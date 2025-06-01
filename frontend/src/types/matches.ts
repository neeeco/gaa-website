export interface Match {
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