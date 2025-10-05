cmake_minimum_required(VERSION 3.16)
project(HDF5ToCOGConverter CXX)

# Set the C++ standard to C++17, required for std::filesystem
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# --- Fetch Dependencies ---
# Fetch the nlohmann/json library for JSON processing
include(FetchContent)
FetchContent_Declare(
  json
  GIT_REPOSITORY https://github.com/nlohmann/json.git
  GIT_TAG v3.11.3 # Use a specific version for stability
)
FetchContent_MakeAvailable(json)

# Find GDAL and OpenMP which will be installed in the Docker image
find_package(GDAL REQUIRED)
find_package(OpenMP REQUIRED)

# --- Build Executable ---
add_executable(
  hdf5_to_cog
  src/main.cpp
)

# --- Link Libraries ---
target_include_directories(
  hdf5_to_cog PUBLIC
  ${GDAL_INCLUDE_DIRS}
  ${json_SOURCE_DIR}/include  # Add nlohmann/json include directory
)

target_link_libraries(
  hdf5_to_cog PUBLIC
  ${GDAL_LIBRARIES}
  OpenMP::OpenMP_CXX
)