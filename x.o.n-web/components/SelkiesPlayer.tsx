import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Input } from '../selkies-core/input';

interface SelkiesPlayerProps {
  signallingUrl: string;
  onClose: () => void;
  onError?: (message: string) => void;
}

// Utility: compute even-aligned resolution in physical pixels taking DPR into account
function getEvenResolution(): { width: number; height: number } {
  const w = Math.floor(document.body.offsetWidth * window.devicePixelRatio);
  const h = Math.floor(document.body.offsetHeight * window.devicePixelRatio);
  const evenW = w - (w % 2);
  const evenH = h - (h % 2);
  return { width: evenW, height: evenH };
}

// Utility: ICE config from env vars
function getIceServersFromEnv(): RTCIceServer[] {
  const stunEnv = (import.meta as any).env.VITE_STUN_URLS as string | undefined; // e.g. "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302"
  const turnUrls = (import.meta as any).env.VITE_TURN_URLS as string | undefined; // e.g. "turn:turn.example.com:3478?transport=udp"
  const turnUser = (import.meta as any).env.VITE_TURN_USER as string | undefined;
  const turnPass = (import.meta as any).env.VITE_TURN_PASS as string | undefined;

  const ice: RTCIceServer[] = [];

  if (stunEnv) {
    const urls = stunEnv.split(',').map((s) => s.trim()).filter(Boolean);
    if (urls.length) ice.push({ urls });
  } else {
    ice.push({ urls: ['stun:stun.l.google.com:19302'] });
  }

  if (turnUrls) {
    const urls = turnUrls.split(',').map((s) => s.trim()).filter(Boolean);
    if (urls.length) {
      if (turnUser && turnPass) {
        ice.push({ urls, username: turnUser, credential: turnPass });
      } else {
        ice.push({ urls });
      }
    }
  }

  return ice;
}

// Prefer H264 codec for video if possible
async function preferH264Codecs(pc: RTCPeerConnection) {
  try {
    const transceivers = pc.getTransceivers ? pc.getTransceivers() : [];
    for (const t of transceivers) {
      const kind = t.receiver?.track?.kind;
      if (kind === 'video' && (t as any).setCodecPreferences) {
        const caps = RTCRtpSender.getCapabilities('video');
        if (!caps) continue;
        const h264 = caps.codecs.filter((c) => /h264/i.test(c.mimeType));
        const others = caps.codecs.filter((c) => !/h264/i.test(c.mimeType));
        if (h264.length) {
          (t as any).setCodecPreferences([...h264, ...others]);
        }
      }
    }
  } catch (e) {
    // noop
  }
}

