import { useState, useRef } from "react";
import axios from "axios";
import { dataConversionAPI } from "../services/api"; 
import { X, Download, ZoomIn, ZoomOut, Maximize2, RotateCw, Move, Eye } from "lucide-react";

// PRODUCTION CHANGE: Define constants using environment variables or fallbacks
const TITILER_BASE_URL = import.meta.env.VITE_TITILER_API_BASE_URL || 'http://api-lb-production-716552440.ap-south-1.elb.amazonaws.com/titiler';
const S3_SERVER_URL = import.meta.env.VITE_S3_SERVER_URL || 'http://localhost:4566'; // URL for S3/LocalStack direct access
const INDIA_BBOX_WGS84 = '68.7,8.4,97.25,35.6'; // Updated to actual India bounds
const POLLING_INTERVAL_MS = 2000;

// Base structure for file tracking (used for initial state)
const createProdFileState = (file) => ({
    name: file.name,
    size: file.size,
    status: 'pending', // 'pending', 'requesting_url', 'uploading', 'converting', 'converted', 'error'
    progress: 0,
    outputFiles: [],
    originalFile: file,
});

// Helper Function: Generates TiTiler Preview URL
const getBandPreviewUrl = (s3FileUrl) => {
    if (!s3FileUrl) return null;
    const encodedFileUrl = encodeURIComponent(s3FileUrl);
    
    // Use TiTiler's preview with rescaling for satellite imagery
    return `${TITILER_BASE_URL}/cog/preview.png?url=${encodedFileUrl}&max_size=1024&rescale=0,1000`;
};

