import React, { useState, useEffect, useRef, useCallback } from 'react';

// Initialize with default values. Range is 0 to 100 for all sliders.
const initialEffects = {
  transparency: 100, // 100% opaque, 0% transparent
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  hue: 0,
};

const EffectsTab = ({ tiffLayers, handleApplyEffect }) => {
  const [effects, setEffects] = useState(initialEffects);
  const [activeLayer, setActiveLayer] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const huePickerRef = useRef(null);

  // Identify the currently visible layer to apply effects to
  useEffect(() => {
    const visibleLayer = tiffLayers.find(l => l.visible);
    setActiveLayer(visibleLayer || null);
    
    // Reset effects state when the active layer changes or disappears
    if (!visibleLayer) {
      setEffects(initialEffects);
    } else if (visibleLayer.metadata.filterValues) {
      // Initialize effects with layer's current state when activated
      setEffects(visibleLayer.metadata.filterValues);
    }
  }, [tiffLayers]);

  const handleChange = (name, value) => {
    const newEffects = { ...effects, [name]: parseFloat(value) };
    setEffects(newEffects);
    
    if (activeLayer) {
      // Pass the updated effects object to the handler immediately
      handleApplyEffect(activeLayer.id, newEffects);
    }
  };

  const handleReset = () => {
    setEffects(initialEffects);
    if (activeLayer) {
      handleApplyEffect(activeLayer.id, initialEffects);
    }
  };

  // --- DRAG LOGIC ---
  const calculateHueFromMouseEvent = useCallback((e) => {
    if (!huePickerRef.current) return;

    const rect = huePickerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const x = e.clientX - centerX;
    const y = e.clientY - centerY;
    
    // Ignore clicks/drags too close to the center (radius 15)
    const distance = Math.sqrt(x * x + y * y);
    if (distance < 15) return;

    // Calculate the angle in radians (-PI to PI)
    // atan2(y, x) calculates angle from positive x-axis (3 o'clock).
    let angleRad = Math.atan2(y, x);

    // Convert radians to degrees (0 to 360, starting at 3 o'clock)
    let angleDeg = angleRad * (180 / Math.PI);

    // Map 0-360 (starting at 3 o'clock) to -180 to 180
    let hueValue = angleDeg;
    if (hueValue > 180) {
        hueValue = hueValue - 360;
    }
    
    // Round to the nearest 5 degrees, matching the slider step
    hueValue = Math.round(hueValue / 5) * 5; 
    
    // Clamp to min/max range for safety
    if (hueValue < -180) hueValue = -180;
    if (hueValue > 180) hueValue = 180;

    handleChange('hue', hueValue);

  }, [handleChange]);

  // Handle end of drag: simply reset the state
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []); 

  // Handle mouse move: use the callback to calculate hue
  const handleDragging = useCallback((e) => {
    calculateHueFromMouseEvent(e);
  }, [calculateHueFromMouseEvent]);

  // Handle start of drag: set the state flag
  const handleDragStart = useCallback((e) => {
    if (e.button !== 0 || e.target.closest('.w-4.h-4')) return; 
    setIsDragging(true);
    e.preventDefault();
    calculateHueFromMouseEvent(e);
  }, [calculateHueFromMouseEvent]);
  
  // Use useEffect to manage global listeners tied to the isDragging state.
  useEffect(() => {
      if (isDragging) {
          // Attach listeners only when dragging starts
          document.addEventListener('mousemove', handleDragging);
          document.addEventListener('mouseup', handleDragEnd);
      }
      // Cleanup function removes listeners when isDragging becomes false or component unmounts
      return () => {
          document.removeEventListener('mousemove', handleDragging);
          document.removeEventListener('mouseup', handleDragEnd);
      };
  }, [isDragging, handleDragging, handleDragEnd]);

  // --- RENDER FUNCTIONS ---
  // Helper function to render a slider control
  const renderSlider = (label, name, min, max, step, displayFactor = 1) => {
    const value = effects[name] || 0;
    const isCentered = (min === -50 && max === 50); // Checks for Brightness, Contrast, Saturation, Exposure
    
    // Calculate the fill percentage (0% to 100%)
    const fillPercent = ((value - min) / (max - min)) * 100;
    
    // Create the gradient background
    const gradientStyle = {
      background: `linear-gradient(to right, 
        #FFFFFF 0%, 
        #FFFFFF ${fillPercent}%, 
        #4b5563 ${fillPercent}%, 
        #4b5563 100%)`
    };

    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <label className="font-medium text-gray-300">{label}</label>
          <span className="text-gray-400">{((value) * displayFactor).toFixed(0)}{name === 'hue' ? '°' : '%'}</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          name={name}
          value={value}
          onChange={(e) => handleChange(name, e.target.value)}
          // Apply dynamic gradient style
          style={gradientStyle}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer range-lg bg-gray-700" 
          disabled={!activeLayer}
        />
      </div>
    );
  };
  
  // Component for the circular hue picker (emulating the image)
  const renderHuePicker = (label, name, min, max, step, displayFactor = 1) => {
    // FIX: Adjusted radial-gradient to define a 4px thick band (44px to 48px)
    const combinedBackground = `
        radial-gradient(circle, white 0%, white 44px, transparent 48px),
        conic-gradient(red, yellow, lime, aqua, blue, magenta, red)
    `;
    
    const hueValue = effects[name] || 0; // -180 to 180
    
    // Calculate the position of the marker
    const outerRadius = 64; // w-32, h-32 -> 128px / 2
    // FIX: Marker position set to 46px (Center of the 44px-48px band)
    const markerDistance = 46; 
    
    // Map hueValue (-180 to 180) to the angle for positioning.
    // Angle: 0 at 3 o'clock, positive clockwise.
    const angle = hueValue * (Math.PI / 180);
    
    const markerX = outerRadius + markerDistance * Math.cos(angle);
    const markerY = outerRadius + markerDistance * Math.sin(angle);

    return (
        <div className="space-y-1">
            <div className="flex justify-between text-sm">
                <label className="font-medium text-gray-300">{label}</label>
                <span className="text-gray-400">{((hueValue) * displayFactor).toFixed(0)}°</span>
            </div>
            
            {/* Custom Circular Picker UI */}
            <div 
              ref={huePickerRef}
              className="relative w-32 h-32 mx-auto mt-4 mb-2 cursor-pointer select-none"
              onMouseDown={activeLayer ? handleDragStart : undefined}
            >
                {/* The circular color gradient with the hollow center */}
                <div 
                    className="absolute inset-0 rounded-full"
                    style={{ background: combinedBackground }}
                >
                </div>
                
                {/* Marker representing the current hue value */}
                <div
                    // CHANGE: Darker border color for marker
                    className="absolute w-4 h-4 bg-white border-2 border-gray-900 rounded-full shadow-md pointer-events-none"
                    style={{ 
                        // ... (positioning styles)
                        top: `${markerY}px`,
                        left: `${markerX}px`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10
                    }}
                ></div>
            </div>
            <p className="text-xs text-gray-500 text-center">Drag anywhere on the wheel to change hue</p>
        </div>
    );
  }

  return (
    <div className="space-y-4">
      
      {!activeLayer && (
        <div className="text-center py-8 text-gray-500">
          Select an image band from the 'Available Bands' tab to apply effects.
        </div>
      )}

      {activeLayer && (
        <div className="space-y-4 p-2"> 
          
          <div className="flex flex-col gap-2
           justify-between items-start pb-2 border-b border-gray-700"> {/* CHANGE: Dark border */}
             <div className="text-sm font-medium text-blue-400 truncate max-w-[200px]"> {/* CHANGE: Text color */}
                Active: {activeLayer.name}
             </div>
             <button
               onClick={handleReset}
               className="text-xs px-3 py-1 bg-red-900/20 text-red-400 rounded hover:bg-red-900/40 transition-colors disabled:opacity-50"
               disabled={!activeLayer}
             >
               Reset All
             </button>
          </div>

          <div className="space-y-6">
            {/* Sliders */}
            {renderSlider('Transparency', 'transparency', 0, 100, 1)}
            {renderSlider('Brightness', 'brightness', -50, 50, 1, 1)}
            {renderSlider('Contrast', 'contrast', -50, 50, 1, 1)}
            {renderSlider('Saturation', 'saturation', -50, 50, 1, 1)}
            {renderSlider('Exposure', 'exposure', -50, 50, 1, 1)}
            
            {/* Hue Shift */}
            {renderHuePicker('Hue Shift', 'hue', -180, 180, 5, 1)}
          </div>
        </div>
      )}
    </div>
  );
};

export default EffectsTab;