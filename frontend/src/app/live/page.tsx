'use client';

import React, { useState, useEffect } from 'react';
import { LiveScore, LiveMatchWithUpdates } from '../../types/live';
import { liveScoresService } from '../../services/liveScoresService';
import LiveScoreCard from '../../components/LiveScoreCard';
import LiveUpdatesPanel from '../../components/LiveUpdatesPanel';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function LiveScoresPage() {
  const [liveScores, setLiveScores] = useState<LiveScore[]>([]);
  const [liveUpdates, setLiveUpdates] = useState<LiveMatchWithUpdates[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchLiveData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both live scores and updates
      const [scoresResponse, updatesResponse] = await Promise.all([
        liveScoresService.getLiveScores(),
        liveScoresService.getLiveScoresWithUpdates()
      ]);

      if (scoresResponse.error) {
        throw new Error(scoresResponse.error);
      }

      if (updatesResponse.error) {
        throw new Error(updatesResponse.error);
      }

      setLiveScores(scoresResponse.data);
      setLiveUpdates(updatesResponse.data);
      setLastRefresh(new Date());

      // Auto-select first match if none selected
      if (!selectedMatch && scoresResponse.data.length > 0) {
        setSelectedMatch(scoresResponse.data[0].match_key);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch live data');
      console.error('Error fetching live data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchLiveData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleMatchSelect = (matchKey: string) => {
    setSelectedMatch(matchKey);
  };

  const handleRefresh = () => {
    fetchLiveData();
  };

  const selectedMatchData = liveUpdates.find(match => match.match_key === selectedMatch);

  // Calculate statistics
  const getStats = () => {
    const now = new Date();
    const liveMatches = liveScores.filter(score => {
      const updateTime = new Date(score.updated_at);
      const diffMs = now.getTime() - updateTime.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return diffHours < 2;
    });
    
    const finishedMatches = liveScores.filter(score => score.is_final);
    const ongoingMatches = liveScores.filter(score => !score.is_final && score.minute);
    
    return {
      total: liveScores.length,
      live: liveMatches.length,
      finished: finishedMatches.length,
      ongoing: ongoingMatches.length
    };
  };

  const stats = getStats();

  if (loading && liveScores.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Live Scores</h1>
              <p className="text-sm text-gray-600 mt-1">
                Real-time GAA match updates and scores
              </p>
              {lastRefresh && (
                <p className="text-xs text-gray-500 mt-1">
                  Last updated: {lastRefresh.toLocaleTimeString('en-GB')}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-600">Auto-refresh</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      {liveScores.length > 0 && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">Total matches:</span>
                <span className="font-semibold text-gray-900">{stats.total}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Live:</span>
                <span className="font-semibold text-gray-900">{stats.live}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">Ongoing:</span>
                <span className="font-semibold text-gray-900">{stats.ongoing}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-gray-600">Finished:</span>
                <span className="font-semibold text-gray-900">{stats.finished}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading live scores</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {liveScores.length === 0 && !loading ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No live matches</h3>
            <p className="mt-1 text-sm text-gray-500">
              There are currently no live matches. Check back later for updates.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Scores List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Match Scores</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {stats.total} match{stats.total !== 1 ? 'es' : ''} • {stats.live} live
                  </p>
                </div>
                <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {liveScores.map((score) => (
                    <LiveScoreCard
                      key={score.match_key}
                      score={score}
                      isSelected={selectedMatch === score.match_key}
                      onClick={() => handleMatchSelect(score.match_key)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Live Updates Panel */}
            <div className="lg:col-span-2">
              {selectedMatchData ? (
                <LiveUpdatesPanel match={selectedMatchData} />
              ) : (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Select a match</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Choose a match from the list to view live updates and commentary.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 