const SelkiesPlayer: React.FC<SelkiesPlayerProps> = ({ signallingUrl, onClose, onError }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const inputRef = useRef<Input | null>(null);

  const [status, setStatus] = useState<string>('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [needsUserGesture, setNeedsUserGesture] = useState<boolean>(false);
  const [reconnectToken, setReconnectToken] = useState<number>(0);
  const [canReconnect, setCanReconnect] = useState<boolean>(false);

  const setErrorMsg = useCallback((msg: string) => {
    setError(msg);
    setStatus('Error');
    if (onError) onError(msg);
  }, [onError]);

  const cleanup = useCallback(() => {
    inputRef.current?.detach();
    inputRef.current = null;
    try { wsRef.current?.close(); } catch {}
    try { pcRef.current?.getSenders().forEach(s => s.track && s.track.stop()); } catch {}
    try { pcRef.current?.close(); } catch {}
    wsRef.current = null;
    pcRef.current = null;
    dataChannelRef.current = null;
  }, []);

  const attemptPlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    const p = v.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        setNeedsUserGesture(false);
      }).catch(() => {
        setNeedsUserGesture(true);
      });
    }
  }, []);

  const handlePointerLock = () => {
    if (videoRef.current && document.pointerLockElement !== videoRef.current) {
      videoRef.current.requestPointerLock().catch(e => console.error("Could not request pointer lock:", e));
    }
  };

  useEffect(() => {
    setCanReconnect(false);

    const pc = new RTCPeerConnection({
      iceServers: getIceServersFromEnv(),
      iceTransportPolicy: 'all'
    });

    pcRef.current = pc;

    pc.addEventListener('icecandidate', (e) => {
      if (e.candidate && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ ice: e.candidate }));
      }
    });

    pc.addEventListener('track', (e) => {
      const v = videoRef.current;
      if (!v) return;
      v.srcObject = e.streams[0];
      attemptPlay();
    });

    pc.addEventListener('connectionstatechange', () => {
      if (!pcRef.current) return;
      const st = pcRef.current.connectionState;
      setStatus(`Peer: ${st}`);
      if (st === 'failed' || st === 'disconnected' || st === 'closed') {
        setCanReconnect(true);
      }
    });

    pc.addEventListener('datachannel', (event) => {
      const channel = event.channel;
      dataChannelRef.current = channel;
      channel.onopen = () => {
        setStatus('DataChannel open');
        if (videoRef.current) {
          const input = new Input(videoRef.current, (data) => {
            if (channel.readyState === 'open') {
              channel.send(data);
            }
          });
          input.attach();
          inputRef.current = input;
        }
      };
      channel.onclose = () => setStatus('DataChannel closed');
      channel.onmessage = (ev) => {
        // TODO: parse messages like clipboard/system actions
        // console.debug('DC message', ev.data);
      };
    });

    const urlWithNonce = signallingUrl.includes('?')
      ? `${signallingUrl}&rk=${Date.now()}-${reconnectToken}`
      : `${signallingUrl}?rk=${Date.now()}-${reconnectToken}`;

    const ws = new WebSocket(urlWithNonce);
    wsRef.current = ws;

    ws.addEventListener('open', () => {
      setStatus('Signalling connected');
      const { width, height } = getEvenResolution();
      const scale = window.devicePixelRatio || 1;
      const meta = { res: `${width}x${height}`, scale };
      const peer_id = 1;
      ws.send(`HELLO ${peer_id} ${btoa(JSON.stringify(meta))}`);
    });

    ws.addEventListener('message', async (event) => {
      try {
        if (event.data === 'HELLO') {
          setStatus('Registered. Waiting for stream...');
          return;
        }
        if (typeof event.data === 'string' && event.data.startsWith('ERROR')) {
          setErrorMsg(`Server error: ${event.data}`);
          return;
        }
        const msg = JSON.parse(event.data);
        if (msg.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          await preferH264Codecs(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ sdp: pc.localDescription }));
          setStatus('SDP negotiated');
        } else if (msg.ice) {
          const ice = new RTCIceCandidate(msg.ice);
          await pc.addIceCandidate(ice);
        }
      } catch (e: any) {
        setErrorMsg(e?.message || 'Signalling parse failure');
      }
    });

    ws.addEventListener('error', () => setStatus('Signalling error'));
    ws.addEventListener('close', () => {
      setStatus('Signalling closed');
      setCanReconnect(true);
    });

    return () => {
      cleanup();
    };
  }, [signallingUrl, attemptPlay, cleanup, setErrorMsg, reconnectToken]);

  return (
    <div className="w-full h-full flex flex-col bg-black">
      <div className="flex items-center justify-between p-2 text-white bg-black/60">
        <div className="text-sm opacity-80">{status}</div>
        <div className="flex gap-2">
          {canReconnect && (
            <button
              onClick={() => setReconnectToken((t) => t + 1)}
              className="px-3 py-1 rounded bg-white/10 hover:bg-white/20"
            >
              Reconnect
            </button>
          )}
          <button
            onClick={() => {
              cleanup();
              onClose();
            }}
            className="px-3 py-1 rounded bg-white/10 hover:bg-white/20"
          >
            Close
          </button>
        </div>
      </div>
      {error && (
        <div className="p-2 text-red-400 text-sm bg-black/60">{error}</div>
      )}
      <div className="flex-1 relative" onClick={handlePointerLock}>
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-contain bg-black cursor-none"
          playsInline
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
        />
        {needsUserGesture && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <button
              onClick={attemptPlay}
              className="px-6 py-3 rounded bg-white/20 text-white hover:bg-white/30"
            >
              Click to start
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelkiesPlayer;