import React from 'react';

const BasemapTab = ({ currentBasemap, changeBasemap, basemaps }) => {
  const basemapConfig = [
    // Main basemaps
    { id: 'osm', name: 'Street Map', description: 'OpenStreetMap', thumbnail: 'https://tile.openstreetmap.org/5/16/10.png' },
    { id: 'satellite', name: 'Satellite Imagery', description: 'Satellite Imagery', thumbnail: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/5/10/16' },
    { id: 'googleSatellite', name: 'Satellite', description: 'Google Satellite', thumbnail: 'https://mt1.google.com/vt/lyrs=s&x=16&y=10&z=5' },
    { id: 'googleHybrid', name: 'Satellite with Labels', description: 'Google Hybrid', thumbnail: 'https://mt1.google.com/vt/lyrs=y&x=16&y=10&z=5' },
    { id: 'googleStreets', name: 'Street Map', description: 'Google Streets', thumbnail: 'https://mt1.google.com/vt/lyrs=m&x=16&y=10&z=5' },
    
    // Esri basemaps with section header
    { id: 'esri-header', name: 'Esri', description: '', thumbnail: '', isHeader: true },
    { id: 'esriSatellite', name: 'GSat', description: 'Esri Satellite', thumbnail: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/5/10/16', isEsri: true },
    { id: 'esriStreets', name: 'GStreets', description: 'Esri Streets', thumbnail: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/5/10/16', isEsri: true }
  ];

  return (
    <div className="space-y-2">
      {basemapConfig.map(basemap => {
        if (basemap.isHeader) {
          return (
            <div key={basemap.id} className="flex items-center p-3">
              <div className="text-sm font-medium text-gray-500">{basemap.name}</div>
            </div>
          );
        }

        return (
          <div 
            key={basemap.id}
            onClick={() => changeBasemap(basemap.id)}
            className={`flex items-center gap-2 p-2 rounded cursor-pointer border ${
              currentBasemap === basemap.id 
                ? 'bg-blue-900/20 border-blue-700/50' // Darkened active style
                : 'border-gray-700 hover:bg-gray-800 shadow-sm' // Darkened border/hover
            } ${basemap.isEsri ? 'ml-4' : ''}`}
          >
            <div className={`${basemap.isEsri ? 'w-12 h-12' : 'w-16 h-16'} rounded border border-gray-600 overflow-hidden`}>
              <img 
                src={basemap.thumbnail} 
                alt={basemap.name} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 pl-2">
              <div className="font-semibold text-gray-200 text-left">{basemap.name}</div>
              <div className="text-sm text-gray-400 text-left">{basemap.description}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BasemapTab;