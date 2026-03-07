import React, { useState } from 'react';
import { motion } from 'framer-motion';

const OptimizedImage = ({ src, alt, className, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Placeholder Skeleton */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-slate-800 animate-pulse" />
      )}
      
      {/* Fallback Image */}
      {hasError ? (
        <div className="absolute inset-0 bg-slate-800 flex items-center justify-center text-slate-500 text-xs text-center p-2">
          {alt || 'No Image'}
        </div>
      ) : (
        <motion.img
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.5 }}
          src={src}
          alt={alt}
          className={`w-full h-full object-cover ${className}`}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}
    </div>
  );
};

export default OptimizedImage;
