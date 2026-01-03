
export interface Fact {
  id: string;
  topic: string;
  content: string;
  sourceName: string;
  sourceUrl: string;
  liked: boolean;
  saved: boolean;
  xpEarned: boolean;
  deckId?: string;
  isAd?: boolean; // New property to identify advertisement cards
}

export interface Deck {
  id: string;
  name: string;
  color: string;
}

export interface Reply {
  id: string;
  username: string;
  text: string;
  timestamp: number;
}

export interface Feedback {
  id: string;
  username: string;
  text: string;
  likes: number;
  replies: Reply[];
  timestamp: number;
}

export interface UserProfile {
  username: string;
  bio: string;
  pfpUrl: string;
  level: number;
  xp: number;
  nextLevelXp: number;
  streak: number;
  isCurated: boolean;
  dailyGoal: number;
  dailyXp: number;
  badges: Badge[];
  interests: string[];
  dislikedTopics: string[];
  decks: Deck[];
}

export interface Badge {
  type: 'easy' | 'medium' | 'hard';
  count: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export type AppTheme = 'light' | 'dark';
export type AppView = 'auth' | 'setup' | 'onboarding' | 'feed' | 'explore' | 'quiz' | 'saved' | 'profile' | 'feedback';
