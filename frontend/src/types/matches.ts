export interface Match {
  id?: number;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: string;
  awayScore?: string;
  venue?: string;
  referee?: string;
  date: string;
  time?: string;
  broadcasting?: string;
  isFixture: boolean;
  scrapedAt?: string;
  createdAt?: string;
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