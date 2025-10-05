// C++ Standard Library
#include <iostream>
#include <string>
#include <vector>
#include <stdexcept>
#include <chrono>
#include <filesystem>
#include <regex>
#include <fstream>
#include <unordered_map>
#include <algorithm>
#include <cctype>
#include <iomanip> // For std::put_time

// Third-party Libraries
#include <gdal.h>
#include <gdal_priv.h>
#include <gdal_utils.h>
#include <omp.h>
#include <nlohmann/json.hpp>

namespace fs = std::filesystem;
using json = nlohmann::json;

// --- Manifest Data Structures ---
enum class DatasetType {
    IMAGE_BAND, GEOLOCATION, QUALITY_FLAG, TIME_DATA, AUXILIARY, UNKNOWN
};

// --- New Sub-structures for detailed metadata ---
struct GeospatialInfo {
    std::string crs;
    std::array<double, 6> transform;
};

struct AcquisitionInfo {
    std::string acquisitionTime;
    std::string satellite;
    std::string sensor;
};


struct SubdatasetInfo {
    std::string name;
    std::string description;
    std::string path;
    DatasetType type = DatasetType::UNKNOWN;
    std::string bandName;
    std::string bandType;
    int dimensions = 0;
    
    // --- New Detailed Metadata Fields ---
    int width = 0;
    int height = 0;
    int bands = 0;
    std::string dtype;
    int tileWidth = 0;
    int tileHeight = 0;
    long long sizeBytes = 0;
    std::string checksum;
    std::string role;
    double wavelength_nm = 0.0;
    GeospatialInfo geo;
    AcquisitionInfo acq;
};

struct ProcessedSubdataset {
    SubdatasetInfo info;
    std::string status;
    std::string outputPath;
};

// --- Conversion Options (Moved for accessibility) ---
struct ConversionOptions {
    bool listSubdatasets = false;
    std::string subdatasetName;
    std::vector<std::string> subdatasetPatterns;
    std::string outputDirectory = "output";
    bool overwrite = false;
    bool groupByBand = true;
    int blockSize = 512;
    std::string compress = "LZW";
    int compressionLevel = 6;
    int numThreads = -1;
    bool createOverview = true;
    bool convertImageBands = true;
    bool convertGeolocation = true;
    bool convertQualityFlags = true;
    bool convertTimeData = true;
    bool convertAuxiliary = true;
    bool convertUnknown = true;
};

// --- Top-level Metadata Structure ---
struct Metadata {
    std::string converterVersion = "1.2.0"; // Version updated
    ConversionOptions conversionOptions;
};

struct Manifest {
    std::string inputFile;
    std::string processingTimestamp;
    std::string overviewImage;
    long long processingDurationMs = 0;
    int totalSubdatasets = 0;
    int convertedCount = 0;
    int skippedCount = 0;
    int failedCount = 0;
    std::vector<ProcessedSubdataset> processedFiles;
    Metadata metadata;
};

// --- JSON Serialization Helpers ---
NLOHMANN_JSON_SERIALIZE_ENUM(DatasetType, {
    {DatasetType::UNKNOWN, "Unknown"},
    {DatasetType::IMAGE_BAND, "Image_Band"},
    {DatasetType::GEOLOCATION, "Geolocation"},
    {DatasetType::QUALITY_FLAG, "Quality_Flag"},
    {DatasetType::TIME_DATA, "Time"},
    {DatasetType::AUXILIARY, "Auxiliary"}
})

// Helper to handle optional JSON fields
template <typename T>
void add_if_not_empty(json& j, const std::string& key, const T& value) {
    if constexpr (std::is_same_v<T, std::string>) {
        if (!value.empty()) j[key] = value;
    } else {
        if (value != 0 && value != 0.0) j[key] = value;
    }
}

void to_json(json& j, const GeospatialInfo& g) {
    j = json{
        {"crs", g.crs},
        {"transform", g.transform}
    };
}

void to_json(json& j, const AcquisitionInfo& a) {
    j = json{};
    add_if_not_empty(j, "acquisitionTime", a.acquisitionTime);
    add_if_not_empty(j, "satellite", a.satellite);
    add_if_not_empty(j, "sensor", a.sensor);
}


