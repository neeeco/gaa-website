export interface Match {
  competition: string;
  round: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  date: string;
  time: string;
  score?: {
    home: string;
    away: string;
  };
  isResult: boolean;
  sport: 'football' | 'hurling';
}

export type MatchFilter = {
  sport?: 'football' | 'hurling';
  showResults?: boolean;
} 