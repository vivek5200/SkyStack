// src/components/Sidebar/TabContent/FiltersTab.jsx
import React, { useState, useEffect } from 'react';
import { FaDownload } from 'react-icons/fa'; 

const FiltersTab = ({
  selectedBands,
  tiffLayers,
  onApplyBandOperation,
  handleColorMapChange,
  colorMap,
  workflowProgress,
  workflowStatusMessage, 
  jobStatus, 
  activeJobId, 
  handleDownloadMosaic,
  vizLayerReady // <-- ACCEPT NEW PROP
}) => {
  const [currentExpression, setCurrentExpression] = useState(''); // This will hold the user's formula (e.g., "B1 / B2")
  const [globalColorMap, setGlobalColorMap] = useState(colorMap);
  const [selectedBand1, setSelectedBand1] = useState('');
  const [selectedBand2, setSelectedBand2] = useState('');
  
  // --- MODIFIED: jobFinished now depends on vizLayerReady ---
  const jobFinished = jobStatus === 'MOSAIC_CREATED' && vizLayerReady;
  
  // --- MODIFIED: Simplified jobRunning logic ---
  const jobRunning = (workflowStatusMessage && !jobFinished && jobStatus !== 'MERGE_FAILED' && jobStatus !== 'FAILED');
  
  const inputsDisabled = jobRunning || jobFinished;

  useEffect(() => {
    setGlobalColorMap(colorMap);
  }, [colorMap]);

  const availableBands = selectedBands.filter(band =>
    band.category === 'image_bands' && band.loaded
  );

  useEffect(() => {
    if (availableBands.length < 2) {
      setSelectedBand1('');
      setSelectedBand2('');
    }
  }, [availableBands.length]);

  // Auto-select the first two available bands as B1 and B2
  useEffect(() => {
    if (availableBands.length >= 2 && !selectedBand1 && !selectedBand2) {
      setSelectedBand1(availableBands[0]?.id || '');
      setSelectedBand2(availableBands[1]?.id || '');
    }
  }, [availableBands, selectedBand1, selectedBand2]);

  const handleApplyOperation = async () => {
    if (availableBands.length < 2) {
      alert('Please select at least 2 bands from the "Bands" tab first.');
      return;
    }
    if (!selectedBand1 || !selectedBand2) {
      alert('Please select two bands (B1 and B2) from the dropdowns below.');
      return;
    }
    if (!currentExpression.trim()) {
      alert('Please enter a valid formula (e.g., B1 - B2).');
      return;
    }

    // --- Translate B1/B2 into band names ---
    const band1 = availableBands.find(b => b.id === selectedBand1);
    const band2 = availableBands.find(b => b.id === selectedBand2);

    if (!band1 || !band2) {
      alert('Selected bands are not valid. Please re-select.');
      return;
    }

    // Get band names without extensions (e.g., "IMG_VIS.tif" -> "IMG_VIS")
    const band1Name = band1.name.split('.').slice(0, -1).join('.');
    const band2Name = band2.name.split('.').slice(0, -1).join('.');

    // Replace B1 and B2 placeholders globally in the expression
    let translatedExpression = currentExpression.replace(/\bB1\b/g, band1Name);
    translatedExpression = translatedExpression.replace(/\bB2\b/g, band2Name);
    
    console.log(`Original expression: ${currentExpression}`);
    console.log(`Translated expression: ${translatedExpression}`);
    
    try {
      const operationData = {
        type: 'custom', // Type is always custom now
        expression: translatedExpression, // Send the translated expression
        colorMap: globalColorMap,
      };
      await onApplyBandOperation(operationData);
      console.log('✅ Band arithmetic job submitted successfully');
    } catch (error) {
      console.error('❌ Band arithmetic failed:', error);
      alert(`Band arithmetic failed: ${error.message}`);
    }
  };

  const handleCustomExpressionChange = (e) => {
    setCurrentExpression(e.target.value);
  };

  const handleApplyGlobalColormap = () => {
    handleColorMapChange(globalColorMap);
  };

  const getBandName = (bandId) => {
    const band = availableBands.find(b => b.id === bandId);
    return band ? band.name : 'Unknown Band';
  };

  return (
    <div className="space-y-6">
      {/* Global Colormap Controls */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
        <h3 className="text-lg text-left font-semibold text-blue-400 ">Visualization</h3>
        
        <div className="mb-4">
          <label className="block text-sm text-left font-medium text-gray-300 mb-2">
            Colormap Type
          </label>
          <select
            value={globalColorMap}
            onChange={(e) => setGlobalColorMap(e.target.value)}
            className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors bg-gray-800 text-white"
          >
            <option value="viridis">Viridis</option>
            <option value="inferno">Inferno</option>
            <option value="plasma">Plasma</option>
            <option value="magma">Magma</option>
            <option value="hot">Hot</option>
            <option value="cool">Cool</option>
            <option value="rainbow">Rainbow</option>
            <option value="jet">Jet</option>
          </select>
        </div>

        <button
          onClick={handleApplyGlobalColormap}
          disabled={tiffLayers.length === 0}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-medium"
        >
          {tiffLayers.length === 0 
            ? 'No Images Loaded' 
            : `Apply ${globalColorMap} to Layer${tiffLayers.length !== 1 ? 's' : ''}`
          }
        </button>
      </div>

      {/* Band Arithmetic Section */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
        <h3 className="text-lg text-left font-semibold text-blue-400 mb-2">Band Arithmetic (Workflow)</h3>

        {/* Status Information */}
        {availableBands.length === 0 ? (
          <div className="mb-4 p-3 bg-red-900/20 rounded border border-red-700/50">
            <p className="text-sm text-red-400">
              <strong>No bands loaded.</strong> Please select bands from the "Bands" tab first.
            </p>
          </div>
        ) : (
          !jobFinished && // Only show this if the job isn't done
          <div className="mb-4 p-3 bg-blue-900/20 rounded border border-blue-700/50">
            <p className="text-sm text-blue-400">
              <strong>{availableBands.length} bands available.</strong> Select B1 and B2 below.
            </p>
          </div>
        )}
        
        {/* Custom Expression Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Enter Formula
          </label>
          <input
            type="text"
            value={currentExpression}
            onChange={handleCustomExpressionChange}
            placeholder="e.g., (B1 - B2) / (B1 + B2)"
            className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono transition-colors bg-gray-800 text-white"
            disabled={inputsDisabled || availableBands.length === 0}
          />
          <p className="text-xs text-gray-500 mt-1">
            Use <strong>B1</strong> and <strong>B2</strong> as placeholders for the bands selected below.
          </p>
        </div>

        {/* Band Selection (Now critical for the formula) */}
        {availableBands.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm text-left font-medium text-gray-300 mb-3">
              Define Bands
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-left font-medium text-gray-500 mx-1 mb-1">
                  Band 1 (B1)
                  {selectedBand1 && (
                    <span className="text-green-400 text-left ml-1">✓ {getBandName(selectedBand1)}</span>
                  )}
                </label>
                <select
                  value={selectedBand1}
                  onChange={(e) => setSelectedBand1(e.target.value)}
                  className="w-full p-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors bg-gray-800 text-white"
                  disabled={inputsDisabled}
                >
                  <option value="">Select B1</option>
                  {availableBands.map(band => (
                    <option key={band.id} value={band.id}>
                      {band.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-left font-medium text-gray-500 mx-1 mb-1">
                  Band 2 (B2)
                  {selectedBand2 && (
                    <span className="text-green-400 ml-1">✓ {getBandName(selectedBand2)}</span>
                  )}
                </label>
                <select
                  value={selectedBand2}
                  onChange={(e) => setSelectedBand2(e.target.value)}
                  className="w-full p-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors bg-gray-800 text-white"
                  disabled={inputsDisabled}
                >
                  <option value="">Select B2</option>
                  {availableBands.map(band => (
                    <option key={band.id} value={band.id}>
                      {band.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {selectedBand1 === selectedBand2 && selectedBand1 !== '' && (
              <p className="text-xs text-red-400 mt-2 text-center">
                Warning: B1 and B2 are the same band.
              </p>
            )}
          </div>
        )}

        {/* --- MODIFIED: Apply/Progress/Download Button --- */}
        <div className="mt-4">
          {jobRunning ? (
            // 1. Job is RUNNING
            <div className="space-y-2">
              <p className="text-sm text-center text-blue-400 truncate">
                {workflowStatusMessage || 'Processing Workflow...'}
              </p>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="h-full rounded-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${workflowProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 text-right pr-1 pt-1">{workflowProgress}%</p>
            </div>
          ) : jobFinished ? (
            // 2. Job is FINISHED (and viz layer is ready)
            <>
              <p className="text-sm text-center text-green-400 mb-3 font-medium truncate">
                {workflowStatusMessage || "✅ Mosaic Created Successfully"}
              </p>
              <button
                onClick={handleDownloadMosaic}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 font-medium"
              >
                <FaDownload className="inline mr-2" />
                Download Full Mosaic
              </button>
            </>
          ) : (
            // 3. Job is IDLE (or failed, which resets the UI)
            <button
              onClick={handleApplyOperation}
              disabled={
                !currentExpression.trim() || 
                !selectedBand1 ||
                !selectedBand2 ||
                availableBands.length === 0
              }
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-medium"
            >
              Apply Band Arithmetic
            </button>
          )}
        </div>
        {/* --- END MODIFICATION --- */}

      </div>
    </div>
  );
};

export default FiltersTab;