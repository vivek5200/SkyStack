// src/components/Sidebar/TabContent/BandsTab.jsx
import React from 'react';
// import FileUpload from '../../UI/FileUpload'; // Removed
import LoadingSpinner from '../../UI/LoadingSpinner';
import ErrorMessage from '../../UI/ErrorMessage';
// import BandManager from '../../GeoTIFF/BandManager'; // No longer needed
import FolderBandManager from '../../GeoTIFF/FolderBandManager'; // This is used

const BandsTab = ({
  // S3 Props
  s3Scenes,
  s3ScenesLoading,
  s3ScenesError,
  handleSceneSelect,
  
  // Existing Props
  sceneData,
  selectedBands,
  tiffLayers,
  selectedBand,
  colorMap,
  loading,
  error,
  // handleFolderUpload, // Removed
  handleColorMapChange,
  handleBandSelect,
  handleBandRemove,
  handleOperation,
  switchBand,
  toggleLayerVisibility,
  updateLayerOpacity,
  removeLayer,
  removeAllBands,
  getUniqueFiles
}) => {
  return (
    <div className="space-y-4 h-full flex flex-col">
      
      {/* --- NEW S3 Scene Selector --- */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-300 mb-2">Select Scene from S3</h3>
        {s3ScenesLoading && <LoadingSpinner message="Loading scenes..." />}
        {s3ScenesError && <ErrorMessage message={s3ScenesError} />}
        
        {!s3ScenesLoading && !s3ScenesError && (
            <select
                className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors bg-gray-800 text-white disabled:bg-gray-700"
                onChange={(e) => handleSceneSelect(e.target.value)}
                // 'loading' is for scene *content* loading
                disabled={loading || s3Scenes.length === 0} 
                // Control the component to show the currently loaded scene
                value={sceneData ? `${sceneData.name}/` : ""} 
            >
                <option value="" disabled>
                    {s3Scenes.length === 0 ? "No scenes found" : "Select a scene..."}
                </option>
                {s3Scenes.map((scenePrefix) => (
                    <option key={scenePrefix} value={scenePrefix}>
                        {scenePrefix.replace(/\/$/, '')} {/* Show clean name */}
                    </option>
                ))}
            </select>
        )}
      </div>
      {/* --- End of New S3 Scene Selector --- */}


      {/* Show loading spinner when loading scene *contents* */}
      {loading && <LoadingSpinner message="Loading scene files..." />}

      {/* Show error if loading scene *contents* fails */}
      {error && !loading && <ErrorMessage message={error} />}

      {/* Show FOLDER structure when scene is loaded */}
      {sceneData && (
        <div className="flex-1 overflow-hidden">
          <FolderBandManager
            sceneData={sceneData}
            selectedBands={selectedBands}
            tiffLayers={tiffLayers}
            onBandSelect={handleBandSelect}
            onBandRemove={handleBandRemove}
            onOperation={handleOperation}
            onToggleVisibility={toggleLayerVisibility}
            onUpdateOpacity={updateLayerOpacity}
            onRemoveLayer={removeLayer}
            colorMap={colorMap}
          />
        </div>
      )}

      {/* The old BandManager for single-file workflows is no longer needed */}
      
    </div>
  );
};

export default BandsTab;