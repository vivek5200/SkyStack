// src/components/GeoTIFF/FolderStructure.jsx
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';

const FolderStructure = ({ sceneData, selectedBands, onBandSelect }) => {
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    auxiliary: true,
    geolocation: true,
    image_bands: true,
    other: true,
  });

  // Refs to track scroll positions for each section
  const sectionRefs = useRef({
    overview: null,
    auxiliary: null,
    geolocation: null,
    image_bands: null,
    other: null
  });

  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  // Memoize categories to prevent unnecessary recalculations
  const categories = useMemo(() => {
    if (!sceneData) return {};
    return {
      overview: sceneData.files.filter(f => f.category === 'overview'),
      auxiliary: sceneData.files.filter(f => f.category === 'auxiliary'),
      geolocation: sceneData.files.filter(f => f.category === 'geolocation'),
      image_bands: sceneData.files.filter(f => f.category === 'image_bands'),
      other: sceneData.files.filter(f => !['overview', 'auxiliary', 'geolocation', 'image_bands'].includes(f.category))
    };
  }, [sceneData]);

  const formatFileSize = useCallback((bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  }, []);

  // Calculate the count of currently selected image bands
  const selectedImageBandsCount = useMemo(() => 
    selectedBands.filter(b => b.category === 'image_bands').length,
    [selectedBands]
  );
  const MAX_BANDS_ALLOWED = 2;

  // Memoize BandCheckbox component to prevent unnecessary re-renders
  const BandCheckbox = useCallback(({ file, category }) => {
    const isSelected = selectedBands.some(band => band.id === file.id);
    const isImageBand = category === 'image_bands';
    const isDisabled = !isImageBand || (isImageBand && !isSelected && selectedImageBandsCount >= MAX_BANDS_ALLOWED);

    const handleCheckboxChange = useCallback(() => {
      onBandSelect(file, !isSelected);
    }, [file, isSelected, onBandSelect]);

    return (
      <div className="band-checkbox flex items-center justify-between py-2 px-3 border-b border-gray-700 last:border-b-0 hover:bg-gray-800">
        <label className={`flex items-center space-x-3 ${isImageBand ? 'cursor-pointer' : 'cursor-default'}`}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            disabled={isDisabled}
            className="rounded border-gray-600 text-blue-400 focus:ring-blue-500 bg-gray-800 disabled:bg-gray-700 disabled:cursor-not-allowed"
          />
          <div className="flex flex-col">
            <span className={`text-sm ${isDisabled && !isImageBand ? 'text-gray-500' : 'text-gray-300'}`}> 
              {file.name}
              {isDisabled && isImageBand && <span className="text-xs text-red-400 ml-2">(Max 2 bands)</span>}
              {!isImageBand && <span className="text-xs text-gray-500 ml-2">(metadata)</span>}
            </span>
            {file.metadata?.description && (
              <span className="text-xs text-gray-500">
                {file.metadata.description}
                {file.metadata.bandNumber && ` (Band ${file.metadata.bandNumber})`}
              </span>
            )}
          </div>
        </label>
        <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
      </div>
    );
  }, [selectedBands, selectedImageBandsCount, formatFileSize, onBandSelect]);

  // Memoize Section component with scroll preservation
  const Section = useCallback(({ title, category, files }) => {
    const sectionRef = useRef(null);
    
    // Store the ref for this section
    useEffect(() => {
      sectionRefs.current[category] = sectionRef;
    }, [category]);

    if (files.length === 0) {
        return null;
    }

    const handleSectionClick = () => {
      toggleSection(category);
    };

    return (
        <div ref={sectionRef} className="mb-3 border border-gray-700 rounded-lg overflow-hidden bg-gray-900">
        <div 
            className="section-header flex items-center space-x-2 p-3 bg-gray-800 cursor-pointer hover:bg-gray-700"
            onClick={handleSectionClick}
        >
            <span className={`arrow transition-transform ${expandedSections[category] ? 'rotate-90' : ''}`}>▶</span>
            <span className="font-medium text-sm text-gray-300">{title}</span> 
            <span className="text-xs text-gray-500 ml-auto">({files.length})</span>
        </div>
        {expandedSections[category] && files.length > 0 && (
            <div className="section-content max-h-48 overflow-y-auto bg-gray-900">
            {files.map(file => (
                <BandCheckbox key={file.id} file={file} category={category} />
            ))}
            </div>
        )}
        </div>
    );
  }, [expandedSections, toggleSection, BandCheckbox]);

  if (!sceneData) {
    return (
      <div className="p-4 text-center text-gray-500">
        Select a scene from the dropdown above to see its files.
      </div>
    );
  }

  return (
    <div className="folder-structure">
      <Section title="Overview & Metadata" category="overview" files={categories.overview} />
      <Section title="Auxiliary Data (Sun/Sat Angles)" category="auxiliary" files={categories.auxiliary} />
      <Section title="Geolocation Data" category="geolocation" files={categories.geolocation} />
      <Section title="Image Bands" category="image_bands" files={categories.image_bands} />
      <Section title="Other Files" category="other" files={categories.other} />
    </div>
  );
};

export default React.memo(FolderStructure);