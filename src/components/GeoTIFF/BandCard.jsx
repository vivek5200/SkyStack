import React from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const BandCard = ({
  band,
  switchBand,
  toggleLayerVisibility,
  updateLayerOpacity,
  removeLayer,
  colorMap
}) => {
  return (
    <div className="bg-gray-900 p-3 rounded border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-300">{band.name}</span>
          {band.visible && (
            <span className="text-xs bg-green-900/20 text-green-400 px-2 py-1 rounded">
              Active
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => switchBand(band.bandIndex, band.fileName)}
            className={`text-xs px-3 py-1 rounded transition-colors ${band.visible
                // CHANGE: Darkened active button
                ? 'bg-blue-900/20 text-blue-400 border border-blue-700/50'
                // CHANGE: Darkened view button
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
          >
            {band.visible ? 'Active' : 'View'}
          </button>
          <button
            onClick={() => toggleLayerVisibility(band.id)}
            className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 transition-colors"
          >
            {band.visible ? <FaEye size={10} /> : <FaEyeSlash size={10} />}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Opacity</span>
            <span className="text-gray-400">{Math.round(band.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={band.opacity * 100}
            onChange={(e) => updateLayerOpacity(band.id, e.target.value / 100)}
            className="w-full h-2 bg-gray-700 rounded appearance-none cursor-pointer"
            disabled={!band.visible}
          />
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>Dimensions:</span>
            <span>{band.metadata.width} × {band.metadata.height}</span>
          </div>
          <div className="flex justify-between">
            <span>Value Range:</span>
            <span>{band.metadata.minValue.toFixed(2)} - {band.metadata.maxValue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Color Map:</span>
            <span className="capitalize">{colorMap}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BandCard;