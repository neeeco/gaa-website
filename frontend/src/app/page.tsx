'use client';

import { useEffect, useState } from 'react';

type Match = {
  competition: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  venue?: string;
  referee?: string;
  time?: string;
  isFixture: boolean;
};

function filterSeniorChampionships(matches: Match[]) {
  return matches.filter((match) => {
    const compLower = match.competition.toLowerCase();
    return compLower.includes('senior championship');
  });
}

function groupSeniorChampionships(matches: Match[]) {
  const groups = {
    hurling: {} as Record<string, Match[]>,
    football: {} as Record<string, Match[]>,
  };

  matches.forEach((match) => {
    const compLower = match.competition.toLowerCase();
    let sport: 'hurling' | 'football';
    
    if (compLower.includes('hurling')) {
      sport = 'hurling';
    } else if (compLower.includes('football')) {
      sport = 'football';
    } else {
      return; // Skip non-hurling/football championships
    }

    const competition = match.competition;
    if (!groups[sport][competition]) {
      groups[sport][competition] = [];
    }
    groups[sport][competition].push(match);
  });

  return groups;
}

function ChampionshipSection({ 
  title, 
  matches, 
  isFixtures = false 
}: { 
  title: string; 
  matches: Record<string, Match[]>; 
  isFixtures?: boolean;
}) {
  return (
    <div className="mb-8">
      <h3 className="text-xl font-bold mb-4 text-center bg-gradient-to-r from-green-600 to-orange-500 bg-clip-text text-transparent">
        {title} {isFixtures ? 'Fixtures' : 'Results'}
      </h3>
      
      {Object.keys(matches).length === 0 ? (
        <p className="text-center text-gray-500 italic">
          No {title.toLowerCase()} {isFixtures ? 'fixtures' : 'results'} available
        </p>
      ) : (
        Object.entries(matches).map(([competition, matchesInGroup]) => (
          <div key={competition} className="mb-6">
            <h4 className="text-lg font-semibold mb-3 text-gray-700 border-b border-gray-200 pb-1">
              {competition}
            </h4>
            <div className="grid gap-3">
              {matchesInGroup.map((match, i) => (
                <div key={i} className="bg-white border-l-4 border-l-green-500 rounded-r-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="text-lg font-semibold text-gray-800">
                        {match.homeTeam} 
                        {!isFixtures && (
                          <span className="mx-2 text-blue-600 font-bold">
                            {match.homeScore}
                          </span>
                        )}
                        <span className="text-gray-500 mx-2">vs</span>
                        {!isFixtures && (
                          <span className="mx-2 text-blue-600 font-bold">
                            {match.awayScore}
                          </span>
                        )}
                        {match.awayTeam}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center">
                      <span className="font-medium">📅</span>
                      <span className="ml-2">{match.date} {match.time}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium">📍</span>
                      <span className="ml-2">{match.venue || 'Venue TBA'}</span>
                    </div>
                    {match.referee && (
                      <div className="flex items-center">
                        <span className="font-medium">👨‍⚖️</span>
                        <span className="ml-2">{match.referee}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default function HomePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    console.log('Fetching from:', `${apiUrl}/api/matches`);
    
    fetch(`${apiUrl}/api/matches`)
      .then((res) => {
        console.log('Response status:', res.status);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log('Raw data received:', data);
        console.log('Number of matches:', data.length);
        console.log('Sample match:', data[0]);
        
        if (!Array.isArray(data)) {
          throw new Error('Expected array of matches but got: ' + typeof data);
        }
        
        setMatches(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching matches:', err);
        setError(err.message || 'Failed to fetch matches');
        setLoading(false);
      });
  }, []);

  // Filter for senior championships only
  const seniorMatches = filterSeniorChampionships(matches);
  console.log('Senior matches found:', seniorMatches.length);
  console.log('Sample senior matches:', seniorMatches.slice(0, 3));
  const fixtures = seniorMatches.filter((m) => m.isFixture);
  const results = seniorMatches.filter((m) => !m.isFixture);

  const groupedFixtures = groupSeniorChampionships(fixtures);
  const groupedResults = groupSeniorChampionships(results);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-4xl font-bold text-center mb-2">
            <span className="bg-gradient-to-r from-green-600 to-orange-500 bg-clip-text text-transparent">
              GAA Men's Senior Championships
            </span>
          </h1>
          <p className="text-center text-gray-600">All Hurling & Football Results & Fixtures</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="mt-2 text-gray-600">Loading championships...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h3>
            <p className="text-red-600">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      ) : seniorMatches.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Senior Championships Found</h3>
            <p className="text-yellow-600">
              Loaded {matches.length} total matches, but found no senior championship matches.
            </p>
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-yellow-700 font-medium">Debug Info</summary>
              <pre className="mt-2 text-xs bg-yellow-100 p-2 rounded overflow-auto">
                {JSON.stringify(matches.slice(0, 3), null, 2)}
              </pre>
            </details>
          </div>
        </div>
      ) : (
        <>
          {/* Main Content - All Results and Fixtures */}
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Column - Hurling */}
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-green-700 mb-1">🏑 Hurling</h2>
                  <div className="w-16 h-1 bg-green-500 mx-auto"></div>
                </div>
                
                {/* Hurling Results */}
                <ChampionshipSection 
                  title="Senior Hurling" 
                  matches={groupedResults.hurling} 
                />
                
                {/* Hurling Fixtures */}
                <ChampionshipSection 
                  title="Senior Hurling" 
                  matches={groupedFixtures.hurling} 
                  isFixtures={true}
                />
              </div>

              {/* Right Column - Football */}
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-orange-700 mb-1">⚽ Football</h2>
                  <div className="w-16 h-1 bg-orange-500 mx-auto"></div>
                </div>
                
                {/* Football Results */}
                <ChampionshipSection 
                  title="Senior Football" 
                  matches={groupedResults.football} 
                />
                
                {/* Football Fixtures */}
                <ChampionshipSection 
                  title="Senior Football" 
                  matches={groupedFixtures.football} 
                  isFixtures={true}
                />
              </div>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-semibold mb-4 text-center">Championship Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-3xl font-bold text-green-600">
                    {Object.values(groupedResults.hurling).flat().length}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">Hurling Results</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-3xl font-bold text-green-600">
                    {Object.values(groupedFixtures.hurling).flat().length}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">Hurling Fixtures</div>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-3xl font-bold text-orange-600">
                    {Object.values(groupedResults.football).flat().length}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">Football Results</div>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-3xl font-bold text-orange-600">
                    {Object.values(groupedFixtures.football).flat().length}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">Football Fixtures</div>
                </div>
              </div>
              
              {/* Total Summary */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <span className="text-2xl font-bold text-gray-800">
                    {seniorMatches.length}
                  </span>
                  <span className="text-gray-600 ml-2">Total Senior Championship Matches</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