void to_json(json& j, const SubdatasetInfo& s) {
    j = json{
        {"name", s.name},
        {"type", s.type},
        {"description", s.description},
        {"dimensions", {
            {"width", s.width},
            {"height", s.height},
            {"bands", s.bands}
        }},
        {"fileInfo", {
            {"sizeBytes", s.sizeBytes}
        }},
        {"geospatial", s.geo},
    };
    add_if_not_empty(j["fileInfo"], "checksum", s.checksum);
    add_if_not_empty(j, "dtype", s.dtype);
    if (s.tileWidth > 0) {
        j["tileInfo"] = {{"tileWidth", s.tileWidth}, {"tileHeight", s.tileHeight}};
    }
    if (s.type == DatasetType::IMAGE_BAND) {
        j["bandInfo"] = {
            {"bandName", s.bandName},
            {"bandType", s.bandType}
        };
        add_if_not_empty(j["bandInfo"], "role", s.role);
        add_if_not_empty(j["bandInfo"], "wavelength_nm", s.wavelength_nm);
    }
    if (!s.acq.acquisitionTime.empty() || !s.acq.satellite.empty() || !s.acq.sensor.empty()) {
        j["acquisition"] = s.acq;
    }
}

void to_json(json& j, const ProcessedSubdataset& p) {
    j = json{
        {"subdataset", p.info},
        {"status", p.status},
        {"outputPath", p.outputPath}
    };
}

void to_json(json& j, const ConversionOptions& o) {
    j = json{
        {"outputDirectory", o.outputDirectory},
        {"overwrite", o.overwrite},
        {"groupByBand", o.groupByBand},
        {"blockSize", o.blockSize},
        {"compress", o.compress},
        {"numThreads", o.numThreads},
        {"createOverview", o.createOverview},
    };
}

void to_json(json& j, const Metadata& m) {
    j = json{
        {"converterVersion", m.converterVersion},
        {"conversionOptions", m.conversionOptions}
    };
}

void to_json(json& j, const Manifest& m) {
    j = json{
        {"inputFile", m.inputFile},
        {"processingTimestamp", m.processingTimestamp},
        {"overviewImage", m.overviewImage.empty() ? nullptr : json(m.overviewImage)},
        {"summary", {
            {"durationMs", m.processingDurationMs},
            {"totalSubdatasets", m.totalSubdatasets},
            {"converted", m.convertedCount},
            {"skipped", m.skippedCount},
            {"failed", m.failedCount}
        }},
        {"files", m.processedFiles},
        {"metadata", m.metadata}
    };
}

class HDF5ToCOGConverter {
public:
    HDF5ToCOGConverter() {
        GDALAllRegister();
    }

