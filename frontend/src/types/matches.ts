export interface Match {
  competition: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  homeScore?: string;
  awayScore?: string;
  venue?: string;
  referee?: string;
  time?: string;
  broadcasting?: string;
  scrapedAt?: string;
  createdAt?: string;
  isFixture: boolean;
}

export function isValidString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function isValidOptionalString(value: unknown): value is string | undefined {
  return value === undefined || (typeof value === 'string' && value.length > 0);
}

export function isValidMatch(match: unknown): match is Match {
  if (!match || typeof match !== 'object') return false;
  
  const m = match as Partial<Match>;
  
  if (!isValidString(m.competition)) return false;
  if (!isValidString(m.homeTeam)) return false;
  if (!isValidString(m.awayTeam)) return false;
  if (!isValidString(m.date)) return false;
  if (typeof m.isFixture !== 'boolean') return false;
  
  if (!isValidOptionalString(m.homeScore)) return false;
  if (!isValidOptionalString(m.awayScore)) return false;
  if (!isValidOptionalString(m.venue)) return false;
  if (!isValidOptionalString(m.referee)) return false;
  if (!isValidOptionalString(m.time)) return false;
  if (!isValidOptionalString(m.broadcasting)) return false;
  if (!isValidOptionalString(m.scrapedAt)) return false;
  if (!isValidOptionalString(m.createdAt)) return false;
  
  return true;
}

export interface GroupTeam {
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  for: number;
  against: number;
  points: number;
}

export interface Group {
  name: string;
  teams: GroupTeam[];
}

export type MatchFilter = {
  sport?: 'football' | 'hurling';
  showResults?: boolean;
} 