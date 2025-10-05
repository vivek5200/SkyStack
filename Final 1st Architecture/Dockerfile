# --- Stage 1: The Builder (compiles your C++ code on Debian 11) ---
FROM debian:11-slim AS builder

ENV DEBIAN_FRONTEND=noninteractive

# Install build dependencies for Debian 11
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    git \
    libgdal-dev \
    libhdf5-dev \
    ca-certificates \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the C++ project files
COPY ./converter/CMakeLists.txt ./converter/
COPY ./converter/src ./converter/src/

# Build the C++ executable
RUN cmake -B build -S ./converter
RUN cmake --build build --parallel $(nproc)


# --- Stage 2: The Final Application Image (Node.js on Debian 11) ---
FROM node:20-bullseye-slim

# Install runtime libraries for Debian 11
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgdal28 \
    libgomp1 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the compiled C++ executable from the builder stage
COPY --from=builder /app/build/hdf5_to_cog ./converter/

# Copy the Node.js server files
COPY package*.json ./

# Install the Node.js server dependencies
RUN npm install

# Copy the rest of your application
COPY server.js .
COPY frontend ./frontend

# Create directories that the server will use
RUN mkdir -p /app/uploads /app/public/outputs

# Expose port 3000
EXPOSE 3000

# The final command to run when the container starts
CMD ["node", "server.js"]