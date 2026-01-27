import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'md',
  fullScreen = false,
}) => {
  const sizeClasses = {
    sm: 'size-4',
    md: 'size-8',
    lg: 'size-12',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className={`${sizeClasses[size]} text-primary animate-spin`} />
      {message && (
        <p className={`${textSizes[size]} text-text-secondary`}>{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="h-full w-full flex items-center justify-center min-h-[200px]">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingState;
