import { Match } from '@/types/matches';

interface MatchCardProps {
  match: Match;
}

export default function MatchCard({ match }: MatchCardProps) {
  const {
    competition,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    venue,
    referee,
    date,
    time,
    broadcasting,
    isFixture,
  } = match;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4 hover:shadow-lg transition-shadow">
      <div className="text-sm text-gray-600 mb-2">
        {competition}
      </div>
      
      <div className="flex justify-between items-center mb-2">
        <div className="flex-1">
          <div className="font-semibold">{homeTeam}</div>
          <div className="text-sm text-gray-500">vs</div>
          <div className="font-semibold">{awayTeam}</div>
        </div>
        
        {!isFixture && homeScore && awayScore && (
          <div className="text-xl font-bold text-gray-800 ml-4">
            <div>{homeScore}</div>
            <div className="text-center text-gray-400">-</div>
            <div>{awayScore}</div>
          </div>
        )}
        
        {isFixture && (
          <div className="text-sm text-blue-600 font-medium">
            Upcoming
          </div>
        )}
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        {venue && <div>📍 {venue}</div>}
        {referee && <div>👨‍⚖️ {referee}</div>}
        {broadcasting && <div>📺 {broadcasting}</div>}
        <div>
          📅 {date} {time && `at ${time}`}
        </div>
      </div>
    </div>
  );
} 