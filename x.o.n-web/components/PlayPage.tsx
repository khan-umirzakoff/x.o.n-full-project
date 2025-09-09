import React from 'react';

const PlayPage: React.FC = () => {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <iframe
        src="http://localhost:8080"
        title="Selkies Stream"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        allow="fullscreen; gamepad; microphone; camera"
      />
    </div>
  );
};

export default PlayPage;
