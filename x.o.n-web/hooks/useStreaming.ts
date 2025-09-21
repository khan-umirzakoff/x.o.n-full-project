import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Game } from '../types';
import { getImageSrc } from '../utils/imageUtils';
import { WebRTCSignalling } from '../components/selkies-core/signalling';
import { WebRTCPlayer } from '../components/selkies-core/webrtc';
import { useSettings } from './useSettings';

export interface UseStreamingParams {
  gameId: string | undefined;
}

export const useStreaming = ({ gameId }: UseStreamingParams) => {
  const navigate = useNavigate();
  const { settings } = useSettings();

  // Game data state
  const [game, setGame] = useState<Game | null>(null);
  const [backgroundImage, setBackgroundImage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Streaming state - initialized from global settings
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('initializing');
  const [signallingUrl, setSignallingUrl] = useState<string | null>(null);
  const [isStreamPlaying, setIsStreamPlaying] = useState(false);
  const [streamingStats, setStreamingStats] = useState<any>({});
  const [serverGpuStats, setServerGpuStats] = useState<any>({});
  const [serverCpuStats, setServerCpuStats] = useState<any>({});
  const [videoBitrate, setVideoBitrate] = useState(settings.videoBitrate);
  const [framerate, setFramerate] = useState(settings.framerate);
  const [selectedResolution, setSelectedResolution] = useState(settings.selectedResolution);
  const [audioBitrate, setAudioBitrate] = useState(settings.audioBitrate);
  const [resizeRemote, setResizeRemote] = useState(settings.resizeRemote);
  const [scaleLocal, setScaleLocal] = useState(settings.scaleLocal);
  const [clipboardStatus, setClipboardStatus] = useState<'enabled' | 'disabled' | 'prompt'>('prompt');
  const [showExitPrompt, setShowExitPrompt] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const webrtcRef = useRef<WebRTCPlayer | null>(null);
  const hasConnectionStarted = useRef(false);
  const hasSentInitialResolution = useRef(false);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastStatsReport = useRef<any>(null);
  const lastStatsTimestamp = useRef<number>(0);
  const previousJitterBufferDelay = useRef<number>(0);
  const previousJitterBufferEmittedCount = useRef<number>(0);


  const sendDataChannelMessage = useCallback((message: string) => {
    webrtcRef.current?.sendDataChannelMessage(message);
  }, []);

  // Fetch game data
  useEffect(() => {
    if (!gameId) navigate('/');
    const fetchGameData = async () => {
      try {
        setIsLoading(true);
        const fetchedGame = await api.getGameById(gameId!);
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
    fetch(agentUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app_id: gameId })})
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
    webrtc.onerror = (msg: string) => { setError(msg); setConnectionStatus('failed'); };
    webrtc.onconnectionstatechange = (state: RTCPeerConnectionState) => {
      setConnectionStatus(state);
      if (state === 'connected') {
        statsIntervalRef.current = setInterval(async () => {
          if (!webrtcRef.current) return;
          const report = await webrtcRef.current.getConnectionStats();
          if (!report) return;

          const now = Date.now();
          const timeDelta = lastStatsTimestamp.current ? (now - lastStatsTimestamp.current) / 1000 : 0;

          let calculatedStats: any = {
              video: { ...report.video },
              audio: { ...report.audio },
              general: { ...report.general },
          };

          if (timeDelta > 0 && lastStatsReport.current) {
            // Calculate video bitrate
            const videoBytesDelta = report.video.bytesReceived - lastStatsReport.current.video.bytesReceived;
            calculatedStats.video.bitrate = (videoBytesDelta * 8) / timeDelta / 1000000; // Mbps

            // Calculate audio bitrate
            const audioBytesDelta = report.audio.bytesReceived - lastStatsReport.current.audio.bytesReceived;
            calculatedStats.audio.bitrate = (audioBytesDelta * 8) / timeDelta / 1000; // kbps

            // --- More accurate latency calculation (ported from gst-web) ---
            let videoLatency = (report.general.currentRoundTripTime || 0) * 1000;
            const jitterFramesDelta = report.video.jitterBufferEmittedCount - previousJitterBufferEmittedCount.current;
            if (jitterFramesDelta > 0) {
                const jitterDelayDelta = (report.video.jitterBufferDelay - previousJitterBufferDelay.current) * 1000;
                videoLatency += jitterDelayDelta / jitterFramesDelta;
            }
            calculatedStats.video.latency = Math.round(videoLatency);
            // --- End latency calculation ---
          }

          setStreamingStats(calculatedStats);

          lastStatsReport.current = report;
          lastStatsTimestamp.current = now;
          previousJitterBufferDelay.current = report.video.jitterBufferDelay;
          previousJitterBufferEmittedCount.current = report.video.jitterBufferEmittedCount;

        }, 1000);
      } else {
        if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
        lastStatsReport.current = null;
        lastStatsTimestamp.current = 0;
        previousJitterBufferDelay.current = 0;
        previousJitterBufferEmittedCount.current = 0;
        if (state === 'failed' || state === 'disconnected' || state === 'closed') {
            setError(`Connection ${state}`);
        }
      }
    };

    webrtc.onsystemaction = (action: string) => {
        console.log("Received system action:", action);
        if (action === 'reload' && webrtcRef.current) {
            webrtcRef.current.reset();
        }
        // TODO: Handle other system actions like setting initial bitrate/framerate from server
    };

    webrtc.ongpustats = (stats: any) => setServerGpuStats(stats);
    webrtc.onsystemstats = (stats: any) => setServerCpuStats(stats);

    webrtc.oncursorchange = (handle, curdata, hotspot, override) => {
        if (!videoRef.current) return;
        if (handle === 0) {
            videoRef.current.style.cursor = "auto";
            return;
        }
        if (override) {
            videoRef.current.style.cursor = override;
            return;
        }
        const cursorUrl = `url('data:image/png;base64,${curdata}') ${hotspot.x} ${hotspot.y}, auto`;
        videoRef.current.style.cursor = cursorUrl;
    };

    webrtc.onplaystreamrequired = () => {
        // This can be used to show a "Click to Play" button if autoplay fails
    };

    webrtc.connect();
    return () => { webrtc.disconnect(); webrtcRef.current = null; };
  }, [signallingUrl]);

  const enterFullscreen = useCallback(() => {
    const element = containerRef.current;
    if (!element || document.fullscreenElement) return;
    element.requestFullscreen().catch(e => console.error("Could not enter fullscreen:", e));
  }, []);

  const handleGoClick = useCallback(() => enterFullscreen(), [enterFullscreen]);

  const handlePointerLock = useCallback(() => {
    if (videoRef.current && document.pointerLockElement !== videoRef.current) {
      videoRef.current.requestPointerLock().catch(e => console.error("Could not request pointer lock:", e));
    }
  }, []);

  // --- Quality Control Effects ---
  useEffect(() => { if (isStreamPlaying) sendDataChannelMessage(`vb,${videoBitrate}`); }, [videoBitrate, isStreamPlaying, sendDataChannelMessage]);
  useEffect(() => { if (isStreamPlaying) sendDataChannelMessage(`_arg_fps,${framerate}`); }, [framerate, isStreamPlaying, sendDataChannelMessage]);
  useEffect(() => { if (isStreamPlaying) sendDataChannelMessage(`ab,${audioBitrate}`); }, [audioBitrate, isStreamPlaying, sendDataChannelMessage]);
  useEffect(() => {
    if (isStreamPlaying) {
        const res = `${window.innerWidth}x${window.innerHeight}`;
        sendDataChannelMessage(`_arg_resize,${resizeRemote},${res}`);
    }
  }, [resizeRemote, isStreamPlaying, sendDataChannelMessage]);

  useEffect(() => {
    if (webrtcRef.current?.input.element) {
        const video = webrtcRef.current.input.element;
        if (scaleLocal) {
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'contain';
        } else {
            video.style.width = '';
            video.style.height = '';
            video.style.objectFit = '';
        }
    }
  }, [scaleLocal, isStreamPlaying]);


  // --- Resolution and Fullscreen Logic ---
  const sendResolution = useCallback((isInitial: boolean) => {
    let resolutionToSend: string;
    if (isInitial || selectedResolution === 'auto') {
        resolutionToSend = `${window.screen.width}x${window.screen.height}`;
        if (isInitial) setSelectedResolution('auto');
    } else {
        resolutionToSend = selectedResolution;
    }
    sendDataChannelMessage(`r,${resolutionToSend}`);
    sendDataChannelMessage(`s,${window.devicePixelRatio}`);
  }, [selectedResolution, sendDataChannelMessage, setSelectedResolution]);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (document.fullscreenElement) {
        if (!isStreamPlaying) {
          webrtcRef.current?.playStream();
          setIsStreamPlaying(true);
          if (!hasSentInitialResolution.current) {
            requestAnimationFrame(() => sendResolution(true));
            hasSentInitialResolution.current = true;
          }
        }
        setShowExitPrompt(false);
      } else {
        if (isStreamPlaying) setShowExitPrompt(true);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, [isStreamPlaying, sendResolution, webrtcRef]);

  useEffect(() => {
    if (isStreamPlaying && hasSentInitialResolution.current) {
      sendResolution(false);
    }
  }, [selectedResolution, isStreamPlaying, sendResolution]);

  // --- Clipboard Logic ---
  const enableClipboard = useCallback(() => {
    navigator.clipboard.readText()
      .then(() => {
        webrtcRef.current?.sendDataChannelMessage("cr");
        setClipboardStatus('enabled');
      })
      .catch(() => setError('Clipboard permission denied.'));
  }, []);

  useEffect(() => {
    if (!webrtcRef.current) return;
    const webrtc = webrtcRef.current;
    webrtc.onclipboardcontent = (content: string) => {
      if (clipboardStatus === 'enabled') navigator.clipboard.writeText(content).catch(err => console.error(err));
    };
  }, [clipboardStatus]);

  useEffect(() => {
    const handleFocus = () => {
      if (webrtcRef.current) {
        webrtcRef.current.sendDataChannelMessage("kr");
        if (clipboardStatus === 'enabled') {
          navigator.clipboard.readText().then(text => {
            const stringToBase64 = (str: string) => btoa(unescape(encodeURIComponent(str)));
            webrtcRef.current?.sendDataChannelMessage("cw," + stringToBase64(text));
          }).catch(err => console.log(err));
        }
      }
    };
    const handleBlur = () => webrtcRef.current?.sendDataChannelMessage("kr");
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isStreamPlaying, clipboardStatus]);

  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'clipboard-read' as PermissionName }).then(p => {
        if (p.state === 'granted') setClipboardStatus('enabled');
        p.onchange = () => setClipboardStatus(p.state === 'granted' ? 'enabled' : 'prompt');
      });
    }
  }, []);

  return {
    game, backgroundImage, isLoading, error, containerRef, videoRef,
    connectionStatus, isStreamPlaying, streamingStats, videoBitrate,
    setVideoBitrate, framerate, setFramerate, selectedResolution,
    setSelectedResolution, audioBitrate, setAudioBitrate,
    clipboardStatus, enableClipboard, showExitPrompt,
    setShowExitPrompt, handleGoClick, handlePointerLock, enterFullscreen,
    resizeRemote, setResizeRemote, serverGpuStats, serverCpuStats,
    scaleLocal, setScaleLocal,
    showFPS: settings.showFPS,
    showStatsOverlay: settings.showStatsOverlay,
  };
};
