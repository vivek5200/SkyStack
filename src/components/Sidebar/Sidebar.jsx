// src/components/Sidebar/Sidebar.jsx
import React, { useState, useRef, useLayoutEffect } from 'react';
import SidebarTabs from './SidebarTabs';
import TabContent from './TabContent/TabContent';

const Sidebar = ({
  activeTab,
  setActiveTab,

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
  workflowProgress,
  workflowStatusMessage, // Added
  jobStatus, // Added
  activeJobId, // Added
  handleDownloadMosaic, // Added
  vizLayerReady, // Added
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
  getUniqueFiles,
  currentBasemap,
  changeBasemap,
  basemaps,
  handleApplyEffect,
  isDrawingBBox,
  enableBBoxDraw,
  disableBBoxDraw,
  handleExport
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState(activeTab || 'bands');
  const scrollContainerRef = useRef(null); // <-- 1. Add a ref for the scroll container

  // --- 2. ADD THIS useLayoutEffect ---
  // This scrolls the content panel to the top *only* when the tab ID changes.
  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [internalActiveTab]); // <-- This effect only runs when internalActiveTab changes
  // --- END OF ADDITION ---

  const getSceneDescription = () => {
    if (!sceneData) {
      return 'Select a scene from the "Bands" tab to begin.';
    }
    return `Scene: ${sceneData.name}`;
  };

  const getTabTitle = (tabId) => {
    const baseTitles = {
      info: 'Information',
      bands: 'Available Bands',
      basemap: 'Map Basemap',
      filters: 'Filters & Operations',
      effects: 'Visual Effects',
      tools: 'Map Tools',
      export: 'Export Options'
    };

    if (tabId === 'bands' && sceneData) {
      const imageBandsCount = sceneData.files.filter(f => f.category === 'image_bands').length;
      return `Available Bands (${imageBandsCount})`;
    }

    return baseTitles[tabId] || tabId.charAt(0).toUpperCase() + tabId.slice(1);
  };

  return (
  <div className="w-80 bg-gray-950 border-l border-gray-800 flex shadow-lg">
    <SidebarTabs activeTab={internalActiveTab} setActiveTab={setInternalActiveTab} />

    {/* --- 3. Add the ref to the scroll container --- */}
    <div 
      ref={scrollContainerRef}
      className="flex-1 p-4 overflow-y-auto" 
      style={{ maxHeight: '100vh', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <div className="mb-6 pb-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-blue-400 break-words">
          {getTabTitle(internalActiveTab)}
        </h2>
        <p className="text-sm text-gray-400 mt-1 break-words whitespace-normal">
          {getSceneDescription()}
        </p>
      </div>
      
      {/* --- 4. Remove the 'key' prop from TabContent --- */}
      <TabContent
        activeTab={internalActiveTab}

        // Pass S3 props
        s3Scenes={s3Scenes}
        s3ScenesLoading={s3ScenesLoading}
        s3ScenesError={s3ScenesError}
        handleSceneSelect={handleSceneSelect}

        // Pass existing props
        sceneData={sceneData}
        selectedBands={selectedBands}
        tiffLayers={tiffLayers}
        selectedBand={selectedBand}
        colorMap={colorMap}
        loading={loading}
        error={error}
        workflowProgress={workflowProgress}
        workflowStatusMessage={workflowStatusMessage} 
        jobStatus={jobStatus} 
        activeJobId={activeJobId} 
        handleDownloadMosaic={handleDownloadMosaic} 
        vizLayerReady={vizLayerReady} 
        // handleFolderUpload={handleFolderUpload} // Removed
        handleColorMapChange={handleColorMapChange}
        handleBandSelect={handleBandSelect}
        handleBandRemove={handleBandRemove}
        handleOperation={handleOperation}
        switchBand={switchBand}
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
    </div>
  </div>
);
};

export default Sidebar;