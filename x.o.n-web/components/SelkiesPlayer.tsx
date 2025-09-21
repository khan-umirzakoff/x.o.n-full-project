import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WebRTCSignalling } from './selkies-core/signalling.ts';
import { WebRTCPlayer } from './selkies-core/webrtc.ts';

interface SelkiesPlayerProps {
  signallingUrl: string;
  onClose: () => void;
  onError?: (message: string) => void;
}

const SelkiesPlayer: React.FC<SelkiesPlayerProps> = ({ signallingUrl, onClose, onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const webrtcRef = useRef<WebRTCPlayer | null>(null);

  const [status, setStatus] = useState<string>('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [needsUserGesture, setNeedsUserGesture] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(true);

  const setErrorMsg = useCallback((msg: string) => {
    setError(msg);
    setStatus('Error');
    if (onError) onError(msg);
    setIsConnecting(false);
  }, [onError]);

  const cleanup = useCallback(() => {
    webrtcRef.current?.disconnect();
    webrtcRef.current = null;
  }, []);

  const attemptPlay = useCallback(() => {
    webrtcRef.current?.playStream();
    setNeedsUserGesture(false);
  }, []);

  const handlePointerLock = () => {
    if (videoRef.current && document.pointerLockElement !== videoRef.current) {
      try {
        const ret = videoRef.current.requestPointerLock();
        (ret as any)?.catch?.((e: any) => console.error("Could not request pointer lock:", e));
      } catch (e) {
        console.error("Could not request pointer lock:", e);
      }
    }
  };

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    const signalling = new WebRTCSignalling(signallingUrl);
    const webrtc = new WebRTCPlayer(signalling, videoRef.current);
    webrtcRef.current = webrtc;

    webrtc.onstatus = (msg: string) => setStatus(msg);
    webrtc.onerror = (msg: string) => setErrorMsg(msg);
    webrtc.onconnectionstatechange = (state: RTCPeerConnectionState) => {
      setStatus(`Connection: ${state}`);
      if (state === 'connected') {
        setIsConnecting(false);
      }
      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        setErrorMsg(`Connection ${state}`);
        setIsConnecting(false);
      }
    };
    webrtc.onplaystreamrequired = () => setNeedsUserGesture(true);

    webrtc.connect();

    return () => {
      cleanup();
    };
  }, [signallingUrl, cleanup, setErrorMsg]);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="absolute top-0 left-0 right-0 z-10 p-2 flex items-center justify-between text-white bg-black/30 backdrop-blur-sm">
        <div className="text-sm" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}>{status}</div>
        <div>
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
      {isConnecting && (
        <div className="absolute top-12 left-0 w-full h-1 bg-white/20">
          <div className="h-full bg-theme-gradient animate-loading-bar"></div>
        </div>
      )}
      {error && (
        <div className="absolute top-14 left-0 right-0 p-2 text-red-400 text-sm bg-black/60 backdrop-blur-sm"  style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}>{error}</div>
      )}
      <div className="flex-1 relative" onClick={handlePointerLock}>
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-contain bg-black cursor-none"
          playsInline
          muted
          autoPlay
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