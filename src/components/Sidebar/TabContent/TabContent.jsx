// src/components/Sidebar/TabContent/TabContent.jsx
import React from 'react';
import InfoTab from './InfoTab';
import BandsTab from './BandsTab';
import BasemapTab from './BasemapTab';
import FiltersTab from './FiltersTab';
import EffectsTab from './EffectsTab';
import ExportTab from './ExportTab';
import { FaMap } from 'react-icons/fa';

const TabContent = ({
  activeTab,

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
  workflowStatusMessage, // <-- Added
  jobStatus, // <-- Added
  activeJobId, // <-- Added
  handleDownloadMosaic, // <-- Added
  vizLayerReady, // <-- ADD NEW PROP
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
  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return <InfoTab sceneData={sceneData} />;
      case 'bands':
        return (
          <BandsTab
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
          />
        );
      case 'basemap':
        return (
          <BasemapTab
            currentBasemap={currentBasemap}
            changeBasemap={changeBasemap}
            basemaps={basemaps}
          />
        );
      case 'filters':
        return (
          <FiltersTab
            selectedBands={selectedBands}
            tiffLayers={tiffLayers}
            onApplyBandOperation={handleOperation}
            handleColorMapChange={handleColorMapChange}
            colorMap={colorMap}
            workflowProgress={workflowProgress}
            workflowStatusMessage={workflowStatusMessage} // <-- Pass this
            jobStatus={jobStatus} // <-- Pass this
            activeJobId={activeJobId} // <-- Pass this
            handleDownloadMosaic={handleDownloadMosaic} // <-- Pass this
            vizLayerReady={vizLayerReady} // <-- PASS NEW PROP
          />
        );
      case 'effects':
        return (
          <EffectsTab 
            tiffLayers={tiffLayers}
            handleApplyEffect={handleApplyEffect}
          />
        );
      case 'export':
        return (
          <ExportTab 
            tiffLayers={tiffLayers}
            isDrawingBBox={isDrawingBBox}
            enableBBoxDraw={enableBBoxDraw}
            disableBBoxDraw={disableBBoxDraw}
            handleExport={handleExport}
          />
        );
      default:
        return (
          <div className="text-center py-8">
            <div className="text-4xl mb-2 text-gray-400">
              <FaMap />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Map Interface</h3>
            <p className="text-gray-600">Select a tool from the sidebar to get started</p>
          </div>
        );
    }
  };

  return <div className="space-y-6">{renderTabContent()}</div>;
};

export default TabContent;