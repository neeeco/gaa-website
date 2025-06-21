import React from 'react';
import { LiveScore } from '../types/live';

interface LiveScoreCardProps {
  score: LiveScore;
  isSelected: boolean;
  onClick: () => void;
}

export default function LiveScoreCard({ score, isSelected, onClick }: LiveScoreCardProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const updateTime = new Date(timestamp);
    const diffMs = now.getTime() - updateTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getStatusBadge = () => {
    if (score.is_final) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Full Time
        </span>
      );
    }
    
    if (score.minute) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          {score.minute} mins
        </span>
      );
    }
    
    // Check if the score is recent (within last 2 hours)
    const updateTime = new Date(score.updated_at);
    const now = new Date();
    const diffMs = now.getTime() - updateTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 2) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Live
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Recent
      </span>
    );
  };

  const getScoreDisplay = () => {
    if (score.home_score && score.away_score) {
      return (
        <div className="text-lg font-bold text-gray-900">
          {score.home_score} - {score.away_score}
        </div>
      );
    }
    return (
      <div className="text-sm text-gray-500">Score not available</div>
    );
  };

  const isRecent = () => {
    const updateTime = new Date(score.updated_at);
    const now = new Date();
    const diffMs = now.getTime() - updateTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours < 2;
  };

  return (
    <div
      className={`p-4 cursor-pointer transition-colors duration-200 ${
        isSelected 
          ? 'bg-blue-50 border-l-4 border-blue-500' 
          : 'hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {score.home_team}
          </div>
          <div className="text-sm font-medium text-gray-900 truncate">
            vs {score.away_team}
          </div>
        </div>
        <div className="ml-2 flex-shrink-0">
          {getStatusBadge()}
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-2">
        {getScoreDisplay()}
        <div className="text-xs text-gray-500">
          {formatTime(score.updated_at)}
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-600">
          Updated {getTimeAgo(score.updated_at)}
        </div>
        {isRecent() && (
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
            <span className="text-xs text-green-600 font-medium">Live</span>
          </div>
        )}
      </div>
      
      {score.last_update && (
        <div className="mt-2 text-xs text-gray-600">
          Last update: {score.last_update}
        </div>
      )}
    </div>
  );
} 