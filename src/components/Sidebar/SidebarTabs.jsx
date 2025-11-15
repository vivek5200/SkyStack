// skystack/src/components/Sidebar/SidebarTabs.jsx
import React from 'react';
import { 
  FaInfoCircle, 
  FaChartBar, 
  FaMap, 
  FaFilter, 
  FaPalette, 
  FaTools, 
  FaFileExport 
} from 'react-icons/fa';

const SidebarTabs = ({ activeTab, setActiveTab }) => {
  const sidebarTabs = [
    { id: 'info', icon: <FaInfoCircle />, label: 'Information' },
    { id: 'bands', icon: <FaChartBar />, label: 'Available Bands' },
    { id: 'basemap', icon: <FaMap />, label: 'Map Basemap' },
    { id: 'filters', icon: <FaFilter />, label: 'Filters' },
    { id: 'effects', icon: <FaPalette />, label: 'Effects' },
    { id: 'export', icon: <FaFileExport />, label: 'Export Options' }
  ];

  return (
    // CHANGE 1: Set main background to dark gray-900
    <div className="bg-gray-900 flex flex-col items-center border-t-2 border-gray-600"> 
      {sidebarTabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`w-12 h-12 flex items-center justify-center transition-all group ${
            activeTab === tab.id
              // CHANGE 2: Use gradient for active tab button background
              ? 'bg-blue-600  text-white shadow-lg' 
              // CHANGE 3: Update hover state for dark background consistency
              : 'text-gray-400 hover:text-white hover:bg-gray-800' 
          }`}
          title={tab.label}
        >
          <span className="text-lg">{tab.icon}</span>
          {/* CHANGE 4: Use a theme color (purple-400) for the active indicator bar */}
          <div className={`absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-purple-400 rounded-l transition-opacity ${
            activeTab === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}></div>
        </button>
      ))}
    </div>
  );
};

export default SidebarTabs;