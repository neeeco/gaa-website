'use client';

import { useEffect, useState } from 'react';
import { Match, GroupTeam, Group } from '../types/matches';
import { getMatches } from '@/services/matches';

// Real All-Ireland SFC Group data based on 2025 structure
const allIrelandSFCGroups: Group[] = [
  {
    name: "Group 1",
    teams: [
      { name: "Donegal", played: 0, won: 0, drawn: 0, lost: 0, for: 0, against: 0, points: 0 },
      { name: "Mayo", played: 0, won: 0, drawn: 0, lost: 0, for: 0, against: 0, points: 0 },
      { name: "Tyrone", played: 0, won: 0, drawn: 0, lost: 0, for: 0, against: 0, points: 0 },
      { name: "Cavan", played: 0, won: 0, drawn: 0, lost: 0, for: 0, against: 0, points: 0 }
    ]
  },
  {
    name: "Group 2", 
    teams: [
      { name: "Kerry", played: 0, won: 0, drawn: 0, lost: 0, for: 0, against: 0, points: 0 },
      { name: "Meath", played: 0, won: 0, drawn: 0, lost: 0, for: 0, against: 0, points: 0 },
      { name: "Roscommon", played: 0, won: 0, drawn: 0, lost: 0, for: 0, against: 0, points: 0 },
      { name: "Cork", played: 0, won: 0, drawn: 0, lost: 0, for: 0, against: 0, points: 0 }
    ]
  },
  {
    name: "Group 3",
    teams: [
      { name: "Louth", played: 0, won: 0, drawn: 0, lost: 0, for: 0, against: 0, points: 0 },
      { name: "Clare", played: 0, won: 0, drawn: 0, lost: 0, for: 0, against: 0, points: 0 },
      { name: "Monaghan", played: 0, won: 0, drawn: 0, lost: 0, for: 0, against: 0, points: 0 },
      { name: "Down", played: 0, won: 0, drawn: 0, lost: 0, for: 0, against: 0, points: 0 }
    ]
  },
  {
    name: "Group 4",
    teams: [
      { name: "Galway", played: 0, won: 0, drawn: 0, lost: 0, for: 0, against: 0, points: 0 },
      { name: "Armagh", played: 0, won: 0, drawn: 0, lost: 0, for: 0, against: 0, points: 0 },
      { name: "Dublin", played: 0, won: 0, drawn: 0, lost: 0, for: 0, against: 0, points: 0 },
      { name: "Derry", played: 0, won: 0, drawn: 0, lost: 0, for: 0, against: 0, points: 0 }
    ]
  }
];

function filterAllIrelandSFCMatches(matches: Match[]) {
  return matches.filter((match) => {
    const compLower = match.competition.toLowerCase();
    return compLower.includes('all-ireland') && 
           compLower.includes('senior') && 
           compLower.includes('football') &&
           compLower.includes('championship');
  });
}

function filterSeniorChampionships(matches: Match[]) {
  return matches.filter((match) => {
    const compLower = match.competition.toLowerCase();
    return compLower.includes('senior championship');
  });
}

// Helper function to parse date strings for sorting
function parseMatchDate(match: Match): Date {
  const { date, time } = match;
  
  try {
    // Convert date like "Saturday 17 May" or "Sunday 01 June" to a proper date
    const dateMatch = date.match(/(\w+)\s+(\d{1,2})\s+(\w+)/);
    if (!dateMatch) return new Date(); // fallback to current date
    
    const day = parseInt(dateMatch[2]);
    const monthStr = dateMatch[3].toLowerCase();
    
    // Map month names to numbers (assuming current year)
    const monthMap: Record<string, number> = {
      'january': 0, 'jan': 0,
      'february': 1, 'feb': 1,
      'march': 2, 'mar': 2,
      'april': 3, 'apr': 3,
      'may': 4,
      'june': 5, 'jun': 5,
      'july': 6, 'jul': 6,
      'august': 7, 'aug': 7,
      'september': 8, 'sep': 8,
      'october': 9, 'oct': 9,
      'november': 10, 'nov': 10,
      'december': 11, 'dec': 11
    };
    
    const month = monthMap[monthStr] ?? 5; // default to June if not found
    const year = 2025; // assuming current year
    
    // Parse time if available
    let hour = 12; // default to noon
    let minute = 0;
    
    if (time) {
      const timeMatch = time.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        hour = parseInt(timeMatch[1]);
        minute = parseInt(timeMatch[2]);
      }
    }
    
    return new Date(year, month, day, hour, minute);
  } catch {
    return new Date(); // fallback to current date
  }
}

