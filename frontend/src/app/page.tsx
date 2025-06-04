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
    if (!match.competition) return false;
    const compLower = match.competition.toLowerCase();
    return compLower.includes('all-ireland') && 
           compLower.includes('senior') && 
           compLower.includes('football') &&
           compLower.includes('championship');
  });
}

function filterSeniorChampionships(matches: Match[]) {
  return matches.filter((match) => {
    if (!match.competition) return false;
    const compLower = match.competition.toLowerCase();
    return compLower.includes('senior championship');
  });
}

// Helper function to parse date strings for sorting
function parseMatchDate(match: Match): Date {
  try {
    if (!match.date) return new Date(); // fallback to current date
    const { date, time } = match;
    
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
    if (!match.competition) return;
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

// Helper function to get team logo - now using inline SVG data URLs
function getTeamLogo(teamName: string): string {
  const normalizedName = teamName.toLowerCase().trim();
  
  // County information with colors and initials
  const countyInfo: Record<string, { initials: string; color: string; textColor?: string }> = {
    'dublin': { initials: 'DUB', color: '#4A90E2', textColor: '#FFFFFF' }, // Sky blue
    'kildare': { initials: 'KIL', color: '#FFFFFF', textColor: '#333333' }, // White
    'meath': { initials: 'MEA', color: '#228B22', textColor: '#FFFFFF' }, // Green
    'westmeath': { initials: 'WES', color: '#8B0000', textColor: '#FFFFFF' }, // Maroon
    'wexford': { initials: 'WEX', color: '#9932CC', textColor: '#FFFFFF' }, // Purple
    'wicklow': { initials: 'WIC', color: '#0000FF', textColor: '#FFFFFF' }, // Blue
    'carlow': { initials: 'CAR', color: '#DC143C', textColor: '#FFFFFF' }, // Red
    'kilkenny': { initials: 'KK', color: '#B45309', textColor: '#FFFFFF' }, // Dark gold
    'laois': { initials: 'LAO', color: '#0000FF', textColor: '#FFFFFF' }, // Blue
    'longford': { initials: 'LF', color: '#B45309', textColor: '#FFFFFF' }, // Dark gold
    'louth': { initials: 'LOU', color: '#DC143C', textColor: '#FFFFFF' }, // Red
    'offaly': { initials: 'OFF', color: '#228B22', textColor: '#FFFFFF' }, // Green
    'cork': { initials: 'COR', color: '#DC143C', textColor: '#FFFFFF' }, // Red
    'kerry': { initials: 'KER', color: '#228B22', textColor: '#FFFFFF' }, // Green
    'limerick': { initials: 'LIM', color: '#228B22', textColor: '#FFFFFF' }, // Green
    'tipperary': { initials: 'TIP', color: '#0000FF', textColor: '#FFFFFF' }, // Blue
    'waterford': { initials: 'WAT', color: '#0000FF', textColor: '#FFFFFF' }, // Blue
    'clare': { initials: 'CLA', color: '#B45309', textColor: '#FFFFFF' }, // Dark gold
    'galway': { initials: 'GAL', color: '#8B0000', textColor: '#FFFFFF' }, // Maroon
    'mayo': { initials: 'MAY', color: '#228B22', textColor: '#FFFFFF' }, // Green
    'roscommon': { initials: 'ROS', color: '#B45309', textColor: '#FFFFFF' }, // Dark gold
    'sligo': { initials: 'SLI', color: '#000000', textColor: '#FFFFFF' }, // Black
    'leitrim': { initials: 'LEI', color: '#228B22', textColor: '#FFFFFF' }, // Green
    'antrim': { initials: 'ANT', color: '#B45309', textColor: '#FFFFFF' }, // Dark gold
    'armagh': { initials: 'ARM', color: '#FF8C00', textColor: '#FFFFFF' }, // Orange
    'cavan': { initials: 'CAV', color: '#0000FF', textColor: '#FFFFFF' }, // Blue
    'derry': { initials: 'DER', color: '#DC143C', textColor: '#FFFFFF' }, // Red
    'donegal': { initials: 'DON', color: '#228B22', textColor: '#FFFFFF' }, // Green
    'down': { initials: 'DOW', color: '#DC143C', textColor: '#FFFFFF' }, // Red
    'fermanagh': { initials: 'FER', color: '#228B22', textColor: '#FFFFFF' }, // Green
    'monaghan': { initials: 'MON', color: '#0000FF', textColor: '#FFFFFF' }, // Blue
    'tyrone': { initials: 'TYR', color: '#DC143C', textColor: '#FFFFFF' }, // Red
    'london': { initials: 'LON', color: '#228B22', textColor: '#FFFFFF' }, // Green
    'new york': { initials: 'NY', color: '#0000FF', textColor: '#FFFFFF' }, // Blue
  };

  // Find county info
  let info = countyInfo[normalizedName];
  if (!info) {
    // Partial match - check if team name contains county name
    for (const [county, countyData] of Object.entries(countyInfo)) {
      if (normalizedName.includes(county)) {
        info = countyData;
        break;
      }
    }
  }

  // Fallback
  if (!info) {
    info = { initials: 'GAA', color: '#228B22', textColor: '#FFFFFF' };
  }

  // Create SVG shield-style logo
  const svgLogo = `
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="1" stdDeviation="1" flood-opacity="0.3"/>
        </filter>
      </defs>
      <!-- Shield background -->
      <path d="M12 2 L20 6 L20 14 C20 18 16 22 12 22 C8 22 4 18 4 14 L4 6 Z" 
            fill="${info.color}" 
            stroke="#333" 
            stroke-width="0.5" 
            filter="url(#shadow)"/>
      <!-- Text -->
      <text x="12" y="14" 
            font-family="Arial, sans-serif" 
            font-size="6" 
            font-weight="bold" 
            text-anchor="middle" 
            fill="${info.textColor || '#FFFFFF'}">${info.initials}</text>
    </svg>
  `;

  // Convert SVG to data URL
  const encodedSvg = encodeURIComponent(svgLogo.trim());
  return `data:image/svg+xml,${encodedSvg}`;
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
              <img 
                src={getTeamLogo(match.homeTeam)} 
                alt={`${match.homeTeam} logo`}
                className="w-6 h-6 mr-3 flex-shrink-0"
              />
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
            <div className="flex items-center flex-1 min-w-0 mr-4">
              <img 
                src={getTeamLogo(match.awayTeam)} 
                alt={`${match.awayTeam} logo`}
                className="w-6 h-6 mr-3 flex-shrink-0"
              />
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

// Enhanced GroupTeam interface to track head-to-head results
interface EnhancedGroupTeam extends GroupTeam {
  headToHead: Record<string, { won: boolean; lost: boolean; drawn: boolean }>;
  positionSecured?: boolean; // Whether this team's position is already determined
  securedReason?: string; // Reason why position is secured
}

// Enhanced Group interface
interface EnhancedGroup extends Omit<Group, 'teams'> {
  teams: EnhancedGroupTeam[];
}

function updateGroupDataWithMatches(groups: Group[], matches: Match[]): EnhancedGroup[] {
  // Filter for All-Ireland SFC matches since May 17th
  const allIrelandSFCMatches = filterAllIrelandSFCMatches(matches);
  const matchesSinceMay17 = filterMatchesSinceMay17(allIrelandSFCMatches);
  
  // Create enhanced groups with head-to-head tracking
  const updatedGroups: EnhancedGroup[] = groups.map(group => ({
    ...group,
    teams: group.teams.map(team => ({
      ...team,
      headToHead: {},
      positionSecured: false,
      securedReason: ''
    }))
  }));
  
  // Initialize head-to-head records
  updatedGroups.forEach(group => {
    group.teams.forEach(teamA => {
      group.teams.forEach(teamB => {
        if (teamA.name !== teamB.name) {
          teamA.headToHead[teamB.name] = { won: false, lost: false, drawn: false };
        }
      });
    });
  });
  
  // Process each match to update team stats and head-to-head records
  matchesSinceMay17.forEach(match => {
    if (match.isFixture || !match.homeScore || !match.awayScore) return; // Only process completed results
    
    // Find the teams in the groups
    let homeTeamData: EnhancedGroupTeam | null = null;
    let awayTeamData: EnhancedGroupTeam | null = null;
    let matchGroup: EnhancedGroup | null = null;
    
    for (const group of updatedGroups) {
      for (const team of group.teams) {
        if (team.name === match.homeTeam) {
          homeTeamData = team;
          matchGroup = group;
        }
        if (team.name === match.awayTeam) {
          awayTeamData = team;
          matchGroup = group;
        }
      }
    }
    
    if (!homeTeamData || !awayTeamData || !matchGroup) return; // Teams not found in groups
    
    // Parse GAA scores (e.g., "3-18" -> 27 total points)
    const homeScore = parseGAAScore(match.homeScore);
    const awayScore = parseGAAScore(match.awayScore);
    
    // Update both teams' stats
    homeTeamData.played++;
    awayTeamData.played++;
    
    homeTeamData.for += homeScore;
    awayTeamData.for += awayScore;
    homeTeamData.against += awayScore;
    awayTeamData.against += homeScore;
    
    // Determine winner and update points + head-to-head
    if (homeScore > awayScore) {
      homeTeamData.won++;
      homeTeamData.points += 2;
      awayTeamData.lost++;
      // Update head-to-head
      homeTeamData.headToHead[awayTeamData.name].won = true;
      awayTeamData.headToHead[homeTeamData.name].lost = true;
    } else if (awayScore > homeScore) {
      awayTeamData.won++;
      awayTeamData.points += 2;
      homeTeamData.lost++;
      // Update head-to-head
      awayTeamData.headToHead[homeTeamData.name].won = true;
      homeTeamData.headToHead[awayTeamData.name].lost = true;
    } else {
      homeTeamData.drawn++;
      awayTeamData.drawn++;
      homeTeamData.points += 1;
      awayTeamData.points += 1;
      // Update head-to-head
      homeTeamData.headToHead[awayTeamData.name].drawn = true;
      awayTeamData.headToHead[homeTeamData.name].drawn = true;
    }
  });
  
  // Sort teams within each group using head-to-head tiebreaking
  updatedGroups.forEach(group => {
    group.teams.sort((a, b) => {
      // First: Points
      if (a.points !== b.points) return b.points - a.points;
      
      // Second: Head-to-head result if they played each other
      const aVsB = a.headToHead[b.name];
      if (aVsB) {
        if (aVsB.won) return -1; // a beats b
        if (aVsB.lost) return 1;  // b beats a
        // If drawn or not played, continue to next tiebreaker
      }
      
      // Third: Goal difference
      const aDiff = a.for - a.against;
      const bDiff = b.for - b.against;
      if (aDiff !== bDiff) return bDiff - aDiff;
      
      // Fourth: Goals scored
      return b.for - a.for;
    });
  });
  
  // Determine secured positions based on completed matches and head-to-head results
  updatedGroups.forEach(group => {
    const groupComplete = group.teams.every(team => team.played >= 3);
    
    if (groupComplete) {
      // Group stage is complete - all positions are secured
      group.teams.forEach((team, index) => {
        team.positionSecured = true;
        team.securedReason = 'Group stage complete';
      });
    } else {
      // Check for early qualification/elimination scenarios
      group.teams.forEach((team, index) => {
        // Check if team has already secured qualification (1st place)
        if (index === 0) {
          const canBeOvertaken = group.teams.slice(1).some(otherTeam => {
            const maxPossiblePoints = otherTeam.points + (3 - otherTeam.played) * 2;
            if (maxPossiblePoints <= team.points) return false;
            
            // If they could tie on points, check head-to-head
            if (maxPossiblePoints === team.points + (3 - team.played) * 2) {
              const h2h = team.headToHead[otherTeam.name];
              if (h2h && (h2h.won || h2h.lost)) {
                // Head-to-head already decided
                return h2h.lost; // Can only be overtaken if they lost head-to-head
              }
            }
            return true; // Could potentially be overtaken
          });
          
          if (!canBeOvertaken) {
            team.positionSecured = true;
            team.securedReason = 'Cannot be overtaken';
          }
        }
        
        // Check if team has already secured playoff spot (top 3)
        if (index <= 2) {
          const canBeDroppedOut = group.teams.slice(3).some(otherTeam => {
            const maxPossiblePoints = otherTeam.points + (3 - otherTeam.played) * 2;
            if (maxPossiblePoints < team.points) return false;
            
            // If they could tie on points, check head-to-head
            if (maxPossiblePoints === team.points + (3 - team.played) * 2) {
              const h2h = team.headToHead[otherTeam.name];
              if (h2h && (h2h.won || h2h.lost)) {
                // Head-to-head already decided
                return h2h.lost; // Can only be dropped if they lost head-to-head
              }
            }
            return true; // Could potentially be dropped
          });
          
          if (!canBeDroppedOut && !team.positionSecured) {
            team.positionSecured = true;
            team.securedReason = index === 0 ? 'Qualified' : 'Playoff secured';
          }
        }
        
        // Check if team is already relegated (4th place)
        if (index === 3) {
          const canEscapeRelegation = group.teams.slice(0, 3).some(otherTeam => {
            const minPossiblePoints = otherTeam.points; // If they lose remaining games
            const teamMaxPoints = team.points + (3 - team.played) * 2;
            
            if (teamMaxPoints < minPossiblePoints) return false;
            
            // If they could tie on points, check head-to-head
            if (teamMaxPoints === minPossiblePoints) {
              const h2h = team.headToHead[otherTeam.name];
              if (h2h && (h2h.won || h2h.lost)) {
                // Head-to-head already decided
                return h2h.won; // Can only escape if they won head-to-head
              }
            }
            return true; // Could potentially escape relegation
          });
          
          if (!canEscapeRelegation) {
            team.positionSecured = true;
            team.securedReason = 'Relegated';
          }
        }
      });
    }
  });
  
  return updatedGroups;
}

function isGroupStageComplete(groups: EnhancedGroup[]): boolean {
  return groups.every(group => 
    group.teams.every(team => team.played >= 3) // Each team plays each other once (3 matches total)
  );
}

function GroupTable({ group }: { group: EnhancedGroup }) {
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
              <th className="text-center px-2 py-2 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {group.teams.map((team, index) => {
              let statusClass = '';
              let statusIcon = '';
              let statusText = '';
              let borderClass = '';
              
              // Determine status and styling based on position and whether it's secured
              if (index === 0) {
                statusIcon = '✓';
                statusText = 'Qualified';
                if (team.positionSecured) {
                  statusClass = 'bg-green-100 text-green-800 font-bold';
                  borderClass = 'border-l-4 border-l-green-600 bg-green-50';
                } else {
                  statusClass = 'bg-green-50 text-green-700';
                  borderClass = 'border-l-4 border-l-green-400 bg-green-25';
                }
              } else if (index === 1 || index === 2) {
                statusIcon = '○';
                statusText = 'Playoff';
                if (team.positionSecured) {
                  statusClass = 'bg-yellow-100 text-yellow-800 font-bold';
                  borderClass = 'border-l-4 border-l-yellow-600 bg-yellow-50';
                } else {
                  statusClass = 'bg-yellow-50 text-yellow-700';
                  borderClass = 'border-l-4 border-l-yellow-400 bg-yellow-25';
                }
              } else {
                statusIcon = '✗';
                statusText = 'Relegated';
                if (team.positionSecured) {
                  statusClass = 'bg-red-100 text-red-800 font-bold';
                  borderClass = 'border-l-4 border-l-red-600 bg-red-50';
                } else {
                  statusClass = 'bg-red-50 text-red-700';
                  borderClass = 'border-l-4 border-l-red-400 bg-red-25';
                }
              }
              
              return (
                <tr key={team.name} className={`${borderClass} hover:bg-gray-50 transition-colors`}>
                  <td className="px-3 py-2">
                    <div className="flex items-center">
                      <span className={`mr-2 text-xs font-bold ${team.positionSecured ? 'text-gray-800' : 'text-gray-500'}`}>
                        {statusIcon}
                      </span>
                      <img 
                        src={getTeamLogo(team.name)} 
                        alt={`${team.name} logo`}
                        className="w-5 h-5 mr-2 flex-shrink-0"
                      />
                      <span className={`font-medium ${team.positionSecured ? 'text-gray-900 font-bold' : 'text-gray-900'}`}>
                        {team.name}
                      </span>
                      {team.positionSecured && (
                        <span className="ml-2 text-xs text-gray-500 italic">
                          ({team.securedReason})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-center px-2 py-2 text-gray-700">{team.played}</td>
                  <td className="text-center px-2 py-2 text-gray-700">{team.won}</td>
                  <td className="text-center px-2 py-2 text-gray-700">{team.drawn}</td>
                  <td className="text-center px-2 py-2 text-gray-700">{team.lost}</td>
                  <td className="text-center px-2 py-2 text-gray-700">{team.for}</td>
                  <td className="text-center px-2 py-2 text-gray-700">{team.against}</td>
                  <td className={`text-center px-2 py-2 font-bold ${team.positionSecured ? 'text-gray-900 text-lg' : 'text-gray-900'}`}>
                    {team.points}
                  </td>
                  <td className="text-center px-2 py-2 text-xs font-medium">
                    <span className={`px-2 py-1 rounded ${statusClass} ${team.positionSecured ? 'ring-2 ring-offset-1' : ''} ${
                      index === 0 && team.positionSecured ? 'ring-green-400' :
                      (index === 1 || index === 2) && team.positionSecured ? 'ring-yellow-400' :
                      index === 3 && team.positionSecured ? 'ring-red-400' : ''
                    }`}>
                      {statusText}
                      {team.positionSecured && ' ✓'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Legend */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
        <div className="flex flex-wrap gap-4 text-xs text-gray-600 mb-2">
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
        <div className="text-xs text-gray-500">
          <span className="font-medium">Tiebreaking:</span> 1. Points, 2. Head-to-head result, 3. Goal difference, 4. Goals scored
        </div>
        {group.teams.some(t => t.positionSecured) && (
          <div className="text-xs text-gray-500 mt-1">
            <span className="font-medium">✓ = Position secured</span> based on completed matches and head-to-head results
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [activeSport, setActiveSport] = useState<'football' | 'hurling'>('football');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const data = await getMatches();
        
        // If component is unmounted, don't update state
        if (!mounted) return;

        if (!Array.isArray(data)) {
          console.error('Received invalid data format:', data);
          setErrorState('Received invalid data format');
          setLoading(false);
          return;
        }

        // Filter out invalid matches first
        const validMatches = data.filter(match => 
          match && 
          typeof match.competition === 'string' &&
          typeof match.homeTeam === 'string' &&
          typeof match.awayTeam === 'string' &&
          typeof match.date === 'string' &&
          typeof match.isFixture === 'boolean'
        );

        if (validMatches.length < data.length) {
          console.warn(`Filtered out ${data.length - validMatches.length} invalid matches`);
        }

        if (validMatches.length === 0) {
          setErrorState('No valid matches found');
          setLoading(false);
          return;
        }

        // Get the most recent scrape time from the matches
        const latestScrapeTime = validMatches.reduce((latest, match) => {
          if (!match?.scrapedAt) return latest;
          const scrapeTime = new Date(match.scrapedAt).getTime();
          return scrapeTime > latest ? scrapeTime : latest;
        }, 0);
        
        if (latestScrapeTime) {
          const date = new Date(latestScrapeTime);
          setLastUpdated(date.toLocaleString('en-IE', {
            dateStyle: 'short',
            timeStyle: 'short'
          }));
        }

        // Process senior championships only if we have valid matches
        const seniorChampionships = validMatches
          .map(match => match.competition)
          .filter(Boolean) // Extra safety check
          .filter(comp => comp.toLowerCase().includes('senior championship'))
          .filter((comp, index, self) => self.indexOf(comp) === index)
          .sort();

        setMatches(validMatches);
        setLoading(false);
      } catch (err) {
        console.error('Error in data fetching:', err);
        setErrorState(err instanceof Error ? err.message : 'Failed to fetch matches');
        setLoading(false);
      }
    };

    fetchData();

    // Cleanup function
    return () => {
      mounted = false;
    };
  }, []);

  // Only process matches if we have data and no error
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <h1 className="text-2xl font-bold text-gray-900">
                GAA<span className="text-green-600">Score</span>
              </h1>
              <div className="text-sm text-gray-600">Loading...</div>
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600">Loading matches...</span>
          </div>
        </main>
      </div>
    );
  }

  if (errorState) {
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <h1 className="text-2xl font-bold text-gray-900">
                GAA<span className="text-green-600">Score</span>
              </h1>
              <div className="text-sm text-gray-600">Error</div>
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">
          <div className="text-center py-20">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Matches</h3>
              <p className="text-red-600 mb-4">{errorState}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

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
              {lastUpdated ? `Last Updated: ${lastUpdated}` : 'Loading...'}
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