    void convert(const std::string& inputPath, const ConversionOptions& options) {
        auto start = std::chrono::high_resolution_clock::now();
        setGDALConfigOptions(options);

        Manifest manifest;
        manifest.inputFile = fs::path(inputPath).filename().string();
        manifest.metadata.conversionOptions = options;
        
        auto now = std::chrono::system_clock::now();
        auto in_time_t = std::chrono::system_clock::to_time_t(now);
        std::stringstream ss;
        ss << std::put_time(std::localtime(&in_time_t), "%Y-%m-%dT%H:%M:%SZ");
        manifest.processingTimestamp = ss.str();

        auto subdatasets = listSubdatasets(inputPath, options);
        if (options.listSubdatasets) {
            printSubdatasetList(subdatasets);
            return;
        }

        auto filteredSubdatasets = filterSubdatasets(subdatasets, options);
        if (filteredSubdatasets.empty()) {
            std::cout << "No subdatasets matched the selection criteria. Nothing to convert." << std::endl;
            return;
        }

        std::cout << "Found " << filteredSubdatasets.size() << " subdatasets to process..." << std::endl;
        manifest.totalSubdatasets = filteredSubdatasets.size();
        
        if (!options.outputDirectory.empty()) {
            fs::create_directories(options.outputDirectory);
        }

        std::vector<ProcessedSubdataset> results(filteredSubdatasets.size());

        #pragma omp parallel for
        for (size_t i = 0; i < filteredSubdatasets.size(); ++i) {
            const auto& sub = filteredSubdatasets[i];
            ProcessedSubdataset result;
            result.info = sub;
            result.outputPath = generateOutputPath(inputPath, sub, options);

            if (!options.overwrite && fs::exists(result.outputPath)) {
                result.status = "Skipped";
                #pragma omp critical
                std::cout << "Skipping existing file: " << result.outputPath << std::endl;
            } else {
                fs::path outputFilePath(result.outputPath);
                fs::create_directories(outputFilePath.parent_path());

                #pragma omp critical
                std::cout << "Processing: " << sub.name << std::endl;
                
                bool success = false;
                if (sub.dimensions == 1) {
                    success = convert1DToJson(sub.path, result.outputPath);
                } else {
                    success = convertToCOG(sub.path, result.outputPath, options);
                }

                if (success) {
                    result.status = "Converted";
                    try {
                        result.info.sizeBytes = fs::file_size(result.outputPath);
                    } catch (const fs::filesystem_error& e) {
                        #pragma omp critical
                        std::cerr << "  Could not get file size for " << result.outputPath << ": " << e.what() << std::endl;
                    }
                    #pragma omp critical
                    std::cout << "  -> Saved to: " << result.outputPath << std::endl;
                } else {
                    result.status = "Failed";
                    #pragma omp critical
                    std::cerr << "  !! Failed to convert: " << sub.name << std::endl;
                }
            }
            results[i] = result;
        }

        manifest.processedFiles = results;
        for(const auto& res : results) {
            if (res.status == "Converted") manifest.convertedCount++;
            else if (res.status == "Skipped") manifest.skippedCount++;
            else if (res.status == "Failed") manifest.failedCount++;
        }
        
        auto end = std::chrono::high_resolution_clock::now();
        manifest.processingDurationMs = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();
        
        manifest.overviewImage = generateOverviewImage(inputPath, manifest, options);
        writeManifest(inputPath, manifest, options);
        
        std::cout << "\n✅ Successfully processed " << manifest.convertedCount << " subdatasets in " 
                  << manifest.processingDurationMs << " ms." << std::endl;
        if(manifest.failedCount > 0) {
            std::cout << "⚠️  " << manifest.failedCount << " subdatasets failed to convert." << std::endl;
        }
    }

private:
    std::string generateOutputPath(const std::string& inputPath, const SubdatasetInfo& sub, const ConversionOptions& options) {
        fs::path pathObj(inputPath);
        std::string stem = pathObj.stem().string();
        std::string ext = sub.dimensions == 1 ? ".json" : ".tif";
        fs::path outputPath = options.outputDirectory;
        outputPath /= stem;

        if (options.groupByBand && sub.type != DatasetType::UNKNOWN) {
            std::string groupFolder = datasetTypeToString(sub.type);
            outputPath /= groupFolder;
        }
        std::string cleanName = sanitizeFilename(sub.name);
        outputPath /= cleanName + ext;
        return outputPath.string();
    }

    void writeManifest(const std::string& inputPath, const Manifest& manifest, const ConversionOptions& options) {
        fs::path pathObj(inputPath);
        std::string stem = pathObj.stem().string();
        fs::path manifestPath = options.outputDirectory;
        manifestPath /= stem;
        manifestPath /= "manifest.json";

        try {
            std::ofstream file(manifestPath);
            if(file.is_open()) {
                json j = manifest;
                file << j.dump(4);
                file.close();
                std::cout << "📄 Manifest file created at: " << manifestPath.string() << std::endl;
            } else {
                std::cerr << "Error: Could not open manifest file for writing: " << manifestPath << std::endl;
            }
        } catch (const std::exception& e) {
            std::cerr << "Error writing manifest file: " << e.what() << std::endl;
        }
    }