export default function DataConversion() {
  const [files, setFiles] = useState([]); 
  const [converted, setConverted] = useState([]); 
  const [loadingFile, setLoadingFile] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState({}); // Track selected files for download
  
  const [activePreview, setActivePreview] = useState({
      fileName: null,
      bandKey: null,
      bandS3Url: null,
      previewImageUrl: null,
  });
  const [imageError, setImageError] = useState(false);

  // Image viewer controls
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    const validFiles = selected.filter(f => f.name.toLowerCase().endsWith('.h5'));
    const newFiles = validFiles.map(file => createProdFileState(file)); 
    setFiles((prev) => [...prev, ...newFiles]);
    e.target.value = null; 
  };

  const handleRemove = (index) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };
  
  const handleBandSelection = (s3FileUrl, fileName, bandKey) => {
      setImageError(false); 
      // Reset view controls when new image is selected
      setZoom(100);
      setRotation(0);
      setPanPosition({ x: 0, y: 0 });
      setActivePreview({
          fileName: fileName,
          bandKey: bandKey,
          bandS3Url: s3FileUrl,
          previewImageUrl: getBandPreviewUrl(s3FileUrl),
      });
  };

  // Image viewer control functions (CSS zoom only)
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 400));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 25));
  const handleResetView = () => {
    setZoom(100);
    setRotation(0);
    setPanPosition({ x: 0, y: 0 });
  };
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPanPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -10 : 10; // Reduced sensitivity: 10% instead of 25%
    setZoom(prev => Math.max(25, Math.min(400, prev + delta)));
  };

  // Toggle individual file selection
  const toggleFileSelection = (convertedIndex, fileKey) => {
    setSelectedFiles(prev => {
      const key = `${convertedIndex}-${fileKey}`;
      return {
        ...prev,
        [key]: !prev[key]
      };
    });
  };

  // Download selected files
  const downloadSelectedFiles = (convertedIndex, outputFiles) => {
    const selected = outputFiles.filter(file => 
      selectedFiles[`${convertedIndex}-${file.key}`]
    );

    if (selected.length === 0) {
      alert('Please select at least one file to download.');
      return;
    }

    selected.forEach(file => {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.key.split('/').pop();
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };
  
  // --- PRODUCTION READY CONVERSION WORKFLOW ---
  const handleConvert = async (fileToConvert) => {
    const fileName = fileToConvert.name;
    const originalFile = fileToConvert.originalFile;
    setLoadingFile(fileName);

    const updateFileState = (newStatus, newProgress = undefined) => {
        setFiles(prev => prev.map(f => {
            if (f.name === fileName) {
                return { 
                    ...f, 
                    status: newStatus,
                    progress: newProgress !== undefined ? newProgress : f.progress
                };
            }
            return f;
        }));
    };

    try {
        // --- STEP 1: GET PRESIGNED URL ---
        updateFileState('requesting_url', 5);
        
        const presignedResponse = await dataConversionAPI.get('/get-presigned-url', {
            params: {
                fileName: fileName,
                fileType: originalFile.type || 'application/octet-stream'
            }
        });
        const uploadUrl = presignedResponse.data.url; // This URL points to S3/LocalStack (port 4566)
        
        // --- STEP 2: HTTP PUT FILE UPLOAD to S3 ---
        updateFileState('uploading', 30);

        await axios.put(uploadUrl, originalFile, {
            headers: {
                'Content-Type': originalFile.type || 'application/octet-stream',
            },
            // Note: transformResponse is essential for handling raw S3 responses
            transformResponse: [] 
        });

        // --- STEP 3: POLLING FOR CONVERSION STATUS ---
        updateFileState('converting', 50);
        
        let conversionComplete = false;
        let finalStatusData = null;
        
        while (!conversionComplete) {
            await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS)); // Wait based on configuration
            
            // GET /file-status/:fileName for polling (dataConversionAPI uses AWS App Runner baseURL)
            const statusResponse = await dataConversionAPI.get(`/file-status/${fileName}`);
            const statusData = statusResponse.data;
            finalStatusData = statusData;

            if (statusData.status === 'converted') {
                conversionComplete = true;
                updateFileState('converted', 100);
            } else if (statusData.status === 'error' || statusData.status === 'failed') {
                throw new Error("Conversion failed on the backend.");
            } else {
                // Use backend's progress or fall back to a gentle increase
                const progress = statusData.conversionProgress || (fileToConvert.progress < 75 ? fileToConvert.progress + 5 : 80);
                updateFileState(statusData.status, progress);
            }
        }
        
        // --- STEP 4: Finalize and Display ---
        const imageBands = finalStatusData.outputFiles.filter(f => f.key.endsWith('.tif') && !f.key.toLowerCase().includes('overview'));

        const finalConvertedData = {
            file_name: fileName,
            status: "converted",
            bands: imageBands.map(f => f.key.split('/').pop().split('.')[0]),
            outputFiles: finalStatusData.outputFiles, 
        };
        
        if (imageBands.length > 0) {
            const defaultBand = imageBands[0];
            handleBandSelection(defaultBand.url, fileName, defaultBand.key);
        }

        setFiles(prev => prev.filter(f => f.name !== fileName));
        setConverted(prev => [...prev, finalConvertedData]);

    } catch (error) {
        console.error(`[${fileName}] Full Conversion Workflow Failed:`, error.message, error.response?.data);
        updateFileState('error', 0);
        alert(`Conversion failed for ${fileName}! Error: ${error.response?.data?.message || error.message}`);
    } finally {
        setLoadingFile(null);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-950 text-gray-100">
      {/* ==== LEFT SIDEBAR ==== */}
      <aside className="w-1/3 border-r border-gray-800 p-6 flex flex-col">
        <h2 className="text-lg font-semibold text-blue-400 mb-4">
          🛰️ Data Conversion
        </h2>

        {/* Upload */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
          <label className="flex flex-col items-center justify-center cursor-pointer">
            <span className="text-sm text-gray-400 mb-2">
              Choose one or more .H5 files
            </span>
            <input
              type="file"
              accept=".h5"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <span className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-md cursor-pointer">
              Choose Files
            </span>
          </label>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* ===== Processing Queue ===== */}
          <section className="flex flex-col items-start">
            <h3 className="text-sm text-gray-400 mb-2 uppercase tracking-wide">
              Processing Queue
            </h3>
            {files.length === 0 ? (
              <p className="text-xs text-gray-600 italic">No files in queue</p>
            ) : (
              <div className="space-y-3 w-full">
                {files.map((file) => (
                  <div
                    key={file.name}
                    className={`bg-gray-900 border p-3 rounded-lg transition-all ${
                        file.status === 'error' ? 'border-red-500' : 
                        file.status === 'converting' ? 'border-purple-500' :
                        file.status === 'converted' ? 'border-green-500' :
                        'border-gray-800 hover:border-blue-500'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm truncate text-gray-300">{file.name}</span>
                      <button
                        onClick={() => handleRemove(files.findIndex(f => f.name === file.name))}
                        className="text-gray-400 hover:text-red-400 cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Display Status and Progress */}
                    <p className="text-xs mt-1">
                        Status: 
                        <span className={`font-medium ml-1 ${
                            file.status === 'uploading' || file.status === 'requesting_url' ? 'text-yellow-400' :
                            file.status === 'converting' ? 'text-purple-400' :
                            file.status === 'converted' ? 'text-green-400' :
                            file.status === 'error' ? 'text-red-400' : 'text-gray-400'
                        }`}>
                            {file.status.charAt(0).toUpperCase() + file.status.slice(1).replace('_', ' ')}
                        </span>
                    </p>
                    
                    {/* Progress Bar (Visible during upload and conversion) */}
                    {(file.status !== 'pending' && file.status !== 'error' && file.status !== 'converted') && (
                        <>
                            <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                                <div 
                                    className="h-full rounded-full bg-purple-500 transition-all duration-500"
                                    style={{ width: `${file.progress}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-400 text-right pr-1 pt-1">{file.progress}%</p>
                        </>
                    )}

                    {/* Convert/Retry Button (Visible in pending/error state) */}
                    {(file.status === 'pending' || file.status === 'error') && (
                        <button
                            onClick={() => handleConvert(file)}
                            disabled={loadingFile === file.name}
                            className={`mt-3 w-full rounded py-1.5 text-xs font-medium cursor-pointer ${
                                loadingFile === file.name
                                    ? "bg-gray-700 text-gray-400"
                                    : "bg-blue-600 hover:bg-blue-500 text-white"
                            }`}
                        >
                            {loadingFile === file.name
                                ? "Processing..."
                                : file.status === 'error' ? "Retry Conversion" : "Convert to COG"}
                        </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ===== Converted Files ===== */}
          <section className="flex flex-col items-start">
            <h3 className="text-sm text-gray-400 mb-2 mt-6 uppercase tracking-wide">
              Converted Files
            </h3>
            {converted.length === 0 ? (
              <p className="text-xs text-gray-600 italic">
                No converted files yet
              </p>
            ) : (
              <div className="space-y-4 w-full">
                {converted.map((file, i) => {
                  // Group files by subfolder (skip the base folder, group by 2nd level)
                  const filesByFolder = {};
                  file.outputFiles.forEach(outputFile => {
                    const parts = outputFile.key.split('/');
                    // If path is like "BaseName/SubFolder/file.tif", get "SubFolder"
                    // If path is like "BaseName/file.tif", use "Root"
                    const folder = parts.length > 2 ? parts[1] : 'Root';
                    if (!filesByFolder[folder]) {
                      filesByFolder[folder] = [];
                    }
                    filesByFolder[folder].push(outputFile);
                  });

                  return (
                    <div
                      key={i}
                      className="bg-gray-900 border border-gray-800 hover:border-blue-400 p-3 rounded-lg transition-all"
                    >
                      <span className="text-sm font-medium text-blue-300 block mb-3 truncate">
                        {file.file_name}
                      </span>

                      {/* Display files grouped by subfolder */}
                      <div className="space-y-3 mb-3">
                        {Object.entries(filesByFolder).map(([folder, folderFiles]) => (
                          <div key={folder} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-gray-300">
                                📁 {folder} ({folderFiles.length} files)
                              </span>
                              <button
                                onClick={() => {
                                  // Toggle all files in this folder
                                  const allSelected = folderFiles.every(f => 
                                    selectedFiles[`${i}-${f.key}`]
                                  );
                                  setSelectedFiles(prev => {
                                    const newState = { ...prev };
                                    folderFiles.forEach(f => {
                                      newState[`${i}-${f.key}`] = !allSelected;
                                    });
                                    return newState;
                                  });
                                }}
                                className="text-xs text-blue-400 hover:text-blue-300"
                              >
                                Select All
                              </button>
                            </div>
                            
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {folderFiles.map((outputFile) => {
                                const fileKey = `${i}-${outputFile.key}`;
                                const isSelected = selectedFiles[fileKey] || false;
                                const isTif = outputFile.key.endsWith('.tif');
                                const isImage = isTif || outputFile.key.endsWith('.jpg') || outputFile.key.endsWith('.png');
                                const fileName = outputFile.key.split('/').pop();
                                const fileSize = (outputFile.size / (1024 * 1024)).toFixed(2);

                                return (
                                  <div
                                    key={outputFile.key}
                                    className={`flex items-center gap-2 p-2 rounded transition-colors ${
                                      isTif ? 'bg-blue-900/20 hover:bg-blue-900/30 border border-blue-800/30' : 'bg-gray-900 hover:bg-gray-800'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleFileSelection(i, outputFile.key)}
                                      className="w-4 h-4 accent-blue-500 cursor-pointer"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        {isImage && (
                                          <Eye size={14} className={isTif ? "text-blue-400" : "text-gray-500"} />
                                        )}
                                        <span className={`text-xs truncate ${isTif ? 'text-blue-300 font-medium' : 'text-gray-300'}`}>
                                          {fileName}
                                        </span>
                                        {isTif && (
                                          <>
                                            <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded shrink-0">
                                              PREVIEWABLE
                                            </span>
                                            <button
                                              onClick={() => handleBandSelection(outputFile.url, file.file_name, outputFile.key)}
                                              className="text-xs text-blue-400 hover:text-blue-300 shrink-0 flex items-center gap-1"
                                            >
                                              <Eye size={12} />
                                              Preview
                                            </button>
                                          </>
                                        )}
                                      </div>
                                      <span className="text-xs text-gray-500">
                                        {fileSize} MB
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Download Button */}
                      <button
                          onClick={() => downloadSelectedFiles(i, file.outputFiles)}
                          className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 py-2 rounded text-xs font-medium cursor-pointer w-full text-white"
                      >
                          <Download size={14} /> Download Selected
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </aside>

      {/* ==== RIGHT SIDE PREVIEW ==== */}
      <section className="flex-1 p-8 overflow-hidden flex flex-col">
        {activePreview.previewImageUrl ? (
          <div className="flex flex-col h-full">
            {/* Header with controls */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-blue-400">
                Preview: {activePreview.bandKey.split('/').pop()}
              </h2>
              
              {/* Image Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleZoomOut}
                  className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut size={18} />
                </button>
                
                <span className="text-sm text-gray-400 min-w-[60px] text-center">
                  {zoom}%
                </span>
                
                <button
                  onClick={handleZoomIn}
                  className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn size={18} />
                </button>
                
                <div className="w-px h-6 bg-gray-700 mx-1"></div>
                
                <button
                  onClick={handleRotate}
                  className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
                  title="Rotate 90°"
                >
                  <RotateCw size={18} />
                </button>
                
                <button
                  onClick={handleResetView}
                  className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
                  title="Reset View"
                >
                  <Maximize2 size={18} />
                </button>
              </div>
            </div>

            {/* Image Container */}
            <div 
              ref={imageContainerRef}
              className="flex-1 rounded-xl border border-gray-800 bg-gray-900 overflow-hidden relative"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
              <div 
                className="w-full h-full flex items-center justify-center"
                style={{
                  transform: `translate(${panPosition.x}px, ${panPosition.y}px)`
                }}
              >
                <img
                  src={imageError 
                      ? `https://via.placeholder.com/800x500?text=Preview+Failed+%7C+Backend+Offline`
                      : activePreview.previewImageUrl
                  }
                  onError={() => setImageError(true)}
                  alt={`Preview of ${activePreview.bandKey}`}
                  className="max-w-none transition-transform duration-200"
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center'
                  }}
                  draggable={false}
                />
              </div>
              
              {/* Pan hint */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800/90 px-3 py-1 rounded-full text-xs text-gray-400 flex items-center gap-2">
                <Move size={14} />
                <span>Click and drag to pan</span>
              </div>
            </div>

            {/* Info footer */}
            <p className="text-xs text-gray-500 mt-3 text-center">
              {imageError 
                  ? 'Preview failed to stream. Backend service may be offline.' 
                  : `Streaming from TiTiler • Zoom: ${zoom}%`
              }
            </p>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500">
              Click "Preview" on any .tif file to visualize it here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}