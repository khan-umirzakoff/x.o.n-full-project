import React, { useState } from 'react';
import { useSettings } from '../hooks/useSettings';

type SettingsCategory = 'account' | 'gameplay' | 'connection';

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

const audioBitrateOptions = [
    { value: 64000, label: '64 Kbps' }, { value: 96000, label: '96 Kbps' }, { value: 128000, label: '128 Kbps' },
    { value: 192000, label: '192 Kbps' }, { value: 256000, label: '256 Kbps' }, { value: 320000, label: '320 Kbps' },
];

interface ToggleProps {
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

const ToggleSwitch: React.FC<ToggleProps> = ({ label, description, checked, onChange }) => (
    <div>
        <label className="flex items-center justify-between cursor-pointer">
            <div>
                <span className="block text-md font-semibold text-gray-300">{label}</span>
                <span className="block text-sm text-gray-500">{description}</span>
            </div>
            <div className="relative">
                <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
                <div
                    className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
                        checked ? 'translate-x-6' : ''
                    }`}
                ></div>
            </div>
        </label>
    </div>
);

const SettingsPage: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState<SettingsCategory>('gameplay');
    const { settings, setSettings } = useSettings();
    const screenHeight = window.screen.height;

    const renderCategoryContent = () => {
        switch (activeCategory) {
            case 'gameplay':
                return (
                    <div className="space-y-8">
                        <section>
                            <h3 className="text-xl font-semibold text-gray-300 mb-4">Streaming Quality</h3>
                            <div className="space-y-6">
                                <div>
                                    <label htmlFor="resolution-select" className="block text-sm font-semibold text-gray-400 mb-1">Resolution</label>
                                    <select id="resolution-select" value={settings.selectedResolution} onChange={(e) => setSettings.setSelectedResolution(e.target.value)} className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
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
                                <div>
                                    <label htmlFor="framerate-select" className="block text-sm font-semibold text-gray-400 mb-1">Framerate</label>
                                    <select id="framerate-select" value={settings.framerate} onChange={(e) => setSettings.setFramerate(parseInt(e.target.value, 10))} className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                        {framerateOptions.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="video-bitrate-select" className="block text-sm font-semibold text-gray-400 mb-1">Video Bitrate (Mbps)</label>
                                    <input type="range" min="1000" max="20000" step="1000" value={settings.videoBitrate} onChange={(e) => setSettings.setVideoBitrate(parseInt(e.target.value, 10))} className="w-full"/>
                                    <span className="text-sm text-gray-400">{(settings.videoBitrate / 1000).toFixed(1)} Mbps</span>
                                </div>
                                <div>
                                    <label htmlFor="audio-bitrate-select" className="block text-sm font-semibold text-gray-400 mb-1">Audio Bitrate (Kbps)</label>
                                    <select id="audio-bitrate-select" value={settings.audioBitrate} onChange={(e) => setSettings.setAudioBitrate(parseInt(e.target.value, 10))} className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                        {audioBitrateOptions.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                                    </select>
                                </div>
                            </div>
                        </section>
                        <section>
                            <h3 className="text-xl font-semibold text-gray-300 mb-4">Display</h3>
                            <div className="space-y-6">
                                <ToggleSwitch
                                    label="Resize remote to fit window"
                                    description="Match the server's resolution to your window size. Disabling this may improve performance."
                                    checked={settings.resizeRemote}
                                    onChange={setSettings.setResizeRemote}
                                />
                                <ToggleSwitch
                                    label="Scale to fit window"
                                    description="Stretch the video to fit your window. Best used when 'Resize remote' is off."
                                    checked={settings.scaleLocal}
                                    onChange={setSettings.setScaleLocal}
                                />
                                <ToggleSwitch
                                    label="Show In-Game Stats"
                                    description="Display a small stats overlay during gameplay."
                                    checked={settings.showStatsOverlay}
                                    onChange={setSettings.setShowStatsOverlay}
                                />
                                <ToggleSwitch
                                    label="Show FPS Counter"
                                    description="Display a simple FPS counter in the corner."
                                    checked={settings.showFPS}
                                    onChange={setSettings.setShowFPS}
                                />
                            </div>
                        </section>
                    </div>
                );
            case 'account':
                return <div><h3 className="text-xl font-semibold text-gray-300">Account</h3><p className="text-gray-400 mt-2">Account management features will be here.</p></div>;
            case 'connection':
                return <div><h3 className="text-xl font-semibold text-gray-300">Connection</h3><p className="text-gray-400 mt-2">Connection and network settings will be here.</p></div>;
            default:
                return null;
        }
    };

    const NavItem: React.FC<{ category: SettingsCategory; label: string }> = ({ category, label }) => (
        <li>
            <button
                onClick={() => setActiveCategory(category)}
                className={`w-full text-left px-4 py-3 rounded-md transition-colors text-lg ${activeCategory === category ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700/50'}`}
            >
                {label}
            </button>
        </li>
    );

    return (
        <div className="container mx-auto px-4 py-8 text-white">
            <h1 className="text-4xl font-bold mb-8">Settings</h1>
            <div className="flex flex-col md:flex-row gap-8">
                <aside className="w-full md:w-1/4">
                    <ul className="space-y-2">
                        <NavItem category="gameplay" label="Gameplay & Streaming" />
                        <NavItem category="account" label="Account" />
                        <NavItem category="connection" label="Connection" />
                    </ul>
                </aside>
                <main className="flex-1 bg-gray-800/50 p-6 rounded-lg">
                    {renderCategoryContent()}
                </main>
            </div>
        </div>
    );
};

export default SettingsPage;
