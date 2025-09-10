import React, { useState, useEffect } from 'react';
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
  // This state is to prevent double-clicking the button
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(true);

    const instanceIp = import.meta.env.VITE_INSTANCE_IP;
    const streamUrl = import.meta.env.VITE_STREAM_URL;

    if (!instanceIp || instanceIp.includes("YOUR_INSTANCE_IP_HERE")) {
      setError("Xatolik: Instance IP manzili .env faylida ko'rsatilmagan. .env.example fayliga qarang.");
      setIsSubmitting(false);
      return;
    }

    if (!streamUrl || streamUrl.includes("your_token_here")) {
      setError("Xatolik: To'liq stream URL manzili (token bilan) .env faylida ko'rsatilmagan.");
      setIsSubmitting(false);
      return;
    }

    const agentUrl = `http://${instanceIp}:5001/launch`;

    try {
      const response = await fetch(agentUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ app_id: gameId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Agentdan xatolik keldi.');
      }

      console.log('Launch command sent successfully. Redirecting...');
      // On success, redirect the browser to the stream URL.
      window.location.href = streamUrl;

    } catch (err: any) {
      console.error('Error launching game:', err);
      setError(`Instance bilan bog'lanib bo'lmadi. Ishlayotganiga ishonch hosil qiling. Xato: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-black text-white">
        Loading...
      </div>
    );
  }

  return (
    <div
      className="w-screen h-screen bg-cover bg-center flex items-center justify-center"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundColor: 'black'
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 text-center">
        <h1 className="text-5xl font-bold text-white mb-8 drop-shadow-lg">{game?.title}</h1>
        <button
          onClick={handleStart}
          className="bg-theme-gradient text-white font-bold text-2xl rounded-lg px-12 py-6 hover-glow transition-all shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Boshlanmoqda...' : 'Boshlash'}
        </button>
        {error && (
          <p className="text-red-500 mt-4 bg-black/50 p-2 rounded">{error}</p>
        )}
      </div>
    </div>
  );
};

export default PlayPage;
