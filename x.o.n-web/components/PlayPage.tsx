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

  const containerRef = useRef<HTMLDivElement>(null);

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
    const instanceIp = import.meta.env.VITE_INSTANCE_IP;
    const agentPort = import.meta.env.VITE_AGENT_PORT || '5001';
    const streamPort = import.meta.env.VITE_STREAM_PORT || '8080';
    const streamPath = import.meta.env.VITE_STREAM_PATH_AND_QUERY || '/?ui=none';

    if (!instanceIp || instanceIp.includes("YOUR_INSTANCE_IP_HERE")) {
      setError("Xatolik: Instance IP manzili .env faylida ko'rsatilmagan. .env.example fayliga qarang.");
      return;
    }

    // Alohida URL yechimi - yangi oynada ochish
    const agentUrl = `http://${instanceIp}:${agentPort}/launch`;
    const newStreamUrl = `http://${instanceIp}:${streamPort}${streamPath}`;

    // Send command to agent first
    fetch(agentUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: gameId }),
    }).then(response => {
      if (!response.ok) {
        response.json().then(errorData => {
          setError(`Agentga buyruq yuborishda xatolik: ${errorData.message || 'Noma\'lum xato'}`);
        }).catch(() => {
          setError('Agentga buyruq yuborishda xatolik: Javobni o\'qib bo\'lmadi.');
        });
      } else {
        console.log('Launch command sent successfully.');
        
        // Open streaming URL in new window/tab
        const streamWindow = window.open(newStreamUrl, '_blank', 'fullscreen=yes,scrollbars=no,resizable=no');
        
        if (streamWindow) {
          // Go back to previous page after opening stream
          setTimeout(() => {
            navigate(-1);
          }, 1000);
        } else {
          setError('Popup blocker tomonidan to\'sildi. Iltimos, popup\'larga ruxsat bering va qayta urinib ko\'ring.');
        }
      }
    }).catch(err => {
      setError(`Agent bilan bog'lanishda xatolik: ${err.message}`);
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
        backgroundImage: `url(${backgroundImage})`,
        backgroundColor: 'black'
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
          <p className="text-white/70 mt-4 text-sm">
            O'yin yangi oynada ochiladi. Popup'larga ruxsat berilganligiga ishonch hosil qiling.
          </p>
        </div>
      </>
    </div>
  );
};

export default PlayPage;
