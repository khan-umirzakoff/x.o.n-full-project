import { useLocalStorage } from './useLocalStorage';

export interface StreamingSettings {
  videoBitrate: number;
  framerate: number;
  selectedResolution: string;
  audioBitrate: number;
}

const defaultSettings: StreamingSettings = {
  videoBitrate: 8000,
  framerate: 60,
  selectedResolution: 'auto',
  audioBitrate: 128000,
};

export const useSettings = () => {
  const [videoBitrate, setVideoBitrate] = useLocalStorage('settings_videoBitrate', defaultSettings.videoBitrate);
  const [framerate, setFramerate] = useLocalStorage('settings_framerate', defaultSettings.framerate);
  const [selectedResolution, setSelectedResolution] = useLocalStorage('settings_selectedResolution', defaultSettings.selectedResolution);
  const [audioBitrate, setAudioBitrate] = useLocalStorage('settings_audioBitrate', defaultSettings.audioBitrate);

  const settings: StreamingSettings = {
    videoBitrate,
    framerate,
    selectedResolution,
    audioBitrate,
  };

  const setSettings = {
    setVideoBitrate,
    setFramerate,
    setSelectedResolution,
    setAudioBitrate,
  };

  return { settings, setSettings };
};
