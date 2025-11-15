// src/pages/OnTheFly.jsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import Sidebar from '../components/Sidebar/Sidebar';
import MapComponent from '../components/Map/MapComponent';
import { useMap } from '../hooks/useMap';
import { useGeoTIFF } from '../hooks/useGeoTIFF';
import { useBasemaps } from '../hooks/useBasemaps';

const OnTheFly = () => {
  const [activeTab, setActiveTab] = useState('bands');

  const {
    mapRef,
    mapInstance,
    currentBasemap,
    changeBasemap,
    zoomIn,
    zoomOut,
    resetView,
    isDrawingBBox,
    enableBBoxDraw,
    disableBBoxDraw
  } = useMap();

  // useGeoTIFF hook now provides S3 props
  const geoTIFFHook = useGeoTIFF(mapInstance);

  const {
    // S3 Scene props
    s3Scenes,
    s3ScenesLoading,
    s3ScenesError,
    handleSceneSelect,

    // Existing props
    sceneData,
    selectedBands,
    tiffLayers,
    colorMap,
    loading,
    error,
    workflowProgress,
    workflowStatusMessage, // <-- Pass this
    jobStatus, // <-- Pass this
    activeJobId, // <-- Pass this
    handleDownloadMosaic, // <-- Pass this
    vizLayerReady, // <-- GET NEW PROP
    // handleFolderUpload, // This is no longer provided or needed
    handleColorMapChange,
    handleBandSelect,
    handleBandRemove,
    handleOperation,
    toggleLayerVisibility,
    updateLayerOpacity,
    removeLayer,
    removeAllBands,
    getUniqueFiles,
    handleApplyEffect,
    handleExport,
  } = geoTIFFHook;

  const { basemaps } = useBasemaps();

  return (
    <div className="min-h-screen bg-gray-950 w-full flex">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        
        // Pass S3 props down
        s3Scenes={s3Scenes}
        s3ScenesLoading={s3ScenesLoading}
        s3ScenesError={s3ScenesError}
        handleSceneSelect={handleSceneSelect}

        // Pass existing props
        sceneData={sceneData}
        selectedBands={selectedBands}
        tiffLayers={tiffLayers}
        colorMap={colorMap}
        loading={loading}
        error={error}
        workflowProgress={workflowProgress}
        workflowStatusMessage={workflowStatusMessage} // <-- Pass this
        jobStatus={jobStatus} // <-- Pass this
        activeJobId={activeJobId} // <-- Pass this
        handleDownloadMosaic={handleDownloadMosaic} // <-- Pass this
        vizLayerReady={vizLayerReady} // <-- PASS NEW PROP
        // handleFolderUpload={handleFolderUpload} // Removed
        handleColorMapChange={handleColorMapChange}
        handleBandSelect={handleBandSelect}
        handleBandRemove={handleBandRemove}
        handleOperation={handleOperation}
        toggleLayerVisibility={toggleLayerVisibility}
        updateLayerOpacity={updateLayerOpacity}
        removeLayer={removeLayer}
        removeAllBands={removeAllBands}
        getUniqueFiles={getUniqueFiles}
        currentBasemap={currentBasemap}
        changeBasemap={changeBasemap}
        basemaps={basemaps}
        handleApplyEffect={handleApplyEffect}
        
        isDrawingBBox={isDrawingBBox}
        enableBBoxDraw={enableBBoxDraw}
        disableBBoxDraw={disableBBoxDraw}
        handleExport={handleExport}
      />
      
      <MapComponent
        mapRef={mapRef}
        currentBasemap={currentBasemap}
        basemaps={basemaps}
        tiffLayers={tiffLayers}
        selectedBands={selectedBands}
        colorMap={colorMap}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        resetView={resetView}
        getUniqueFiles={getUniqueFiles}
      />
    </div>
  );
};

export default OnTheFly;