import React from 'react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  resizeRemote: boolean;
  onResizeRemoteChange: (value: boolean) => void;
  scaleLocal: boolean;
  onScaleLocalChange: (value: boolean) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  resizeRemote,
  onResizeRemoteChange,
  scaleLocal,
  onScaleLocalChange,
}) => {
  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/30 z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-gray-800 text-white p-6 z-50 shadow-lg transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-gray-300">Resize remote to fit window</span>
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={resizeRemote}
                  onChange={(e) => onResizeRemoteChange(e.target.checked)}
                />
                <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
                <div
                  className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
                    resizeRemote ? 'translate-x-6' : ''
                  }`}
                ></div>
              </div>
            </label>
          </div>
          <div>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-gray-300">Scale to fit window</span>
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={scaleLocal}
                  onChange={(e) => onScaleLocalChange(e.target.checked)}
                />
                <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
                <div
                  className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
                    scaleLocal ? 'translate-x-6' : ''
                  }`}
                ></div>
              </div>
            </label>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPanel;
