import React from 'react';
import { FaPlus, FaMinus, FaUndo } from 'react-icons/fa';

const MapControls = ({ zoomIn, zoomOut, resetView }) => {
  return (
    <div className="absolute top-4 left-4 p-1 z-10">
      <div className="flex gap-1">
        <button 
          onClick={zoomIn}
          className="w-6 h-6 bg-gray-800 text-white rounded-sm shadow-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
        >
          <FaPlus size={14} />
        </button>
        <button 
          onClick={zoomOut}
          className="w-6 h-6 bg-gray-800 text-white rounded-sm shadow-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
        >
          <FaMinus size={14} />
        </button>
        <button 
          onClick={resetView}
          className="w-6 h-6 bg-gray-800 text-white rounded-sm shadow-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
        >
          <FaUndo size={14} />
        </button>
      </div>
    </div>
  );
};

export default MapControls; 