/**
 * Live, full-duplex voice conversation via OpenAI's Realtime API (WebRTC).
 *
 * This is the "ChatGPT voice mode" path: real speech-to-speech, interruptible,
 * with the model talking and listening at the same time. The browser never
 * sees the API key — it asks our backend (/tutor/realtime) for a short-lived
 * ephemeral token, then opens a peer connection straight to OpenAI.
 *
 * Flow (per OpenAI's WebRTC guide):
 *   1. backend mints an ephemeral token (ek_…) bound to the session config
 *   2. getUserMedia(mic) → add track to an RTCPeerConnection
 *   3. create a data channel ("oai-events") for JSON events
 *   4. createOffer → POST the SDP to /v1/realtime/calls with the ek_… token
 *   5. apply the SDP answer; audio + events now flow over the peer connection
 */

export type RealtimeState =
  | 'connecting'
  | 'listening'
  | 'user_speaking'
  | 'thinking'
  | 'assistant_speaking'
  | 'closed';

export interface RealtimeCallbacks {
  onStateChange?: (state: RealtimeState) => void;
  /** A finished user utterance (transcribed). */
  onUserTranscript?: (text: string) => void;
  /** Streaming assistant text as it speaks. */
  onAssistantDelta?: (text: string) => void;
  /** A finished assistant utterance. */
  onAssistantDone?: (text: string) => void;
  onError?: (message: string) => void;
}

export interface EphemeralToken {
  token: string;
  model: string;
}

const CALLS_URL = 'https://api.openai.com/v1/realtime/calls';
// If the handshake hasn't reached "listening" within this window, something's
// stuck (common on flaky mobile networks/mic permission dialogs) — fail
// cleanly instead of leaving the call hanging on "Connecting…" forever, which
// is what previously made a retry pile a second session on top of a stuck one.
const CONNECT_TIMEOUT_MS = 20000;

export function realtimeSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof RTCPeerConnection !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

export class RealtimeSession {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private micStream: MediaStream | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private closed = false;
  private connecting = false;

  private assistantBuffer = '';
  private transcript: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Barge-in bookkeeping — lets the learner cut in mid-sentence like a real
  // conversation instead of waiting for Profe to finish (see handleEvent's
  // input_audio_buffer.speech_started handler).
  private state: RealtimeState = 'connecting';
  private currentItemId: string | null = null;
  private assistantSpeechStartedAt: number | null = null;

  constructor(private cb: RealtimeCallbacks) {}

  /** True while a connection attempt is in flight — guards against double-starts. */
  isConnecting(): boolean {
    return this.connecting;
  }

