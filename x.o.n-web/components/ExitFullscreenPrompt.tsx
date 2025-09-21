import React from 'react';

interface ExitFullscreenPromptProps {
  onReturn: () => void;
  onQuit: () => void;
}

const ExitFullscreenPrompt: React.FC<ExitFullscreenPromptProps> = ({ onReturn, onQuit }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl text-center animate-fade-in">
        <h2 className="text-2xl font-bold text-white mb-4">You have exited fullscreen</h2>
        <p className="text-gray-300 mb-6">Do you want to return to the game or quit the session?</p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={onQuit}
            className="px-6 py-3 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-700 transition-colors"
          >
            Quit
          </button>
          <button
            onClick={onReturn}
            className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
          >
            Return to Fullscreen
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExitFullscreenPrompt;
