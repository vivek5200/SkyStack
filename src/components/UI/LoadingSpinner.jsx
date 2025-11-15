import React from 'react';

const LoadingSpinner = ({ message = 'Loading...' }) => {
  return (
    <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 text-center">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto mb-2"></div>
      <p className="text-blue-400 text-sm">{message}</p>
    </div>
  );
};

export default LoadingSpinner;