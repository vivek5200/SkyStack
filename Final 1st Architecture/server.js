// server.js
const express = require('express');
const multer = require('multer');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.static('frontend'));

// This makes the output folder accessible to the browser
const publicOutputsDir = path.join(__dirname, 'public/outputs');
app.use('/outputs', express.static(publicOutputsDir));

// Configure file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        fs.mkdirSync('uploads', { recursive: true });
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // Use a timestamp to prevent files with the same name from overwriting each other
        cb(null,file.originalname);
    }
});

const upload = multer({ storage: storage });

// The API endpoint that the frontend will send the file to
app.post('/upload', upload.array('hdf5files'), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'No files were uploaded.' });
    }

    const converterExecutable = './converter/hdf5_to_cog'; // Path to the compiled C++ program
    const outputDir = path.join(__dirname, 'public/outputs');
    
    const conversionPromises = req.files.map(file => {
        return new Promise((resolve, reject) => {
            const inputFilePath = file.path;
            console.log(`File received: ${inputFilePath}`);
            console.log('Starting conversion process...');
            
            // Arguments to pass to your C++ program
            const args = ['--outdir', outputDir, inputFilePath];
            
            // Execute your C++ program
            execFile(converterExecutable, args, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Execution Error: ${error.message}`);
                    return reject({ success: false, message: 'Conversion failed.', error: stderr });
                }
                
                console.log(`Converter Output (stdout):\n${stdout}`);
                if (stderr) {
                    console.error(`Converter Error Output (stderr):\n${stderr}`);
                }
                
                // After conversion, find the manifest.json to know where the output files are
                const originalFileName = file.originalname;
                const fileStem = path.basename(originalFileName, path.extname(originalFileName));
                const manifestPath = path.join(outputDir, fileStem, 'manifest.json');
                
                try {
                    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                    
                    // Create web-friendly URLs for the frontend to use
                    const cogFiles = manifest.files
                    .filter(f => f.outputPath.endsWith('.tif'))
                    .map(f => path.join('/outputs', path.relative(outputDir, f.outputPath)).replace(/\\/g, '/'));
                    
                    console.log(`Conversion successful for ${originalFileName}. Found ${cogFiles.length} COG files.`);
                    resolve({
                        fileName: originalFileName,
                        cogs: cogFiles
                    });
                    
                } catch (e) {
                    console.error(`Error reading manifest file: ${e.message}`);
                    reject({ success: false, message: 'Conversion succeeded, but server could not find output files.' });
                }
            });
        });
    });

    Promise.all(conversionPromises)
        .then(results => {
            res.json({
                success: true,
                message: 'All conversions successful!',
                files: results
            });
        })
        .catch(error => {
            res.status(500).json(error);
        });
});


app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});