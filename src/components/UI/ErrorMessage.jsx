import React from 'react';

const ErrorMessage = ({ message }) => {
  return (
    <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
      <div className="flex items-center">
        <span className="text-red-400 text-sm">{message}</span>
      </div>
    </div>
  );
};

export default ErrorMessage;