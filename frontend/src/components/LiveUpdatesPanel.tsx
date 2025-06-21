import React, { useState } from 'react';
import { LiveMatchWithUpdates, LiveUpdate } from '../types/live';

interface LiveUpdatesPanelProps {
  match: LiveMatchWithUpdates;
}

export default function LiveUpdatesPanel({ match }: LiveUpdatesPanelProps) {
  const [showAllUpdates, setShowAllUpdates] = useState(false);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusIcon = (update: LiveUpdate) => {
    if (update.is_final) {
      return (
        <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      );
    }

    if (update.minute) {
      return (
        <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-green-600">{update.minute}</span>
        </div>
      );
    }

    return (
      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      </div>
    );
  };

  const getScoreDisplay = (update: LiveUpdate) => {
    if (update.home_score && update.away_score) {
      return (
        <div className="text-lg font-bold text-gray-900">
          {update.home_score} - {update.away_score}
        </div>
      );
    }
    return null;
  };

  const sortedUpdates = [...match.updates].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeB - timeA; // Most recent first
  });

  const displayedUpdates = showAllUpdates ? sortedUpdates : sortedUpdates.slice(0, 10);

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Match Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-900">
            {match.home_team} vs {match.away_team}
          </h2>
          <div className="flex items-center space-x-2">
            {match.is_final ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                Full Time
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                {match.minute ? `${match.minute} mins` : 'Live'}
              </span>
            )}
          </div>
        </div>
        
        {match.home_score && match.away_score && (
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {match.home_score} - {match.away_score}
          </div>
        )}
        
        <div className="text-sm text-gray-600">
          Last updated: {formatTime(match.updated_at)} on {formatDate(match.updated_at)}
        </div>
      </div>

      {/* Updates Timeline */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Live Updates</h3>
          <span className="text-sm text-gray-600">
            {sortedUpdates.length} update{sortedUpdates.length !== 1 ? 's' : ''}
          </span>
        </div>

        {displayedUpdates.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No updates yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Live updates will appear here as the match progresses.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedUpdates.map((update, index) => (
              <div key={`${update.match_key}-${update.timestamp}-${index}`} className="flex space-x-4">
                {getStatusIcon(update)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-medium text-gray-900">
                      {update.is_final ? 'Full Time' : update.minute ? `${update.minute} minutes` : 'Live Update'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(update.timestamp)}
                    </div>
                  </div>
                  
                  {getScoreDisplay(update) && (
                    <div className="mb-2">
                      {getScoreDisplay(update)}
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-700">
                    {update.home_team} {update.home_score} - {update.away_score} {update.away_team}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {sortedUpdates.length > 10 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowAllUpdates(!showAllUpdates)}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {showAllUpdates ? 'Show Less' : `Show All ${sortedUpdates.length} Updates`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 