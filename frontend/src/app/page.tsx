'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { Match, GroupTeam, Group, isValidMatch, isValidString } from '../types/matches';
import { getMatches } from '@/services/matches';

// Helper function to determine if a match is hurling
function isHurlingMatch(match: Match): boolean {
  try {
    if (!match?.competition) return false;
    const compLower = match.competition.toLowerCase();
    
    // Check if it's a minor game
    const isMinor = compLower.includes('minor');
    
    // Check if it's a hurling match
    const isHurling = compLower.includes('hurling') || 
           compLower.includes('camán') || 
           compLower.includes('iomaint') ||
           compLower.includes('camogie');
    
    // Must be hurling but not minor
    return isHurling && !isMinor;
  } catch (error) {
    console.warn('Error checking if hurling match:', error);
    return false;
  }
}

// Helper function to determine if a match is senior football
function isFootballMatch(match: Match): boolean {
  try {
    if (!match?.competition) return false;
    const compLower = match.competition.toLowerCase();
    
    // Must include "senior" and one of the football terms, but not include "minor"
    const isSenior = compLower.includes('senior');
    const isMinor = compLower.includes('minor');
    const isFootball = (compLower.includes('football') || 
                       compLower.includes('peil') ||
                       compLower.includes('ladies football') ||
                       compLower.includes('gaelic football')) &&
                      !isHurlingMatch(match); // Ensure it's not categorized as hurling
    
    return isSenior && isFootball && !isMinor;
  } catch (error) {
    console.warn('Error checking if football match:', error);
    return false;
  }
}

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

// Filter matches since May 17th
function filterMatchesSinceMay17(matches: Match[]): Match[] {
  const may17 = new Date(2025, 4, 17); // May 17, 2025
  
  return matches.filter(match => {
    const matchDate = parseMatchDate(match);
    return matchDate >= may17;
  });
}

// Helper function to parse date strings for sorting
function parseMatchDate(match: Match | undefined | null): Date {
  if (!match) return new Date(); // fallback to current date
  
  try {
    if (!match.date) return new Date(); // fallback to current date
    const { date, time } = match;
    
    // Convert date like "Saturday 17 May" or "Sunday 01 June" to a proper date
    const dateMatch = date.match(/(\w+)\s+(\d{1,2})\s+(\w+)/);
    if (!dateMatch) return new Date(); // fallback to current date
    
    const day = parseInt(dateMatch[2]);
    const monthStr = dateMatch[3]?.toLowerCase() || '';
    
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
  } catch (error) {
    console.warn('Error parsing match date:', error);
    return new Date(); // fallback to current date
  }
}

// Group matches by weekend and day
function groupMatchesByWeekendAndDay(matches: Match[]): {
  grouped: Record<string, Record<string, Match[]>>;
  weekendMap: Record<string, { saturday: Date; sunday: Date }>;
} {
  const grouped: Record<string, Record<string, Match[]>> = {};
  const weekendMap: Record<string, { saturday: Date; sunday: Date }> = {};
  
  // First pass: Group matches and determine weekend dates
  matches.forEach((match: Match) => {
    try {
      const matchDate = parseMatchDate(match);
      const dayOfWeek = matchDate.getDay();
      
      // Only process Saturday (6) and Sunday (0) matches
      if (dayOfWeek !== 6 && dayOfWeek !== 0) {
        console.warn('Match not on weekend:', match);
        return;
      }
      
      // For Sunday matches, we need to find the corresponding Saturday
      let weekendKey: string;
      if (dayOfWeek === 0) { // Sunday
        const saturday = new Date(matchDate);
        saturday.setDate(matchDate.getDate() - 1);
        weekendKey = saturday.toISOString().split('T')[0];
      } else { // Saturday
        weekendKey = matchDate.toISOString().split('T')[0];
      }
      
      // Store weekend dates for later use in descriptions
      if (!weekendMap[weekendKey]) {
        const saturday = dayOfWeek === 6 ? matchDate : new Date(matchDate.getTime() - 24 * 60 * 60 * 1000);
        const sunday = dayOfWeek === 0 ? matchDate : new Date(matchDate.getTime() + 24 * 60 * 60 * 1000);
        weekendMap[weekendKey] = { saturday, sunday };
      }
      
      // Initialize weekend group if needed
      if (!grouped[weekendKey]) {
        grouped[weekendKey] = {};
      }
      
      // Add match to appropriate day
      const dayName = dayOfWeek === 0 ? 'Sunday' : 'Saturday';
      if (!grouped[weekendKey][dayName]) {
        grouped[weekendKey][dayName] = [];
      }
      grouped[weekendKey][dayName].push(match);
    } catch (error) {
      console.warn('Error grouping match:', error);
    }
  });
  
  // Second pass: Sort matches within each day by time
  Object.keys(grouped).forEach(weekendKey => {
    ['Saturday', 'Sunday'].forEach(day => {
      if (grouped[weekendKey][day]?.length > 0) {
        grouped[weekendKey][day].sort((a, b) => {
          const timeA = parseMatchDate(a).getTime();
          const timeB = parseMatchDate(b).getTime();
          return timeA - timeB;
        });
      } else if (grouped[weekendKey][day]) {
        // Remove empty days
        delete grouped[weekendKey][day];
      }
    });
    
    // Remove empty weekends
    if (Object.keys(grouped[weekendKey]).length === 0) {
      delete grouped[weekendKey];
      delete weekendMap[weekendKey];
    }
  });
  
  return { grouped, weekendMap };
}