// Sort results from newest to oldest (most recent first)
function sortResultsByNewest(results: Match[]): Match[] {
  return [...results].sort((a, b) => {
    const dateA = parseMatchDate(a);
    const dateB = parseMatchDate(b);
    return dateB.getTime() - dateA.getTime(); // newest first
  });
}

// Sort fixtures from nearest to furthest (soonest first)
function sortFixturesByNearest(fixtures: Match[]): Match[] {
  return [...fixtures].sort((a, b) => {
    const dateA = parseMatchDate(a);
    const dateB = parseMatchDate(b);
    return dateA.getTime() - dateB.getTime(); // nearest first
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
    
    // More comprehensive sport detection
    if (compLower.includes('hurling') || 
        compLower.includes('camán') || 
        compLower.includes('iomaint') ||
        compLower.includes('camogie')) {
      sport = 'hurling';
    } else if (compLower.includes('football') || 
               compLower.includes('peil') ||
               compLower.includes('ladies football') ||
               compLower.includes('gaelic football')) {
      sport = 'football';
    } else {
      // If sport is unclear, make an educated guess based on competition patterns
      // Some competitions might not explicitly mention the sport
      if (compLower.includes('minor') || compLower.includes('under') || compLower.includes('u-')) {
        // For age-grade competitions, we'll need to check team names or default to football
        sport = 'football'; // Default to football for unclear cases
      } else {
        return; // Skip if we can't determine the sport
      }
    }

    const competition = match.competition;
    if (!groups[sport][competition]) {
      groups[sport][competition] = [];
    }
    groups[sport][competition].push(match);
  });

  // Sort matches within each competition group
  Object.keys(groups.hurling).forEach(competition => {
    const matches = groups.hurling[competition];
    const hasResults = matches.some(m => !m.isFixture);
    const hasFixtures = matches.some(m => m.isFixture);
    
    if (hasResults && hasFixtures) {
      // Mixed group - separate and sort each type
      const results = sortResultsByNewest(matches.filter(m => !m.isFixture));
      const fixtures = sortFixturesByNearest(matches.filter(m => m.isFixture));
      groups.hurling[competition] = [...results, ...fixtures];
    } else if (hasResults) {
      // Results only - sort by newest first
      groups.hurling[competition] = sortResultsByNewest(matches);
    } else {
      // Fixtures only - sort by nearest first
      groups.hurling[competition] = sortFixturesByNearest(matches);
    }
  });

  Object.keys(groups.football).forEach(competition => {
    const matches = groups.football[competition];
    const hasResults = matches.some(m => !m.isFixture);
    const hasFixtures = matches.some(m => m.isFixture);
    
    if (hasResults && hasFixtures) {
      // Mixed group - separate and sort each type
      const results = sortResultsByNewest(matches.filter(m => !m.isFixture));
      const fixtures = sortFixturesByNearest(matches.filter(m => m.isFixture));
      groups.football[competition] = [...results, ...fixtures];
    } else if (hasResults) {
      // Results only - sort by newest first
      groups.football[competition] = sortResultsByNewest(matches);
    } else {
      // Fixtures only - sort by nearest first
      groups.football[competition] = sortFixturesByNearest(matches);
    }
  });

  return groups;
}

