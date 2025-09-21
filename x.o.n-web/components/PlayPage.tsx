import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStreaming } from '../hooks/useStreaming';
import LoadingOverlay from './LoadingOverlay';
import StatsPanel from './StatsPanel';
import SettingsPanel from './SettingsPanel';
import ExitFullscreenPrompt from './ExitFullscreenPrompt';

const PlayPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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

      {isStreamPlaying && (
        <>
            <button
                onClick={() => setIsSettingsOpen(true)}
                className="absolute top-1/2 -translate-y-1/2 left-0 bg-gray-800/80 text-white p-2 rounded-r-lg z-30 transition-all duration-300 ease-in-out hover:bg-gray-700"
                aria-label="Open settings"
            >
                {/* Icon for Settings */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
            <SettingsPanel
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                resizeRemote={resizeRemote}
                onResizeRemoteChange={setResizeRemote}
                scaleLocal={scaleLocal}
                onScaleLocalChange={setScaleLocal}
            />
            <StatsPanel
              stats={streamingStats}
              connectionStatus={connectionStatus}
              gpuStats={serverGpuStats}
              cpuStats={serverCpuStats}
            />
        </>
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