    std::string generateOverviewImage(const std::string& inputPath, const Manifest& manifest, const ConversionOptions& options) {
        if (!options.createOverview) return "";

        std::vector<std::string> imageBandPaths;
        for (const auto& processed : manifest.processedFiles) {
            if (processed.status == "Converted" && processed.info.type == DatasetType::IMAGE_BAND && processed.info.dimensions > 1) {
                imageBandPaths.push_back(processed.outputPath);
            }
        }

        if (imageBandPaths.empty()) return "";

        fs::path overviewPath = options.outputDirectory;
        overviewPath /= fs::path(inputPath).stem();
        overviewPath /= "overview.jpg";

        fs::path vrtPath = fs::temp_directory_path() / (fs::path(inputPath).stem().string() + ".vrt");

        std::vector<const char*> vrtFiles;
        for(const auto& s : imageBandPaths) vrtFiles.push_back(s.c_str());

        GDALBuildVRTOptions* vrtOptions = GDALBuildVRTOptionsNew(std::vector<char*>{"-separate", nullptr}.data(), nullptr);
        GDALDatasetH hVRTDataset = GDALBuildVRT(vrtPath.c_str(), imageBandPaths.size(), nullptr, const_cast<char**>(vrtFiles.data()), vrtOptions, nullptr);
        GDALBuildVRTOptionsFree(vrtOptions);

        if (!hVRTDataset) return "";
        GDALClose(hVRTDataset);

        GDALTranslateOptions* transOptions = GDALTranslateOptionsNew(std::vector<char*>{"-of", "JPEG", "-ot", "Byte", "-scale", "-outsize", "10%", "10%", nullptr}.data(), nullptr);
        GDALDatasetH srcVRT = GDALOpen(vrtPath.c_str(), GA_ReadOnly);
        std::string finalOverviewPath = "";
        if (srcVRT) {
            GDALDatasetH hJpegDataset = GDALTranslate(overviewPath.c_str(), srcVRT, transOptions, nullptr);
            if (hJpegDataset) {
                std::cout << "🖼️  Overview image generated at: " << overviewPath.string() << std::endl;
                finalOverviewPath = overviewPath.string();
                GDALClose(hJpegDataset);
            }
            GDALClose(srcVRT);
        }
        GDALTranslateOptionsFree(transOptions);
        fs::remove(vrtPath);
        return finalOverviewPath;
    }
    
    std::vector<SubdatasetInfo> listSubdatasets(const std::string& inputPath, const ConversionOptions& options) {
        GDALDatasetH hdfDataset = GDALOpen(inputPath.c_str(), GA_ReadOnly);
        if (!hdfDataset) throw std::runtime_error("Failed to open HDF5 file: " + inputPath);

        std::vector<SubdatasetInfo> subdatasets;
        char** metadata = GDALGetMetadata(hdfDataset, "SUBDATASETS");
        if (!metadata || CSLCount(metadata) == 0) {
             GDALClose(hdfDataset);
             throw std::runtime_error("No subdatasets found in the file: " + inputPath);
        }

        std::unordered_map<int, SubdatasetInfo> tempMap;
        for (int i = 0; metadata[i] != nullptr; i++) {
            std::string item = metadata[i];
            size_t pos = item.find('=');
            if (pos == std::string::npos) continue;
            
            std::string key = item.substr(0, pos);
            std::string value = item.substr(pos + 1);
            
            std::smatch match;
            if (std::regex_search(key, match, std::regex("SUBDATASET_(\\d+)_NAME"))) {
                int num = std::stoi(match[1].str());
                tempMap[num].path = value;
                tempMap[num].name = extractSubdatasetName(value);
            } else if (std::regex_search(key, match, std::regex("SUBDATASET_(\\d+)_DESC"))) {
                int num = std::stoi(match[1].str());
                tempMap[num].description = value;
            }
        }

        for (auto const& [key, val] : tempMap) subdatasets.push_back(val);
        
        std::sort(subdatasets.begin(), subdatasets.end(), [](const auto& a, const auto& b) { return a.name < b.name; });

        for (auto& sub : subdatasets) {
            GDALDatasetH ds = GDALOpen(sub.path.c_str(), GA_ReadOnly);
            if (ds) {
                sub.width = GDALGetRasterXSize(ds);
                sub.height = GDALGetRasterYSize(ds);
                sub.bands = GDALGetRasterCount(ds);
                sub.dimensions = (sub.width > 1 && sub.height > 1) ? 2 : 1;
                
                if (sub.bands > 0) {
                    GDALRasterBandH band = GDALGetRasterBand(ds, 1);
                    sub.dtype = GDALGetDataTypeName(GDALGetRasterDataType(band));
                    sub.tileWidth = options.blockSize;
                    sub.tileHeight = options.blockSize;
                }

                const char* crs = GDALGetProjectionRef(ds);
                sub.geo.crs = (crs && strlen(crs) > 0) ? crs : "EPSG:4326";
                GDALGetGeoTransform(ds, sub.geo.transform.data());

                GDALClose(ds);
            }
            sub.type = classifySubdataset(sub.name, sub.description);
            if (sub.type == DatasetType::IMAGE_BAND) extractBandInfo(sub);
        }
        
        GDALClose(hdfDataset);
        return subdatasets;
    }

