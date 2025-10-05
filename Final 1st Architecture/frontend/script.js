// script.js
const form = document.getElementById('uploadForm');
const inputFile = document.getElementById('hdf5file');
const convertBtn = document.getElementById('convertBtn');
const fileNameSpan = document.getElementById('file-name');
const statusDiv = document.getElementById('status');
const bandSelectorContainer = document.getElementById('band-selector-container');
const cogViewer = document.getElementById('cog-viewer');
const cogLabel = document.getElementById('cog-label');
const viewerControls = document.getElementById('viewer-controls');
const colorMapSelect = document.getElementById('color-map-select');

let cogUrlsMap = new Map(); // To store URLs against band names
let rawPixelData = null; // Store raw data to re-render with new color maps

// --- Optimization: This will hold our pre-rendered image for fast drawing ---
let coloredImageBitmap = null; 

// --- Zoom and Pan Variables ---
let scale = 1.0;
let panX = 0;
let panY = 0;
let isDragging = false;
let startX, startY;

// --- Improved File Input (no changes) ---
inputFile.addEventListener('change', () => {
    if (inputFile.files.length > 0) {
        if (inputFile.files.length === 1) {
            fileNameSpan.textContent = inputFile.files[0].name;
        } else {
            fileNameSpan.textContent = `${inputFile.files.length} files selected`;
        }
        convertBtn.disabled = false;
    } else {
        fileNameSpan.textContent = 'No file chosen';
        convertBtn.disabled = true;
    }
});

// --- Form Submit (no changes) ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    for (const file of inputFile.files) {
        formData.append('hdf5files', file);
    }

    statusDiv.innerHTML = '<div class="spinner"></div><p>Uploading and converting...</p>';
    statusDiv.style.backgroundColor = '#e0e0e0';
    bandSelectorContainer.innerHTML = '';
    cogViewer.style.display = 'none';
    cogLabel.style.display = 'none';
    viewerControls.style.display = 'none';

    try {
        const response = await fetch('http://localhost:4000/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success && result.files.length > 0) {
            statusDiv.textContent = '✅ Success! Select a file and band to view it.';
            statusDiv.style.backgroundColor = '#d4edda';
            createFileAndBandSelectors(result.files);
        } else if (result.success) {
             statusDiv.textContent = '✅ Conversion successful, but no COG files were produced.';
            statusDiv.style.backgroundColor = '#d4edda';
        }
        else {
            statusDiv.textContent = `❌ Error: ${result.message}`;
            statusDiv.style.backgroundColor = '#f8d7da';
        }
    } catch (error) {
        statusDiv.textContent = '❌ A critical error occurred.';
        statusDiv.style.backgroundColor = '#f8d7da';
        console.error('Upload error:', error);
    }
});

// --- Create Selectors (no changes) ---
function createFileAndBandSelectors(files) {
    bandSelectorContainer.innerHTML = ''; // Clear previous selectors

    const fileLabel = document.createElement('label');
    fileLabel.setAttribute('for', 'file-select');
    fileLabel.textContent = 'Select File';
    const fileSelect = document.createElement('select');
    fileSelect.id = 'file-select';

    const bandLabel = document.createElement('label');
    bandLabel.setAttribute('for', 'band-select');
    bandLabel.textContent = 'Select Band';
    const bandSelect = document.createElement('select');
    bandSelect.id = 'band-select';
    
    files.forEach((fileData, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = fileData.fileName;
        fileSelect.appendChild(option);
    });

    function updateBandSelector(fileIndex) {
        bandSelect.innerHTML = '';
        cogUrlsMap.clear();
        const selectedFile = files[fileIndex];

        selectedFile.cogs.forEach(url => {
            const fileName = url.split('/').pop();
            const option = document.createElement('option');
            option.value = fileName;
            option.textContent = fileName;
            bandSelect.appendChild(option);
            cogUrlsMap.set(fileName, `http://localhost:4000${url}`);
        });

        if (bandSelect.options.length > 0) {
            const firstBandName = bandSelect.options[0].value;
            const firstUrl = cogUrlsMap.get(firstBandName);
            displayCog(firstUrl, firstBandName);
        }
    }

    fileSelect.addEventListener('change', (e) => {
        updateBandSelector(e.target.value);
    });

    bandSelect.addEventListener('change', (e) => {
        const selectedFileName = e.target.value;
        const url = cogUrlsMap.get(selectedFileName);
        displayCog(url, selectedFileName);
    });
    
    bandSelectorContainer.appendChild(fileLabel);
    bandSelectorContainer.appendChild(fileSelect);
    bandSelectorContainer.appendChild(bandLabel);
    bandSelectorContainer.appendChild(bandSelect);

    // Initially populate the band selector for the first file
    if (files.length > 0) {
        updateBandSelector(0);
    }
}

