export interface Board {
  id: string;
  user_id: string;
  title: string;
  categories: string[];
  created_at: string;
}

export interface Question {
  id: string;
  board_id: string;
  category_index: number;
  row_number: number; // 1, 2, 3, 4, or 5 (position in category)
  question_text: string;
  answer_text: string;
  is_daily_double: boolean;
}

export interface GameSession {
  id: string;
  board_id: string;
  second_board_id: string | null;
  user_id: string;
  session_pin: string;
  current_state: GameState;
  game_settings: GameSettings;
  created_at: string;
  expires_at: string;
}

export interface GameSettings {
  enable_daily_doubles: boolean;
  contestants: Contestant[];
  current_round: 1 | 2;
}

export interface Contestant {
  id: string;
  name: string;
  score: number;
}

export interface GameState {
  selectedQuestion: {
    categoryIndex: number;
    rowNumber: number;
  } | null;
  revealedQuestions: string[];
  showingAnswer: boolean;
}

export interface RealtimeMessage {
  type: "SELECT_QUESTION" | "REVEAL_ANSWER" | "MARK_COMPLETE" | "RESET_VIEW";
  payload?: any;
}

// Point values by round
export const ROUND_1_VALUES = [100, 200, 300, 400, 500];
export const ROUND_2_VALUES = [200, 400, 600, 800, 1000];

// Get point value for a row in a specific round
export function getPointValue(rowNumber: number, round: 1 | 2): number {
  const values = round === 1 ? ROUND_1_VALUES : ROUND_2_VALUES;
  return values[rowNumber - 1] || 0;
}
