'use client';

import { useState, useEffect } from 'react';
import MatchCard from '@/components/MatchCard';
import { Match, MatchFilter } from '@/types/matches';
import { getMatches } from '@/services/matches';

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MatchFilter>({
    sport: undefined,
    showResults: false,
  });

  useEffect(() => {
    async function fetchMatches() {
      const data = await getMatches();
      setMatches(data);
      setLoading(false);
    }
    fetchMatches();
  }, []);

  const filteredMatches = matches.filter((match) => {
    if (filter.sport && match.sport !== filter.sport) return false;
    if (filter.showResults !== undefined && match.isResult !== filter.showResults) return false;
    return true;
  });

  return (
    <main className="min-h-screen p-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">GAA Fixtures & Results</h1>
      
      <div className="mb-6 flex gap-4">
        <select
          className="px-4 py-2 border rounded-lg"
          value={filter.sport || ''}
          onChange={(e) => setFilter({ ...filter, sport: e.target.value as 'football' | 'hurling' | undefined })}
        >
          <option value="">All Sports</option>
          <option value="football">Football</option>
          <option value="hurling">Hurling</option>
        </select>

        <button
          className={`px-4 py-2 rounded-lg ${
            filter.showResults
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
          onClick={() => setFilter({ ...filter, showResults: !filter.showResults })}
        >
          {filter.showResults ? 'Show Fixtures' : 'Show Results'}
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center text-gray-500">Loading matches...</div>
        ) : filteredMatches.length > 0 ? (
          filteredMatches.map((match, index) => (
            <MatchCard key={index} match={match} />
          ))
        ) : (
          <p className="text-center text-gray-500">No matches found</p>
        )}
      </div>
    </main>
  );
}
