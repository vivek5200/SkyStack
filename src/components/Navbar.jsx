// skystack/src/components/Navbar.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import React, { useEffect, useState } from 'react'; // Import React, useEffect, and useState

// No longer needs activeTab or setActiveTab as props
export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation(); // Get current location
  const [activeTab, setActiveTab] = useState(''); // Internal state for active tab

  // Mapping from the URL path to the tab name
  const tabRoutes = {
    "/overview": "Overview", // This won't be displayed, but sets state
    "/data-conversion": "Data Conversion",
    "/on-the-fly": "On-The-Fly Processing",
    "/geotiff-display": "GeoTIFF Display"
  };

  // List of tabs to physically display in the navbar
  const tabs = [
    "Data Conversion", 
    "On-The-Fly Processing",
    // "GeoTIFF Display" // Uncomment to show this tab
  ];

  // This hook runs on page load and any time the URL changes
  useEffect(() => {
    const currentPath = location.pathname;
    
    // Handle root path
    if (currentPath === "/") {
        setActiveTab("Overview");
    } else {
        // Find the matching tab name for the current path
        const currentTab = tabRoutes[currentPath] || ""; 
        setActiveTab(currentTab);
    }
  }, [location.pathname]); // Dependency on pathname ensures it runs on route change

  // Function to handle tab clicks
  const handleTabClick = (tab) => {
    const routes = {
      // "Overview" is handled by handleLogoClick
      "Data Conversion": "/data-conversion", 
      "On-The-Fly Processing": "/on-the-fly",
      "GeoTIFF Display": "/geotiff-display",
    };
    if (routes[tab]) {
      navigate(routes[tab]); // Navigation will trigger the useEffect
    }
  };
  
  // Handle logo click
  const handleLogoClick = () => {
    navigate('/overview'); // Navigation will trigger the useEffect
  };

  return (
    <nav className="bg-gray-900 px-8 py-4 shadow-md border-b border-gray-800 flex justify-between items-center">
      {/* Left side - Logo & Title */}
      <div 
        className="flex items-center gap-2 cursor-pointer"
        onClick={handleLogoClick} 
      >
        <span className="text-blue-400 text-2xl">🌌</span>
        <h1 className="text-xl font-bold text-blue-400">SkyStack</h1>
      </div>

      {/* Middle - Tabs (Overview is no longer here) */}
      <div className="flex gap-6">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={`pb-1 border-b-2 transition-all ${
              activeTab === tab // Compare with internal, route-driven state
                ? "text-blue-400 border-blue-400"
                : "text-gray-400 border-transparent hover:text-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Right side - Empty for spacing */}
      <div className="flex items-center gap-4" style={{minWidth: '150px'}}>
        {/* Empty div to balance the navbar */}
      </div>
    </nav>
  );
}