// Helper function to add ordinal suffix
function addOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return day + 'th';
  switch (day % 10) {
    case 1: return day + 'st';
    case 2: return day + 'nd';
    case 3: return day + 'rd';
    default: return day + 'th';
  }
}

// Helper function to get simplified venue
function getSimplifiedVenue(venue?: string | null): string {
  if (!isValidString(venue)) return '';
  
  try {
    // Special case for Croke Park
    const venueLower = String(venue).toLowerCase();
    if (venueLower.includes('páirc an chrócaigh') || venueLower.includes('croke park')) {
      return 'Croke Park';
    }
    
    // Split by comma and take the last meaningful part (usually county)
    const parts = venue.split(',').map(part => part.trim());
    
    // Return the last non-empty part, or the whole venue if only one part
    const lastPart = parts[parts.length - 1];
    return lastPart || venue;
  } catch {
    return venue; // Return original venue if any error occurs
  }
}

// Helper function to get date description
function getDateDescription(match: Match): { text: string; showTime: boolean } {
  const matchDate = parseMatchDate(match);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  
  // Only format time if it exists in the match data
  const hasTime = Boolean(match.time && match.time.trim());
  const timeStr = hasTime ? matchDate.toLocaleTimeString('en-IE', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  }) : '';
  
  // Check if it's today, tomorrow, or yesterday
  const isToday = matchDate.toDateString() === today.toDateString();
  const isTomorrow = matchDate.toDateString() === tomorrow.toDateString();
  const isYesterday = matchDate.toDateString() === yesterday.toDateString();
  
  // For today's matches
  if (isToday) {
    return { 
      text: hasTime ? `Today, ${timeStr}` : 'Today', 
      showTime: hasTime 
    };
  }
  
  // For tomorrow's matches
  if (isTomorrow) {
    return { 
      text: hasTime ? `Tomorrow, ${timeStr}` : 'Tomorrow', 
      showTime: hasTime 
    };
  }
  
  // For yesterday's matches
  if (isYesterday) {
    return { 
      text: hasTime ? `Yesterday, ${timeStr}` : 'Yesterday', 
      showTime: hasTime 
    };
  }
  
  // For all other matches, show date and time with ordinal suffix
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const dayName = dayNames[matchDate.getDay()];
  const day = addOrdinalSuffix(matchDate.getDate());
  const monthName = monthNames[matchDate.getMonth()];
  
  return { 
    text: hasTime ? `${dayName} ${day} ${monthName}, ${timeStr}` : `${dayName} ${day} ${monthName}`,
    showTime: hasTime 
  };
}

// Helper function to check if a match is live
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

// Helper function to parse GAA scores
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