    void setGDALConfigOptions(const ConversionOptions& options) {
        int numThreads = options.numThreads == -1 ? omp_get_max_threads() : options.numThreads;
        CPLSetConfigOption("GDAL_NUM_THREADS", std::to_string(numThreads).c_str());
        CPLSetConfigOption("OMP_NUM_THREADS", std::to_string(numThreads).c_str());
        CPLSetConfigOption("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR");
    }

    bool convert1DToJson(const std::string& inputPath, const std::string& outputJsonPath) {
        GDALDatasetH dataset = GDALOpen(inputPath.c_str(), GA_ReadOnly);
        if (!dataset) return false;

        GDALRasterBandH band = GDALGetRasterBand(dataset, 1);
        int xsize = GDALGetRasterXSize(dataset);
        int ysize = GDALGetRasterYSize(dataset);
        std::vector<double> buffer(static_cast<size_t>(xsize) * ysize);

        if (GDALRasterIO(band, GF_Read, 0, 0, xsize, ysize, buffer.data(), xsize, ysize, GDT_Float64, 0, 0) != CE_None) {
            GDALClose(dataset);
            return false;
        }

        json jsonData;
        jsonData["name"] = extractSubdatasetName(inputPath);
        jsonData["data"] = buffer;
        std::ofstream jsonFile(outputJsonPath);
        if (!jsonFile.is_open()) {
            GDALClose(dataset);
            return false;
        }
        jsonFile << jsonData.dump(4);
        GDALClose(dataset);
        return true;
    }

    bool convertToCOG(const std::string& inputPath, const std::string& outputPath, const ConversionOptions& options) {
        GDALDatasetH srcDataset = GDALOpen(inputPath.c_str(), GA_ReadOnly);
        if (!srcDataset) return false;

        std::vector<std::string> cogOptionsStr = {
            "-of", "COG",
            "-co", "BLOCKSIZE=" + std::to_string(options.blockSize),
            "-co", "COMPRESS=" + options.compress,
        };

        if (options.compress == "DEFLATE" || options.compress == "ZSTD") {
            cogOptionsStr.push_back("-co");
            cogOptionsStr.push_back("LEVEL=" + std::to_string(options.compressionLevel));
        }

        std::vector<const char*> cogOptions;
        for(const auto& s : cogOptionsStr) cogOptions.push_back(s.c_str());
        cogOptions.push_back(nullptr);

        GDALTranslateOptions* translateOptions = GDALTranslateOptionsNew(const_cast<char**>(cogOptions.data()), nullptr);
        GDALDatasetH cogDataset = GDALTranslate(outputPath.c_str(), srcDataset, translateOptions, nullptr);
        GDALTranslateOptionsFree(translateOptions);
        GDALClose(srcDataset);

        if (!cogDataset) return false;
        GDALClose(cogDataset);
        return true;
    }

    std::string extractSubdatasetName(const std::string& path) {
        size_t lastColon = path.find_last_of(':');
        if (lastColon != std::string::npos) {
            std::string name = path.substr(lastColon + 1);
            size_t slashPos = name.find_last_of('/');
            if (slashPos != std::string::npos) return name.substr(slashPos + 1);
            return name;
        }
        return path;
    }

    DatasetType classifySubdataset(const std::string& name, const std::string& description) {
        std::string lowerName = name;
        std::transform(lowerName.begin(), lowerName.end(), lowerName.begin(), ::tolower);
        if (lowerName.find("img_") == 0) return DatasetType::IMAGE_BAND;
        if (lowerName.find("geo") == 0 || lowerName.find("latitude") != std::string::npos || lowerName.find("longitude") != std::string::npos) return DatasetType::GEOLOCATION;
        if (lowerName.find("quality") != std::string::npos || lowerName.find("flag") != std::string::npos) return DatasetType::QUALITY_FLAG;
        if (lowerName.find("time") != std::string::npos || lowerName.find("scan_line_time") != std::string::npos) return DatasetType::TIME_DATA;
        if (lowerName.find("sun_") != std::string::npos || lowerName.find("sat_") != std::string::npos || lowerName.find("angle") != std::string::npos) return DatasetType::AUXILIARY;
        return DatasetType::UNKNOWN;
    }

