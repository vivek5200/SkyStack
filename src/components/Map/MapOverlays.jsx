import React from 'react';
import { FaImage } from 'react-icons/fa';

const MapOverlays = ({
  currentBasemap,
  basemaps,
  tiffLayers,
  selectedBand,
  colorMap,
  getUniqueFiles
}) => {
  return (
    <>
      {/* Coordinates Display */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white rounded-lg shadow-lg p-3 z-10">
        <div className="text-xs space-y-1">
          <div>Basemap: <span>{basemaps[currentBasemap]?.description}</span></div>
        </div>
      </div>

      {/* Active Band Display */}
      {tiffLayers.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white rounded-lg shadow-lg p-3 z-10">
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2">
              <FaImage size={10} />
              <span>Active Band: {selectedBand + 1}</span>
            </div>
            <div>Color Map: {colorMap}</div>
            <div>Files: {getUniqueFiles().length}</div>
          </div>
        </div>
      )}
    </>
  );
};

export default MapOverlays;