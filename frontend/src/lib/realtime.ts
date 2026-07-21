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

  private assistantBuffer = '';
  private transcript: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  constructor(private cb: RealtimeCallbacks) {}

  /** Connect and start the conversation. `fetchToken` calls our backend. */
  async start(fetchToken: () => Promise<EphemeralToken>): Promise<void> {
    this.setState('connecting');

    const { token, model } = await fetchToken();

    const pc = new RTCPeerConnection();
    this.pc = pc;

    // Play the model's voice.
    const audioEl = new Audio();
    audioEl.autoplay = true;
    this.audioEl = audioEl;
    pc.ontrack = (e) => {
      audioEl.srcObject = e.streams[0];
    };

    // Capture the mic. Echo cancellation matters — it stops the model hearing
    // its own voice through the speakers.
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    for (const track of this.micStream.getTracks()) pc.addTrack(track, this.micStream);

    // Events channel.
    const dc = pc.createDataChannel('oai-events');
    this.dc = dc;
    dc.onmessage = (e) => this.handleEvent(e.data);
    dc.onopen = () => {
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

    const answer = { type: 'answer' as const, sdp: await resp.text() };
    await pc.setRemoteDescription(answer);
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

    // The learner started/stopped speaking (server VAD).
    if (type === 'input_audio_buffer.speech_started') {
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
      this.audioEl.srcObject = null;
      this.audioEl = null;
    }
    this.pc = null;
    this.dc = null;
    this.micStream = null;
    this.setState('closed');
  }

  private setState(state: RealtimeState): void {
    this.cb.onStateChange?.(state);
  }
}
