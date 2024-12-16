// app/types.ts
export interface Flashcard {
    id: number;
    word: string;
    translation: string;
    status: 'known' | 'somewhat_known' | 'unknown';
  }