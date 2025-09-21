import React from 'react';

interface LoadingOverlayProps {
  status: string;
  onGoClick: () => void;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ status, onGoClick }) => {
  const isConnected = status === 'connected';

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 transition-opacity duration-500">
      {isConnected ? (
        <div className="text-center animate-fade-in">
          <button
            onClick={onGoClick}
            className="bg-theme-gradient text-white font-bold text-4xl rounded-full w-40 h-40 flex items-center justify-center hover-glow transition-all shadow-lg transform hover:scale-110"
          >
            GO
          </button>
        </div>
      ) : (
        <div className="text-center animate-fade-in">
          <div className="loading-progress-full" />
          <h2 className="text-white text-3xl font-semibold mt-8 mb-4 drop-shadow">
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </h2>
          <p className="text-white/80">O'yin muhiti tayyorlanmoqda, iltimos kuting...</p>
        </div>
      )}
    </div>
  );
};

// We need a new loading animation and fade-in animation in index.css
// I will add a placeholder for now and add the real CSS later.
/*
in index.css:

@keyframes loading-bar-full {
  0% { width: 0%; }
  100% { width: 100%; }
}
.loading-progress-full {
  position: absolute;
  top: 0;
  left: 0;
  height: 4px;
  background: linear-gradient(90deg, #3b82f6, #a855f7);
  animation: loading-bar-full 15s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes fade-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
.animate-fade-in {
  animation: fade-in 0.5s ease-out forwards;
}

*/

export default LoadingOverlay;
