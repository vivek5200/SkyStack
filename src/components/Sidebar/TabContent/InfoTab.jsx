// src/components/Sidebar/TabContent/InfoTab.jsx
import React, { useState } from 'react';
import { FaChevronRight, FaFileAlt } from 'react-icons/fa';

// Recursive Collapsible Component
const CollapsibleItem = ({ label, value, depth = 0 }) => {
    const [isOpen, setIsOpen] = useState(depth === 0); // Auto-expand first level

    const isObject = typeof value === 'object' && value !== null && !Array.isArray(value);
    const isArray = Array.isArray(value);
    const isCollapsible = isObject || isArray;

    // Format simple string/number values
    const formattedValue = (val) => {
        if (typeof val === 'number') {
            return val.toFixed(val % 1 === 0 ? 0 : 4).toLocaleString();
        }
        if (typeof val === 'string' && val.length > 100) {
            return val.substring(0, 100) + '...';
        }
        return String(val);
    };

    // Determine key for display
    const displayLabel = (() => {
        if (label.startsWith('[')) {
            return `Item ${label.slice(1, -1)}`;
        }
        // Convert camelCase to Title Case with spaces
        return label.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    })();

    // Calculate padding based on depth for visual hierarchy
    const paddingLeft = 12 + (depth * 16); // 12px base + 16px per level

    const renderContent = () => {
        if (!isCollapsible) {
            return (
                <div 
                    className="flex items-start gap-2 p-1 bg-gray-900 hover:bg-gray-800 rounded"
                    style={{ paddingLeft: `${paddingLeft}px` }}
                >
                    <span className="text-sm font-medium text-gray-300 flex-shrink-0">
                        {displayLabel}:
                    </span>
                    <span className="text-gray-400 text-sm break-words flex-1">
                        {formattedValue(value)}
                    </span>
                </div>
            );
        }

        // Render nested content (array or object)
        const contentEntries = isArray
            ? value.map((item, index) => [`[${index}]`, item])
            : Object.entries(value);

        return (
            <div className="space-y-1">
                {contentEntries.map(([key, subValue]) => (
                    <CollapsibleItem 
                        key={key} 
                        label={key} 
                        value={subValue} 
                        depth={depth + 1}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="border-b border-gray-700 last:border-b-0 bg-gray-900">
            {isCollapsible ? (
                <>
                    <div 
                        className="flex items-start gap-2 cursor-pointer bg-gray-900 hover:bg-gray-800 rounded p-1 transition-colors"
                        style={{ paddingLeft: `${paddingLeft}px` }}
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        <FaChevronRight 
                            className={`text-xs text-blue-400 mt-1 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} 
                        />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-300 break-words">
                                    {displayLabel}
                                </span>
                                <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded ml-2 flex-shrink-0">
                                    {isArray ? `${value.length} items` : `${Object.keys(value).length} keys`}
                                </span>
                            </div>
                        </div>
                    </div>

                    {isOpen && (
                        <div className="mt-1">
                            {renderContent()}
                        </div>
                    )}
                </>
            ) : (
                // For non-collapsible items
                <div 
                    className="flex items-start gap-2 p-1 bg-gray-900 hover:bg-gray-800 rounded"
                    style={{ paddingLeft: `${paddingLeft}px` }}
                >
                    <span className="text-sm font-medium text-gray-300 flex-shrink-0">
                        {displayLabel}:
                    </span>
                    <span className="text-gray-400 text-sm break-words flex-1">
                        {formattedValue(value)}
                    </span>
                </div>
            )}
        </div>
    );
};

const InfoTab = ({ sceneData }) => {
    const [activeSection, setActiveSection] = useState("all");

    // Check if any scene data is loaded and has manifest data
    if (!sceneData || !sceneData.manifest) {
        return (
            <div className="flex flex-col items-center justify-center py-8 space-y-3 text-center">
                <FaFileAlt className="text-4xl text-gray-600" />
                <div className="flex flex-col space-y-1">
                    <h3 className="text-lg font-medium text-gray-300">No Scene Data</h3>
                    <p className="text-gray-400 text-sm">
                        Upload a GeoTIFF folder to view manifest metadata.
                    </p>
                </div>
            </div>
        );
    }

    // Use the actual manifest data from the uploaded scene
    const manifestData = sceneData.manifest;

    // Filter sections based on active section
    const getFilteredData = () => {
        if (activeSection === "all") return manifestData;

        const filtered = {};
        if (activeSection === "files" && manifestData.files) {
            filtered.files = manifestData.files;
        }
        if (activeSection === "metadata" && manifestData.metadata) {
            filtered.metadata = manifestData.metadata;
        }
        if (activeSection === "summary" && manifestData.summary) {
            filtered.summary = manifestData.summary;
        }
        return filtered;
    };

    const filteredData = getFilteredData();

    return (
        <div className="flex flex-col space-y-4">
            {/* Section Filter Controls */}
            <div className="flex gap-1 border-b border-gray-700 pb-3 overflow-x-auto">
                <div className="flex gap-1 min-w-max pb-1">
                    {["all", "files", "metadata", "summary"].map(section => (
                        <button
                            key={section}
                            onClick={() => setActiveSection(section)}
                            className={`px-3 py-2 rounded text-sm font-medium transition-colors flex-shrink-0 ${
                                activeSection === section 
                                    ? "bg-blue-600 text-white" 
                                    : "bg-gray-800 text-gray-300 hover:bg-gray-700" // CHANGE: Dark button styling
                            }`}
                        >
                            {section.charAt(0).toUpperCase() + section.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Data Display */}
            <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                {Object.keys(filteredData).length === 0 ? (
                    <div className="p-4 text-center text-gray-400 text-sm">
                        No data available for this section.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-700">
                        {Object.entries(filteredData).map(([key, value]) => (
                            <CollapsibleItem 
                                key={key}
                                label={key}
                                value={value}
                                depth={0}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InfoTab;