// Helper function to get start and end of current week (Monday to Sunday)
function getCurrentWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust for Monday start
  
  const start = new Date(now);
  start.setDate(now.getDate() - daysFromMonday);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

// Helper function to get start and end of last week
function getLastWeekRange(): { start: Date; end: Date } {
  const currentWeek = getCurrentWeekRange();
  
  const end = new Date(currentWeek.start);
  end.setDate(currentWeek.start.getDate() - 1);
  end.setHours(23, 59, 59, 999);
  
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  
  return { start, end };
}

// Helper function to get start and end of previous week (week before last week)
function getPreviousWeekRange(): { start: Date; end: Date } {
  const lastWeek = getLastWeekRange();
  
  const end = new Date(lastWeek.start);
  end.setDate(lastWeek.start.getDate() - 1);
  end.setHours(23, 59, 59, 999);
  
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  
  return { start, end };
}

// Helper function to get start and end of next week
function getNextWeekRange(): { start: Date; end: Date } {
  const currentWeek = getCurrentWeekRange();
  
  const start = new Date(currentWeek.end);
  start.setDate(currentWeek.end.getDate() + 1);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

// Helper function to get the end of the second week from now (2 weeks total)
function getTwoWeeksFromNowEnd(): Date {
  const nextWeek = getNextWeekRange();
  return nextWeek.end; // This is the Sunday ending the second week
}

// Filter matches since May 17th (group stage started 1 week earlier)
function filterMatchesSinceMay17(matches: Match[]): Match[] {
  const may17 = new Date(2025, 4, 17); // May 17, 2025
  
  return matches.filter(match => {
    const matchDate = parseMatchDate(match);
    return matchDate >= may17;
  });
}

// Filter matches for this week's results
function filterThisWeekResults(matches: Match[]): Match[] {
  const { start, end } = getCurrentWeekRange();
  
  return matches.filter(match => {
    if (match.isFixture) return false; // Only results
    const matchDate = parseMatchDate(match);
    return matchDate >= start && matchDate <= end;
  });
}

// Filter matches for last week's results
function filterLastWeekResults(matches: Match[]): Match[] {
  const { start, end } = getLastWeekRange();
  
  return matches.filter(match => {
    if (match.isFixture) return false; // Only results
    const matchDate = parseMatchDate(match);
    return matchDate >= start && matchDate <= end;
  });
}

// Filter matches for previous week's results (week before last week)
function filterPreviousWeekResults(matches: Match[]): Match[] {
  const { start, end } = getPreviousWeekRange();
  
  return matches.filter(match => {
    if (match.isFixture) return false; // Only results
    const matchDate = parseMatchDate(match);
    return matchDate >= start && matchDate <= end;
  });
}

// Get latest senior championship results with intelligent fallback that looks back in time
function getLatestResults(matches: Match[], sport: 'football' | 'hurling'): { results: Match[]; weekLabel: string } {
  // Filter to only senior championships first
  const seniorMatches = matches.filter((match) => {
    const compLower = match.competition.toLowerCase();
    return compLower.includes('senior championship');
  });
  
  // Then filter by sport
  const sportMatches = seniorMatches.filter(match => {
    const compLower = match.competition.toLowerCase();
    if (sport === 'hurling') {
      return compLower.includes('hurling') || 
             compLower.includes('camán') || 
             compLower.includes('iomaint') ||
             compLower.includes('camogie');
    } else {
      return compLower.includes('football') || 
             compLower.includes('peil') ||
             compLower.includes('ladies football') ||
             compLower.includes('gaelic football');
    }
  });
  
  console.log(`Total ${sport} senior championship matches for fallback:`, sportMatches.length);
  
  // Try this week first
  const thisWeekResults = filterThisWeekResults(sportMatches);
  console.log(`This week ${sport} senior championship results:`, thisWeekResults.length);
  if (thisWeekResults.length > 0) {
    return { results: thisWeekResults, weekLabel: "This Week's Results" };
  }
  
  // Try last week
  const lastWeekResults = filterLastWeekResults(sportMatches);
  console.log(`Last week ${sport} senior championship results:`, lastWeekResults.length);
  if (lastWeekResults.length > 0) {
    return { results: lastWeekResults, weekLabel: "Last Week's Results" };
  }
  
  // Try previous week
  const previousWeekResults = filterPreviousWeekResults(sportMatches);
  console.log(`Previous week ${sport} senior championship results:`, previousWeekResults.length);
  if (previousWeekResults.length > 0) {
    return { results: previousWeekResults, weekLabel: "Previous Week's Results" };
  }
  
  // Keep looking back further in time for senior championship results
  let weeksBack = 4; // Start from 4 weeks back since we already checked 1-3
  const maxWeeksBack = 52; // Look back up to 1 year
  
  console.log(`Looking further back in time for ${sport} senior championship results...`);
  
  while (weeksBack <= maxWeeksBack) {
    const weekRange = getWeekRangeNWeeksAgo(weeksBack);
    const weekResults = sportMatches.filter(match => {
      if (match.isFixture) return false; // Only results
      const matchDate = parseMatchDate(match);
      return matchDate >= weekRange.start && matchDate <= weekRange.end;
    });
    
    console.log(`Week ${weeksBack} ago: ${weekResults.length} ${sport} senior championship results`);
    
    if (weekResults.length > 0) {
      const weeksAgoText = weeksBack === 1 ? "1 week ago" : `${weeksBack} weeks ago`;
      console.log(`Found ${sport} senior championship results from ${weeksAgoText}`);
      return { results: weekResults, weekLabel: `Latest Results (${weeksAgoText})` };
    }
    
    weeksBack++;
  }
  
  console.log(`No ${sport} senior championship results found in the past year`);
  return { results: [], weekLabel: "No Recent Results" };
}

// Helper function to get week range N weeks ago
function getWeekRangeNWeeksAgo(weeksAgo: number): { start: Date; end: Date } {
  const currentWeek = getCurrentWeekRange();
  
  const end = new Date(currentWeek.start);
  end.setDate(currentWeek.start.getDate() - 1 - (7 * (weeksAgo - 1)));
  end.setHours(23, 59, 59, 999);
  
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  
  return { start, end };
}

// Filter matches for upcoming fixtures (within 2 weeks ending on Sunday)
function filterUpcomingFixtures(matches: Match[]): Match[] {
  const now = new Date();
  const twoWeeksEnd = getTwoWeeksFromNowEnd();
  
  return matches.filter(match => {
    if (!match.isFixture) return false; // Only fixtures
    const matchDate = parseMatchDate(match);
    return matchDate >= now && matchDate <= twoWeeksEnd;
  });
}

// Filter matches for future fixtures (beyond 2 weeks)
function filterFutureFixtures(matches: Match[]): Match[] {
  const twoWeeksEnd = getTwoWeeksFromNowEnd();
  
  return matches.filter(match => {
    if (!match.isFixture) return false; // Only fixtures
    const matchDate = parseMatchDate(match);
    return matchDate > twoWeeksEnd;
  });
}

function getSimplifiedVenue(venue?: string): string {
  if (!venue) return '';
  
  // Special case for Croke Park
  if (venue.toLowerCase().includes('páirc an chrócaigh') || venue.toLowerCase().includes('croke park')) {
    return 'Croke Park';
  }
  
  // Split by comma and take the last meaningful part (usually county)
  const parts = venue.split(',').map(part => part.trim());
  
  // Return the last non-empty part, or the whole venue if only one part
  const lastPart = parts[parts.length - 1];
  return lastPart || venue;
}

function getDateDescription(match: Match): string {
  const matchDate = parseMatchDate(match);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  
  // Check if it's today, tomorrow, or yesterday
  const isToday = matchDate.toDateString() === today.toDateString();
  const isTomorrow = matchDate.toDateString() === tomorrow.toDateString();
  const isYesterday = matchDate.toDateString() === yesterday.toDateString();
  
  if (isToday) return 'Today';
  if (isTomorrow) return 'Tomorrow';
  if (isYesterday) return 'Yesterday';
  
  // Format as "Mon 15 Jun"
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const dayName = dayNames[matchDate.getDay()];
  const day = matchDate.getDate();
  const monthName = monthNames[matchDate.getMonth()];
  
  return `${dayName} ${day} ${monthName}`;
}

function isMatchLive(match: Match): boolean {
  if (match.isFixture) return false;
  
  const matchDate = parseMatchDate(match);
  const now = new Date();
  
  // Consider a match live if it's within 2 hours of the scheduled time
  // This is a simplified check - in reality you'd have more sophisticated live match detection
  const timeDiff = Math.abs(now.getTime() - matchDate.getTime());
  const twoHours = 2 * 60 * 60 * 1000;
  
  return timeDiff <= twoHours && match.homeScore !== '' && match.awayScore !== '';
}

// Helper function to parse GAA scores (e.g., "3-18" -> total points)
function parseGAAScore(score: string): number {
  if (!score || score === 'null') return 0;
  
  const parts = score.split('-');
  if (parts.length === 2) {
    const goals = parseInt(parts[0]) || 0;
    const points = parseInt(parts[1]) || 0;
    return goals * 3 + points; // Goals worth 3 points each
  }
  
  return parseInt(score) || 0;
}

function MatchRow({ match }: { match: Match }) {
  const isLive = isMatchLive(match);
  const venue = getSimplifiedVenue(match.venue);
  const dateDesc = getDateDescription(match);
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center">
        {/* Teams and Scores Container */}
        <div className="flex-1 min-w-0">
          {/* Home Team Row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center flex-1 min-w-0 mr-4">
              <span className="font-medium text-gray-900 truncate">{match.homeTeam}</span>
              {isLive && (
                <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded font-bold flex-shrink-0">
                  LIVE
                </span>
              )}
            </div>
            <div className={`text-right font-bold w-16 ${isLive ? 'text-gray-400' : 'text-gray-900'}`}>
              {match.isFixture ? (
                <span className="text-sm text-gray-500">{match.time || 'TBC'}</span>
              ) : (
                <span className="text-lg">{match.homeScore}</span>
              )}
            </div>
          </div>
          
          {/* Away Team Row */}
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 mr-4">
              <span className="font-medium text-gray-900 truncate">{match.awayTeam}</span>
            </div>
            <div className={`text-right font-bold w-16 ${isLive ? 'text-gray-400' : 'text-gray-900'}`}>
              {match.isFixture ? '' : (
                <span className="text-lg">{match.awayScore}</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Match Info */}
        <div className="ml-6 text-right text-sm text-gray-500 flex-shrink-0 w-24">
          <div>{dateDesc}</div>
          {venue && <div className="truncate">{venue}</div>}
        </div>
      </div>
    </div>
  );
}

function CompetitionSection({ competition, matches }: { competition: string; matches: Match[] }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="font-semibold text-gray-900 mb-3 text-sm">
        {competition}
      </h3>
      <div className="space-y-2">
        {matches.map((match, index) => (
          <MatchRow key={`${match.homeTeam}-${match.awayTeam}-${index}`} match={match} />
        ))}
      </div>
    </div>
  );
}

