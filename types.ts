export enum Sender {
  USER = 'user',
  AI = 'model'
}

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: Date;
  isThinking?: boolean;
}

export interface Chapter {
  title: string;
  content: string; // Markdown supported
  imageKeyword: string;
  imageUrl?: string; // Generated AI image URL
}

export type BookFormat = 'novel' | 'comic';
export type BookLength = 'short' | 'medium' | 'long' | 'epic';

export interface EBook {
  title: string;
  author: string;
  description: string;
  theme: 'modern' | 'classic' | 'fantasy' | 'technical' | 'sci-fi' | 'horror' | 'romance' | 'historical' | 'comic' | 'cyberpunk' | 'steampunk' | 'minimalist';
  format: BookFormat;
  chapters: Chapter[];
}

export type UserLevel = 'Beginner' | 'Advanced' | 'Pro';

export interface KeywordData {
  term: string;
  volume: string;
  competition: 'Low' | 'Medium' | 'High';
}

export interface CompetitorInsight {
  name: string;
  marketShare: number; // Percentage
  strength: string;
  weakness: string;
}

export interface MarketData {
  topic: string;
  difficultyScore: number; // 0-100
  potentialEarnings: number; // Monthly estimate
  trendData: { month: string; value: number }[]; // Historical
  forecastData: { month: string; value: number }[]; // Future
  topKeywords: KeywordData[];
  competitorInsights: CompetitorInsight[];
}

export interface SavedProject {
  id: string;
  name: string;
  book: EBook;
  messages: Message[];
  marketData: MarketData | null;
  createdAt: number;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  apiKey: string;
}

export type AppMode = 'chat' | 'preview' | 'analysis' | 'projects';