  /** Connect and start the conversation. `fetchToken` calls our backend. */
  async start(fetchToken: () => Promise<EphemeralToken>): Promise<void> {
    if (this.connecting || this.pc) {
      // Already starting/started — never open a second peer connection and
      // mic stream on top of one that's still mid-setup (the exact scenario
      // that made mobile browsers lock up on a retry tap).
      return;
    }
    this.connecting = true;
    this.setState('connecting');

    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      this.cb.onError?.('Could not connect — please try again.');
      this.close();
    }, CONNECT_TIMEOUT_MS);

    try {
      const { token, model } = await fetchToken();
      if (timedOut) return;

      const pc = new RTCPeerConnection();
      this.pc = pc;

      // Play the model's voice. Attached to the DOM (hidden) and played
      // explicitly — some mobile browsers are unreliable about autoplay on an
      // audio element that's never actually in the document.
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioEl.setAttribute('playsinline', 'true');
      audioEl.style.display = 'none';
      document.body.appendChild(audioEl);
      this.audioEl = audioEl;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
        audioEl.play().catch(() => {
          // Autoplay can still be blocked until the next user gesture —
          // harmless, playback resumes once the user taps anything.
        });
      };

      // Capture the mic. Echo cancellation matters — it stops the model
      // hearing its own voice through the speakers.
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (timedOut) return;
      for (const track of this.micStream.getTracks()) pc.addTrack(track, this.micStream);

      // Events channel.
      const dc = pc.createDataChannel('oai-events');
      this.dc = dc;
      dc.onmessage = (e) => this.handleEvent(e.data);
      dc.onopen = () => {
        clearTimeout(timeout);
        this.connecting = false;
        // Ask Profe to open the conversation (greet first), per the instructions.
        this.send({ type: 'response.create' });
        this.setState('listening');
      };

      pc.onconnectionstatechange = () => {
        if (['failed', 'disconnected', 'closed'].includes(pc.connectionState) && !this.closed) {
          this.cb.onError?.('The voice connection dropped.');
          this.close();
        }
      };

      // SDP offer → OpenAI → answer.
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (timedOut) return;

      const resp = await fetch(`${CALLS_URL}?model=${encodeURIComponent(model)}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!resp.ok) {
        throw new Error(`Realtime handshake failed (${resp.status})`);
      }
      if (timedOut) return;

      const answer = { type: 'answer' as const, sdp: await resp.text() };
      await pc.setRemoteDescription(answer);
    } catch (err) {
      clearTimeout(timeout);
      this.connecting = false;
      // If we already timed out, the timeout handler above already closed
      // everything and reported the error — don't double-report.
      if (timedOut) return;
      // Clean up whatever got partially set up before rethrowing, so a failed
      // attempt never leaves a dangling mic stream / peer connection for the
      // next attempt to collide with.
      this.close();
      throw err;
    }
  }

  private send(event: Record<string, unknown>): void {
    if (this.dc && this.dc.readyState === 'open') {
      this.dc.send(JSON.stringify(event));
    }
  }

  private handleEvent(raw: string): void {
    let evt: any;
    try {
      evt = JSON.parse(raw);
    } catch {
      return;
    }
    const type: string = evt.type || '';

    // A new assistant item started — remember its id and when its audio
    // began, so a mid-sentence interruption can tell the server exactly how
    // much was actually heard (see speech_started below).
    if (type.includes('output_item.added')) {
      const itemId = evt.item?.id;
      if (itemId) {
        this.currentItemId = itemId;
        this.assistantSpeechStartedAt = Date.now();
      }
      return;
    }

    // The learner started/stopped speaking (server VAD).
    if (type === 'input_audio_buffer.speech_started') {
      // Real barge-in: if Profe was mid-response, stop it immediately rather
      // than letting it talk over the learner. Explicit response.cancel +
      // conversation.item.truncate (rather than relying only on whatever the
      // server does implicitly) so the model's own memory of the
      // conversation matches what the learner actually heard — otherwise it
      // can carry on next turn as if it had finished a sentence it never got
      // to say.
      if (this.state === 'assistant_speaking' || this.state === 'thinking') {
        this.send({ type: 'response.cancel' });
        if (this.currentItemId && this.assistantSpeechStartedAt !== null) {
          const audioEndMs = Math.max(0, Date.now() - this.assistantSpeechStartedAt);
          this.send({
            type: 'conversation.item.truncate',
            item_id: this.currentItemId,
            content_index: 0,
            audio_end_ms: audioEndMs,
          });
        }
        this.assistantBuffer = '';
        this.currentItemId = null;
        this.assistantSpeechStartedAt = null;
      }
      this.setState('user_speaking');
      return;
    }
    if (type === 'input_audio_buffer.speech_stopped') {
      this.setState('thinking');
      return;
    }

    // Final transcription of what the learner said.
    if (type.includes('input_audio_transcription.completed')) {
      const text = (evt.transcript || '').trim();
      if (text) {
        this.transcript.push({ role: 'user', content: text });
        this.cb.onUserTranscript?.(text);
      }
      return;
    }

    // Assistant audio transcript streaming in (event name varies by version).
    if (type.includes('audio_transcript.delta')) {
      const delta = evt.delta || '';
      if (delta) {
        this.assistantBuffer += delta;
        this.setState('assistant_speaking');
        this.cb.onAssistantDelta?.(this.assistantBuffer);
      }
      return;
    }
    if (type.includes('audio_transcript.done')) {
      const text = (evt.transcript || this.assistantBuffer).trim();
      this.assistantBuffer = '';
      if (text) {
        this.transcript.push({ role: 'assistant', content: text });
        this.cb.onAssistantDone?.(text);
      }
      return;
    }

    // Assistant finished this response — back to listening.
    if (type === 'response.done') {
      this.currentItemId = null;
      this.assistantSpeechStartedAt = null;
      if (!this.closed) this.setState('listening');
      return;
    }

    if (type === 'error') {
      const msg = evt.error?.message || 'Voice error';
      this.cb.onError?.(msg);
      return;
    }
  }

  /** Mute/unmute the learner's mic without dropping the call. */
  setMuted(muted: boolean): void {
    if (this.micStream) {
      for (const t of this.micStream.getAudioTracks()) t.enabled = !muted;
    }
  }

  getTranscript(): Array<{ role: 'user' | 'assistant'; content: string }> {
    return [...this.transcript];
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.connecting = false;
    try {
      this.dc?.close();
    } catch {
      /* ignore */
    }
    try {
      this.pc?.close();
    } catch {
      /* ignore */
    }
    if (this.micStream) {
      for (const t of this.micStream.getTracks()) t.stop();
    }
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.srcObject = null;
      this.audioEl.remove();
      this.audioEl = null;
    }
    this.pc = null;
    this.dc = null;
    this.micStream = null;
    this.setState('closed');
  }

  private setState(state: RealtimeState): void {
    this.state = state;
    this.cb.onStateChange?.(state);
  }
}
