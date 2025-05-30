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

function groupBySportAndCompetition(matches: Match[]) {
  const groups: Record<string, Record<string, Match[]>> = {
    Hurling: {},
    Football: {},
    Other: {},
  };

  matches.forEach((match) => {
    let sport = 'Other';
    const compLower = match.competition.toLowerCase();
    if (compLower.includes('hurling')) sport = 'Hurling';
    else if (compLower.includes('football')) sport = 'Football';

    const comp = match.competition || 'Other';

    if (!groups[sport][comp]) groups[sport][comp] = [];
    groups[sport][comp].push(match);
  });

  return groups;
}

export default function HomePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/matches`)
      .then((res) => res.json())
      .then((data) => {
        setMatches(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching matches:', err);
        setLoading(false);
      });
  }, []);

  const fixtures = matches.filter((m) => m.isFixture);
  const results = matches.filter((m) => !m.isFixture);

  const groupedFixtures = groupBySportAndCompetition(fixtures);
  const groupedResults = groupBySportAndCompetition(results);

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">GAA Fixtures & Results</h1>

      {loading ? (
        <p>Loading matches...</p>
      ) : (
        <>
          {/* Fixtures Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Upcoming Fixtures</h2>
            {['Hurling', 'Football', 'Other'].map((sport) => (
              <div key={sport} className="mb-6">
                <h3 className="text-xl font-bold mb-3">{sport}</h3>
                {Object.entries(groupedFixtures[sport]).length === 0 && (
                  <p>No {sport.toLowerCase()} fixtures.</p>
                )}
                {Object.entries(groupedFixtures[sport]).map(([competition, matchesInGroup]) => (
                  <div key={competition} className="mb-4">
                    <h4 className="text-lg font-semibold">{competition}</h4>
                    <ul className="space-y-4">
                      {matchesInGroup.map((match, i) => (
                        <li key={i} className="border rounded p-4 shadow">
                          <p>
                            <strong>Date:</strong> {match.date} {match.time}
                          </p>
                          <p>
                            <strong>Teams:</strong> {match.homeTeam} vs {match.awayTeam}
                          </p>
                          <p>
                            <strong>Venue:</strong> {match.venue || 'TBA'}
                          </p>
                          {match.referee && (
                            <p>
                              <strong>Referee:</strong> {match.referee}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </section>

          {/* Results Section */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Recent Results</h2>
            {['Hurling', 'Football', 'Other'].map((sport) => (
              <div key={sport} className="mb-6">
                <h3 className="text-xl font-bold mb-3">{sport}</h3>
                {Object.entries(groupedResults[sport]).length === 0 && (
                  <p>No {sport.toLowerCase()} results.</p>
                )}
                {Object.entries(groupedResults[sport]).map(([competition, matchesInGroup]) => (
                  <div key={competition} className="mb-4">
                    <h4 className="text-lg font-semibold">{competition}</h4>
                    <ul className="space-y-4">
                      {matchesInGroup.map((match, i) => (
                        <li key={i} className="border rounded p-4 shadow">
                          <p>
                            <strong>Date:</strong> {match.date} {match.time}
                          </p>
                          <p>
                            <strong>Teams:</strong> {match.homeTeam} {match.homeScore} - {match.awayScore} {match.awayTeam}
                          </p>
                          <p>
                            <strong>Venue:</strong> {match.venue || 'TBA'}
                          </p>
                          {match.referee && (
                            <p>
                              <strong>Referee:</strong> {match.referee}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
