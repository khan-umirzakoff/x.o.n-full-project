import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Game } from '../types';
import { getImageSrc } from '../utils/imageUtils';
import { WebRTCSignalling } from '../components/selkies-core/signalling';
import { WebRTCPlayer } from '../components/selkies-core/webrtc';

export interface UseStreamingParams {
  gameId: string | undefined;
}

export const useStreaming = ({ gameId }: UseStreamingParams) => {
  const navigate = useNavigate();

  // Game data state
  const [game, setGame] = useState<Game | null>(null);
  const [backgroundImage, setBackgroundImage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Streaming state
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('initializing');
  const [signallingUrl, setSignallingUrl] = useState<string | null>(null);
  const [isStreamPlaying, setIsStreamPlaying] = useState(false);
  const [streamingStats, setStreamingStats] = useState<any>({});
  const [videoBitrate, setVideoBitrate] = useState(8000);
  const [clipboardStatus, setClipboardStatus] = useState<'enabled' | 'disabled' | 'prompt'>('prompt');

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const webrtcRef = useRef<WebRTCPlayer | null>(null);
  const hasConnectionStarted = useRef(false);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
    if (isLoading || !game || hasConnectionStarted.current) return;

    hasConnectionStarted.current = true;
    setError(null);

    const instanceIp = import.meta.env.VITE_INSTANCE_IP as string | undefined;
    const agentPort = (import.meta.env.VITE_AGENT_PORT as string) || '5001';
    const streamPort = (import.meta.env.VITE_STREAM_PORT as string) || '8080';
    const appName = (import.meta.env.VITE_STREAM_APPNAME as string) || 'webrtc';

    if (!instanceIp || instanceIp.includes('YOUR_INSTANCE_IP_HERE')) {
      setError("Xatolik: Instance IP manzili .env faylida ko'rsatilmagan.");
      setConnectionStatus('failed');
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
        const message = err.message.includes('Failed to fetch')
          ? "Agent serveriga ulanib bo'lmadi (Connection Refused). Server ishlayotganiga ishonch hosil qiling."
          : `Agent bilan bog'lanishda xatolik: ${err.message}`;
        setError(message);
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
      if (state === 'connected') {
        statsIntervalRef.current = setInterval(async () => {
          const stats = await webrtcRef.current?.getConnectionStats();
          if (stats) {
            setStreamingStats(stats);
          }
        }, 1000);
      } else {
        if (statsIntervalRef.current) {
          clearInterval(statsIntervalRef.current);
        }
        if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          setError(`Connection ${state}`);
        }
      }
    };
    webrtc.onplaystreamrequired = () => {
      // This is expected, we will call playStream() from our GO button
    };

    webrtc.connect();

    return () => {
      webrtc.disconnect();
      webrtcRef.current = null;
    };
  }, [signallingUrl]);

  const enterFullscreen = useCallback(() => {
    const element = containerRef.current;
    if (!element) return;
    if (document.fullscreenElement) return;

    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if ((element as any).mozRequestFullScreen) {
      (element as any).mozRequestFullScreen();
    } else if ((element as any).webkitRequestFullscreen) {
      (element as any).webkitRequestFullscreen();
    } else if ((element as any).msRequestFullscreen) {
      (element as any).msRequestFullscreen();
    }
  }, []);

  const handleGoClick = useCallback(() => {
    if (webrtcRef.current) {
      webrtcRef.current.playStream();
      enterFullscreen();
      setIsStreamPlaying(true);
    }
  }, [enterFullscreen]);

  const handlePointerLock = useCallback(() => {
    if (videoRef.current && document.pointerLockElement !== videoRef.current) {
      videoRef.current.requestPointerLock().catch(e => console.error("Could not request pointer lock:", e));
    }
  }, []);

  const sendDataChannelMessage = (message: string) => {
    webrtcRef.current?.sendDataChannelMessage(message);
  };

  useEffect(() => {
    if (isStreamPlaying) {
        sendDataChannelMessage(`vb,${videoBitrate}`);
    }
  }, [videoBitrate, isStreamPlaying]);

  const enableClipboard = useCallback(() => {
    navigator.clipboard.readText()
      .then(text => {
        webrtcRef.current?.sendDataChannelMessage("cr");
        setClipboardStatus('enabled');
        console.log('Clipboard access enabled.');
      })
      .catch(err => {
        console.error('Failed to enable clipboard:', err);
        setError('Clipboard permission denied.');
      });
  }, []);

  // Setup WebRTC event listeners for advanced features
  useEffect(() => {
    if (!webrtcRef.current) return;
    const webrtc = webrtcRef.current;

    // --- Clipboard ---
    webrtc.onclipboardcontent = (content: string) => {
      if (clipboardStatus === 'enabled') {
        navigator.clipboard.writeText(content).catch(err => {
          console.error('Could not copy text to clipboard:', err);
        });
      }
    };

    const handleFocus = () => {
      // Reset keyboard state
      webrtc.sendDataChannelMessage("kr");
      // Sync clipboard
      if (clipboardStatus === 'enabled') {
        navigator.clipboard.readText().then(text => {
          // A simple base64 implementation
          const stringToBase64 = (str: string) => btoa(unescape(encodeURIComponent(str)));
          webrtc.sendDataChannelMessage("cw," + stringToBase64(text));
        }).catch(err => console.log('Cannot read clipboard on focus:', err));
      }
    };
    const handleBlur = () => webrtc.sendDataChannelMessage("kr");

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isStreamPlaying, clipboardStatus]);

  // Check clipboard permissions on mount
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'clipboard-read' as PermissionName }).then(permissionStatus => {
        if (permissionStatus.state === 'granted') {
          setClipboardStatus('enabled');
        }
        permissionStatus.onchange = () => {
          if (permissionStatus.state === 'granted') {
            setClipboardStatus('enabled');
          } else {
            setClipboardStatus('prompt');
          }
        };
      });
    }
  }, []);

  return {
    game,
    backgroundImage,
    isLoading,
    error,
    containerRef,
    videoRef,
    connectionStatus,
    isStreamPlaying,
    streamingStats,
    videoBitrate,
    setVideoBitrate,
    clipboardStatus,
    enableClipboard,
    handleGoClick,
    handlePointerLock,
  };
};
