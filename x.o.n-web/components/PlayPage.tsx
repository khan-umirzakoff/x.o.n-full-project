import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStreaming } from '../hooks/useStreaming';
import LoadingOverlay from './LoadingOverlay';
import StatsHUD from './StatsHUD';
import ExitFullscreenPrompt from './ExitFullscreenPrompt';

const PlayPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const {
    backgroundImage,
    isLoading,
    error,
    containerRef,
    videoRef,
    connectionStatus,
    isStreamPlaying,
    streamingStats,
    serverGpuStats,
    serverCpuStats,
    videoBitrate,
    setVideoBitrate,
    framerate,
    setFramerate,
    selectedResolution,
    setSelectedResolution,
    audioBitrate,
    setAudioBitrate,
    resizeRemote,
    setResizeRemote,
    scaleLocal,
    setScaleLocal,
    showStatsOverlay,
    clipboardStatus,
    enableClipboard,
    showExitPrompt,
    setShowExitPrompt,
    handleGoClick,
    handlePointerLock,
    enterFullscreen,
  } = useStreaming({ gameId });

  if (isLoading) {
    return <div className="w-screen h-screen flex items-center justify-center bg-black text-white">Loading Game...</div>;
  }

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen bg-cover bg-center flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundColor: 'black',
      }}
    >
      <div className="absolute inset-0 bg-black/50" />

      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-contain cursor-none"
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

      {isStreamPlaying && showStatsOverlay && (
        <StatsHUD
          stats={streamingStats}
          gpuStats={serverGpuStats}
          cpuStats={serverCpuStats}
        />
      )}

      {showExitPrompt && (
        <ExitFullscreenPrompt
            onReturn={enterFullscreen}
            onQuit={() => navigate(`/game/${gameId}`)}
        />
      )}
    </div>
  );
};

export default PlayPage;
