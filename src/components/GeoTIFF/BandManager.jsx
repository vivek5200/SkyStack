import React from 'react';
import { FaImage, FaEye, FaEyeSlash } from 'react-icons/fa';
import BandCard from './BandCard';

const BandManager = ({
  tiffLayers,
  getUniqueFiles,
  switchBand,
  toggleLayerVisibility,
  updateLayerOpacity,
  removeLayer,
  removeAllBands,
  colorMap
}) => {
  if (tiffLayers.length === 0) return null;

  return (
    <div className="space-y-4">
      {getUniqueFiles().map((file, fileIndex) => (
        <div key={file.fileName} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FaImage className="text-gray-400" /> {/* CHANGE: Icon color */}
              <span className="text-sm font-medium text-gray-200 truncate max-w-[200px]"> {/* CHANGE: Text color */}
                {file.fileName}
              </span>
              <span className="text-xs bg-blue-900/20 text-blue-400 px-2 py-1 rounded"> {/* CHANGE: Darkened badge color */}
                {file.bands.length} band{file.bands.length > 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => removeAllBands(file.fileName)}
              className="text-xs px-2 py-1 bg-red-900/20 text-red-400 rounded hover:bg-red-900/40 transition-colors" // CHANGE: Darkened red button
            >
              Remove All
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {file.bands.map((band) => (
              <BandCard
                key={band.id}
                band={band}
                switchBand={switchBand}
                toggleLayerVisibility={toggleLayerVisibility}
                updateLayerOpacity={updateLayerOpacity}
                removeLayer={removeLayer}
                colorMap={colorMap}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BandManager;