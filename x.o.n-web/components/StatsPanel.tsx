import React, { useState } from 'react';

interface StatsPanelProps {
  stats: any;
  connectionStatus: string;
  videoBitrate: number;
  setVideoBitrate: (value: number) => void;
  audioBitrate: number;
  setAudioBitrate: (value: number) => void;
  framerate: number;
  setFramerate: (value: number) => void;
  selectedResolution: string;
  setSelectedResolution: (value: string) => void;
  clipboardStatus: 'enabled' | 'disabled' | 'prompt';
  enableClipboard: () => void;
}

const StatRow: React.FC<{ label: string; value: any }> = ({ label, value }) => (
  <div className="flex justify-between items-center text-sm mb-1">
    <span className="font-semibold text-gray-400">{label}:</span>
    <span className="font-mono text-indigo-300">{value}</span>
  </div>
);

const QualityControlSlider: React.FC<{
  label: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
}> = ({ label, value, onChange, min, max, step, unit }) => (
  <div className="my-4">
    <label className="block text-sm font-semibold text-gray-400 mb-1">{label}</label>
    <div className="flex items-center space-x-2">
        <input type="range" min={min} max={max} step={step} value={value} onChange={onChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"/>
        <span className="text-xs font-mono text-indigo-300 w-24 text-right">{`${(value / 1000).toFixed(1)} ${unit}`}</span>
    </div>
  </div>
);

// --- Constants for Controls ---
const framerateOptions = [
    { value: 30, label: '30 fps' }, { value: 45, label: '45 fps' }, { value: 60, label: '60 fps' },
    { value: 75, label: '75 fps' }, { value: 90, label: '90 fps' }, { value: 120, label: '120 fps' },
    { value: 144, label: '144 fps' }, { value: 165, label: '165 fps' }, { value: 200, label: '200 fps' },
    { value: 240, label: '240 fps' },
];

const resolutionOptions = [
    { value: 'auto', label: 'Auto (Native)' }, { value: '3840x2160', label: '4K (2160p)' },
    { value: '2560x1440', label: '1440p' }, { value: '1920x1080', label: '1080p' },
    { value: '1280x720', label: '720p' },
];


const StatsPanel: React.FC<StatsPanelProps> = ({ stats, connectionStatus, videoBitrate, setVideoBitrate, audioBitrate, setAudioBitrate, framerate, setFramerate, selectedResolution, setSelectedResolution, clipboardStatus, enableClipboard }) => {
  const [isOpen, setIsOpen] = useState(false);
  const screenHeight = window.screen.height;

  const { general, video, audio } = stats;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-1/2 -translate-y-1/2 bg-gray-800/80 text-white p-2 rounded-l-lg z-50 transition-all duration-300 ease-in-out hover:bg-gray-700"
        style={{ right: isOpen ? '300px' : '0' }}
        aria-label="Toggle stats panel"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transition-transform duration-300" style={{ transform: isOpen ? 'rotate(180deg)' : '' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div
        className="absolute top-0 right-0 h-full w-[300px] bg-gray-900/90 backdrop-blur-sm text-white p-4 z-40 transition-transform duration-300 ease-in-out flex flex-col"
        style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <h2 className="text-xl font-bold mb-4 border-b border-gray-600 pb-2">Controls & Stats</h2>
        <div className="flex-grow overflow-y-auto pr-2">
            <h3 className="text-lg font-semibold text-gray-300 mt-2 mb-2">Controls</h3>
            <QualityControlSlider label="Video Bitrate" value={videoBitrate} onChange={(e) => setVideoBitrate(parseInt(e.target.value, 10))} min={1000} max={20000} step={1000} unit="Mbps"/>
            <QualityControlSlider label="Audio Bitrate" value={audioBitrate} onChange={(e) => setAudioBitrate(parseInt(e.target.value, 10))} min={32000} max={320000} step={32000} unit="Kbps"/>

            <div className="my-4">
                <label htmlFor="framerate-select" className="block text-sm font-semibold text-gray-400 mb-1">Framerate</label>
                <select id="framerate-select" value={framerate} onChange={(e) => setFramerate(parseInt(e.target.value, 10))} className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {framerateOptions.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </select>
            </div>

            <div className="my-4">
                <label htmlFor="resolution-select" className="block text-sm font-semibold text-gray-400 mb-1">Resolution</label>
                <select id="resolution-select" value={selectedResolution} onChange={(e) => setSelectedResolution(e.target.value)} className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {resolutionOptions.map(opt => {
                        const height = opt.value === 'auto' ? screenHeight : parseInt(opt.value.split('x')[1], 10);
                        const isDisabled = height > screenHeight;
                        return (
                            <option key={opt.value} value={opt.value} disabled={isDisabled} title={isDisabled ? `Your monitor does not support resolutions above ${screenHeight}p` : ''}>
                                {opt.label}
                            </option>
                        );
                    })}
                </select>
            </div>

            <div className="my-4">
                <label className="block text-sm font-semibold text-gray-400 mb-1">Clipboard</label>
                {clipboardStatus === 'enabled' ? (<p className="text-sm text-green-400">Clipboard enabled.</p>) : (
                    <button onClick={enableClipboard} className="w-full px-4 py-2 rounded bg-indigo-600/50 hover:bg-indigo-600/80 transition-colors">
                        Enable Clipboard
                    </button>
                )}
            </div>

            <h3 className="text-lg font-semibold text-gray-300 mt-4 mb-2">Stats</h3>
            <div className="mb-4">
                <p className="text-sm flex items-center">
                    <span className="font-semibold text-gray-400 mr-2">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${connectionStatus === 'connected' ? 'bg-green-500/30 text-green-300' : 'bg-yellow-500/30 text-yellow-300'}`}>
                        {connectionStatus}
                    </span>
                </p>
            </div>
            {general && video ? (
            <>
                <h4 className="text-md font-semibold text-gray-300 mt-2 mb-2">Connection</h4>
                <StatRow label="Round Trip" value={`${(general.currentRoundTripTime * 1000).toFixed(0)} ms`} />
                <StatRow label="Packets Lost" value={general.packetsLost} />
                <StatRow label="Connection Type" value={general.connectionType} />

                <h4 className="text-md font-semibold text-gray-300 mt-4 mb-2">Video</h4>
                <StatRow label="Resolution" value={`${video.frameWidth}x${video.frameHeight}`} />
                <StatRow label="Framerate" value={`${video.framesPerSecond} fps`} />
                <StatRow label="Bitrate" value={`${(video.bytesReceived * 8 / 1000000).toFixed(2)} Mbps`} />
                <StatRow label="Jitter" value={`${(video.jitter * 1000).toFixed(2)} ms`} />
                <StatRow label="Codec" value={video.codecName} />

                {audio && (
                    <>
                        <h4 className="text-md font-semibold text-gray-300 mt-4 mb-2">Audio</h4>
                        <StatRow label="Bitrate" value={`${(audio.bytesReceived * 8 / 1000).toFixed(2)} Kbps`} />
                        <StatRow label="Jitter" value={`${(audio.jitter * 1000).toFixed(2)} ms`} />
                        <StatRow label="Codec" value={audio.codecName} />
                    </>
                )}
            </>
            ) : (
            <p className="text-gray-400">Waiting for stats...</p>
            )}
        </div>
      </div>
    </>
  );
};

export default StatsPanel;
