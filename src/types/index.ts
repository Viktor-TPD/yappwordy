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
  user_id: string;
  session_pin: string;
  current_state: GameState;
  created_at: string;
  expires_at: string;
}

export interface GameState {
  selectedQuestion: {
    categoryIndex: number;
    pointValue: number;
  } | null;
  revealedQuestions: string[];
  scores: Record<string, number>;
  showingAnswer: boolean;
}

export interface RealtimeMessage {
  type: "SELECT_QUESTION" | "REVEAL_ANSWER" | "MARK_COMPLETE" | "RESET_VIEW";
  payload?: any;
}

export type PointValue = 200 | 400 | 600 | 800 | 1000;

export const POINT_VALUES: PointValue[] = [200, 400, 600, 800, 1000];
