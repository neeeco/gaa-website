import React from 'react';
import Image from 'next/image';

interface FixtureWithScore {
  id: number;
  competition: string;
  hometeam: string;
  awayteam: string;
  date: string;
  time?: string;
  venue?: string;
  liveScore?: {
    match_key: string;
    home_team: string;
    away_team: string;
    home_score?: string;
    away_score?: string;
    minute?: number;
    is_final: boolean;
    updated_at: string;
  } | null;
  hasLiveScore: boolean;
}

interface TodaysFixturesCardProps {
  fixture: FixtureWithScore;
}

export default function TodaysFixturesCard({ fixture }: TodaysFixturesCardProps) {
  const getTeamLogo = (teamName: string) => {
    // Simple SVG logo generation (you can enhance this)
    const normalizedName = teamName.toLowerCase().trim();
    const initials = teamName.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 3);
    
    const svgLogo = `
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2 L20 6 L20 14 C20 18 16 22 12 22 C8 22 4 18 4 14 L4 6 Z" 
              fill="#228B22" 
              stroke="#333" 
              stroke-width="0.5"/>
        <text x="12" y="14" 
              font-family="Arial, sans-serif" 
              font-size="6" 
              font-weight="bold" 
              text-anchor="middle" 
              fill="#FFFFFF">${initials}</text>
      </svg>
    `;
    
    return `data:image/svg+xml,${encodeURIComponent(svgLogo.trim())}`;
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const updateTime = new Date(timestamp);
    const diffMs = now.getTime() - updateTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${diffHours}h ago`;
  };

  const getStatusBadge = () => {
    if (!fixture.liveScore) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Scheduled
        </span>
      );
    }
    
    if (fixture.liveScore.is_final) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Full Time
        </span>
      );
    }
    
    if (fixture.liveScore.minute) {
      // Check if the score is recent (within last 2 hours)
      const updateTime = new Date(fixture.liveScore.updated_at);
      const now = new Date();
      const diffMs = now.getTime() - updateTime.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      if (diffHours < 2) {
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {fixture.liveScore.minute} mins
          </span>
        );
      }
      
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {fixture.liveScore.minute} mins
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        Live
      </span>
    );
  };

  const getScoreDisplay = () => {
    if (!fixture.liveScore || !fixture.liveScore.home_score || !fixture.liveScore.away_score) {
      return (
        <div className="text-sm text-gray-500">
          {fixture.time ? fixture.time : 'TBD'}
        </div>
      );
    }
    
    return (
      <div className="text-lg font-bold text-gray-900">
        {fixture.liveScore.home_score} - {fixture.liveScore.away_score}
      </div>
    );
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isRecent = () => {
    if (!fixture.liveScore) return false;
    const updateTime = new Date(fixture.liveScore.updated_at);
    const now = new Date();
    const diffMs = now.getTime() - updateTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours < 2;
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {fixture.competition}
          </h3>
          <div className="text-xs text-gray-500 mt-1">
            {fixture.venue && `${fixture.venue}`}
          </div>
        </div>
        <div className="ml-2 flex-shrink-0">
          {getStatusBadge()}
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Home Team */}
          <div className="flex items-center gap-2 min-w-0 justify-end">
            <span className="font-medium text-gray-900 truncate text-sm">{fixture.hometeam}</span>
            <div className="w-5 h-5 flex-shrink-0">
              <Image 
                src={getTeamLogo(fixture.hometeam)} 
                alt={`${fixture.hometeam} logo`}
                width={20}
                height={20}
                className="object-contain"
              />
            </div>
          </div>
          
          {/* Score/VS */}
          <div className="flex-shrink-0 min-w-[60px] text-center">
            {getScoreDisplay()}
          </div>
          
          {/* Away Team */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 flex-shrink-0">
              <Image 
                src={getTeamLogo(fixture.awayteam)} 
                alt={`${fixture.awayteam} logo`}
                width={20}
                height={20}
                className="object-contain"
              />
            </div>
            <span className="font-medium text-gray-900 truncate text-sm">{fixture.awayteam}</span>
          </div>
        </div>
      </div>
      
      {fixture.liveScore && (
        <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-2">
          <span>Updated {getTimeAgo(fixture.liveScore.updated_at)}</span>
          {isRecent() && (
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
              <span className="text-green-600 font-medium">Live</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 