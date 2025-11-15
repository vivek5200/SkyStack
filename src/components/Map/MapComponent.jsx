import React from 'react';
import MapControls from './MapControls';
import MapOverlays from './MapOverlays';

const MapComponent = ({
  mapRef,
  currentBasemap,
  basemaps,
  tiffLayers,
  selectedBand,
  colorMap,
  zoomIn,
  zoomOut,
  resetView,
  getUniqueFiles
}) => {
  return (
    <div className="flex-1 relative">
      <div 
        ref={mapRef} 
        className="w-full h-full"
        style={{ 
          width: '100%', 
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
      />
      
      <MapControls
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        resetView={resetView}
      />

      <MapOverlays
        currentBasemap={currentBasemap}
        basemaps={basemaps}
        tiffLayers={tiffLayers}
        selectedBand={selectedBand}
        colorMap={colorMap}
        getUniqueFiles={getUniqueFiles}
      />
    </div>
  );
};

export default MapComponent;