function updateGroupDataWithMatches(groups: Group[], matches: Match[]): Group[] {
  // Filter for All-Ireland SFC matches since May 17th
  const allIrelandSFCMatches = filterAllIrelandSFCMatches(matches);
  const matchesSinceMay17 = filterMatchesSinceMay17(allIrelandSFCMatches);
  
  // Create a copy of the groups to avoid mutation
  const updatedGroups = groups.map(group => ({
    ...group,
    teams: group.teams.map(team => ({ ...team }))
  }));
  
  // Process each match to update team stats
  matchesSinceMay17.forEach(match => {
    if (match.isFixture || !match.homeScore || !match.awayScore) return; // Only process completed results
    
    // Find the teams in the groups
    let homeTeamData: GroupTeam | null = null;
    let awayTeamData: GroupTeam | null = null;
    
    for (const group of updatedGroups) {
      for (const team of group.teams) {
        if (team.name === match.homeTeam) homeTeamData = team;
        if (team.name === match.awayTeam) awayTeamData = team;
      }
    }
    
    if (!homeTeamData || !awayTeamData) return; // Teams not found in groups
    
    // Parse GAA scores (e.g., "3-18" -> 27 total points)
    const homeScore = parseGAAScore(match.homeScore);
    const awayScore = parseGAAScore(match.awayScore);
    
    // Update both teams' stats
    homeTeamData.played++;
    awayTeamData.played++;
    
    homeTeamData.for += homeScore;
    homeTeamData.against += awayScore;
    awayTeamData.for += awayScore;
    awayTeamData.against += homeScore;
    
    // Determine winner and update points
    if (homeScore > awayScore) {
      homeTeamData.won++;
      homeTeamData.points += 2;
      awayTeamData.lost++;
    } else if (awayScore > homeScore) {
      awayTeamData.won++;
      awayTeamData.points += 2;
      homeTeamData.lost++;
    } else {
      homeTeamData.drawn++;
      awayTeamData.drawn++;
      homeTeamData.points += 1;
      awayTeamData.points += 1;
    }
  });
  
  // Sort teams within each group by points (descending), then by goal difference
  updatedGroups.forEach(group => {
    group.teams.sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      const aDiff = a.for - a.against;
      const bDiff = b.for - b.against;
      return bDiff - aDiff;
    });
  });
  
  return updatedGroups;
}