// --- MODIFIED: displayCog now calls the new update function ---
async function displayCog(cogUrl, fileName) {
    statusDiv.textContent = `Loading layer...`;
    statusDiv.style.backgroundColor = '#e0e0e0';

    try {
        const response = await fetch(cogUrl);
        const arrayBuffer = await response.arrayBuffer();
        const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
        const image = await tiff.getImage();
        const data = await image.readRasters();
        
        const pixelData = data[0];
        let min = pixelData[0];
        let max = pixelData[0];
        for (let i = 1; i < pixelData.length; i++) {
            if (pixelData[i] < min) min = pixelData[i];
            if (pixelData[i] > max) max = pixelData[i];
        }
        
        rawPixelData = {
            data: pixelData,
            width: image.getWidth(),
            height: image.getHeight(),
            min: min,
            max: max,
        };
        
        // Reset zoom and pan when a new image is loaded
        scale = 1.0;
        panX = 0;
        panY = 0;
        
        // This will now handle the coloring and the initial render
        await updateAndRender();

        cogViewer.style.display = 'block';
        cogLabel.textContent = fileName;
        cogLabel.style.display = 'block';
        viewerControls.style.display = 'block';

    } catch (err) {
        console.error("Error loading or rendering COG:", err);
        statusDiv.textContent = '❌ Failed to load or render the COG layer.';
        statusDiv.style.backgroundColor = '#f8d7da';
        rawPixelData = null;
    }
}

// --- Color Maps (no changes) ---
const colorMaps = {
    grayscale: val => [val, val, val],
    viridis: val => { 
        const r = Math.sin(val * 0.024) * 127 + 128;
        const g = Math.sin(val * 0.024 + 2) * 127 + 128;
        const b = Math.sin(val * 0.024 + 4) * 127 + 128;
        return [r, g, b];
    },
    inferno: val => { 
        const r = Math.pow(val / 255, 0.5) * 255;
        const g = Math.pow(val / 255, 2.5) * 255;
        const b = Math.sin(val / 255 * Math.PI) * 100;
        return [r, g, b];
    }
};

// --- MODIFIED: Color Map selector now calls the new update function ---
colorMapSelect.addEventListener('change', async () => {
    if (rawPixelData) {
        await updateAndRender();
    }
});


// --- NEW: Heavy lifting function to color the image data ---
async function updateAndRender() {
    if (!rawPixelData) return;
    
    statusDiv.textContent = `Rendering layer...`;
    statusDiv.style.backgroundColor = '#e0e0e0';

    // Yield to the main thread so the "Rendering..." message can show up
    await new Promise(resolve => setTimeout(resolve, 0)); 

    const { data, width, height, min, max } = rawPixelData;
    const range = max - min;
    const selectedColorMap = colorMaps[colorMapSelect.value];
    
    // This is the slow part that we are now doing only once
    const imageData = new ImageData(width, height);
    for (let i = 0; i < data.length; i++) {
        let normalizedValue = 0;
        if (range > 0) {
            normalizedValue = ((data[i] - min) / range) * 255;
        }
        const color = selectedColorMap(normalizedValue);
        const pixelIndex = i * 4;
        imageData.data[pixelIndex] = color[0];
        imageData.data[pixelIndex + 1] = color[1];
        imageData.data[pixelIndex + 2] = color[2];
        imageData.data[pixelIndex + 3] = 255;
    }
    
    // Create a bitmap for optimized drawing
    if (coloredImageBitmap) coloredImageBitmap.close(); // Free up memory
    coloredImageBitmap = await createImageBitmap(imageData);

    renderCanvas(); // Call the fast render function
    
    statusDiv.textContent = 'Layer loaded successfully!';
    statusDiv.style.backgroundColor = '#d4edda';
}


// --- MODIFIED: renderCanvas is now very fast ---
function renderCanvas() {
    if (!coloredImageBitmap) return;

    const canvas = document.getElementById('cog-viewer');
    const ctx = canvas.getContext('2d');
    
    // Set the canvas size to match the image to avoid distortion
    canvas.width = coloredImageBitmap.width;
    canvas.height = coloredImageBitmap.height;
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(scale, scale);
    
    // Disable smoothing to see raw pixels when zoomed in
    ctx.imageSmoothingEnabled = false;

    // Draw the pre-rendered image. This is a single, fast operation.
    ctx.drawImage(coloredImageBitmap, 0, 0);

    ctx.restore();
}

// --- Zoom and Pan Event Listeners (no changes) ---
cogViewer.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (!coloredImageBitmap) return;

    const scaleFactor = 1.1;
    const rect = cogViewer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - panX) / scale;
    const worldY = (mouseY - panY) / scale;

    if (e.deltaY < 0) {
        scale *= scaleFactor;
    } else {
        scale /= scaleFactor;
    }

    panX = mouseX - worldX * scale;
    panY = mouseY - worldY * scale;

    renderCanvas();
});

cogViewer.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    cogViewer.style.cursor = 'grabbing';
});

cogViewer.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    renderCanvas();
});

cogViewer.addEventListener('mouseup', () => {
    isDragging = false;
    cogViewer.style.cursor = 'grab';
});

cogViewer.addEventListener('mouseleave', () => {
    isDragging = false;
    cogViewer.style.cursor = 'grab';
});

cogViewer.style.cursor = 'grab';