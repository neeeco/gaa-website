import { Match } from '@/types/matches';

interface MatchCardProps {
  match: Match;
}

export default function MatchCard({ match }: MatchCardProps) {
  const {
    competition,
    round,
    homeTeam,
    awayTeam,
    venue,
    date,
    time,
    score,
    isResult,
  } = match;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4 hover:shadow-lg transition-shadow">
      <div className="text-sm text-gray-600 mb-2">
        {competition} - {round}
      </div>
      
      <div className="flex justify-between items-center mb-2">
        <div className="flex-1">
          <div className="font-semibold">{homeTeam}</div>
          <div className="font-semibold">{awayTeam}</div>
        </div>
        
        {isResult && score && (
          <div className="text-xl font-bold text-gray-800 ml-4">
            <div>{score.home}</div>
            <div>{score.away}</div>
          </div>
        )}
      </div>

      <div className="text-sm text-gray-600">
        <div>{venue}</div>
        <div>
          {date} at {time}
        </div>
      </div>
    </div>
  );
} 