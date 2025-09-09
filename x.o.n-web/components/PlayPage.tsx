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
  const [isStarted, setIsStarted] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFullscreenChange = useCallback(() => {
    if (document.fullscreenElement === null) {
      navigate(-1); // Go back to the previous page
    }
  }, [navigate]);

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [handleFullscreenChange]);

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
      } catch (error) {
        console.error('Failed to fetch game data:', error);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGameData();
  }, [gameId, navigate]);

  const handleStart = () => {
    if (containerRef.current) {
      containerRef.current.requestFullscreen().then(() => {
        setIsStarted(true);
        setShowInstructions(true);
        setTimeout(() => setShowInstructions(false), 3000);
      }).catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        setIsStarted(true);
      });
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
          </div>
        </>
      ) : (
        <>
          <iframe
            src="http://localhost:8080?ui=none"
            title="Selkies Stream"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            allow="fullscreen; gamepad; microphone; camera"
          />
          {showInstructions && (
            <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-md transition-opacity duration-500 animate-pulse">
              To'liq ekrandan chiqish uchun ESC tugmasini bosing
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PlayPage;
