import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SelkiesPlayer from '../../components/SelkiesPlayer';
import { Input } from '../../components/selkies-core/input';

// Mock the Input class
vi.mock('../../components/selkies-core/input');

describe('SelkiesPlayer', () => {
  const mockOnClose = vi.fn();
  const mockOnError = vi.fn();
  const signallingUrl = 'ws://localhost:8080/ws';

  // Mocks for WebRTC classes
  const mockDataChannel = {
    send: vi.fn(),
    onopen: () => {},
    onclose: () => {},
    onmessage: () => {},
    readyState: 'open',
  };

  const mockPeerConnection = {
    addEventListener: vi.fn((event, callback) => {
      if (event === 'datachannel') {
        // Immediately simulate datachannel event
        act(() => callback({ channel: mockDataChannel }));
      }
    }),
    removeEventListener: vi.fn(),
    close: vi.fn(),
    getSenders: vi.fn(() => []),
    setRemoteDescription: vi.fn(),
    createAnswer: vi.fn(() => Promise.resolve({ type: 'answer', sdp: '...' })),
    setLocalDescription: vi.fn(),
    addIceCandidate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.RTCPeerConnection = vi.fn(() => mockPeerConnection) as any;
    global.RTCSessionDescription = vi.fn();
    global.RTCIceCandidate = vi.fn();
    global.WebSocket = vi.fn(() => ({
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
    })) as any;
    window.Guacamole = {
        Keyboard: vi.fn().mockImplementation(() => ({
            onkeydown: null,
            onkeyup: null,
            reset: vi.fn(),
        })),
    } as any;
  });

  it('renders with initial status', () => {
    render(<SelkiesPlayer signallingUrl={signallingUrl} onClose={mockOnClose} onError={mockOnError} />);
    expect(screen.getByText('Initializing...')).toBeInTheDocument();
  });

  it('initializes Input class and attaches listeners when datachannel opens', async () => {
    render(<SelkiesPlayer signallingUrl={signallingUrl} onClose={mockOnClose} onError={mockOnError} />);

    // Simulate datachannel opening
    await act(async () => {
      mockDataChannel.onopen();
    });

    expect(Input).toHaveBeenCalledTimes(1);
    const mockInputInstance = (Input as any).mock.instances[0];
    expect(mockInputInstance.attach).toHaveBeenCalledTimes(1);
  });
});
