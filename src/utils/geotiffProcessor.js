import { transformExtent } from 'ol/proj.js';

export const processGeoTIFF = async (file) => {
  try {
    const GeoTIFF = await import('geotiff');
    const arrayBuffer = await file.arrayBuffer();
    const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();
    
    const rasterData = await image.readRasters();
    const width = image.getWidth();
    const height = image.getHeight();
    
    console.log('GeoTIFF loaded:', { 
      width, 
      height, 
      bands: rasterData.length,
      fileSize: file.size 
    });

    let imageExtent;
    // CRITICAL FIX: Override the GeoTIFF's full disk extent with India's BBOX.
    // This forces OpenLayers to place and stretch the image correctly over India.
    const indiaBbox = [68.0, 6.0, 98.0, 36.0]; // Approximate coordinates for India (WGS84: minx, miny, maxx, maxy)
    
    // Transform BBOX from WGS84 (EPSG:4326) to Web Mercator (EPSG:3857)
    imageExtent = transformExtent(indiaBbox, 'EPSG:4326', 'EPSG:3857');
    console.log('Forcing image extent to India BBOX:', indiaBbox, 'Transformed extent:', imageExtent);
    // The original logic to read the full satellite disk bbox is now skipped.
    
    return {
      rasterData,
      width,
      height,
      imageExtent,
      fileName: file.name,
      bands: rasterData.length,
      rawData: { arrayBuffer, file }
    };
    
  } catch (err) {
    console.error('Error processing GeoTIFF:', err);
    throw new Error(`Failed to process GeoTIFF: ${err.message}`);
  }
};

export const createBandCanvas = (bandData, width, height, min, max, applyColorMap, colorMap) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(width, height);

  for (let i = 0; i < bandData.length; i++) {
    const [r, g, b, a] = applyColorMap(bandData[i], min, max, colorMap);
    
    const idx = i * 4;
    imageData.data[idx] = r;
    imageData.data[idx + 1] = g;
    imageData.data[idx + 2] = b;
    imageData.data[idx + 3] = a;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};