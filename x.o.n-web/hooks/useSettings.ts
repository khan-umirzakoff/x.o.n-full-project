import { useLocalStorage } from './useLocalStorage';

export interface StreamingSettings {
  videoBitrate: number;
  framerate: number;
  selectedResolution: string;
  audioBitrate: number;
  resizeRemote: boolean;
  scaleLocal: boolean;
  showStatsOverlay: boolean;
  showFPS: boolean;
}

const defaultSettings: StreamingSettings = {
  videoBitrate: 8000,
  framerate: 60,
  selectedResolution: 'auto',
  audioBitrate: 128000,
  resizeRemote: true,
  scaleLocal: false,
  showStatsOverlay: false,
  showFPS: true,
};

export const useSettings = () => {
  const [videoBitrate, setVideoBitrate] = useLocalStorage('settings_videoBitrate', defaultSettings.videoBitrate);
  const [framerate, setFramerate] = useLocalStorage('settings_framerate', defaultSettings.framerate);
  const [selectedResolution, setSelectedResolution] = useLocalStorage('settings_selectedResolution', defaultSettings.selectedResolution);
  const [audioBitrate, setAudioBitrate] = useLocalStorage('settings_audioBitrate', defaultSettings.audioBitrate);
  const [resizeRemote, setResizeRemote] = useLocalStorage('settings_resizeRemote', defaultSettings.resizeRemote);
  const [scaleLocal, setScaleLocal] = useLocalStorage('settings_scaleLocal', defaultSettings.scaleLocal);
  const [showStatsOverlay, setShowStatsOverlay] = useLocalStorage('settings_showStatsOverlay', defaultSettings.showStatsOverlay);
  const [showFPS, setShowFPS] = useLocalStorage('settings_showFPS', defaultSettings.showFPS);

  const settings: StreamingSettings = {
    videoBitrate,
    framerate,
    selectedResolution,
    audioBitrate,
    resizeRemote,
    scaleLocal,
    showStatsOverlay,
    showFPS,
  };

  const setSettings = {
    setVideoBitrate,
    setFramerate,
    setSelectedResolution,
    setAudioBitrate,
    setResizeRemote,
    setScaleLocal,
    setShowStatsOverlay,
    setShowFPS,
  };

  return { settings, setSettings };
};
