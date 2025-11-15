// src/components/UI/FileUpload.jsx
import React, { useRef } from 'react';
import { FaFolder } from 'react-icons/fa';

const FileUpload = ({ handleFolderUpload, loading }) => {
  const fileInputRef = useRef(null);

  const handleFolderSelect = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      handleFolderUpload(files);
    }
  };

  return (
    <div className="mb-4">
      <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer hover:bg-gray-800">
        <input
          ref={fileInputRef}
          type="file"
          accept=".tif,.tiff,.geotiff,.jpg,.jpeg,.png,.aux,.xml,.json,.txt"
          webkitdirectory="true"
          directory="true"
          multiple
          onChange={handleFolderSelect}
          className="hidden"
          id="folder-upload"
          disabled={loading}
        />
        <label htmlFor="folder-upload" className="cursor-pointer">
          <FaFolder className="mx-auto text-3xl text-gray-300 mb-3" />
          <p className="text-sm text-gray-600">
            {loading ? 'Processing Folder...' : 'Click to upload COG Folder'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Select a folder containing COG GeoTIFF files and auxiliary data
          </p>
        </label>
      </div>
    </div>
  );
};

export default FileUpload;