import React, { useState } from 'react';
import { FaDownload, FaMousePointer, FaTimesCircle } from 'react-icons/fa';

const ExportTab = ({ 
    tiffLayers,
    isDrawingBBox,
    enableBBoxDraw,
    disableBBoxDraw,
    handleExport
}) => {
  const [exportBBox, setExportBBox] = useState(null); // Stores the BBox after drawing is complete
  const [exportStatus, setExportStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  
  const activeLayer = tiffLayers.find(l => l.visible);

  const startBBoxDrawing = () => {
    setExportBBox(null); // Clear previous BBox
    
    // Pass a callback function to the map hook to receive the final BBox
    enableBBoxDraw((bbox) => {
      setExportBBox(bbox);
    });
  };

  const cancelBBoxDrawing = () => {
    disableBBoxDraw();
    setExportBBox(null);
    setExportStatus('idle'); // Reset status on cancel
  };

  const initiateDownload = async () => {
    if (!activeLayer) {
      alert("Please ensure a GeoTIFF layer is visible before exporting.");
      return;
    }
    if (!exportBBox) {
      alert("Please draw a bounding box on the map to define the export area.");
      return;
    }

    setExportStatus('loading');
    
    try {
      // handleExport triggers the download and returns true/false based on success
      const success = await handleExport(exportBBox); 
      if (success) {
        setExportStatus('success');
        // Reset status after 3 seconds
        setTimeout(() => setExportStatus('idle'), 3000);
      } else {
        setExportStatus('error');
        // Reset status after 5 seconds to allow user to read error
        setTimeout(() => setExportStatus('idle'), 5000);
      }
    } catch (error) {
      console.error('Export error:', error);
      setExportStatus('error');
      setTimeout(() => setExportStatus('idle'), 5000);
    }
  };

  const renderBBoxStatus = () => {
    if (isDrawingBBox) {
      return (
        <div className="p-3 bg-blue-900/20 rounded border border-blue-700/50 flex justify-between items-center text-blue-400">
          <p className="text-sm font-medium">Drawing Mode Active. Draw a rectangle on the map.</p>
          <button onClick={cancelBBoxDrawing} className="text-red-400 hover:text-red-300">
            <FaTimesCircle size={18} />
          </button>
        </div>
      );
    }
    
    if (exportBBox) {
      const [minX, minY, maxX, maxY] = exportBBox;
      return (
        <div className="p-3 bg-green-900/20 rounded border border-green-700/50 text-green-400">
          <p className="text-sm font-medium mb-1">✅ Bounding Box Defined (WGS84):</p>
          <p className="text-xs font-mono break-all">
            Lon: {minX.toFixed(4)} to {maxX.toFixed(4)}
          </p>
          <p className="text-xs font-mono break-all">
            Lat: {minY.toFixed(4)} to {maxY.toFixed(4)}
          </p>
        </div>
      );
    }    
    return null;
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-blue-400">Selective GeoTIFF Export</h3>

      {/* Active Layer Status */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
        <h4 className="text-md font-semibold text-gray-300 mb-2">Source Layer</h4>
        {activeLayer ? (
          <p className="text-sm text-green-400 font-medium truncate">
            Active: {activeLayer.name}
          </p>
        ) : (
          <p className="text-sm text-red-400">
            No visible GeoTIFF layer found.
          </p>
        )}
      </div>

      {/* Step 1: Define Area */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
        <h4 className="text-md font-semibold text-gray-300 mb-3">1. Define Area (BBox)</h4>
      
        {renderBBoxStatus()}

        <button
          onClick={startBBoxDrawing}
          disabled={isDrawingBBox || !activeLayer}
          className={`w-full py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 font-medium mt-3 ${
            isDrawingBBox 
              ? 'bg-gray-400 text-white cursor-wait' 
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed'
          }`}
        >
          <FaMousePointer className="inline mr-2" /> 
          {isDrawingBBox ? 'Drawing...' : (exportBBox ? 'Redraw Bounding Box' : 'Start Drawing BBox')}
        </button>
        <p className="text-xs text-gray-500 mt-2">
            Output format will be GeoTIFF (.tif)
        </p>
      </div>

      {/* Export Status Indicator */}
      {exportStatus === 'loading' && (
        <div className="p-3 bg-blue-900/20 rounded border border-blue-700/50 text-blue-400">
          <p className="text-sm font-medium">🔄 Exporting GeoTIFF... This may take a moment.</p>
        </div>
      )}

      {exportStatus === 'success' && (
        <div className="p-3 bg-green-900/20 rounded border border-green-700/50 text-green-400">
          <p className="text-sm font-medium">✅ Export initiated! Check your downloads.</p>
        </div>
      )}

      {exportStatus === 'error' && (
        <div className="p-3 bg-red-900/20 rounded border border-red-700/50 text-red-400">
          <p className="text-sm font-medium">❌ Export failed. Please try again or check backend.</p>
        </div>
      )}

      {/* Download Button (Step 2 and 3 combined) */}
      <button
        onClick={initiateDownload}
        disabled={!activeLayer || !exportBBox || exportStatus === 'loading'}
        className={`w-full py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 font-bold shadow-lg ${
          activeLayer && exportBBox && exportStatus !== 'loading'
            ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500' 
            : 'bg-gray-400 text-gray-600 disabled:cursor-not-allowed'
        }`}
      >
        <FaDownload className="inline mr-2" /> Download GeoTIFF
      </button>
    </div>
  );
};

export default ExportTab;