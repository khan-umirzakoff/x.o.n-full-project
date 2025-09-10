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
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const instructionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleFullscreenChange = useCallback(() => {
    const isFullscreen = document.fullscreenElement !== null;
    if (!isFullscreen && isStarted) {
      // Cleanup instruction timeout on exit
      if (instructionTimeoutRef.current) {
        clearTimeout(instructionTimeoutRef.current);
      }
      navigate(-1);
    }
  }, [navigate, isStarted]);

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Cleanup the event listener and any pending timeouts when the component unmounts
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (instructionTimeoutRef.current) {
        clearTimeout(instructionTimeoutRef.current);
      }
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

  const handleStart = async () => {
    setError(null);

    // TODO: Replace with the actual IP address of your game instance.
    // This could be passed via URL params or a config file in a real application.
    const agentUrl = 'http://127.0.0.1:5001/launch';

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
        throw new Error(errorData.message || 'Failed to launch game.');
      }

      console.log('Launch command sent successfully.');

      // Proceed with fullscreen and starting the iframe
      if (containerRef.current) {
        containerRef.current.requestFullscreen().then(() => {
          setIsStarted(true);
          setShowInstructions(true);
          // Hide instructions after 3 seconds
          instructionTimeoutRef.current = setTimeout(() => {
            setShowInstructions(false);
          }, 3000);
        }).catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
          setError(`Could not enter fullscreen. Please check browser permissions. Error: ${err.message}`);
          setIsStarted(true); // Still show the iframe even if fullscreen fails
        });
      }

    } catch (err: any) {
      console.error('Error launching game:', err);
      setError(`Failed to connect to the game instance. Is it running? Error: ${err.message}`);
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
              disabled={isLoading}
            >
              Boshlash
            </button>
            {error && (
              <p className="text-red-500 mt-4 bg-black/50 p-2 rounded">{error}</p>
            )}
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
