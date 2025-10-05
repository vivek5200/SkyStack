import os
import json
import boto3
import math
import re

# GeoLambda layer should provide these imports
try:
    import rasterio
    from rasterio.io import MemoryFile
    RASTERIO_AVAILABLE = True
    print("SUCCESS: rasterio imported successfully from GeoLambda layer")
    print(f"Rasterio version: {rasterio.__version__}")
except ImportError as e:
    RASTERIO_AVAILABLE = False
    print(f"WARNING: rasterio not available: {e}")

def handler(event, context):
    """
    This Lambda function translates a high-level DAG into a list of
    parallelizable, tile-based tasks.
    """
    print(f"Translator invoked with event: {json.dumps(event)}")
    
    AWS_ENDPOINT_URL = os.getenv("AWS_ENDPOINT_URL")
    S3_BUCKET_NAME = "insat-cog-processed"

    # Extract job details from the input payload
    dataset_id = event.get("dataset_id")
    user_tasks = event.get("tasks")
    job_id = event.get("job_id")

    if not all([dataset_id, user_tasks, job_id]):
        raise ValueError("FATAL: Missing one or more required fields from input: dataset_id, tasks, job_id")

    # --- Step 1: Read the manifest.json from S3 ---
    manifest_key = f"{dataset_id}/manifest.json"
    print(f"Reading metadata from scene manifest: s3://{S3_BUCKET_NAME}/{manifest_key}")
    
    session = boto3.Session()
    s3_client = session.client("s3", endpoint_url=AWS_ENDPOINT_URL)
    
    try:
        s3_object = s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=manifest_key)
        manifest_content = s3_object['Body'].read().decode('utf-8')
        
        # Clean the JSON content
        manifest_content = manifest_content.replace(',/', ',')
        manifest_content = manifest_content.strip()
        
        manifest_data = json.loads(manifest_content)
        print(f"Successfully parsed manifest JSON with {len(manifest_data.get('files', []))} files")
        
    except json.JSONDecodeError as e:
        print(f"FATAL: Could not parse manifest JSON: {e}")
        raise ValueError(f"Invalid JSON in manifest: {e}")
    except Exception as e:
        print(f"FATAL: Could not read manifest file at {manifest_key}: {e}")
        raise e

    # --- Step 2: Find a high-resolution reference band from the manifest ---
    reference_file_info = None
    for file_info in manifest_data.get('files', []):
        if file_info.get('subdataset', {}).get('name') == 'IMG_VIS':
            reference_file_info = file_info
            break
    
    if not reference_file_info:
        print("WARNING: Could not find 'IMG_VIS' reference band, using first available file")
        if manifest_data.get('files'):
            reference_file_info = manifest_data['files'][0]
        else:
            raise ValueError("FATAL: No files found in manifest")

    print(f"Using reference file: {reference_file_info.get('subdataset', {}).get('name')}")

    # --- Step 3: Use rasterio if available, otherwise fallback ---
    if RASTERIO_AVAILABLE:
        print("SUCCESS: Using rasterio from GeoLambda layer for precise tile information")
        
        full_path = reference_file_info.get('outputPath', '')
        if not full_path:
            raise ValueError("FATAL: No outputPath found in reference file info")
            
        # Extract relative path safely
        if f"{dataset_id}/" in full_path:
            relative_path = full_path.split(f"{dataset_id}/")[-1]
        else:
            relative_path = full_path
            
        reference_cog_key = f"{dataset_id}/{relative_path}"

        print(f"Reading REAL COG metadata from: s3://{S3_BUCKET_NAME}/{reference_cog_key}")
        
        try:
            # Get the COG file from S3
            cog_object = s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=reference_cog_key)
            cog_data = cog_object['Body'].read()
            print(f"Downloaded COG file size: {len(cog_data)} bytes")
            
            # Use rasterio to read COG metadata
            with MemoryFile(cog_data) as memfile:
                with memfile.open() as dataset:
                    width = dataset.width
                    height = dataset.height
                    tile_height, tile_width = dataset.block_shapes[0]
                    num_bands = dataset.count
                    driver = dataset.driver
                    crs = dataset.crs
                    transform = dataset.transform
                    
            print(f"COG Metadata successfully extracted:")
            print(f"  - Image Size: {width}x{height} pixels")
            print(f"  - Tile Size: {tile_width}x{tile_height} pixels")
            print(f"  - Number of Bands: {num_bands}")
            print(f"  - Driver: {driver}")
            print(f"  - CRS: {crs}")
            print(f"  - Transform: {transform}")
            
        except Exception as e:
            print(f"ERROR: Failed to read COG metadata with rasterio: {e}")
            print("Falling back to manifest-based dimensions...")
            # Fallback to values from manifest description
            tile_width = 512
            tile_height = 512
            description = reference_file_info.get('subdataset', {}).get('description', '')
            dimension_match = re.search(r'\[(\d+)x(\d+)x(\d+)\]', description)
            if dimension_match:
                width = int(dimension_match.group(2))
                height = int(dimension_match.group(3))
                print(f"Using dimensions from manifest description: {width}x{height}")
            else:
                width = 2048
                height = 2048
                print(f"Using default dimensions: {width}x{height}")
    else:
        print("WARNING: rasterio not available, using fallback mode")
        # Use default tile sizes
        tile_width = 512
        tile_height = 512
        
        # Extract dimensions from description
        description = reference_file_info.get('subdataset', {}).get('description', '')
        dimension_match = re.search(r'\[(\d+)x(\d+)x(\d+)\]', description)
        if dimension_match:
            width = int(dimension_match.group(2))
            height = int(dimension_match.group(3))
            print(f"Using dimensions from manifest description: {width}x{height}")
        else:
            width = 2048
            height = 2048
            print(f"Using default dimensions: {width}x{height}")
        
        print(f"Using fallback values: ImageSize=({width}x{height}), TileSize=({tile_width}x{tile_height})")

    # --- Step 4: Calculate the grid and generate tile tasks ---
    tiles_x = math.ceil(width / tile_width)
    tiles_y = math.ceil(height / tile_height)
    print(f"Calculated tile grid: {tiles_x} tiles wide by {tiles_y} tiles high.")
    
    tile_tasks = []
    for y in range(tiles_y):
        for x in range(tiles_x):
            tile_tasks.append({
                "dataset_id": dataset_id,
                "job_id": job_id,
                "tile_x_index": x,
                "tile_y_index": y,
                "user_task": user_tasks[0] if user_tasks else {}
            })

    print(f"Generated {len(tile_tasks)} tile tasks for parallel execution.")

    return {
        "job_id": job_id,
        "dataset_id": dataset_id,
        "tile_tasks": tile_tasks
    }