function isGroupStageComplete(groups: Group[]): boolean {
  return groups.every(group => 
    group.teams.every(team => team.played >= 3) // Each team plays each other once (3 matches total)
  );
}

function getTeamStatusText(position: number): string {
  switch (position) {
    case 0: return 'Qualified';
    case 1:
    case 2: return 'Playoff';
    case 3: return 'Relegated';
    default: return '';
  }
}

function GroupTable({ group }: { group: Group }) {
  const groupComplete = group.teams.every(team => team.played >= 3); // Each team plays 3 matches
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Group Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <h3 className="font-semibold text-gray-900 text-sm">
          {group.name}
        </h3>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Team</th>
              <th className="text-center px-2 py-2 font-medium text-gray-600">P</th>
              <th className="text-center px-2 py-2 font-medium text-gray-600">W</th>
              <th className="text-center px-2 py-2 font-medium text-gray-600">D</th>
              <th className="text-center px-2 py-2 font-medium text-gray-600">L</th>
              <th className="text-center px-2 py-2 font-medium text-gray-600">F</th>
              <th className="text-center px-2 py-2 font-medium text-gray-600">A</th>
              <th className="text-center px-2 py-2 font-medium text-gray-600">Pts</th>
              {groupComplete && <th className="text-center px-2 py-2 font-medium text-gray-600">Status</th>}
            </tr>
          </thead>
          <tbody>
            {group.teams.map((team, index) => {
              let statusClass = '';
              let statusIcon = '';
              
              // Always show color coding since matches have been played
              if (index === 0) {
                statusClass = 'bg-green-50 border-l-4 border-l-green-500';
                statusIcon = '✓';
              } else if (index === 1 || index === 2) {
                statusClass = 'bg-yellow-50 border-l-4 border-l-yellow-500';
                statusIcon = '○';
              } else {
                statusClass = 'bg-red-50 border-l-4 border-l-red-500';
                statusIcon = '✗';
              }
              
              return (
                <tr key={team.name} className={`${statusClass} hover:bg-gray-50`}>
                  <td className="px-3 py-2">
                    <div className="flex items-center">
                      <span className="mr-2 text-xs">{statusIcon}</span>
                      <span className="font-medium text-gray-900">{team.name}</span>
                    </div>
                  </td>
                  <td className="text-center px-2 py-2 text-gray-700">{team.played}</td>
                  <td className="text-center px-2 py-2 text-gray-700">{team.won}</td>
                  <td className="text-center px-2 py-2 text-gray-700">{team.drawn}</td>
                  <td className="text-center px-2 py-2 text-gray-700">{team.lost}</td>
                  <td className="text-center px-2 py-2 text-gray-700">{team.for}</td>
                  <td className="text-center px-2 py-2 text-gray-700">{team.against}</td>
                  <td className="text-center px-2 py-2 font-bold text-gray-900">{team.points}</td>
                  {groupComplete && (
                    <td className="text-center px-2 py-2 text-xs font-medium">
                      <span className={`px-2 py-1 rounded ${
                        index === 0 ? 'bg-green-100 text-green-700' :
                        index === 1 || index === 2 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {getTeamStatusText(index)}
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Legend - Only show when group stage is complete */}
      {groupComplete && (
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
          <div className="flex flex-wrap gap-4 text-xs text-gray-600">
            <div className="flex items-center">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              <span>Qualified</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
              <span>Playoff</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
              <span>Relegated</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [activeSport, setActiveSport] = useState<'football' | 'hurling'>('football');

  useEffect(() => {
    getMatches()
      .then((data) => {
        console.log('Matches received:', data.length);
        console.log('Sample match:', data[0]);
        
        // Debug: Log competition names to understand what we have
        const competitions = [...new Set(data.map(match => match.competition))];
        console.log('All competitions:', competitions);
        
        // Debug: Check senior championships specifically
        const seniorChampionships = competitions.filter(comp => 
          comp.toLowerCase().includes('senior championship')
        );
        console.log('Senior championship competitions found:', seniorChampionships);
        
        // Debug: Count senior championship matches
        const seniorChampionshipMatches = data.filter(match => 
          match.competition.toLowerCase().includes('senior championship')
        );
        console.log('Senior championship matches found:', seniorChampionshipMatches.length);
        
        // Debug: Show actual senior championship competition names
        const seniorChampionshipNames = [...new Set(seniorChampionshipMatches.map(match => match.competition))];
        console.log('Actual senior championship competition names:', seniorChampionshipNames);
        
        // Debug: Log hurling vs football breakdown for senior championships
        const hurlingCompetitions = seniorChampionships.filter(comp => 
          comp.toLowerCase().includes('hurling') || 
          comp.toLowerCase().includes('camán') || 
          comp.toLowerCase().includes('iomaint') ||
          comp.toLowerCase().includes('camogie')
        );
        const footballCompetitions = seniorChampionships.filter(comp => 
          comp.toLowerCase().includes('football') || 
          comp.toLowerCase().includes('peil') ||
          comp.toLowerCase().includes('ladies football') ||
          comp.toLowerCase().includes('gaelic football')
        );
        
        console.log('Senior hurling championships found:', hurlingCompetitions);
        console.log('Senior football championships found:', footballCompetitions);
        
        setMatches(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching matches:', err);
        setErrorState(err.message || 'Failed to fetch matches');
        setLoading(false);
      });
  }, []);

  // Get latest senior championship results with intelligent fallback
  const { results: latestResults, weekLabel } = getLatestResults(matches, activeSport);
  
  // Apply time-based filtering for fixtures (senior championships only)
  const seniorMatches = filterSeniorChampionships(matches);
  const upcomingFixtures = filterUpcomingFixtures(seniorMatches);
  const futureFixtures = filterFutureFixtures(seniorMatches);
  
  // Group by sport and competition
  const groupedLatestResults = groupSeniorChampionships(latestResults);
  const groupedUpcomingFixtures = groupSeniorChampionships(upcomingFixtures);
  const groupedFutureFixtures = groupSeniorChampionships(futureFixtures);

  // Get current sport data
  const currentLatestResults = activeSport === 'football' ? groupedLatestResults.football : groupedLatestResults.hurling;
  const currentUpcomingFixtures = activeSport === 'football' ? groupedUpcomingFixtures.football : groupedUpcomingFixtures.hurling;
  const currentFutureFixtures = activeSport === 'football' ? groupedFutureFixtures.football : groupedFutureFixtures.hurling;

  // Update group data with real match results since May 17th
  const updatedGroups = updateGroupDataWithMatches(allIrelandSFCGroups, matches);
  const groupsComplete = isGroupStageComplete(updatedGroups);

  return (
    <div className="min-h-screen bg-white">
      {/* Header - LiveScore style */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900">
              GAA<span className="text-green-600">Score</span>
            </h1>
            <div className="text-sm text-gray-600">
              Latest Results & Upcoming Fixtures
            </div>
          </div>

          {/* Sport Tabs - LiveScore style */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveSport('football')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeSport === 'football'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Football
            </button>
            <button
              onClick={() => setActiveSport('hurling')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeSport === 'hurling'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Hurling
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600">Loading...</span>
          </div>
        ) : errorState ? (
          <div className="text-center py-20">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
              <p className="text-red-600 mb-4">{errorState}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Group Tables Section - Only for Football */}
            {activeSport === 'football' && (
              <section>
                <div className="flex items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">All-Ireland SFC Championship Groups</h2>
                  {groupsComplete ? (
                    <div className="ml-3 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                      Group Stage Complete
                    </div>
                  ) : (
                    <div className="ml-3 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
                      Group Stage In Progress
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {updatedGroups.map((group) => (
                    <GroupTable key={group.name} group={group} />
                  ))}
                </div>
              </section>
            )}

            {/* Latest Results Section */}
            <section>
              <div className="flex items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">{weekLabel}</h2>
                <div className="ml-3 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                  {Object.values(currentLatestResults).flat().length} matches
                </div>
              </div>
              
              {Object.keys(currentLatestResults).length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <div className="text-gray-400 text-lg mb-2">
                    No senior championship results found
                  </div>
                  <p className="text-sm text-gray-500">
                    No senior championship matches have been played recently in this sport
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(currentLatestResults).map(([competition, competitionMatches]) => (
                    <CompetitionSection
                      key={`latest-${competition}`}
                      competition={competition}
                      matches={competitionMatches}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Upcoming Fixtures Section (within 2 weeks) */}
            <section>
              <div className="flex items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Upcoming Fixtures</h2>
                <div className="ml-3 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                  {Object.values(currentUpcomingFixtures).flat().length} matches
                </div>
                <div className="ml-3 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                  Next 2 weeks
                </div>
              </div>
              
              {Object.keys(currentUpcomingFixtures).length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <div className="text-gray-400 text-lg mb-2">
                    No upcoming fixtures in the next 2 weeks
                  </div>
                  <p className="text-sm text-gray-500">
                    Check back later for updated match schedules
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(currentUpcomingFixtures).map(([competition, competitionMatches]) => (
                    <CompetitionSection
                      key={`upcoming-${competition}`}
                      competition={competition}
                      matches={competitionMatches}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Future Fixtures Section (beyond 2 weeks) */}
            {Object.keys(currentFutureFixtures).length > 0 && (
              <section>
                <div className="flex items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Future Fixtures</h2>
                  <div className="ml-3 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                    {Object.values(currentFutureFixtures).flat().length} matches
                  </div>
                  <div className="ml-3 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                    Beyond 2 weeks
                  </div>
                </div>
                
                <div className="space-y-4">
                  {Object.entries(currentFutureFixtures).map(([competition, competitionMatches]) => (
                    <CompetitionSection
                      key={`future-${competition}`}
                      competition={competition}
                      matches={competitionMatches}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}