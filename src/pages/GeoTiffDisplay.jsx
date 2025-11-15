import React, { useState, useRef, useCallback, useEffect } from 'react';

const GeoTiffDisplay = () => {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [colorMap, setColorMap] = useState('grayscale');
  const canvasRef = useRef(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      canvas.width = 800;
      canvas.height = 600;
      
      ctx.fillStyle = '#1f2937'; // gray-800
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#9ca3af'; // gray-400
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Upload a TIFF file to view image', canvas.width / 2, canvas.height / 2);
    }
  }, []);

  // Simple color mapping functions (like your working version)
  const applyColorMap = (value, min, max) => {
    const normalized = (value - min) / (max - min);
    
    switch (colorMap) {
      case 'grayscale':
        const gray = Math.floor(normalized * 255);
        return [gray, gray, gray, 255];
      
      case 'viridis':
        // Simple viridis approximation
        const r = Math.floor(normalized * 255);
        const g = Math.floor(normalized * 150 + 105);
        const b = Math.floor((1 - normalized) * 255);
        return [r, g, b, 255];
      
      case 'inferno':
        // Simple inferno approximation
        const infR = Math.min(255, normalized * 4 * 255);
        const infG = Math.min(255, Math.max(0, (normalized * 2 - 0.5) * 255));
        const infB = Math.min(255, Math.max(0, (normalized * 2 - 1) * 255));
        return [infR, infG, infB, 255];
      
      default:
        const defaultGray = Math.floor(normalized * 255);
        return [defaultGray, defaultGray, defaultGray, 255];
    }
  };

  // Render TIFF to canvas (simpler approach like your working version)
  const renderTiffToCanvas = useCallback(async (file) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    
    try {
      // Use the same approach as your working script.js
      const GeoTIFF = await import('geotiff');
      const arrayBuffer = await file.arrayBuffer();
      
      // Create TIFF from array buffer (like your working version)
      const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
      const image = await tiff.getImage();
      
      // Read raster data
      const rasterData = await image.readRasters();
      const width = image.getWidth();
      const height = image.getHeight();
      
      console.log('TIFF loaded:', { width, height, bands: rasterData.length });

      // Set canvas dimensions to match image
      canvas.width = width;
      canvas.height = height;

      // Create image data
      const imageData = ctx.createImageData(width, height);
      
      // Use first band for simplicity (like your working version)
      const bandData = rasterData[0];
      
      // Find min/max for normalization
      let min = Number.MAX_SAFE_INTEGER;
      let max = Number.MIN_SAFE_INTEGER;
      
      for (let i = 0; i < bandData.length; i++) {
        const value = bandData[i];
        if (value < min) min = value;
        if (value > max) max = value;
      }
      
      // Handle case where all values are the same
      if (min === max) {
        min = 0;
        max = 1;
      }

      // Apply color map to each pixel
      for (let i = 0; i < bandData.length; i++) {
        const [r, g, b, a] = applyColorMap(bandData[i], min, max);
        const idx = i * 4;
        
        imageData.data[idx] = r;
        imageData.data[idx + 1] = g;
        imageData.data[idx + 2] = b;
        imageData.data[idx + 3] = a;
      }

      // Draw to canvas
      ctx.putImageData(imageData, 0, 0);
      
      return {
        width,
        height,
        bands: rasterData.length,
        fileName: file.name,
        fileSize: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
      };
      
    } catch (err) {
      console.error('Error rendering TIFF:', err);
      throw err;
    }
  }, [colorMap]);

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('Processing file:', file.name, file.size);

    if (!file.name.toLowerCase().endsWith('.tif') && 
        !file.name.toLowerCase().endsWith('.tiff')) {
      setError('Please upload a valid TIFF file (.tif or .tiff)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const imageMetadata = await renderTiffToCanvas(file);
      setMetadata(imageMetadata);
      console.log('Image rendered successfully:', imageMetadata);
      
    } catch (err) {
      console.error('Error loading TIFF:', err);
      setError('Failed to load TIFF file: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Download image
  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setError('Canvas not available for download');
      return;
    }

    try {
      const link = document.createElement('a');
      link.download = `tiff-export-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (err) {
      setError('Failed to download image: ' + err.message);
    }
  };

  // Clear everything
  const clearAll = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      canvas.width = 800;
      canvas.height = 600;
      ctx.fillStyle = '#1f2937'; // gray-800
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#9ca3af'; // gray-400
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Upload a TIFF file to view image', canvas.width / 2, canvas.height / 2);
    }
    setMetadata(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="max-w-6xl mx-auto px-4">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-400">TIFF File Viewer</h1>
          <p className="text-gray-400 mt-2">Upload and visualize TIFF files</p>
        </div>

        {/* Upload Section */}
        <div className="bg-gray-900 rounded-lg shadow-md p-6 mb-6 border border-gray-800">
          <div className="flex flex-col items-center space-y-4">
            <label className="flex flex-col items-center px-6 py-8 bg-gray-900 text-blue-400 rounded-lg border-2 border-dashed border-blue-700/50 cursor-pointer hover:bg-gray-800 transition-colors">
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-lg font-semibold">Choose TIFF File</span>
              <input 
                type="file" 
                className="hidden" 
                accept=".tif,.tiff" 
                onChange={handleFileUpload} 
              />
            </label>
            <p className="text-gray-500 text-sm">Supported: .tif, .tiff files</p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 mb-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-blue-400">Processing TIFF file...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-400">{error}</span>
            </div>
          </div>
        )}

        {/* Controls */}
        {metadata && (
          <div className="bg-gray-900 rounded-lg shadow-md p-4 mb-6 border border-gray-800">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Color Map Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color Map:
                </label>
                <select
                  value={colorMap}
                  onChange={(e) => setColorMap(e.target.value)}
                  className="px-3 py-2 border font-medium text-white bg-gray-800 border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="grayscale" className="font-medium text-white truncate max-w-[120px]">Grayscale</option>
                  <option value="viridis" className="font-medium text-white truncate max-w-[120px]">Viridis</option>
                  <option value="inferno" className="font-medium text-white truncate max-w-[120px]">Inferno</option>
                </select>
              </div>

              {/* Download Button */}
              <button
                onClick={downloadImage}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Download PNG
              </button>

              {/* Clear Button */}
              <button
                onClick={clearAll}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Clear & Upload New
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-gray-900 rounded-lg shadow-md overflow-hidden border border-gray-800">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6">
            
            {/* Sidebar Info */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* File Information */}
              {metadata && (
                <div>
                  <h3 className="text-lg font-semibold text-blue-400 mb-3">File Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Name:</span>
                      <span className="font-medium text-gray-200 truncate max-w-[120px]">{metadata.fileName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Size:</span>
                      <span className="font-medium text-gray-200 truncate max-w-[120px]">{metadata.fileSize}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Dimensions:</span>
                      <span className="font-medium text-gray-200 truncate max-w-[120px]">{metadata.width} × {metadata.height}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Bands:</span>
                      <span className="font-medium text-gray-200 truncate max-w-[120px]">{metadata.bands}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Color Map:</span>
                      <span className="capitalize font-medium text-gray-200 truncate max-w-[120px]">{colorMap}</span>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Canvas Display */}
            <div className="lg:col-span-3">
              {/* CHANGE: Dark background, light text */}
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    {metadata ? 'Image Preview' : 'Ready for Upload'}
                  </h3>
                  <span className="text-gray-400 text-sm">
                    {metadata?.width} {metadata?.height && '×'} {metadata?.height} pixels {metadata?.width && '•'} {colorMap}
                  </span>
                </div>
                
                <div className="bg-black rounded overflow-auto max-h-96 flex justify-center items-center min-h-[400px]">
                  <canvas
                    ref={canvasRef}
                    className="max-w-full h-auto border border-gray-600"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default GeoTiffDisplay;