import React from 'react';

interface FPSCounterProps {
  fps: number;
}

const FPSCounter: React.FC<FPSCounterProps> = ({ fps }) => {
  return (
    <div className="absolute top-2 left-2 text-green-400 font-mono text-lg z-40 pointer-events-none">
      {`${fps} FPS`}
    </div>
  );
};

export default FPSCounter;
