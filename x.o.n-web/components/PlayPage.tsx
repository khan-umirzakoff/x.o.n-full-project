import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Game } from '../types';
import { getImageSrc } from '../utils/imageUtils';
import SelkiesPlayer from './SelkiesPlayer';

const PlayPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [backgroundImage, setBackgroundImage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [signallingUrl, setSignallingUrl] = useState<string | null>(null);

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

  const handleStart = () => {
    setError(null);

    // Read all config from .env file, providing sensible defaults.
    const instanceIp = import.meta.env.VITE_INSTANCE_IP as string | undefined;
    const agentPort = (import.meta.env.VITE_AGENT_PORT as string) || '5001';
    const streamPort = (import.meta.env.VITE_STREAM_PORT as string) || '8080';
    const appName = (import.meta.env.VITE_STREAM_APPNAME as string) || 'webrtc';

    if (!instanceIp || instanceIp.includes('YOUR_INSTANCE_IP_HERE')) {
      setError("Xatolik: Instance IP manzili .env faylida ko'rsatilmagan. .env.example fayliga qarang.");
      return;
    }

    const agentUrl = `http://${instanceIp}:${agentPort}/launch`;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${instanceIp}:${streamPort}/${appName}/signalling/`;

    setIsLaunching(true);

    // Agentga start komandasi
    fetch(agentUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: gameId }),
    })
      .then(async (response) => {
        if (!response.ok) {
          try {
            const errorData = await response.json();
            throw new Error(errorData.message || "Noma'lum xato");
          } catch (e: any) {
            throw new Error(e?.message || "Agent javobini o'qib bo'lmadi");
          }
        }
        // Agent OK: sahifadagi player orqali ulanamiz
        setSignallingUrl(wsUrl);
        setShowPlayer(true);
        setIsLaunching(false);
      })
      .catch((err: any) => {
        setError(`Agent bilan bog'lanishda xatolik: ${err.message}`);
        setIsLaunching(false);
      });
  };

  if (isLoading) {
    return <div className="w-screen h-screen flex items-center justify-center bg-black text-white">Loading...</div>;
  }

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen bg-cover bg-center bg-pan flex items-center justify-center"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundColor: 'black',
      }}
    >
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

        {isLaunching && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
            <div className="text-center">
              <h2 className="text-white text-3xl font-semibold mb-4 drop-shadow">Yuklanmoqda...</h2>
              <div className="loading-progress mt-6" />
              <p className="text-white/80 mt-3">O'yin ishga tushirilmoqda, biroz kuting.</p>
              <div className="mt-8">
                <button
                  onClick={() => {
                    setIsLaunching(false);
                  }}
                  className="px-6 py-3 rounded bg-white/10 text-white hover:bg-white/20 transition"
                >
                  Bekor qilish
                </button>
              </div>
              {error && <p className="text-red-400 mt-4 bg-black/40 p-2 rounded">{error}</p>}
            </div>
          </div>
        )}

        {showPlayer && signallingUrl && (
          <div className="absolute inset-0 z-30">
            <SelkiesPlayer
              signallingUrl={signallingUrl}
              onClose={() => setShowPlayer(false)}
              onError={(msg) => setError(msg)}
            />
          </div>
        )}
      </>
    </div>
  );
};

export default PlayPage;
