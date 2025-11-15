import { useState, useEffect, useRef } from 'react';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import { fromLonLat, toLonLat, transformExtent } from 'ol/proj.js'; // Added transformExtent
import OSM from 'ol/source/OSM.js';
import { basemaps } from '../utils/constants';

// OpenLayers imports for drawing interaction 
// FIX: Import createBox alongside Draw
import Draw, { createBox } from 'ol/interaction/Draw.js'; 
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import Style from 'ol/style/Style.js';
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';


export const useMap = () => {
  const mapRef = useRef();
  const mapInstance = useRef(null);
  const basemapLayerRef = useRef(null);
  const drawInteractionRef = useRef(null);
  const vectorSourceRef = useRef(null);
  
  const [currentBasemap, setCurrentBasemap] = useState('osm');
  const [isDrawingBBox, setIsDrawingBBox] = useState(false); // NEW State

  // Initialize map and drawing layer/source
  useEffect(() => {
    if (!mapRef.current) return;

    // Create vector source and layer for drawing
    vectorSourceRef.current = new VectorSource();
    const vectorLayer = new VectorLayer({
        source: vectorSourceRef.current,
        style: new Style({
            stroke: new Stroke({
                color: 'rgba(255, 0, 0, 0.7)',
                width: 3,
            }),
            fill: new Fill({
                color: 'rgba(255, 0, 0, 0.1)',
            }),
        }),
        zIndex: 100 // Ensure it's on top
    });
    vectorLayer.setProperties({ isDrawLayer: true });
    
    // Create initial basemap layer
    basemapLayerRef.current = new TileLayer({
      source: basemaps.osm.source
    });
    basemapLayerRef.current.setProperties({ isBasemap: true, name: 'basemap' });
    
    // Initialize the map
    mapInstance.current = new Map({
      target: mapRef.current,
      layers: [basemapLayerRef.current, vectorLayer], // Add the draw layer
      view: new View({
        center: fromLonLat([78.9629, 20.5937]),
        zoom: 4,
        maxZoom: 18,
        minZoom: 2
      }),
      controls: []
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.setTarget(null);
      }
    };
  }, []);

  const enableBBoxDraw = (onBBoxDrawn) => {
    if (!mapInstance.current || !vectorSourceRef.current) return;

    // 1. Clear existing features (previous BBox)
    vectorSourceRef.current.clear();
    
    // 2. Remove existing interaction if any
    if (drawInteractionRef.current) {
        mapInstance.current.removeInteraction(drawInteractionRef.current);
    }
    
    // 3. Create new Draw interaction for a rectangular BBox
    drawInteractionRef.current = new Draw({
        source: vectorSourceRef.current,
        type: 'Circle',
        geometryFunction: createBox(), // FIX: use the imported createBox function directly
    });

    // 4. Set handler for drawing end
    drawInteractionRef.current.on('drawend', (event) => {
        const feature = event.feature;
        const geometry = feature.getGeometry();
        
        // Calculate BBox in EPSG:4326 (WGS84) for TiTiler
        const extent3857 = geometry.getExtent();
        // Convert extent from Web Mercator (3857) to WGS84 (4326)
        const extent4326 = transformExtent(extent3857, 'EPSG:3857', 'EPSG:4326');
        
        // Format: [minx, miny, maxx, maxy] => [minLon, minLat, maxLon, maxLat]
        const bbox = [
            extent4326[0], // minLon
            extent4326[1], // minLat
            extent4326[2], // maxLon
            extent4326[3]  // maxLat
        ];

        // The feature is already added to the source, so we keep it visible

        // Disable drawing mode
        mapInstance.current.removeInteraction(drawInteractionRef.current);
        setIsDrawingBBox(false);

        // Call the external handler with the BBox
        onBBoxDrawn(bbox);
    });

    // 5. Add interaction to map and update state
    mapInstance.current.addInteraction(drawInteractionRef.current);
    setIsDrawingBBox(true);
    
    return () => {
        if (drawInteractionRef.current) {
            mapInstance.current.removeInteraction(drawInteractionRef.current);
        }
    };
  };

  const disableBBoxDraw = () => {
    if (drawInteractionRef.current && mapInstance.current) {
        mapInstance.current.removeInteraction(drawInteractionRef.current);
    }
    vectorSourceRef.current?.clear();
    setIsDrawingBBox(false);
  };

  const changeBasemap = (basemapKey) => {
    if (!mapInstance.current || !basemapLayerRef.current) return;

    setCurrentBasemap(basemapKey);
    const newSource = basemaps[basemapKey].source;
    basemapLayerRef.current.setSource(newSource);
  };

  const zoomIn = () => {
    if (mapInstance.current) {
      const view = mapInstance.current.getView();
      view.animate({
        zoom: view.getZoom() + 1,
        duration: 250
      });
    }
  };

  const zoomOut = () => {
    if (mapInstance.current) {
      const view = mapInstance.current.getView();
      view.animate({
        zoom: view.getZoom() - 1,
        duration: 250
      });
    }
  };

  const resetView = () => {
    if (mapInstance.current) {
      const view = mapInstance.current.getView();
      view.animate({
        center: fromLonLat([78.9629, 20.5937]),
        zoom: 4,
        duration: 500
      });
    }
  };

  return {
    mapRef,
    mapInstance,
    basemapLayerRef,
    currentBasemap,
    changeBasemap,
    zoomIn,
    zoomOut,
    resetView,
    isDrawingBBox,
    enableBBoxDraw,
    disableBBoxDraw,
  };
};