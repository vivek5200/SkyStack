// src/hooks/useGeoTIFF.js
import { useState, useEffect, useRef } from 'react';
import TileLayer from 'ol/layer/Tile.js';
import XYZ from 'ol/source/XYZ.js';
import { transformExtent } from 'ol/proj.js';
import axios from 'axios';

export const useGeoTIFF = (mapInstance) => {
    const [sceneData, setSceneData] = useState(null);
    const [selectedBands, setSelectedBands] = useState([]);
    const [tiffLayers, setTiffLayers] = useState([]);
    const [selectedBand, setSelectedBand] = useState(0);
    const [colorMap, setColorMap] = useState('viridis');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [workflowProgress, setWorkflowProgress] = useState(0);
    const [workflowStatusMessage, setWorkflowStatusMessage] = useState('');
    const socketRef = useRef(null);
    const [activeJobId, setActiveJobId] = useState(null);
    const [jobStatus, setJobStatus] = useState(null);
    const [vizInfo, setVizInfo] = useState(null);
    const [currentOperationType, setCurrentOperationType] = useState(null);
    const [workflowColorMap, setWorkflowColorMap] = useState('viridis');
    const [vizLayerReady, setVizLayerReady] = useState(false); 

    // --- State for S3 Scene Loading ---
    const [s3Scenes, setS3Scenes] = useState([]);
    const [s3ScenesLoading, setS3ScenesLoading] = useState(false);
    const [s3ScenesError, setS3ScenesError] = useState(null);

    // --- API URLs ---
    const WORKFLOW_API_BASE_URL = import.meta.env.VITE_WORKFLOW_API_BASE_URL || 'http://api-lb-production-716552440.ap-south-1.elb.amazonaws.com';
    const TITILER_API_BASE_URL = import.meta.env.VITE_TITILER_API_BASE_URL || 'http://localhost:8000';

    // --- S3 API Endpoints from your main.py ---
    const S3_ROOT_URL = `${WORKFLOW_API_BASE_URL}/s3/root`;
    const S3_LIST_URL = `${WORKFLOW_API_BASE_URL}/s3/list`;
    const S3_PRESIGN_URL = `${WORKFLOW_API_BASE_URL}/s3/presign`;
    const S3_READ_URL = `${WORKFLOW_API_BASE_URL}/s3/read`;

    const INDIA_BBOX_WGS84 = '45,-15,120,55';

    // --- Default Filter Values ---
    const defaultFilterValues = {
        transparency: 100,
        brightness: 0,
        contrast: 0,
        saturation: 0,
        exposure: 0,
        hue: 0
    };

    // ### START FIX 1: Add prerender/postrender helper functions ###

    // This function will be called on 'prerender'
    const handlePreRender = function (evt) {
        const ctx = evt.context;
        if (!ctx) return;

        const filterValues = this.get('filterValues');
        ctx.save(); // Save the canvas state

        if (filterValues) {
            const filterParts = [];

            // Combine brightness and exposure into a single brightness filter
            const totalBrightness = 1 + (filterValues.brightness + filterValues.exposure) / 100;
            if (totalBrightness !== 1) {
                filterParts.push(`brightness(${totalBrightness})`);
            }

            if (filterValues.contrast !== 0) {
                const contrastValue = 1 + (filterValues.contrast / 100);
                filterParts.push(`contrast(${contrastValue})`);
            }

            if (filterValues.saturation !== 0) {
                const saturationValue = 1 + (filterValues.saturation / 100);
                filterParts.push(`saturate(${saturationValue})`);
            }

            if (filterValues.hue !== 0) {
                filterParts.push(`hue-rotate(${filterValues.hue}deg)`);
            }

            const filterString = filterParts.join(' ') || 'none';
            ctx.filter = filterString; // Apply the filter to the context
        } else {
            ctx.filter = 'none';
        }
    };

    // This function will be called on 'postrender'
    const handlePostRender = function (evt) {
        const ctx = evt.context;
        if (!ctx) return;
        ctx.restore(); // Restore the canvas state, removing the filter
    };

    // ### END FIX 1 ###


    useEffect(() => {
        axios.defaults.withCredentials = false;

        // Fetch S3 scenes on mount
        fetchS3Scenes();

        return () => {
            disconnectSocket();
        };
    }, []);

    // --- S3 Scene Loading Functions ---
    const fetchS3Scenes = async () => {
        setS3ScenesLoading(true);
        setS3ScenesError(null);
        try {
            const response = await axios.get(S3_ROOT_URL);
            if (response.data && Array.isArray(response.data.prefixes)) {
                setS3Scenes(response.data.prefixes);
            } else {
                console.warn("Unexpected S3 scene format. 'prefixes' array not found:", response.data);
                setS3Scenes([]);
            }
        } catch (err) {
            console.error("Failed to fetch S3 scenes:", err);
            setS3ScenesError(err.message || 'Failed to load scenes from S3');
        } finally {
            setS3ScenesLoading(false);
        }
    };

    // --- WebSocket Functions ---
    const disconnectSocket = () => {
        if (socketRef.current) {
            console.log('Disconnecting WebSocket...');
            socketRef.current.close();
            socketRef.current = null;
        }
    };

    const handleSocketMessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            const data = message.data;
            console.log('Raw message received from server:', event.data);
            switch (message.type) {
                case 'initial_status':
                case 'status_update':
                    
                    if (data?.status) {
                        setJobStatus(data.status);
                        
                        if (data.status === 'MERGE_STARTED') {
                            setWorkflowStatusMessage('Merging tiles into final mosaic...');
                            setWorkflowProgress(100); // Keep progress at 100
                        } else if (data.status === 'MOSAIC_CREATED') {
                            setWorkflowStatusMessage('✅ Mosaic Created. Loading visualization...');
                            setWorkflowProgress(100);
                        } else if (data?.human_status) {
                            setWorkflowStatusMessage(data.human_status);
                        }
                    } else if (data?.human_status) {
                        setWorkflowStatusMessage(data.human_status);
                    }

                    if (data?.processing_progress && data.status !== 'MERGE_STARTED' && data.status !== 'MOSAIC_CREATED') { 
                        const { processed_tiles, total_tiles } = data.processing_progress;
                        if (total_tiles > 0) {
                            const percent = Math.round((processed_tiles / total_tiles) * 100);
                            setWorkflowProgress(percent);
                        }
                    }

                    if (data?.status === 'MOSAIC_CREATED' && data.visualization) {
                        console.log("MOSAIC_CREATED: Storing visualization data.");
                        setVizInfo(data.visualization);
                    }
                    if (data?.status === 'FAILED' || data?.status === 'MOSAIC_INCOMPLETE' || data?.status === 'MERGE_FAILED') {
                        setError(`Workflow failed: ${data.human_status || data.status}`);
                        setLoading(false);
                        setWorkflowProgress(0);
                        setWorkflowStatusMessage(`Error: ${data.human_status || data.status}`);
                        disconnectSocket();
                    }
                    break;
                case 'merge_started':
                    console.log('Backend started merging tiles.');
                    setWorkflowStatusMessage('Merging tiles into final mosaic...');
                    setWorkflowProgress(100);
                    break;
                case 'error':
                    setError(`Workflow error: ${message.message}`);
                    setLoading(false);
                    setWorkflowProgress(0);
                    setWorkflowStatusMessage('');
                    disconnectSocket();
                    break;
                default:
                    console.warn('Unknown WebSocket message type:', message.type);
            }
        } catch (error) {
            console.error('Failed to parse socket message:', error);
        }
    };

    const connectSocket = (jobId) => {
        if (socketRef.current) {
            disconnectSocket();
        }
        const wsUrl = (WORKFLOW_API_BASE_URL || 'http://localhost:8000')
            .replace('http://', 'ws://')
            .replace('https://', 'wss://');
        const socket = new WebSocket(`${wsUrl}/ws/workflows/${jobId}`);
        console.log(`Connecting to WebSocket for job ${jobId}...`);

        socket.onopen = () => {
            console.log('WebSocket connected.');
        };
        socket.onmessage = handleSocketMessage;
        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            setError('WebSocket connection failed.');
            setLoading(false);
        };

        socket.onclose = () => {
            console.log('WebSocket disconnected.');
        };

        socketRef.current = socket;
    };

    // Helper function to poll for job existence before connecting WebSocket
    const waitForJobToExist = async (jobId, retries = 10, delay = 500) => {
        const initialDelay = 5000;

        for (let i = 0; i < retries; i++) {
            try {
                const waitTime = (i === 0) ? initialDelay : delay;
                await new Promise(resolve => setTimeout(resolve, waitTime));

                console.log(`(Attempt ${i + 1}/${retries}) Checking for job ${jobId}...`);
                await axios.get(`${WORKFLOW_API_BASE_URL}/workflows/${jobId}`);

                return true;
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    console.log(`Job not found yet, will retry...`);
                } else {
                    console.error("Error checking job status:", error.message);
                    return false;
                }
            }
        }
        console.error(`Timed out waiting for job ${jobId} to exist.`);
        return false;
    };

    // --- Scene Selection and File Processing ---
    const handleSceneSelect = async (scenePrefix) => {
        if (!scenePrefix) return;

        setLoading(true);
        setError(null);
        clearAllLayers();

        try {
            const allFiles = []; // This will store all files from all sub-folders

            // 1. Recursive function to fetch all contents
            const fetchContents = async (prefix) => {
                console.log(`Fetching contents for prefix: ${prefix}`);
                try {
                    const response = await axios.get(S3_LIST_URL, {
                        params: { prefix }
                    });

                    // 2. Add all files (objects) from this level
                    if (response.data && response.data.contents && Array.isArray(response.data.contents.objects)) {
                        allFiles.push(...response.data.contents.objects);
                    }

                    // 3. Recursively fetch contents of all sub-folders
                    if (response.data && response.data.contents && Array.isArray(response.data.contents.folders)) {
                        // Create a list of promises
                        const folderPromises = response.data.contents.folders.map(folderPrefix =>
                            fetchContents(folderPrefix)
                        );
                        // Run all recursive calls in parallel for speed
                        await Promise.all(folderPromises);
                    }
                } catch (err) {
                    console.error(`Failed to fetch contents for prefix: ${prefix}`, err);
                    // Don't stop the whole process, just log the error
                }
            };

            // --- Start the recursive fetch ---
            await fetchContents(scenePrefix);
            // --- All files are now in the `allFiles` array ---

            console.log(`Found ${allFiles.length} total files.`);

            // 4. Find, fetch, and parse the manifest file
            let manifestData = null;
            const manifestFile = allFiles.find(file =>
                file.key.toLowerCase().endsWith('manifest.json') ||
                file.key.toLowerCase().endsWith('metadata.json') ||
                file.key.toLowerCase().endsWith('mtl.txt')
            );

            if (manifestFile) {
                try {
                    const manifestContentResponse = await axios.get(S3_READ_URL, {
                        params: { key: manifestFile.key }
                    });

                    if (manifestContentResponse.data && manifestContentResponse.data.data) {
                        const content = manifestContentResponse.data.data;
                        if (typeof content === 'object') {
                            manifestData = content;
                        } else if (typeof content === 'string') {
                            if (manifestFile.key.toLowerCase().endsWith('.txt')) {
                                manifestData = parseMTLFile(content);
                            } else {
                                manifestData = JSON.parse(content);
                            }
                        }
                    } else {
                        console.warn("Manifest proxy response did not contain 'data' field:", manifestContentResponse.data);
                    }
                } catch (err) {
                    console.error("Failed to fetch or parse manifest file via proxy:", err);
                    setError("Scene files loaded, but failed to load metadata file.");
                }
            }

            // 5. Build the final sceneData object
            const sceneName = scenePrefix.replace(/\/$/, '');

            const scene = {
                id: sceneName,
                name: sceneName,
                files: allFiles.map(file => {
                    const fileName = file.key.split('/').pop();
                    return {
                        id: file.key,
                        name: fileName,
                        size: file.size_bytes || 0,
                        s3_key: file.key,
                        file: null,
                        url: null,
                        category: categorizeFile(fileName, manifestData),
                        uploaded: true,
                        metadata: extractFileMetadata(fileName, manifestData)
                    };
                }),
                manifest: manifestData,
                timestamp: new Date().toISOString()
            };

            setSceneData(scene);
            setSelectedBands([]);

        } catch (err) {
            console.error('Error processing S3 scene list:', err);
            setError('Failed to load scene files: ' + err.message);
            setSceneData(null);
        } finally {
            setLoading(false);
        }
    };

    // --- S3 Band Loading ---
    const loadS3BandLayer = async (band) => {
        try {
            const presignResponse = await axios.get(S3_PRESIGN_URL, {
                params: { key: band.s3_key }
            });
            const s3FileUrl = presignResponse.data.url;

            if (!s3FileUrl) {
                throw new Error("Backend did not return a pre-signed URL.");
            }

            const encodedFileUrl = encodeURIComponent(s3FileUrl);
            const TILE_URL_TEMPLATE =
                `${TITILER_API_BASE_URL}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}@1x.png` +
                `?url=${encodedFileUrl}` +
                `&colormap_name=${colorMap}` +
                `&bbox=${INDIA_BBOX_WGS84}`;

            const extent3857 = transformExtent(
                INDIA_BBOX_WGS84.split(',').map(coord => parseFloat(coord)),
                'EPSG:4326',
                'EPSG:3857'
            );

            const imageLayer = new TileLayer({
                source: new XYZ({
                    url: TILE_URL_TEMPLATE,
                    projection: 'EPSG:3857',
                    crossOrigin: 'anonymous',
                }),
                extent: extent3857,
                opacity: 0.8,
                visible: true,
                name: `${band.name} (India Crop)`,
            });

            imageLayer.setProperties({
                isGeoTIFF: true,
                isBasemap: false,
                layerType: 'geotiff',
                fileName: band.name,
                s3_key: band.s3_key,
                filterValues: { ...defaultFilterValues } // Initialize with default values
            });

            // ### START FIX 2: Attach prerender/postrender listeners ###
            imageLayer.on('prerender', handlePreRender);
            imageLayer.on('postrender', handlePostRender);
            // ### END FIX 2 ###

            imageLayer.getSource().on('tileloaderror', (event) => {
                console.error('Tile load error:', event);
                console.error('Failed tile URL:', event.tile.src_);
                setError(`Tile load error for ${band.name}. Check local TiTiler logs.`);
            });

            if (mapInstance.current) {
                mapInstance.current.getLayers().forEach(layer => {
                    if (layer instanceof TileLayer && layer.get('isGeoTIFF')) {
                        layer.setVisible(false);
                    }
                });
                mapInstance.current.addLayer(imageLayer);
            }

            setTiffLayers(prev => {
                const updatedPrev = prev.map(layer => {
                    layer.layer.setVisible(false);
                    return { ...layer, visible: false };
                });

                const newLayer = {
                    id: band.s3_key,
                    name: `${band.name} (India Crop)`,
                    layer: imageLayer,
                    visible: true,
                    opacity: 0.8,
                    fileName: band.name,
                    fileSize: band.size,
                    s3_key: band.s3_key,
                    tileUrlTemplate: TILE_URL_TEMPLATE,
                    metadata: {
                        extent: extent3857,
                        uploadedAt: new Date().toISOString(),
                        filterValues: { ...defaultFilterValues }, // Use default values
                        s3PresignedUrl: s3FileUrl
                    }
                };
                return [...updatedPrev, newLayer];
            });

            setSelectedBand(0);

            if (mapInstance.current) {
                mapInstance.current.getView().fit(extent3857, {
                    duration: 1000,
                    maxZoom: 8,
                    padding: [50, 50, 50, 50]
                });
            }

        } catch (err) {
            console.error('Error in S3 band loading:', err);
            let errorMessage = `Failed to process ${band.name}. `;
            errorMessage += err.message || 'Unknown error occurred';
            setError(errorMessage);
            throw err;
        }
    };

    // --- Band Selection ---
    const handleBandSelect = async (band, isSelected) => {
        const selectedImageBandsCount = selectedBands.filter(b => b.category === 'image_bands').length;
        const MAX_BANDS_ALLOWED = 2;

        if (isSelected) {
            if (band.category === 'image_bands' && selectedImageBandsCount >= MAX_BANDS_ALLOWED) {
                setError(`Maximum of ${MAX_BANDS_ALLOWED} image bands can be selected simultaneously.`);
                return;
            }

            setSelectedBands(prev => [...prev, { ...band, loading: true }]);
            setError(null);

            if (band.category === 'image_bands' && (band.name.toLowerCase().endsWith('.tif') || band.name.toLowerCase().endsWith('.tiff'))) {
                try {
                    await loadS3BandLayer(band);
                    setSelectedBands(prev => prev.map(b =>
                        b.id === band.id ? { ...b, loading: false, loaded: true } : b
                    ));
                } catch (error) {
                    setSelectedBands(prev => prev.filter(b => b.id !== band.id));
                }
            }
        } else {
            setSelectedBands(prev => prev.filter(b => b.id !== band.id));
            if (band.category === 'image_bands') {
                removeLayer(band.id);
            }
            setError(null);
        }
    };

    const handleBandRemove = (bandId) => {
        setSelectedBands(prev => prev.filter(band => band.id !== bandId));
        removeLayer(bandId);
    };

    // --- Workflow Operation with WebSocket ---
    const handleOperation = async (operationData) => {
        setLoading(true);
        setError(null);
        setWorkflowProgress(0);
        setWorkflowStatusMessage('Submitting job...');
        setJobStatus(null);
        setActiveJobId(null);
        setVizInfo(null);
        setVizLayerReady(false); 

        setCurrentOperationType(operationData.type);

        try {
            const {
                type,
                expression,
                colorMap: opColorMap,
            } = operationData;

            setWorkflowColorMap(opColorMap); // Save the colormap for the result

            if (type === 'reset') {
                clearAllLayers();
                setLoading(false);
                return;
            }

            if (type === 'client_side_math' || type === 'ndvi' || type === 'ndbi' || type === 'ndwi' || type === 'savi' || type === 'evi' || type === 'custom' || type === 'your_test') {

                const datasetId = sceneData?.name;
                if (!datasetId) {
                    throw new Error("No Scene/Folder loaded. Please select a scene from the 'Bands' tab first.");
                }
                if (!expression) {
                    throw new Error("No formula/expression provided for the operation.");
                }

                const workflowRequest = {
                    workflow_id: "ndvi_request_postman_test", // This should probably be dynamic
                    dataset_id: datasetId,
                    tasks: [
                        {
                            task_id: "calculate_ndvi", // This should probably be dynamic
                            operation: 'band_math',
                            parameters: {
                                formula: expression,
                            },
                            dependencies: []
                        }
                    ]
                };

                const startResponse = await axios.post(`${WORKFLOW_API_BASE_URL}/workflows`, workflowRequest);

                if (!startResponse.data || !startResponse.data.job_id) {
                    throw new Error("Backend did not return a job_id. Ensure SQS_QUEUE_URL is set on the server.");
                }

                const jobId = startResponse.data.job_id;

                console.log(`Job ${jobId} submitted. Waiting for backend to create job record...`);
                setWorkflowStatusMessage('Waiting for job to initialize...');

                const jobExists = await waitForJobToExist(jobId);

                if (!jobExists) {
                    throw new Error("Job failed to initialize on the backend after 5 seconds.");
                }

                console.log(`Job ${jobId} is active. Connecting to WebSocket...`);
                setWorkflowStatusMessage('Connecting to real-time updates...');

                setActiveJobId(jobId);
                connectSocket(jobId);
            }

        } catch (err) {
            console.error('=== Job Submission Error ===', err);
            const errorMessage = err.response?.data?.message || err.response?.data?.detail || err.message;
            setError(`Failed to start job: ${errorMessage}`);
            setLoading(false);
            setWorkflowProgress(0);
            setWorkflowStatusMessage('');
        }
    };

    // --- Download Mosaic ---
    const handleDownloadMosaic = async () => {
        if (!activeJobId) {
            setError("No active job ID found to download.");
            console.error("Download failed: activeJobId is null.");
            return;
        }

        console.log(`Requesting download URL for job ${activeJobId}...`);
        setWorkflowStatusMessage("Preparing download...");

        try {
            const response = await axios.get(`${WORKFLOW_API_BASE_URL}/workflows/${activeJobId}/download`);
            const downloadUrl = response.data?.download_url;

            if (!downloadUrl) {
                throw new Error("Backend did not return a download_url.");
            }

            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `mosaic_${activeJobId}.tif`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setWorkflowStatusMessage("✅ Mosaic ready");

        } catch (err) {
            console.error('Failed to get download URL:', err);
            setError(`Download failed: ${err.message}`);
            setWorkflowStatusMessage("Download failed");
        }
    };

    // --- Visualization Layer Creation ---
    useEffect(() => {
        if (vizInfo && mapInstance.current) {
            console.log('vizInfo state updated! Fetching statistics and adding layer to map...');

            const fetchStatsAndAddLayer = async () => {
                let rescale = null;

                try {
                    if (!vizInfo.tiles_url || !vizInfo.statistics_url) {
                        throw new Error("Visualization data from WebSocket is missing 'tiles_url' or 'statistics_url'");
                    }

                    // 1. Try to fetch statistics
                    try {
                        console.log(`Fetching stats from: ${vizInfo.statistics_url}`);
                        const statsResponse = await axios.get(vizInfo.statistics_url);
                        rescale = statsResponse.data?.recommended_rescale; 
                        console.log(`Received recommended rescale: ${rescale}`);
                    } catch (statsError) {
                        console.warn(`Could not fetch statistics: ${statsError.message}`);
                        console.warn("Proceeding to load map without rescale parameter. Artifacts may be visible.");
                    }

                    // 2. Build the new URL
                    const TILE_URL_TEMPLATE = vizInfo.tiles_url;
                    let finalTileUrl = TILE_URL_TEMPLATE;
                    
                    // --- FIX #1: Use 'colormap_name' ---
                    const paramName = 'colormap_name';
                    const colormapRegex = new RegExp(`${paramName}=[^&]+`);
            
                    if (!finalTileUrl.includes(`${paramName}=`)) {
                        finalTileUrl += (finalTileUrl.includes('?') ? '&' : '?') + `${paramName}=${workflowColorMap}`;
                    } else {
                        finalTileUrl = finalTileUrl.replace(colormapRegex, `${paramName}=${workflowColorMap}`);
                    }
                    // --- END FIX #1 ---

                    if (rescale) {
                        finalTileUrl += `&rescale=${rescale}`;
                    }
                    console.log(`Final Tile URL: ${finalTileUrl}`);

                    // 3. Add layer to map
                    const extent3857 = transformExtent(
                        INDIA_BBOX_WGS84.split(',').map(coord => parseFloat(coord)),
                        'EPSG:4326',
                        'EPSG:3857'
                    );

                    const resultLayer = new TileLayer({
                        source: new XYZ({
                            url: finalTileUrl,
                            projection: 'EPSG:3857',
                            crossOrigin: 'anonymous',
                        }),
                        extent: extent3857,
                        opacity: 1.0,
                        visible: true,
                        name: `Workflow Result`,
                    });

                    resultLayer.setProperties({
                        isGeoTIFF: true,
                        isBasemap: false,
                        layerType: 'band_math',
                        fileName: `${sceneData?.name || 'workflow'}_result`,
                        filterValues: { ...defaultFilterValues } // Initialize with default values
                    });

                    // ### START FIX 3: Attach prerender/postrender listeners ###
                    resultLayer.on('prerender', handlePreRender);
                    resultLayer.on('postrender', handlePostRender);
                    // ### END FIX 3 ###

                    mapInstance.current.getLayers().forEach(layer => {
                        if (layer instanceof TileLayer && !layer.get('isBasemap')) {
                            layer.setVisible(false);
                        }
                    });
                    mapInstance.current.addLayer(resultLayer);

                    const newLayer = {
                        id: `math-${Date.now()}`,
                        name: resultLayer.get('name'),
                        layer: resultLayer,
                        visible: true,
                        opacity: 1.0,
                        fileName: `${sceneData?.name || 'workflow'}_result`,
                        tileUrlTemplate: finalTileUrl,
                        metadata: {
                            type: 'band_math_workflow',
                            sourceBands: [sceneData?.name],
                            uploadedAt: new Date().toISOString(),
                            filterValues: { ...defaultFilterValues },
                            rescale: rescale || null 
                        }
                    };

                    setTiffLayers(prev => {
                        const updatedPrev = prev.map(layer => {
                            layer.layer.setVisible(false);
                            return { ...layer, visible: false };
                        });
                        return [...updatedPrev, newLayer];
                    });
                    
                    setVizLayerReady(true); 

                } catch (vizError) {
                    console.error('Failed to add visualization layer:', vizError);
                    setError(`Job finished, but failed to load map layer: ${vizError.message}`);
                } finally {
                    setLoading(false);
                    disconnectSocket();
                    setVizInfo(null);
                }
            };

            fetchStatsAndAddLayer();
        }
    }, [vizInfo, mapInstance, workflowColorMap, sceneData?.name]);

    // --- Effects Application Functions ---
    const handleColorMapChange = (newColorMap) => {
        setColorMap(newColorMap);
        refreshLayersWithNewColormap(newColorMap);
    };

    const refreshLayersWithNewColormap = (newColorMap) => {
        setTiffLayers(prev => prev.map(layer => {
            let newTileUrl = layer.tileUrlTemplate;

            if (layer.visible && layer.tileUrlTemplate) {
                const currentColormap = newColorMap || colorMap;
                const existingUrl = layer.tileUrlTemplate;
                const colormapRegex = /colormap_name=[^&]+/;

                if (layer.layer.getSource().getUrls() && layer.layer.getSource().getUrls()[0].startsWith(TITILER_API_BASE_URL)) {
                    if (existingUrl.match(colormapRegex)) {
                        newTileUrl = existingUrl.replace(colormapRegex, `colormap_name=${currentColormap}`);
                    } else {
                        newTileUrl = `${existingUrl}&colormap_name=${currentColormap}`;
                    }
                    layer.layer.getSource().setUrl(newTileUrl);
                    layer.layer.getSource().refresh();
                
                // --- FIX #2: Use 'colormap_name' for workflow URLs ---
                } else if (layer.layer.getSource().getUrls() && layer.layer.getSource().getUrls()[0].startsWith(WORKFLOW_API_BASE_URL)) {
                    
                    const urlParts = existingUrl.split('?');
                    const baseUrl = urlParts[0];
                    const params = new URLSearchParams(urlParts[1] || '');
                    
                    params.set('colormap_name', currentColormap); // <-- Set the correct param
                    
                    newTileUrl = `${baseUrl}?${params.toString()}`;
                    
                    layer.layer.getSource().setUrl(newTileUrl);
                    layer.layer.getSource().refresh();
                }
                // --- END FIX #2 ---

                // Re-apply filters after colormap change
                const filterValues = layer.layer.get('filterValues');
                if (filterValues) {
                    layer.layer.changed();
                }
            }
            return { ...layer, tileUrlTemplate: newTileUrl || layer.tileUrlTemplate };
        }));
    };

    // ### START FIX 4: Confirm handleApplyEffect is correct ###
    // This function now correctly forces a re-render for real-time updates
    const handleApplyEffect = (layerId, newFilterValues) => {
        setTiffLayers(prev => prev.map(layer => {
            if (layer.id === layerId) {
                const newOpacity = newFilterValues.transparency / 100;

                // Update the OpenLayers layer properties
                layer.layer.setOpacity(newOpacity);
                layer.layer.set('filterValues', newFilterValues);

                // Force the layer to re-render with new filters
                layer.layer.changed();

                // Trigger map re-render
                if (mapInstance.current) {
                    mapInstance.current.render(); // This forces the map to redraw *now*
                }

                return {
                    ...layer,
                    opacity: newOpacity,
                    metadata: {
                        ...layer.metadata,
                        filterValues: newFilterValues
                    }
                };
            }
            return layer;
        }));
    };
    // ### END FIX 4 ###

    const toggleLayerVisibility = (layerId) => {
        setTiffLayers(prev => prev.map(layer => {
            if (layer.id === layerId) {
                const newVisibility = !layer.visible;
                layer.layer.setVisible(newVisibility);
                return { ...layer, visible: newVisibility };
            }
            layer.layer.setVisible(false);
            return { ...layer, visible: false };
        }));
    };

    const updateLayerOpacity = (layerId, opacity) => {
        setTiffLayers(prev => prev.map(layer => {
            if (layer.id === layerId) {
                layer.layer.setOpacity(opacity);
                return { ...layer, opacity };
            }
            return layer;
        }));
    };

    const removeLayer = (layerId) => {
        setTiffLayers(prev => {
            const layerToRemove = prev.find(layer => layer.id === layerId);
            if (layerToRemove && mapInstance.current) {
                mapInstance.current.removeLayer(layerToRemove.layer);
            }
            return prev.filter(layer => layer.id !== layerId);
        });
    };

    const clearAllLayers = () => {
        setTiffLayers(prev => {
            prev.forEach(layer => {
                if (mapInstance.current) {
                    mapInstance.current.removeLayer(layer.layer);
                }
            });
            return [];
        });
        setSelectedBands([]);
    };

    const getUniqueFiles = () => {
        const files = {};
        tiffLayers.forEach(layer => {
            if (!files[layer.fileName]) {
                files[layer.fileName] = {
                    fileName: layer.fileName,
                    bands: [],
                    layerCount: 0
                };
            }
            files[layer.fileName].bands.push(layer);
            files[layer.fileName].layerCount++;
        });
        return Object.values(files);
    };

    const handleUpdateColormap = async (colormapData) => {
        setColorMap(colormapData);
    };

    const handleExport = async (bbox) => {
        setLoading(true);
        setError(null);

        try {
            const activeLayer = tiffLayers.find(l => l.visible);
            if (!activeLayer) {
                throw new Error('No active layer found for export.');
            }

            // CASE 1: The active layer is a PROCESSED WORKFLOW (e.g., NDVI)
            if (activeLayer.metadata.type === 'band_math_workflow') {
                const jobIdMatch = activeLayer.tileUrlTemplate.match(/\/viz\/([^\/]+)\//);
                if (!jobIdMatch || !jobIdMatch[1]) {
                    throw new Error("Could not parse Job ID from processed layer URL.");
                }
                const jobId = jobIdMatch[1];

                const exportUrl = `${WORKFLOW_API_BASE_URL}/workflows/${jobId}/download/bbox`;

                // --- FIX #3: Use 'colormap_name' in export payload ---
                const payload = {
                    min_lon: bbox[0],
                    min_lat: bbox[1],
                    max_lon: bbox[2],
                    max_lat: bbox[3],
                    format: "geotiff",
                    width: 1024,
                    height: 1024,
                    colormap_name: colorMap, // <-- FIX: Use colormap_name
                    rescale: activeLayer.metadata.rescale || "0,100" // Use stored metadata or default to "0,100"
                };
                // --- END FIX #3 ---

                console.log(`Sending POST request to ${exportUrl}`, payload);

                const response = await axios.post(exportUrl, payload, {
                    responseType: 'blob', // This is crucial for file downloads
                });

                const blobUrl = window.URL.createObjectURL(new Blob([response.data]));

                const link = document.createElement('a');
                link.href = blobUrl;
                link.setAttribute('download', `export_${jobId}_${Date.now()}.tif`);
                document.body.appendChild(link);
                link.click();

                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);

            // CASE 2: The active layer is a RAW S3 BAND (e.g., IMG_VIS)
            } else {
                const sourceUrl = activeLayer.metadata.s3PresignedUrl;
                if (!sourceUrl) {
                    throw new Error('Active layer S3 source URL not found.');
                }
                const baseUrlForCrop = TITILER_API_BASE_URL;

                const bboxString = bbox.join(',');
                const encodedPath = encodeURIComponent(sourceUrl);

                // This endpoint hits localhost:8000/cog/crop
                const endpoint =
                    `${baseUrlForCrop}/cog/crop?url=${encodedPath}&bbox=${bboxString}&format=GTiff`;

                console.log(`Sending GET request to local TiTiler: ${endpoint}`);

                const link = document.createElement('a');
                link.href = endpoint;
                link.target = '_blank'; // Open in new tab (safer for GET requests)
                link.download = `export_${Date.now()}.tif`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            return true;

        } catch (err) {
            console.error('❌ Export failed:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Unknown error occurred';
            setError(`Export failed: ${errorMessage}. Please ensure backend services are running.`);
            return false;
        } finally {
            setLoading(false);
        }
    };

    // --- Helper Functions for File Categorization ---
    const parseMTLFile = (content) => {
        const metadata = {};
        const lines = content.split('\n');

        lines.forEach(line => {
            const match = line.match(/^\s*(\w+)\s*=\s*(.+)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim().replace(/"/g, '');

                if (!isNaN(value) && value !== '' && !value.includes('-')) {
                    value = Number(value);
                }

                metadata[key] = value;
            }
        });
        return metadata;
    };

    const findInCategory = (manifestSection, fileName) => {
        if (!manifestSection) return false;
        if (Array.isArray(manifestSection)) {
            return manifestSection.some(item => item.toLowerCase() === fileName.toLowerCase());
        }
        if (typeof manifestSection === 'object' && manifestSection !== null) {
            return Object.values(manifestSection).some(item =>
                (typeof item === 'object' && item.file_name && item.file_name.toLowerCase() === fileName.toLowerCase()) ||
                (typeof item === 'string' && item.toLowerCase() === fileName.toLowerCase())
            );
        }
        return false;
    };

    const categorizeFile = (fileName, manifestData) => {
        const name = fileName.toLowerCase();

        // 1. Try manifest-based categorization first
        if (manifestData) {
            // Check root level
            if (findInCategory(manifestData.image_bands, fileName)) return 'image_bands';
            if (findInCategory(manifestData.geolocation_data, fileName)) return 'geolocation';
            if (findInCategory(manifestData.auxiliary_data, fileName)) return 'auxiliary';
            if (findInCategory(manifestData.overview_metadata, fileName)) return 'overview';

            // Check nested 'files' object
            if (manifestData.files) {
                if (findInCategory(manifestData.files.image_bands, fileName)) return 'image_bands';
                if (findInCategory(manifestData.files.geolocation, fileName)) return 'geolocation';
                if (findInCategory(manifestData.files.auxiliary, fileName)) return 'auxiliary';
                if (findInCategory(manifestData.files.overview, fileName)) return 'overview';
            }

            // Check for the manifest file itself
            if (name.includes('manifest') || name.includes('mtl') || name.endsWith('.txt')) {
                return 'overview';
            }
        }

        // 2. Fallback to filename-based guessing if manifest fails
        if (name.includes('img_') || name.includes('band') || name.endsWith('.tif') || name.endsWith('.tiff')) {
            if (name.includes('latitude') || name.includes('longitude') || name.includes('geo')) return 'geolocation';
            if (name.includes('azimuth') || name.includes('elevation') || name.includes('aux')) return 'auxiliary';
            return 'image_bands';
        }
        if (name.includes('latitude') || name.includes('longitude') || name.includes('geolocation')) return 'geolocation';
        if (name.includes('azimuth') || name.includes('elevation') || name.includes('.aux')) return 'auxiliary';
        if (name.includes('overview') || name === 'manifest' || name.includes('mtl') || name.endsWith('.txt') || name.endsWith('.json')) return 'overview';

        return 'other';
    };

    const extractFileMetadata = (fileName, manifestData) => {
        const metadata = {};
        const name = fileName.toLowerCase();

        if (manifestData) {
            let fileInfo = null;
            if (manifestData.files && typeof manifestData.files === 'object') {
                for (const category of Object.values(manifestData.files)) {
                    if (typeof category === 'object' && !Array.isArray(category)) {
                        const matchingKey = Object.keys(category).find(k =>
                            (typeof category[k] === 'string' && category[k].toLowerCase() === name) ||
                            (typeof category[k] === 'object' && category[k].file_name && category[k].file_name.toLowerCase() === name)
                        );
                        if (matchingKey) {
                            fileInfo = typeof category[matchingKey] === 'object' ? category[matchingKey] : { file_name: category[matchingKey] };
                            break;
                        }
                    } else if (Array.isArray(category)) {
                        if (category.some(item => item.toLowerCase() === name)) {
                            fileInfo = { file_name: fileName };
                            break;
                        }
                    }
                }
            }

            if (fileInfo) {
                metadata.description = fileInfo.description;
                metadata.bandNumber = fileInfo.band_number || fileInfo.band;
                metadata.wavelength = fileInfo.wavelength;
            }

            // Try LANDSAT MTL style
            const bandKey = Object.keys(manifestData).find(k => k.endsWith('_FILE_NAME') && manifestData[k].toLowerCase() === name);
            if (bandKey) {
                const baseKey = bandKey.replace('_FILE_NAME', '');
                metadata.bandNumber = manifestData[`${baseKey}_BAND_NUMBER`] || baseKey.replace('BAND', '');
                metadata.wavelength = manifestData[`${baseKey}_WAVELENGTH`];
                metadata.description = manifestData[`${baseKey}_DESCRIPTION`];
            }

            metadata.satellite = manifestData.SPACECRAFT_ID || manifestData.SATELLITE;
            metadata.acquisitionDate = manifestData.DATE_ACQUIRED || manifestData.ACQUISITION_DATE;
            metadata.cloudCover = manifestData.CLOUD_COVER;
        }

        // Fallback if no manifest or data not found in manifest
        if (!metadata.description) {
            if (name.includes('img_vis')) metadata.description = "Visible Band";
            else if (name.includes('img_mir')) metadata.description = "Mid-Infrared";
            else if (name.includes('img_tir1')) metadata.description = "Thermal Infrared 1";
            else if (name.includes('img_tir2')) metadata.description = "Thermal Infrared 2";
            else if (name.includes('img_nir')) metadata.description = "Near-Infrared";
            else if (name.includes('latitude')) metadata.description = "Latitude";
            else if (name.includes('longitude')) metadata.description = "Longitude";
            else if (name.includes('sun_azimuth')) metadata.description = "Sun Azimuth Angle";
        }

        return metadata;
    };

    return {
        // S3 scene properties
        s3Scenes,
        s3ScenesLoading,
        s3ScenesError,
        handleSceneSelect,

        // Existing properties
        sceneData,
        selectedBands,
        tiffLayers,
        selectedBand,
        colorMap,
        loading,
        error,
        workflowProgress,
        workflowStatusMessage,
        jobStatus,
        activeJobId,
        vizLayerReady, 

        // Handler functions
        handleColorMapChange,
        handleBandSelect,
        handleBandRemove,
        handleOperation,
        handleDownloadMosaic,
        toggleLayerVisibility,
        updateLayerOpacity,
        removeLayer,
        clearAllLayers,
        getUniqueFiles,
        handleUpdateColormap,
        handleApplyEffect,
        handleExport,
    };
};