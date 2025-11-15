// skystack/src/pages/Overview.jsx
import { Link } from 'react-router-dom';
// useAuth hook is removed
import { FaCloudUploadAlt, FaMicrochip, FaGlobe, FaArrowRight, FaCogs, FaAws, FaDocker, FaDatabase } from 'react-icons/fa';
import { SiPython, SiGdal, SiFastapi, SiOpengl } from 'react-icons/si';

export default function Overview() {
  // isAuthenticated state is removed
  
  const problemAndSolution = [
    { 
      title: "The Problem: Inefficient Data Access", 
      description: "INSAT Level 1 satellite data is large, non-streamable, and difficult to process efficiently using traditional methods, hindering timely meteorological analysis.", 
      icon: FaDatabase,
      color: "text-red-400"
    },
    { 
      title: "The Solution: Cloud-Native COGs", 
      description: "By converting legacy HDF5 data into Cloud-Optimized GeoTIFFs (COGs), the system enables selective data streaming and on-the-fly processing through a high-performance serverless architecture.", 
      icon: FaCogs,
      color: "text-green-400"
    },
    { 
      title: "Core Benefit: Timely & Responsive Analysis", 
      description: "Provides meteorologists with powerful tools for timely visualization and manipulation of satellite imagery, demonstrating a significant improvement in usability and responsiveness.", 
      icon: FaGlobe,
      color: "text-blue-400"
    },
  ];
  
  const technicalPillars = [
    { 
      title: "Conversion Pipeline", 
      description: "Automated conversion of raw HDF5 data to COGs, optimized with GDAL and fine-grained parallelization using OpenMP.", 
      icon: SiGdal,
      link: "/data-conversion",
      linkText: "Start Conversion"
    },
    { 
      title: "On-The-Fly Processing (DAG)", 
      description: "Complex analysis tasks (e.g., band arithmetic) are managed by a Directed Acyclic Graph (DAG) model and executed selectively on-demand via TiTiler microservices.", 
      icon: FaMicrochip,
      link: "/on-the-fly",
      linkText: "Explore Processing"
    },
    { 
      title: "Latency Minimization", 
      description: "Accelerated by an in-memory caching layer (Redis/ElastiCache) to significantly reduce data retrieval latency during intensive user analysis.", 
      icon: FaCloudUploadAlt,
      link: "/data-conversion", // Link now goes directly to the app
      linkText: "Go to App" // Text is simplified
    },
  ];
  
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-950 text-gray-100">
      
      {/* Hero Section */}
      <div className="py-20 md:py-32 text-center border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              SkyStack
            </span>: Cloud-Based Processing and Streaming of INSAT Satellite Data using COGs
          </h1>
          <p className="text-xl text-gray-400 max-w-4xl mx-auto mb-8">
            The high-performance, cloud-native architecture for selective streaming and interactive manipulation of large-scale INSAT satellite data.
          </p>
          
          {/* Main CTA (unchanged) */}
          {/* Conditional logic is removed, now shows one button */}
          <Link 
            to="/data-conversion" 
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-900 bg-blue-400 rounded-full hover:bg-blue-300 transition-all duration-300 shadow-xl hover:shadow-blue-500/50"
          >
            Access Platform <FaArrowRight className="ml-2" />
          </Link>
        </div>
      </div>
  
      {/* Problem & Solution Overview (unchanged titles, updated descriptions) */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center text-blue-400 mb-12">Architecture & Objectives</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {problemAndSolution.map((item, index) => (
            <div key={index} className="p-6 rounded-xl border border-gray-800 shadow-lg flex flex-col items-center text-center">
              <item.icon className={`text-4xl ${item.color} mb-4`} />
              <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
              <p className="text-gray-400 text-sm">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
  
      {/* Technical Pillars Section (updated titles/descriptions) */}
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-8 border-t border-gray-800">
        <h2 className="text-3xl font-bold text-center text-purple-400 mb-12">Technical Pillars</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {technicalPillars.map((feature, index) => (
            <div key={index} className="bg-gray-900 p-8 rounded-xl shadow-2xl border border-gray-800 transition-transform hover:scale-[1.02]">
              <feature.icon className="text-5xl text-purple-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400 mb-6 text-sm">{feature.description}</p>
              
              <Link to={feature.link} className="inline-flex items-center text-sm font-medium text-blue-400 hover:text-blue-300">
                {feature.linkText} <FaArrowRight className="ml-2 text-xs" />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Technology Stack Section (unchanged) */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-center text-gray-400 mb-8">Integrated Tech Stack</h2>
        
        <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16 text-gray-400">
          
          <div className="flex flex-col items-center gap-2">
            <SiGdal className="text-5xl text-orange-500" />
            <span className="text-sm font-medium">GDAL & OpenMP</span>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <FaCogs className="text-5xl text-orange-500" />
            <span className="text-sm font-medium">TiTiler Microservices</span>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <SiFastapi className="text-5xl text-green-500" />
            <span className="text-sm font-medium">FastAPI</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <FaAws className="text-5xl text-yellow-500" />
            <span className="text-sm font-medium">AWS (Serverless)</span>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <FaDocker className="text-5xl text-blue-500" />
            <span className="text-sm font-medium">Docker</span>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <SiOpengl className="text-5xl text-red-500" />
            <span className="text-sm font-medium">OpenLayers (Frontend)</span>
          </div>
          
        </div>
      </div>

      <div className="pt-4 pb-8 text-center text-gray-500 text-sm">
        <p>Project Title: Cloud-Based Processing and Streaming of INSAT Satellite Data using COGs</p>
      </div>
    </div>
  );
}