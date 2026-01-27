import React, { ReactNode } from 'react';
import { Inbox, Search, Zap, Calendar, FileX } from 'lucide-react';

type EmptyStateType = 'default' | 'search' | 'stations' | 'sessions' | 'reservations';

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: ReactNode;
}

const defaultContent: Record<EmptyStateType, { icon: ReactNode; title: string; description: string }> = {
  default: {
    icon: <Inbox size={32} />,
    title: 'No data available',
    description: 'There is no data to display at the moment.',
  },
  search: {
    icon: <Search size={32} />,
    title: 'No results found',
    description: 'Try adjusting your search or filter criteria.',
  },
  stations: {
    icon: <Zap size={32} />,
    title: 'No stations found',
    description: 'There are no charging stations available in this area.',
  },
  sessions: {
    icon: <FileX size={32} />,
    title: 'No charging history',
    description: 'Your charging sessions will appear here.',
  },
  reservations: {
    icon: <Calendar size={32} />,
    title: 'No reservations',
    description: 'You have no active or upcoming reservations.',
  },
};

const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'default',
  title,
  description,
  action,
  icon,
}) => {
  const defaults = defaultContent[type];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-surface-lighter flex items-center justify-center text-text-secondary mb-4">
        {icon || defaults.icon}
      </div>

      {/* Title */}
      <h3 className="text-white text-lg font-semibold mb-2">
        {title || defaults.title}
      </h3>

      {/* Description */}
      <p className="text-text-secondary text-sm max-w-xs mb-6">
        {description || defaults.description}
      </p>

      {/* Action */}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-primary hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
