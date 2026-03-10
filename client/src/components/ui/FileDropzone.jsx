import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { HiCloudArrowUp } from 'react-icons/hi2';

const FileDropzone = ({ onDrop, accept, maxSize = 104857600, label = 'Drop files here', multiple = false, children }) => {
  const handleDrop = useCallback((acceptedFiles) => {
    if (onDrop) onDrop(acceptedFiles);
  }, [onDrop]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop, accept, maxSize, multiple,
  });

  return (
    <div {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
        isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 dark:border-dark-border hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-dark-hover/50'
      }`}>
      <input {...getInputProps()} />
      {children || (
        <div className="flex flex-col items-center gap-3">
          <HiCloudArrowUp className={`w-10 h-10 ${isDragActive ? 'text-primary dark:text-primary-dark' : 'text-gray-500 dark:text-gray-400'}`} />
          <p className="text-sm text-gray-500 dark:text-gray-400">{isDragActive ? 'Drop it here!' : label}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Max size: {Math.round(maxSize / 1024 / 1024)}MB</p>
        </div>
      )}
    </div>
  );
};

export default FileDropzone;