// Helper function to get team logo
function getTeamLogo(teamName: string | undefined | null): string {
  if (!isValidString(teamName)) {
    // Return a default logo if no team name is provided
    return `data:image/svg+xml,${encodeURIComponent(`
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
              fill="#FFFFFF">GAA</text>
      </svg>
    `)}`;
  }

  try {
    
    const normalizedName = String(teamName).toLowerCase().trim();
    
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
  } catch (error) {
    console.warn('Error getting team logo:', error);
    return getTeamLogo(null); // Return default logo on error
  }
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

// Filter All-Ireland SFC matches
function filterAllIrelandSFCMatches(matches: Match[]): Match[] {
  if (!Array.isArray(matches)) return [];
  
  return matches.filter((match) => {
    try {
      if (!isValidMatch(match)) return false;
      const compLower = String(match.competition).toLowerCase();
      return compLower.includes('all-ireland') && 
             compLower.includes('senior') && 
             compLower.includes('football') &&
             compLower.includes('championship');
    } catch (error) {
      console.warn('Error filtering All-Ireland SFC match:', error);
      return false;
    }
  });
}

// Update group data with matches
function updateGroupDataWithMatches(groups: Group[], matches: Match[]): EnhancedGroup[] {
  // Filter for All-Ireland SFC matches since May 17th
  const allIrelandSFCMatches = filterAllIrelandSFCMatches(matches);
  const matchesSinceMay17 = filterMatchesSinceMay17(allIrelandSFCMatches);
  
  // Create a copy of the groups with enhanced team data
  const updatedGroups = groups.map(group => ({
    ...group,
    teams: group.teams.map(team => ({
      ...team,
      headToHead: {} as Record<string, { won: boolean; lost: boolean; drawn: boolean }>,
      positionSecured: false,
      securedReason: ''
    }))
  }));

  // Initialize head-to-head records
  updatedGroups.forEach(group => {
    group.teams.forEach(team => {
      group.teams.forEach(opponent => {
        if (team.name !== opponent.name) {
          team.headToHead[opponent.name] = { won: false, lost: false, drawn: false };
        }
      });
    });
  });
  
  // Process each match to update team stats and head-to-head records
  matchesSinceMay17.forEach(match => {
    if (match.isFixture || !match.homeScore || !match.awayScore) return;
    
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
    
    if (!homeTeamData || !awayTeamData || !matchGroup) return;
    
    const homeScore = parseGAAScore(match.homeScore);
    const awayScore = parseGAAScore(match.awayScore);
    
    homeTeamData.played++;
    awayTeamData.played++;
    
    homeTeamData.for += homeScore;
    awayTeamData.for += awayScore;
    homeTeamData.against += awayScore;
    awayTeamData.against += homeScore;
    
    if (homeScore > awayScore) {
      homeTeamData.won++;
      homeTeamData.points += 2;
      awayTeamData.lost++;
      homeTeamData.headToHead[awayTeamData.name].won = true;
      awayTeamData.headToHead[homeTeamData.name].lost = true;
    } else if (awayScore > homeScore) {
      awayTeamData.won++;
      awayTeamData.points += 2;
      homeTeamData.lost++;
      awayTeamData.headToHead[homeTeamData.name].won = true;
      homeTeamData.headToHead[awayTeamData.name].lost = true;
    } else {
      homeTeamData.drawn++;
      awayTeamData.drawn++;
      homeTeamData.points += 1;
      awayTeamData.points += 1;
      homeTeamData.headToHead[awayTeamData.name].drawn = true;
      awayTeamData.headToHead[homeTeamData.name].drawn = true;
    }
  });

  // Sort teams and determine positions with new qualification logic
  updatedGroups.forEach(group => {
    group.teams.sort((a, b) => {
      // First: Points
      if (a.points !== b.points) return b.points - a.points;
      
      // Second: Head-to-head result
      if (a.headToHead[b.name]?.won) return -1;
      if (b.headToHead[a.name]?.won) return 1;
      
      // Third: Goal difference
      const aDiff = a.for - a.against;
      const bDiff = b.for - b.against;
      return bDiff - aDiff;
    });

    // Check for secured positions with new rules
    group.teams.forEach((team, index) => {
      // Reset position secured status
      team.positionSecured = false;
      team.securedReason = '';

      // Special case for Armagh (already qualified)
      if (team.name === 'Armagh') {
        const secondPlaceTeam = group.teams[1];
        if (team.headToHead[secondPlaceTeam.name]?.won) {
          // Check if they can't be caught by 3rd or 4th
          const thirdPlaceTeam = group.teams[2];
          const fourthPlaceTeam = group.teams[3];
          const maxThirdPoints = thirdPlaceTeam.points + ((3 - thirdPlaceTeam.played) * 2);
          const maxFourthPoints = fourthPlaceTeam.points + ((3 - fourthPlaceTeam.played) * 2);
          
          if (team.points > maxThirdPoints && team.points > maxFourthPoints) {
            team.positionSecured = true;
            team.securedReason = 'Qualified';
          }
        }
      }

      // For all teams - check if they've played all 3 games
      if (team.played >= 3) {
        team.positionSecured = true;
        if (index === 0) {
          team.securedReason = 'Qualified';
        } else if (index === 1 || index === 2) {
          team.securedReason = 'Playoff';
        } else if (index === 3) {
          team.securedReason = 'Relegated';
        }
      }
    });
  });
  
  return updatedGroups;
}

// Check if group stage is complete
function isGroupStageComplete(groups: EnhancedGroup[]): boolean {
  return groups.every(group => 
    group.teams.every(team => team.played >= 3) // Each team plays each other once (3 matches total)
  );
}

// Get week description
function getWeekDescription(weekKey: string, weekendMap: Record<string, { saturday: Date; sunday: Date }>, matches?: Match[]): string {
  try {
    const weekend = weekendMap[weekKey];
    
    if (!weekend) {
      return ''; // Return empty string if no matches this weekend
    }

    // Check if it's the final group round weekend (June 14th/15th)
    const isFinalGroupRound = 
      weekend.saturday.getMonth() === 5 && // June is month 5
      weekend.saturday.getDate() === 14 &&
      weekend.sunday.getDate() === 15;

    if (isFinalGroupRound) {
      // Check if there are any football matches this weekend
      const hasFootballMatches = matches?.some(match => {
        const compLower = match.competition?.toLowerCase() || '';
        return compLower.includes('all-ireland') && 
               compLower.includes('senior') && 
               isFootballMatch(match);
      });

      if (hasFootballMatches) {
        const saturdayDate = addOrdinalSuffix(weekend.saturday.getDate());
        const sundayDate = addOrdinalSuffix(weekend.sunday.getDate());
        const month = weekend.saturday.toLocaleDateString('en-IE', { month: 'long' });
        return `Final Group Round (${month} ${saturdayDate}/${sundayDate})`;
      }
    }

    // Check if it's Provincial Finals weekend (June 7th/8th)
    const isProvincialFinalsWeekend = 
      weekend.saturday.getMonth() === 5 && // June is month 5
      weekend.saturday.getDate() === 7 &&
      weekend.sunday.getDate() === 8;

    if (isProvincialFinalsWeekend) {
      const saturdayDate = addOrdinalSuffix(weekend.saturday.getDate());
      const sundayDate = addOrdinalSuffix(weekend.sunday.getDate());
      const month = weekend.saturday.toLocaleDateString('en-IE', { month: 'long' });
      return `Provincial Finals (${month} ${saturdayDate}/${sundayDate})`;
    }

    // Check if it's Round 2 weekend (May 31st/June 1st)
    const isRoundTwo = 
      weekend.saturday.getMonth() === 4 && // May is month 4
      weekend.saturday.getDate() === 31 &&
      weekend.sunday.getMonth() === 5 && // June is month 5
      weekend.sunday.getDate() === 1;

    if (isRoundTwo) {
      // Check if there are any football matches this weekend
      const hasFootballMatches = matches?.some(match => {
        const compLower = match.competition?.toLowerCase() || '';
        return compLower.includes('all-ireland') && 
               compLower.includes('senior') && 
               isFootballMatch(match);
      });

      if (hasFootballMatches) {
        const saturdayDate = addOrdinalSuffix(weekend.saturday.getDate());
        const sundayDate = addOrdinalSuffix(weekend.sunday.getDate());
        const saturdayMonth = weekend.saturday.toLocaleDateString('en-IE', { month: 'long' });
        const sundayMonth = weekend.sunday.toLocaleDateString('en-IE', { month: 'long' });
        return `Round 2 (${saturdayMonth} ${saturdayDate}/${sundayMonth} ${sundayDate})`;
      }
    }

    // Check if it's Round 1 weekend (either May 17th/18th or May 24th/25th)
    const isRoundOne = 
      weekend.saturday.getMonth() === 4 && // May is month 4
      ((weekend.saturday.getDate() === 17 && weekend.sunday.getDate() === 18) ||
       (weekend.saturday.getDate() === 24 && weekend.sunday.getDate() === 25));

    if (isRoundOne) {
      // Check if there are any football matches this weekend
      const hasFootballMatches = matches?.some(match => {
        const compLower = match.competition?.toLowerCase() || '';
        return compLower.includes('all-ireland') && 
               compLower.includes('senior') && 
               isFootballMatch(match);
      });

      if (hasFootballMatches) {
        const saturdayDate = addOrdinalSuffix(weekend.saturday.getDate());
        const sundayDate = addOrdinalSuffix(weekend.sunday.getDate());
        const month = weekend.saturday.toLocaleDateString('en-IE', { month: 'long' });
        return `Round 1 (${month} ${saturdayDate}/${sundayDate})`;
      }
    }

    // Check for Finals, Semi-Finals, and Quarter-Finals if matches are provided
    if (matches) {
      const weekendMatches = matches.filter(match => {
        const matchDate = parseMatchDate(match);
        return matchDate >= weekend.saturday && matchDate <= weekend.sunday;
      });

      // Check for Final
      const finalMatch = weekendMatches.find(match => {
        const compLower = match.competition?.toLowerCase() || '';
        const homeTeamLower = match.homeTeam?.toLowerCase() || '';
        const awayTeamLower = match.awayTeam?.toLowerCase() || '';
        return (compLower.includes('all-ireland') && compLower.includes('senior')) &&
               ((homeTeamLower.includes('semi-final winner') || homeTeamLower.includes('semi final winner')) &&
                (awayTeamLower.includes('semi-final winner') || awayTeamLower.includes('semi final winner')));
      });

      if (finalMatch) {
        return 'Final';
      }

      // Check for Quarter-Finals (including preliminary quarter-final winners)
      const quarterFinalMatch = weekendMatches.find(match => {
        const compLower = match.competition?.toLowerCase() || '';
        const homeTeamLower = match.homeTeam?.toLowerCase() || '';
        const awayTeamLower = match.awayTeam?.toLowerCase() || '';
        
        // Check if it's an All-Ireland senior match
        const isAllIrelandSenior = compLower.includes('all-ireland') && compLower.includes('senior');
        
        // Check for exact match of "Group Winner" and "Preliminary Quarter-Final Winner"
        const isGroupWinnerVsPrelim = 
          (homeTeamLower === 'group winner' && awayTeamLower === 'preliminary quarter-final winner') ||
          (awayTeamLower === 'group winner' && homeTeamLower === 'preliminary quarter-final winner');
        
        // Check for any team being a Preliminary Quarter-Final Winner
        const hasPrelimWinner = 
          homeTeamLower === 'preliminary quarter-final winner' ||
          awayTeamLower === 'preliminary quarter-final winner';
        
        // Check for the specific weekend of June 28th/29th
        const matchDate = parseMatchDate(match);
        const isJune2829Weekend = 
          matchDate.getMonth() === 5 && // June is month 5
          (matchDate.getDate() === 28 || matchDate.getDate() === 29);
        
        return isAllIrelandSenior && (isGroupWinnerVsPrelim || hasPrelimWinner || isJune2829Weekend);
      });

      if (quarterFinalMatch) {
        return 'Quarter-Finals';
      }

      // Check for Semi-Finals
      const semiMatch = weekendMatches.find(match => {
        const compLower = match.competition?.toLowerCase() || '';
        const homeTeamLower = match.homeTeam?.toLowerCase() || '';
        const awayTeamLower = match.awayTeam?.toLowerCase() || '';
        
        // Only check for regular Quarter-Final Winners, not Preliminary
        return (compLower.includes('all-ireland') && compLower.includes('senior')) &&
               ((homeTeamLower === 'quarter-final winner' || homeTeamLower === 'quarter final winner') ||
                (awayTeamLower === 'quarter-final winner' || awayTeamLower === 'quarter final winner'));
      });

      if (semiMatch) {
        return 'Semi-Finals';
      }

      // Check for Quarter-Finals weekend
      const isQuarterFinalWeekend = weekend.saturday.getMonth() === 5 && // June is month 5
                                   weekend.saturday.getDate() === 21 &&
                                   weekend.sunday.getDate() === 22;

      const hasHurlingMatches = weekendMatches.some(match => {
        const compLower = match.competition?.toLowerCase() || '';
        return compLower.includes('all-ireland') && 
               compLower.includes('senior') && 
               isHurlingMatch(match);
      });

      if (isQuarterFinalWeekend && hasHurlingMatches) {
        return 'Quarter-Finals';
      }
    }
    
    const { saturday, sunday } = weekend;
    
    // Format the dates with ordinal numbers
    const saturdayDate = addOrdinalSuffix(saturday.getDate());
    const sundayDate = addOrdinalSuffix(sunday.getDate());
    const saturdayMonth = saturday.toLocaleDateString('en-IE', { month: 'long' });
    
    // If the weekend spans two months, include both month names
    if (saturday.getMonth() !== sunday.getMonth()) {
      const sundayMonth = sunday.toLocaleDateString('en-IE', { month: 'long' });
      return `Weekend of ${saturdayMonth} ${saturdayDate}/${sundayMonth} ${sundayDate}`;
    }
    
    return `Weekend of ${saturdayMonth} ${saturdayDate}/${sundayDate}`;
  } catch (error) {
    console.warn('Error generating week description:', error);
    return '';
  }
}

// Group table component
function GroupTable({ group }: { group: EnhancedGroup }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full">
      {/* Group Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <h3 className="font-semibold text-gray-900 text-sm">
          {group.name}
        </h3>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-900">Team</th>
              <th className="text-center px-2 py-2 font-medium text-gray-900">P</th>
              <th className="text-center px-2 py-2 font-medium text-gray-900">W</th>
              <th className="text-center px-2 py-2 font-medium text-gray-900">D</th>
              <th className="text-center px-2 py-2 font-medium text-gray-900">L</th>
              <th className="text-center px-2 py-2 font-medium text-gray-900">F</th>
              <th className="text-center px-2 py-2 font-medium text-gray-900">A</th>
              <th className="text-center px-2 py-2 font-medium text-gray-900">Pts</th>
              <th className="text-center px-2 py-2 font-medium text-gray-900">Status</th>
            </tr>
          </thead>
          <tbody>
            {group.teams.map((team, index) => {
              let statusClass = '';
              const statusText = team.securedReason || '';
              let rowClass = '';
              
              if (index === 0) {
                statusClass = 'bg-green-100 text-green-800 font-bold';
                rowClass = 'bg-green-50 hover:bg-green-100';
              } else if (index === 1 || index === 2) {
                statusClass = 'bg-yellow-100 text-yellow-800 font-bold';
                rowClass = 'bg-yellow-50 hover:bg-yellow-100';
              } else {
                statusClass = 'bg-red-100 text-red-800 font-bold';
                rowClass = 'bg-red-50 hover:bg-red-100';
              }
              
              return (
                <tr key={team.name} className={`${rowClass} transition-colors`}>
                  <td className="px-3 py-2">
                    <div className="flex items-center">
                      <div className="w-5 h-5 relative mr-2 flex-shrink-0">
                        <Image 
                          src={getTeamLogo(team.name)} 
                          alt={`${team.name} logo`}
                          width={20}
                          height={20}
                          className="object-contain"
                        />
                      </div>
                      <span className={`font-medium ${team.positionSecured ? 'text-gray-900 font-bold' : 'text-gray-900'}`}>
                        {team.name}
                      </span>
                    </div>
                  </td>
                  <td className="text-center px-2 py-2 text-gray-900">{team.played}</td>
                  <td className="text-center px-2 py-2 text-gray-900">{team.won}</td>
                  <td className="text-center px-2 py-2 text-gray-900">{team.drawn}</td>
                  <td className="text-center px-2 py-2 text-gray-900">{team.lost}</td>
                  <td className="text-center px-2 py-2 text-gray-900">{team.for}</td>
                  <td className="text-center px-2 py-2 text-gray-900">{team.against}</td>
                  <td className="text-center px-2 py-2 font-bold text-gray-900">{team.points}</td>
                  <td className="text-center px-2 py-2 text-xs font-medium">
                    {statusText && (
                      <span className={`px-2 py-1 rounded ${statusClass} ${team.positionSecured ? 'ring-2 ring-offset-1' : ''} ${
                        index === 0 && team.positionSecured ? 'ring-green-400' :
                        (index === 1 || index === 2) && team.positionSecured ? 'ring-yellow-400' :
                        index === 3 && team.positionSecured ? 'ring-red-400' : ''
                      }`}>
                        {statusText}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Component implementations
function MatchRow({ match }: { match: Match }) {
  const isLive = isMatchLive(match);
  const venue = getSimplifiedVenue(match.venue);
  const homeTeamLogo = getTeamLogo(match.homeTeam);
  const awayTeamLogo = getTeamLogo(match.awayTeam);

  return (
    <div className="bg-gray-50 hover:bg-gray-100 transition-colors p-3 rounded-lg">
      <div className="flex flex-col gap-2">
        {/* Match Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Home Team */}
            <div className="flex items-center gap-2 min-w-[180px] justify-end">
              <span className="font-medium text-gray-900 truncate text-sm">{match.homeTeam}</span>
              <div className="w-6 h-6 flex-shrink-0">
                <Image 
                  src={homeTeamLogo} 
                  alt={`${match.homeTeam} logo`}
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
            </div>
            
            {/* Score/VS */}
            <div className="flex-shrink-0 min-w-[60px] text-center">
              <span className={`${isLive ? 'text-red-600' : 'text-gray-900'} font-semibold text-sm px-3 py-1 ${!match.isFixture ? 'bg-white rounded shadow-sm' : ''}`}>
                {match.isFixture ? 'v' : `${match.homeScore} - ${match.awayScore}`}
              </span>
            </div>
            
            {/* Away Team */}
            <div className="flex items-center gap-2 min-w-[180px]">
              <div className="w-6 h-6 flex-shrink-0">
                <Image 
                  src={awayTeamLogo} 
                  alt={`${match.awayTeam} logo`}
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
              <span className="font-medium text-gray-900 truncate text-sm">{match.awayTeam}</span>
            </div>
          </div>

          {/* Live Badge - Moved outside of details */}
          {isLive && (
            <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded font-bold ml-2">
              LIVE
            </span>
          )}
        </div>

        {/* Match Details - Time/Date centered and venue on right for fixtures */}
        {match.isFixture && (
          <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
            <div className="w-24"></div> {/* Spacer for alignment */}
            <div>
              {match.time ? (
                <span className="font-medium">{match.time}</span>
              ) : (
                <span className="font-medium">{match.date}</span>
              )}
            </div>
            <div className="w-24 text-right truncate">
              {venue && <span>{venue}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main component
export default function HomePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [activeSport, setActiveSport] = useState<'football' | 'hurling'>('football');
  const [activeTab, setActiveTab] = useState<'fixtures' | 'results' | 'groups'>('fixtures');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [weekendDatesMap, setWeekendDatesMap] = useState<Record<string, { saturday: Date; sunday: Date }>>({});

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        console.log('Fetching matches...');
        const data = await getMatches();
        
        // If component is unmounted, don't update state
        if (!mounted) return;

        console.log('Raw data received:', data);

        if (!data) {
          console.error('No data received');
          setErrorState('No data received from the server');
          setLoading(false);
          return;
        }

        if (!Array.isArray(data)) {
          console.error('Received invalid data format:', data);
          setErrorState('Received invalid data format from the server');
          setLoading(false);
          return;
        }

        // Filter out invalid matches first
        const validMatches = data.filter(match => {
          if (!match) {
            console.warn('Found null/undefined match');
            return false;
          }
          
          console.log('Validating match:', match);
          
          try {
            const isValid = match && 
              typeof match.competition === 'string' &&
              typeof match.homeTeam === 'string' &&
              typeof match.awayTeam === 'string' &&
              typeof match.date === 'string' &&
              typeof match.isFixture === 'boolean';
              
            if (!isValid) {
              console.warn('Invalid match structure:', match);
            }
            
            return isValid;
          } catch (error) {
            console.warn('Error validating match:', error);
            return false;
          }
        });

        console.log('Valid matches found:', validMatches.length);

        if (validMatches.length < data.length) {
          console.warn(`Filtered out ${data.length - validMatches.length} invalid matches`);
        }

        if (validMatches.length === 0) {
          console.error('No valid matches found in the data');
          setErrorState('No valid matches found in the data. Please try again later.');
          setLoading(false);
          return;
        }

        // Get the most recent scrape time from the matches
        const latestScrapeTime = validMatches.reduce((latest, match) => {
          if (!match?.scrapedAt) return latest;
          try {
            const scrapeTime = new Date(match.scrapedAt).getTime();
            return scrapeTime > latest ? scrapeTime : latest;
          } catch (error) {
            console.warn('Error parsing scrape time:', error);
            return latest;
          }
        }, 0);
        
        if (latestScrapeTime) {
          const date = new Date(latestScrapeTime);
          setLastUpdated(date.toLocaleString('en-IE', {
            dateStyle: 'short',
            timeStyle: 'short'
          }));
        }

        console.log('Setting valid matches:', validMatches);
        setMatches(validMatches);
        setLoading(false);
      } catch (err) {
        console.error('Error in data fetching:', err);
        setErrorState(err instanceof Error ? err.message : 'Failed to fetch matches. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();

    // Cleanup function
    return () => {
      mounted = false;
    };
  }, []);

  // Get all results and fixtures for current sport
  const allResults = useMemo(() => {
    return matches
      .filter(match => !match.isFixture)
      .filter(match => 
        activeSport === 'hurling' ? isHurlingMatch(match) : isFootballMatch(match)
      )
      .sort((a, b) => {
        const dateA = parseMatchDate(a);
        const dateB = parseMatchDate(b);
        return dateB.getTime() - dateA.getTime(); // Newest first for results
      });
  }, [matches, activeSport]);

  const allFixtures = useMemo(() => {
    return matches
      .filter(match => match.isFixture)
      .filter(match => 
        activeSport === 'hurling' ? isHurlingMatch(match) : isFootballMatch(match)
      )
      .sort((a, b) => {
        const dateA = parseMatchDate(a);
        const dateB = parseMatchDate(b);
        return dateA.getTime() - dateB.getTime(); // Earliest first for fixtures
      });
  }, [matches, activeSport]);

  const { groupedResults, resultsWeekendMap } = useMemo(() => {
    const { grouped, weekendMap } = groupMatchesByWeekendAndDay(allResults);
    return { groupedResults: grouped, resultsWeekendMap: weekendMap };
  }, [allResults]);

  const { groupedFixtures, fixturesWeekendMap } = useMemo(() => {
    const { grouped, weekendMap } = groupMatchesByWeekendAndDay(allFixtures);
    return { groupedFixtures: grouped, fixturesWeekendMap: weekendMap };
  }, [allFixtures]);

  // Update weekendDatesMap when either map changes
  useEffect(() => {
    setWeekendDatesMap({ ...resultsWeekendMap, ...fixturesWeekendMap });
  }, [resultsWeekendMap, fixturesWeekendMap]);

  // Update group data with real match results since May 17th
  const updatedGroups = useMemo(() => {
    console.log('Updating group data with matches');
    return updateGroupDataWithMatches(allIrelandSFCGroups, matches);
  }, [matches]);

  const groupsComplete = useMemo(() => {
    return isGroupStageComplete(updatedGroups);
  }, [updatedGroups]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between h-16">
            <div>
            <h1 className="text-2xl font-audiowide text-gray-900">
              gaa<span className="text-orange-500">Today</span>
            </h1>
              <p className="text-xs text-gray-500 -mt-1 font-medium">ALL-IRELAND, ALL DAY.</p>
            </div>
            <div className="text-sm text-gray-600">
              {lastUpdated ? `Last Updated: ${lastUpdated}` : 'Loading...'}
            </div>
          </div>

          {/* Main Sport Tabs */}
          <div className="flex">
            <button
              onClick={() => setActiveSport('football')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeSport === 'football'
                  ? 'text-gray-900 font-semibold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Football
            </button>
            <button
              onClick={() => setActiveSport('hurling')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeSport === 'hurling'
                  ? 'text-gray-900 font-semibold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Hurling
            </button>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex space-x-2 pt-2 pb-4">
            <button
              onClick={() => setActiveTab('fixtures')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === 'fixtures'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Fixtures ({Object.values(groupedFixtures).reduce((count, week) => 
                count + Object.values(week).reduce((dayCount, matches) => dayCount + matches.length, 0), 0)})
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === 'results'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Results ({Object.values(groupedResults).reduce((count, week) => 
                count + Object.values(week).reduce((dayCount, matches) => dayCount + matches.length, 0), 0)})
            </button>
            {activeSport === 'football' && (
              <button
                onClick={() => setActiveTab('groups')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === 'groups'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Groups
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading matches...</p>
            </div>
          </div>
        ) : errorState ? (
          <div className="text-center py-12">
            <div className="text-red-600 text-lg mb-2">Error loading matches</div>
            <p className="text-gray-500">{errorState}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Results Tab Content */}
            {activeTab === 'results' && (
              <section className="space-y-6">
                {Object.entries(groupedResults)
                  .sort(([weekA], [weekB]) => weekB.localeCompare(weekA))
                  .map(([weekKey, days]) => {
                    if (Object.keys(days).length === 0) return null;
                    
                    // Get all matches for this weekend to check for finals/semi-finals
                    const weekendMatches = Object.values(days).flat();
                    const weekDescription = getWeekDescription(weekKey, weekendDatesMap, weekendMatches);
                    if (!weekDescription) return null;

                    return (
                      <div key={weekKey} className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {weekDescription}
                        </h3>
                        <div className="space-y-4">
                          {['Sunday', 'Saturday'].map(day => {
                            if (!days[day] || days[day].length === 0) return null;

                            return (
                              <div key={`${weekKey}-${day}`}>
                                <div className="mb-3">
                                  <span className="inline-block px-4 py-2 bg-gray-500 text-white rounded-full text-sm font-medium">
                                    {day}
                                  </span>
                                </div>
                                <div className="space-y-3">
                                  {days[day]
                                    .sort((a, b) => {
                                      const timeA = parseMatchDate(a).getTime();
                                      const timeB = parseMatchDate(b).getTime();
                                      return timeB - timeA; // Sort matches within day from latest to earliest
                                    })
                                    .map((match, index) => (
                                    <MatchRow 
                                        key={`${match.homeTeam}-${match.awayTeam}-${match.date}-${match.time || ''}-${index}`} 
                                      match={match} 
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </section>
            )}

            {/* Fixtures Tab Content */}
            {activeTab === 'fixtures' && (
              <section className="space-y-6">
                {Object.entries(groupedFixtures)
                  .sort(([weekA], [weekB]) => weekA.localeCompare(weekB))
                  .map(([weekKey, days]) => {
                    if (Object.keys(days).length === 0) return null;
                    
                    // Get all matches for this weekend to check for finals/semi-finals
                    const weekendMatches = Object.values(days).flat();
                    const weekDescription = getWeekDescription(weekKey, weekendDatesMap, weekendMatches);
                    if (!weekDescription) return null;

                    return (
                      <div key={weekKey} className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {weekDescription}
                        </h3>
                        <div className="space-y-4">
                          {['Saturday', 'Sunday'].map(day => {
                            if (!days[day] || days[day].length === 0) return null;

                            return (
                              <div key={`${weekKey}-${day}`}>
                                <div className="mb-3">
                                  <span className="inline-block px-4 py-2 bg-gray-500 text-white rounded-full text-sm font-medium">
                                    {day}
                                  </span>
                                </div>
                                <div className="space-y-3">
                                  {days[day].map((match, index) => (
                                    <MatchRow 
                                      key={`${match.homeTeam}-${match.awayTeam}-${match.date}-${match.time || ''}-${index}`} 
                                      match={match} 
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </section>
            )}

            {/* Groups Tab Content */}
            {activeTab === 'groups' && activeSport === 'football' && (
              <section>
                <div className="flex items-center gap-3 mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">All-Ireland SFC Championship Groups</h2>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    groupsComplete 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {groupsComplete ? 'Group Results' : 'Group Stage In Progress'}
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {updatedGroups.map((group) => (
                    <GroupTable key={group.name} group={group} />
                  ))}
                </div>
                <div className="mt-6 bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    Head-to-head rules apply for teams on level points after 3 games.
                  </p>
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Disclaimer */}
      <footer className="max-w-6xl mx-auto px-4 py-6 border-t border-gray-200">
        <p className="text-sm text-gray-500 text-center">
          This site is an independent fan project created to provide easy access to publicly available GAA match information. It is not affiliated with the Gaelic Athletic Association.
        </p>
      </footer>
    </div>
  );
}