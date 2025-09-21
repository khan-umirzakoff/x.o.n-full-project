import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Game } from '../types';
import { getImageSrc } from '../utils/imageUtils';
import { WebRTCSignalling } from './selkies-core/signalling';
import { WebRTCPlayer } from './selkies-core/webrtc';
import LoadingOverlay from './LoadingOverlay';

const PlayPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  // Game data state
  const [game, setGame] = useState<Game | null>(null);
  const [backgroundImage, setBackgroundImage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // WebRTC and streaming state
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const webrtcRef = useRef<WebRTCPlayer | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('initializing');
  const [signallingUrl, setSignallingUrl] = useState<string | null>(null);
  const [isStreamPlaying, setIsStreamPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasStarted = useRef(false);

  // Fetch game data
  useEffect(() => {
    if (!gameId) {
      navigate('/');
      return;
    }
    const fetchGameData = async () => {
      try {
        setIsLoading(true);
        const fetchedGame = await api.getGameById(gameId);
        if (fetchedGame) {
          setGame(fetchedGame);
          const wideImageSrc = await getImageSrc(fetchedGame.title, fetchedGame.wideImage || fetchedGame.image);
          setBackgroundImage(wideImageSrc);
        } else {
          navigate('/not-found');
        }
      } catch (err) {
        console.error('Failed to fetch game data:', err);
        setError('Could not load game data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchGameData();
  }, [gameId, navigate]);

  // Auto-start agent connection
  useEffect(() => {
    if (isLoading || !game || hasStarted.current) return;

    hasStarted.current = true;
    setError(null);

    const instanceIp = import.meta.env.VITE_INSTANCE_IP as string | undefined;
    const agentPort = (import.meta.env.VITE_AGENT_PORT as string) || '5001';
    const streamPort = (import.meta.env.VITE_STREAM_PORT as string) || '8080';
    const appName = (import.meta.env.VITE_STREAM_APPNAME as string) || 'webrtc';

    if (!instanceIp || instanceIp.includes('YOUR_INSTANCE_IP_HERE')) {
      setError("Xatolik: Instance IP manzili .env faylida ko'rsatilmagan.");
      return;
    }

    const agentUrl = `http://${instanceIp}:${agentPort}/launch`;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${instanceIp}:${streamPort}/${appName}/signalling/`;

    setConnectionStatus('agent-connecting');
    fetch(agentUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: gameId }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "Noma'lum xato" }));
          throw new Error(errorData.message || "Agent javobini o'qib bo'lmadi");
        }
        setSignallingUrl(wsUrl);
      })
      .catch((err: any) => {
        setError(`Agent bilan bog'lanishda xatolik: ${err.message}`);
        setConnectionStatus('failed');
      });
  }, [isLoading, game, gameId]);

  // Setup WebRTC connection
  useEffect(() => {
    if (!signallingUrl || !videoRef.current) return;

    const signalling = new WebRTCSignalling(signallingUrl);
    const webrtc = new WebRTCPlayer(signalling, videoRef.current);
    webrtcRef.current = webrtc;

    webrtc.onstatus = (msg: string) => console.log('WebRTC Status:', msg);
    webrtc.onerror = (msg: string) => {
      setError(msg);
      setConnectionStatus('failed');
    };
    webrtc.onconnectionstatechange = (state: RTCPeerConnectionState) => {
      setConnectionStatus(state);
      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        setError(`Connection ${state}`);
      }
    };
    // The browser requires a user gesture to start video with sound.
    // We handle this with the "GO" button.
    webrtc.onplaystreamrequired = () => {
        // This is expected, we will call playStream() from our GO button
    };

    webrtc.connect();

    return () => {
      webrtc.disconnect();
      webrtcRef.current = null;
    };
  }, [signallingUrl]);

  const enterFullscreen = () => {
    const element = containerRef.current;
    if (!element) return;

    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if ((element as any).mozRequestFullScreen) {
      (element as any).mozRequestFullScreen();
    } else if ((element as any).webkitRequestFullscreen) {
      (element as any).webkitRequestFullscreen();
    } else if ((element as any).msRequestFullscreen) {
      (element as any).msRequestFullscreen();
    }
  };

  const handleGoClick = () => {
    if (webrtcRef.current) {
      webrtcRef.current.playStream();
      enterFullscreen();
      setIsStreamPlaying(true);
    }
  };

  const handlePointerLock = () => {
    if (videoRef.current && document.pointerLockElement !== videoRef.current) {
      videoRef.current.requestPointerLock().catch(e => console.error("Could not request pointer lock:", e));
    }
  };

  if (isLoading) {
    return <div className="w-screen h-screen flex items-center justify-center bg-black text-white">Loading Game...</div>;
  }

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen bg-cover bg-center flex items-center justify-center relative"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundColor: 'black',
      }}
    >
      <div className="absolute inset-0 bg-black/50" />

      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-contain cursor-none transition-opacity duration-500 ${isStreamPlaying ? 'opacity-100' : 'opacity-0'}`}
        playsInline
        muted
        autoPlay
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        onClick={handlePointerLock}
      />

      {!isStreamPlaying && (
        <LoadingOverlay status={connectionStatus} onGoClick={handleGoClick} />
      )}

      {error && !isStreamPlaying && (
         <div className="absolute bottom-4 left-4 z-50 p-4 bg-red-900/80 rounded-lg text-white">
            <h3 className="font-bold mb-2">Ulanishda xatolik</h3>
            <p>{error}</p>
            <button onClick={() => navigate('/')} className="mt-4 px-4 py-1 rounded bg-white/20 hover:bg-white/30">
                Bosh sahifa
            </button>
         </div>
      )}
    </div>
  );
};

export default PlayPage;
