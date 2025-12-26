# SkyStack 🛰️

**Cloud-Native Satellite Data Processing & Streaming Platform**

A high-performance, cloud-native architecture for selective streaming and interactive manipulation of large-scale INSAT Level 1 satellite data. This frontend application enables meteorologists and researchers to visualize, process, and analyze satellite imagery with minimal latency through an innovative COG-based pipeline.

---

## 🧩 Distributed System Repositories

SkyStack is built as a microservices ecosystem. This repository contains the **Frontend Client**. The system is powered by two additional core services:

| Service | Repository | Description |
|---------|------------|-------------|
| **Frontend Dashboard** | **[SkyStack](https://github.com/vivek5200/SkyStack)** | *(Current)* React-based geospatial interface for selective streaming and visualization |
| **Core Processing Engine** | [**skystack-processor**](https://github.com/vivek5200/skystack-processor) | FastAPI & AWS ECS backend handling DAG workflows, on-the-fly tile generation, and spectral analysis |
| **Ingestion Service** | [**skystack-converter**](https://github.com/vivek5200/skystack-converter) | C++ & Python AWS Lambda function that automates high-performance HDF5 to COG conversion |

---

## 🎯 Overview

### The Challenge
INSAT Level 1 satellite data is massive, non-streamable, and computationally expensive to process using traditional methods. This hinders timely meteorological analysis and atmospheric monitoring.

### The Solution
SkyStack converts legacy HDF5 satellite data into **Cloud-Optimized GeoTIFFs (COGs)**, enabling:
- **Selective data streaming** - Load only the data you need via HTTP Range Requests
- **On-the-fly processing** - Execute complex band arithmetic and transformations on demand
- **Minimal latency** - Redis/ElastiCache caching layer for rapid data retrieval
- **Scalable architecture** - Serverless AWS infrastructure with TiTiler microservices

---

## 🏗️ Technical Architecture

### Core Components

**1. Data Conversion Pipeline (`skystack-converter`)**
- Automated HDF5 → COG conversion triggered by S3 events
- Optimized with GDAL and OpenMP parallelization
- Produces cloud-ready, tiled GeoTIFF outputs

**2. On-The-Fly Processing (`skystack-processor`)**
- Directed Acyclic Graph (DAG) for complex analysis tasks
- TiTiler microservices for selective on-demand execution
- Band arithmetic, spectral analysis, and custom transformations

**3. Frontend Application (This Repository)**
- Interactive web interface built with React + Vite
- Real-time satellite imagery visualization with OpenLayers
- Responsive design optimized for data exploration

**4. Caching & Performance**
- Redis/ElastiCache for in-memory data caching
- Dramatically reduces retrieval latency during intensive analysis

---

## 🚀 Tech Stack

### Frontend (This Project)
- **Framework**: React 19.1 with React Router 7.9
- **Build Tool**: Vite (with Rolldown)
- **Styling**: Tailwind CSS 4.1
- **Mapping**: OpenLayers 10.6 + GeoTIFF.js 2.0
- **UI Components**: Lucide React Icons, React Icons
- **HTTP Client**: Axios 1.12
- **Linting**: ESLint 9.36

### Backend Services (Connected APIs)
- **Workflow API**: AWS Load Balancer (On-The-Fly Processing)
- **Data Conversion API**: AWS App Runner
- **Processing**: FastAPI, GDAL, TiTiler
- **Infrastructure**: Docker, AWS (Serverless Lambda, ECS Fargate)

---

## 📋 Features

### 📊 Interactive Visualization
- Real-time satellite imagery display with OpenLayers
- Multiple basemap options
- Customizable map controls and overlays

### 🎨 Band Management
- View and manipulate individual bands from GeoTIFF data
- Band arithmetic calculations (e.g., NDVI, NDWI)
- Color mapping and visualization controls

### 📁 Data Management
- Organize and explore GeoTIFF folder structures
- Batch processing capabilities
- Export processed data

### ⚡ Real-Time Processing
- On-the-fly image processing and transformations
- Filter effects and enhancements
- Export results in multiple formats

### 🌍 Responsive Design
- Desktop, tablet, and mobile optimized
- Dark mode interface for extended analysis sessions

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/vivek5200/SkyStack.git
   cd SkyStack
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   
   Copy the `.env.example` file and create `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your API endpoints (pointing to your backend deployments):
   ```env
   VITE_WORKFLOW_API_BASE_URL=https://api.your-backend-url.com
   VITE_DATA_CONVERSION_API_BASE_URL=https://converter.your-backend-url.com
   ```

   ⚠️ **Important**: Never commit `.env.local` to version control. It's already in `.gitignore`.

4. **Start Development Server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5173`

---

## 📦 Available Scripts

```bash
# Start development server with hot module replacement
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

---

## 📁 Project Structure

```
skystack/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable React components
│   │   ├── GeoTIFF/        # Band and folder management
│   │   ├── Map/            # OpenLayers mapping
│   │   ├── Sidebar/        # Tab-based sidebar interface
│   │   ├── UI/             # Shared UI components
│   │   ├── Navbar.jsx      # Navigation
│   │   └── Footer.jsx      # Footer
│   ├── pages/              # Page-level components
│   │   ├── Overview.jsx         # Landing/home page
│   │   ├── GeoTiffDisplay.jsx   # Main data visualization
│   │   ├── DataConversion.jsx   # HDF5 to COG conversion
│   │   └── OnTheFly.jsx         # On-demand processing
│   ├── hooks/              # Custom React hooks
│   │   ├── useMap.js       # Map state management
│   │   ├── useGeoTIFF.js   # GeoTIFF data handling
│   │   └── useBasemaps.js  # Basemap management
│   ├── services/           # API integration
│   │   └── api.js          # Axios instances & API calls
│   ├── utils/              # Utility functions
│   │   ├── colorMaps.js    # Color mapping presets
│   │   ├── constants.js    # Application constants
│   │   └── geotiffProcessor.js # GeoTIFF processing logic
│   ├── App.jsx             # Root component
│   ├── main.jsx            # React DOM entry point
│   ├── App.css             # Global styles
│   └── index.css           # Base styles
├── index.html              # HTML entry point
├── package.json            # Dependencies & scripts
├── vite.config.js          # Vite configuration
├── eslint.config.js        # ESLint rules
└── README.md               # This file
```

---

## 🔗 API Endpoints

The application connects to two main services configured via environment variables:

### Workflow API (On-The-Fly Processing)
- **Environment Variable**: `VITE_WORKFLOW_API_BASE_URL`
- **Purpose**: Complex band calculations, spectral analysis, real-time processing
- **Repository**: [skystack-processor](https://github.com/vivek5200/skystack-processor)

### Data Conversion API
- **Environment Variable**: `VITE_DATA_CONVERSION_API_BASE_URL`
- **Purpose**: HDF5 to COG conversion, batch data processing
- **Repository**: [skystack-converter](https://github.com/vivek5200/skystack-converter)

---

## 🎓 Key Concepts

### Cloud-Optimized GeoTIFFs (COGs)
GeoTIFFs with internal tiling and overviews that enable efficient partial reads without downloading the entire file. Perfect for web-based geospatial applications.

### Directed Acyclic Graph (DAG)
A workflow model used for managing complex multi-step processing tasks with dependencies, enabling efficient parallel execution.

### TiTiler Microservices
High-performance tile server for serving dynamic tiles from GeoTIFF data with on-the-fly processing capabilities.

---

## 🔐 Security Considerations

- API endpoints use HTTPS for production deployments
- Environment variables store sensitive configuration
- CORS headers configured on backend services
- Input validation on all user-provided data

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is part of a Final Year Engineering Project.

---

## 👥 Authors

**Vivek** - *Full Stack Cloud Architecture*
- [GitHub Profile](https://github.com/vivek5200)

---

## 📞 Support

For issues, questions, or feature requests, please open an issue in the [GitHub Issue Tracker](https://github.com/vivek5200/SkyStack/issues).

---

**Happy analyzing! 🛰️📊**
