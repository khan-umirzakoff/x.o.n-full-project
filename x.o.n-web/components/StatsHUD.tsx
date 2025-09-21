import React from 'react';

interface StatsHUDProps {
  stats: any;
  gpuStats: any;
  cpuStats: any;
}

const HUDStat: React.FC<{ label: string; value: string | number; className?: string }> = ({ label, value, className }) => (
    <div className={`flex justify-between items-center ${className}`}>
        <span className="text-gray-400 font-semibold">{label}</span>
        <span className="font-mono text-white">{value}</span>
    </div>
);

const Section: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-2 last:mb-0">
        <h4 className="font-bold text-gray-200 border-b border-gray-600/50 mb-1">{title}</h4>
        <div className="space-y-0.5">{children}</div>
    </div>
);

const StatsHUD: React.FC<StatsHUDProps> = ({ stats, gpuStats, cpuStats }) => {
    const { general = {}, video = {}, audio = {} } = stats || {};

    // Video Stats
    const fps = video?.framesPerSecond ?? '...';
    const resolution = video?.frameWidth ? `${video.frameWidth}x${video.frameHeight}` : '...';
    const videoBitrate = video?.bitrate ? `${video.bitrate.toFixed(1)} Mbps` : '...';
    const jitter = video?.jitter ? `${(video.jitter * 1000).toFixed(2)}ms` : '...';
    const decoder = video?.decoder ?? '...';

    // Audio Stats
    const audioBitrate = audio?.bitrate ? `${audio.bitrate.toFixed(1)} Kbps` : '...';
    const audioCodec = audio?.codecName ?? '...';

    // Connection Stats
    const latency = video?.latency ? `${video.latency.toFixed(0)}ms` : '...';
    const packetsLost = general?.packetsLost ?? '...';
    const connectionType = general?.connectionType ?? '...';
    const bandwidth = general?.availableReceiveBandwidth ? `${(general.availableReceiveBandwidth / 1e6).toFixed(2)} Mbps` : '...';
    const bytesReceived = general?.bytesReceived ? `${(general.bytesReceived / 1e6).toFixed(2)} MB` : '...';
    const bytesSent = general?.bytesSent ? `${(general.bytesSent / 1e6).toFixed(2)} MB` : '...';


    // Server Stats
    const gpuLoad = gpuStats?.load ? `${(gpuStats.load * 100).toFixed(0)}%` : '...';
    const gpuMem = gpuStats?.memory_used ? `${(gpuStats.memory_used / 1024).toFixed(2)} GB` : '...';
    const cpuLoad = cpuStats?.cpu_percent ? `${cpuStats.cpu_percent.toFixed(0)}%` : '...';
    const cpuMem = cpuStats?.mem_used ? `${(cpuStats.mem_used / 1024 / 1024 / 1024).toFixed(2)} GB` : '...';

    return (
        <div className="absolute top-4 right-4 bg-black/60 text-white p-3 rounded-lg text-xs z-40 pointer-events-none backdrop-blur-sm w-64">
            <Section title="Video">
                <HUDStat label="FPS" value={fps} />
                <HUDStat label="Resolution" value={resolution} />
                <HUDStat label="Bitrate" value={videoBitrate} />
                <HUDStat label="Jitter" value={jitter} />
                <HUDStat label="Decoder" value={decoder} />
            </Section>
            <Section title="Audio">
                <HUDStat label="Bitrate" value={audioBitrate} />
                <HUDStat label="Codec" value={audioCodec} />
            </Section>
            <Section title="Connection">
                <HUDStat label="Latency" value={latency} />
                <HUDStat label="Packet Loss" value={packetsLost} />
                <HUDStat label="Avail. Bandwidth" value={bandwidth} />
                <HUDStat label="Data Received" value={bytesReceived} />
                <HUDStat label="Connection" value={connectionType} />
            </Section>
            <Section title="Server">
                <HUDStat label="CPU" value={cpuLoad} />
                <HUDStat label="GPU" value={gpuLoad} />
                <HUDStat label="GPU Memory" value={gpuMem} />
            </Section>
        </div>
    );
};

export default StatsHUD;
