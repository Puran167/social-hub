import React from 'react';

const LoadingSpinner = ({ size = 'md', text }) => {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12', xl: 'w-16 h-16' };
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className={`${sizes[size]} border-2 border-gray-200 dark:border-dark-border border-t-primary dark:border-t-primary-dark rounded-full animate-spin`} />
      {text && <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
