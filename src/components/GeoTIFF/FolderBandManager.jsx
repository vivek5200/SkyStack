// src/components/GeoTIFF/FolderBandManager.jsx - SIMPLER VERSION
import React, { useRef, useEffect } from 'react';
import FolderStructure from './FolderStructure';

const FolderBandManager = ({ 
  sceneData, 
  selectedBands, 
  tiffLayers,
  onBandSelect, 
  onBandRemove, 
  onOperation,
  onToggleVisibility,
  onUpdateOpacity,
  onRemoveLayer,
  colorMap
}) => {
  const containerRef = useRef(null);
  const scrollPositionRef = useRef(0);

  // Capture scroll position before re-render
  useEffect(() => {
    if (containerRef.current) {
      scrollPositionRef.current = containerRef.current.scrollTop;
    }
  });

  // Restore scroll position after re-render
  useEffect(() => {
    if (containerRef.current && scrollPositionRef.current > 0) {
      const timer = setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = scrollPositionRef.current;
        }
      }, 10);
      return () => clearTimeout(timer);
    }
  });

  return (
    <div 
      ref={containerRef}
      className="band-manager h-full overflow-y-auto" // Make entire container scrollable
    >
      {/* Folder Structure */}
      <div className="mb-4">
        <FolderStructure
          sceneData={sceneData}
          selectedBands={selectedBands}
          onBandSelect={onBandSelect}
        />
      </div>

      {/* Selected Bands */}
      <div className="border-t border-gray-700 pt-4">
        <h3 className="font-semibold text-lg mb-3 text-blue-400">Selected Bands ({selectedBands.filter(band => band.category === 'image_bands').length})</h3>
        
        {selectedBands.filter(band => band.category === 'image_bands').length === 0 ? (
          <p className="text-gray-500 text-center py-4 text-sm">
            No image bands selected. Select bands from the Image Bands section above.
          </p>
        ) : (
          <div className="space-y-2 mb-4">
            {selectedBands
              .filter(band => band.category === 'image_bands')
              .map((band) => (
              <div key={band.id} className="flex items-center justify-between p-3 bg-blue-900/20 rounded-lg border border-blue-700/50">
                <span className="text-sm font-medium text-blue-400">{band.name}</span>
                <button
                  onClick={() => onBandRemove(band.id)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(FolderBandManager);