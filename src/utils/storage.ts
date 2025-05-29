import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const MATCHES_FILE = path.join(DATA_DIR, 'matches.json');

interface StoredData {
  matches: any[];
  lastFetch: number;
}

export const ensureDataDirExists = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

export const saveMatches = (matches: any[]) => {
  ensureDataDirExists();
  const data: StoredData = {
    matches,
    lastFetch: Date.now()
  };
  fs.writeFileSync(MATCHES_FILE, JSON.stringify(data, null, 2));
};

export const loadMatches = (): StoredData | null => {
  try {
    if (fs.existsSync(MATCHES_FILE)) {
      const data = fs.readFileSync(MATCHES_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading matches from file:', error);
  }
  return null;
}; 