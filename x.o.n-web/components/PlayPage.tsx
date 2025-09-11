import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Game } from '../types';
import { getImageSrc } from '../utils/imageUtils';

const PlayPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [backgroundImage, setBackgroundImage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for the hybrid embed model
  const [isStarted, setIsStarted] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const instructionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Corrected fullscreen handler that exits on a single ESC press.
  const handleFullscreenChange = useCallback(() => {
    const isFullscreen = document.fullscreenElement !== null;
    if (!isFullscreen && isStarted) {
      navigate(-1);
    }
  }, [navigate, isStarted]);

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (instructionTimeoutRef.current) {
        clearTimeout(instructionTimeoutRef.current);
      }
    };
  }, [handleFullscreenChange]);

  useEffect(() => {
    // When the component unmounts, exit fullscreen if it's active.
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    };
  }, []);

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

  const handleStart = async () => {
    setError(null);

    // Read all config from .env file, providing sensible defaults.
    const instanceIp = import.meta.env.VITE_INSTANCE_IP;
    const agentPort = import.meta.env.VITE_AGENT_PORT || '5001';
    const streamPort = import.meta.env.VITE_STREAM_PORT || '8080';
    const streamPath = import.meta.env.VITE_STREAM_PATH_AND_QUERY || '/?ui=none';

    if (!instanceIp || instanceIp.includes("YOUR_INSTANCE_IP_HERE")) {
      setError("Xatolik: Instance IP manzili .env faylida ko'rsatilmagan. .env.example fayliga qarang.");
      return;
    }

    if (!containerRef.current) return;

    // "One-click" flow:
    containerRef.current.requestFullscreen().then(() => {
      const agentUrl = `http://${instanceIp}:${agentPort}/launch`;
      const newStreamUrl = `http://${instanceIp}:${streamPort}${streamPath}`;

      setStreamUrl(newStreamUrl);
      setIsStarted(true);
      setShowInstructions(true);
      instructionTimeoutRef.current = setTimeout(() => setShowInstructions(false), 4000);

      // Send command to agent in the background.
      fetch(agentUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: gameId }),
      }).then(response => {
        if (!response.ok) {
          response.json().then(errorData => {
            setError(`Agentga buyruq yuborishda xatolik: ${errorData.message || 'Noma\\'lum xato'}`);
          }).catch(() => {
            setError('Agentga buyruq yuborishda xatolik: Javobni o\\'qib bo\\'lmadi.');
          });
        } else {
          console.log('Launch command sent successfully.');
        }
      }).catch(err => {
        setError(`Agent bilan bog'lanishda xatolik: ${err.message}`);
      });

    }).catch(err => {
      console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      setError(`To'liq ekranga o'tib bo'lmadi. Brauzer ruxsatlarini tekshiring.`);
    });
  };

  if (isLoading) {
    return <div className="w-screen h-screen flex items-center justify-center bg-black text-white">Loading...</div>;
  }

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen bg-cover bg-center flex items-center justify-center"
      style={{
        backgroundImage: !isStarted ? `url(${backgroundImage})` : 'none',
        backgroundColor: 'black'
      }}
    >
      {!isStarted ? (
        <>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 text-center">
            <h1 className="text-5xl font-bold text-white mb-8 drop-shadow-lg">{game?.title}</h1>
            <button
              onClick={handleStart}
              className="bg-theme-gradient text-white font-bold text-2xl rounded-lg px-12 py-6 hover-glow transition-all shadow-lg transform hover:scale-105"
            >
              Boshlash
            </button>
            {error && <p className="text-red-500 mt-4 bg-black/50 p-2 rounded">{error}</p>}
          </div>
        </>
      ) : (
        <>
          <iframe
            src={streamUrl}
            title="Selkies Stream"
            style={{ width: '100%', height: '100%', border: 'none' }}
            allow="fullscreen; gamepad; microphone; camera"
          />
          {showInstructions && (
            <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-md transition-opacity duration-500 animate-pulse">
              To'liq ekrandan chiqish uchun ESC tugmasini bosing
            </div>
          )}
          {error && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-red-800/80 text-white px-4 py-2 rounded-md">
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PlayPage;
