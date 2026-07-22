import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RealtimeCall } from '@/components/RealtimeCall';

jest.mock('@/lib/api', () => ({
  api: { post: jest.fn().mockResolvedValue({ data: { token: 'tok', model: 'test-model' } }) },
}));

let lastCallbacks: any = null;
const mockClose = jest.fn();
const mockGetTranscript = jest.fn().mockReturnValue([
  { role: 'user', content: 'when I wake up I get a coffee' },
]);

jest.mock('@/lib/realtime', () => ({
  realtimeSupported: () => true,
  RealtimeSession: jest.fn().mockImplementation((cb: any) => {
    lastCallbacks = cb;
    return {
      start: jest.fn().mockImplementation(async (fetchToken: () => Promise<any>) => {
        await fetchToken();
        cb.onStateChange?.('listening');
      }),
      getTranscript: mockGetTranscript,
      close: mockClose,
      setMuted: jest.fn(),
    };
  }),
}));

async function startCall() {
  render(<RealtimeCall context={null} onClose={onClose} />);
  fireEvent.click(await screen.findByText('🎙️ Start talking'));
  await waitFor(() => expect(screen.getByText('Listening — just talk')).toBeInTheDocument());
}

let onClose: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ legacyFakeTimers: false });
  onClose = jest.fn();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('RealtimeCall — end-call grace period', () => {
  it('does not close immediately, so a final in-flight transcription has time to land', async () => {
    await startCall();

    fireEvent.click(screen.getByText('End call'));

    // Grace period hasn't elapsed yet — should not have closed or reported yet.
    expect(screen.getByText('Saving your progress…')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(mockClose).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1200);
    });

    expect(onClose).toHaveBeenCalledWith([{ role: 'user', content: 'when I wake up I get a coffee' }]);
    expect(mockClose).toHaveBeenCalled();
  });

  it('ignores a second End-call tap during the grace period', async () => {
    await startCall();

    fireEvent.click(screen.getByText('End call'));
    // The button is gone once "ending" replaces the screen — nothing to double-tap.
    expect(screen.queryByText('End call')).not.toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(1200);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('RealtimeCall — call duration cap', () => {
  it('warns a couple of minutes before the cap, so wrap-up never feels sudden', async () => {
    await startCall();
    expect(screen.queryByText(/Wrapping up/)).not.toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(18 * 60 * 1000);
    });

    expect(screen.getByText(/Wrapping up/)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ends the call automatically at the cap, so a forgotten call cannot run away on cost', async () => {
    await startCall();

    await act(async () => {
      jest.advanceTimersByTime(20 * 60 * 1000);
    });
    // The grace period after auto-end still applies.
    await act(async () => {
      jest.advanceTimersByTime(1200);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalled();
  });

  it('does not fire the cap timers at all for a call that ends well within the limit', async () => {
    await startCall();
    fireEvent.click(screen.getByText('End call'));

    await act(async () => {
      jest.advanceTimersByTime(1200);
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    // Advancing well past the cap afterwards must not trigger a second close.
    await act(async () => {
      jest.advanceTimersByTime(25 * 60 * 1000);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
