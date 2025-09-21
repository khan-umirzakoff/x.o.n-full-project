import React from 'react';

interface StatsHUDProps {
  stats: any;
  gpuStats: any;
  cpuStats: any;
}

const HUDStat: React.FC<{ label: string; value: string | number; className?: string }> = ({ label, value, className }) => (
    <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-gray-400 font-semibold">{label}</span>
        <span className="font-mono text-white">{value}</span>
    </div>
);

const StatsHUD: React.FC<StatsHUDProps> = ({ stats, gpuStats, cpuStats }) => {
    // Destructure with default empty objects to prevent errors if stats are not yet populated
    const { general = {}, video = {} } = stats || {};

    // Use optional chaining and provide default values for each stat
    const rtt = general?.currentRoundTripTime ? `${(general.currentRoundTripTime * 1000).toFixed(0)}ms` : '...';
    const fps = video?.framesPerSecond ?? '...';
    const bitrate = video?.bytesReceived ? `${(video.bytesReceived * 8 / 1000000).toFixed(1)}` : '...';
    const packetsLost = general?.packetsLost ?? '...';
    const gpuLoad = gpuStats?.load ? `${(gpuStats.load * 100).toFixed(0)}%` : '...';
    const cpuLoad = cpuStats?.cpu_percent ? `${cpuStats.cpu_percent.toFixed(0)}%` : '...';

    return (
        <div className="absolute top-4 left-4 bg-black/50 text-white p-2 rounded-lg text-xs z-40 pointer-events-none backdrop-blur-sm">
            <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                <HUDStat label="RTT" value={rtt} />
                <HUDStat label="FPS" value={fps} />
                <HUDStat label="Bitrate" value={`${bitrate} Mbps`} />
                <HUDStat label="Packet Loss" value={packetsLost} />
                <HUDStat label="GPU" value={gpuLoad} />
                <HUDStat label="CPU" value={cpuLoad} />
            </div>
        </div>
    );
};

export default StatsHUD;
