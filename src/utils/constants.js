import OSM from 'ol/source/OSM.js';
import XYZ from 'ol/source/XYZ.js';

export const basemaps = {
  osm: {
    name: 'Street Map',
    description: 'OpenStreetMap',
    source: new OSM()
  },
  satellite: {
    name: 'Satellite Imagery',
    description: 'Satellite Imagery',
    source: new XYZ({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    })
  },
  googleSatellite: {
    name: 'Satellite',
    description: 'Google Satellite',
    source: new XYZ({
      url: 'http://mt{0-3}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    })
  },
  googleHybrid: {
    name: 'Satellite with Labels',
    description: 'Google Hybrid',
    source: new XYZ({
      url: 'http://mt{0-3}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    })
  },
  googleStreets: {
    name: 'Street Map',
    description: 'Google Streets',
    source: new XYZ({
      url: 'http://mt{0-3}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    })
  },
  esriSatellite: {
    name: 'GSat',
    description: 'Esri',
    source: new XYZ({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    })
  },
  esriHybrid: {
    name: 'Hybrid',
    description: 'Esri',
    source: new XYZ({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    })
  },
  esriStreets: {
    name: 'GStreets',
    description: 'Esri',
    source: new XYZ({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    })
  }
};

export const sidebarTabs = [
  { id: 'info', icon: 'FaInfoCircle', label: 'Information' },
  { id: 'bands', icon: 'FaChartBar', label: 'Available Bands' },
  { id: 'basemap', icon: 'FaMap', label: 'Map Basemap' },
  { id: 'filters', icon: 'FaFilter', label: 'Filters' },
  { id: 'effects', icon: 'FaPalette', label: 'Effects' },
  { id: 'export', icon: 'FaFileExport', label: 'Export Options' }
];