    void extractBandInfo(SubdatasetInfo& sub) {
        if (sub.name.rfind("IMG_", 0) != 0) return;
        size_t start = 4;
        size_t underscore = sub.name.find('_', start);
        if (underscore != std::string::npos) {
            sub.bandName = sub.name.substr(start, underscore - start);
            sub.bandType = sub.name.substr(underscore + 1);
        } else {
            sub.bandName = sub.name.substr(start);
        }
    }

    void printSubdatasetList(const std::vector<SubdatasetInfo>& subdatasets) {
        std::cout << "Available subdatasets (" << subdatasets.size() << "):\n";
        for (const auto& sub : subdatasets) {
            std::cout << "  Name: " << sub.name << "\n";
            std::cout << "    Type: " << datasetTypeToString(sub.type) << "\n";
            if (sub.type == DatasetType::IMAGE_BAND) std::cout << "    Band: " << sub.bandName << "\n";
            std::cout << "    Dimensions: " << sub.width << "x" << sub.height << "x" << sub.bands << "\n";
            std::cout << "    Description: " << sub.description << "\n\n";
        }
    }

    std::string datasetTypeToString(DatasetType type) {
        switch (type) {
            case DatasetType::IMAGE_BAND: return "Image_Band";
            case DatasetType::GEOLOCATION: return "Geolocation";
            case DatasetType::QUALITY_FLAG: return "Quality_Flag";
            case DatasetType::TIME_DATA: return "Time";
            case DatasetType::AUXILIARY: return "Auxiliary";
            default: return "Unknown";
        }
    }

    std::vector<SubdatasetInfo> filterSubdatasets(const std::vector<SubdatasetInfo>& subdatasets, const ConversionOptions& options) {
        std::vector<SubdatasetInfo> filtered;
        for (const auto& sub : subdatasets) {
            bool shouldProcess = false;
            switch (sub.type) {
                case DatasetType::IMAGE_BAND:   shouldProcess = options.convertImageBands; break;
                case DatasetType::GEOLOCATION:  shouldProcess = options.convertGeolocation; break;
                case DatasetType::QUALITY_FLAG: shouldProcess = options.convertQualityFlags; break;
                case DatasetType::TIME_DATA:    shouldProcess = options.convertTimeData; break;
                case DatasetType::AUXILIARY:    shouldProcess = options.convertAuxiliary; break;
                case DatasetType::UNKNOWN:      shouldProcess = options.convertUnknown; break;
            }
            if (shouldProcess) filtered.push_back(sub);
        }
        return filtered;
    }

    std::string sanitizeFilename(const std::string& name) {
        std::string result = name;
        std::replace_if(result.begin(), result.end(), 
            [](char c) { return !isalnum(c) && c != '_' && c != '-'; }, '_');
        return result;
    }
};

void printHelp(const char* appName) {
    std::cerr << "Usage: " << appName << " [options] <input.h5> ...\n";
    // ... help text ...
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        printHelp(argv[0]);
        return 1;
    }

    ConversionOptions options;
    std::vector<std::string> inputFiles;

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--help") { printHelp(argv[0]); return 0; }
        else if (arg == "--list") { options.listSubdatasets = true; }
        else if (arg == "--outdir") { if (i + 1 < argc) options.outputDirectory = argv[++i]; }
        // ... parse other arguments ...
        else if (arg.rfind("-", 0) != 0) {
            inputFiles.push_back(arg);
        }
    }

    if (inputFiles.empty()) {
        std::cerr << "Error: No input files provided.\n";
        return 1;
    }

    HDF5ToCOGConverter converter;
    for (const auto& inputFile : inputFiles) {
        std::cout << "========================================\n";
        std::cout << "Processing: " << inputFile << "\n";
        try {
            converter.convert(inputFile, options);
        } catch (const std::exception& e) {
            std::cerr << "Error processing file " << inputFile << ": " << e.what() << std::endl;
        }
    }
    
    return 0;
}