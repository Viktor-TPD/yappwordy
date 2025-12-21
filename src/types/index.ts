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
  point_value: number;
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
  point_mode: "single" | "double"; // 100-500 or 200-1000
  enable_daily_doubles: boolean;
  contestants: Contestant[];
  current_round: 1 | 2; // Round 1 (first board) or Round 2 (second board)
}

export interface Contestant {
  id: string;
  name: string;
  score: number;
}

export interface GameState {
  selectedQuestion: {
    categoryIndex: number;
    pointValue: number;
  } | null;
  revealedQuestions: string[];
  showingAnswer: boolean;
}

export interface RealtimeMessage {
  type: "SELECT_QUESTION" | "REVEAL_ANSWER" | "MARK_COMPLETE" | "RESET_VIEW";
  payload?: any;
}

export type PointValue = 100 | 200 | 300 | 400 | 500 | 600 | 800 | 1000;

export const POINT_VALUES_SINGLE: PointValue[] = [100, 200, 300, 400, 500];
export const POINT_VALUES_DOUBLE: PointValue[] = [200, 400, 600, 800, 1000];
