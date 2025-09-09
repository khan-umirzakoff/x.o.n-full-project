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
  const [showInstructions, setShowInstructions] = useState(true); // Show instructions by default when game starts
  const [instructionText, setInstructionText] = useState("To'liq ekrandan chiqish uchun ESC tugmasini bosing");
  const containerRef = useRef<HTMLDivElement>(null);
  const lastExitAttemptRef = useRef(0);
  const instructionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleFullscreenChange = useCallback(() => {
    if (document.fullscreenElement === null && isStarted) {
      const now = Date.now();
      if (now - lastExitAttemptRef.current < 2000) {
        // This is the second press, so exit
        if (instructionTimeoutRef.current) {
          clearTimeout(instructionTimeoutRef.current);
        }
        navigate(-1);
      } else {
        // This is the first press
        lastExitAttemptRef.current = now;
        // Re-enter fullscreen immediately
        containerRef.current?.requestFullscreen().catch(err => {
          console.error(`Error attempting to re-enter full-screen mode: ${err.message} (${err.name})`);
        });

        // Update instruction text
        setInstructionText("Chiqish uchun yana bir marta ESC bosing");
        setShowInstructions(true);

        // Clear any existing timeout
        if (instructionTimeoutRef.current) {
          clearTimeout(instructionTimeoutRef.current);
        }

        // Set a timeout to reset the message
        instructionTimeoutRef.current = setTimeout(() => {
          setInstructionText("To'liq ekrandan chiqish uchun ESC tugmasini bosing");
          // Optionally hide the message again after some time
          // setShowInstructions(false);
        }, 2000);
      }
    }
  }, [navigate, isStarted]);

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
        setShowInstructions(true); // Show instructions when game starts
        // Hide instructions after 3 seconds
        instructionTimeoutRef.current = setTimeout(() => {
          setShowInstructions(false);
        }, 3000);
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
              {instructionText}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PlayPage;
