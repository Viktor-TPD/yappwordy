import { supabase } from "./supabase";
import { Board, Question, GameSession, GameSettings } from "@/types";
import { generateSessionPin } from "./utils";

// ============================================================================
// BOARD OPERATIONS
// ============================================================================

export async function createBoard(
  userId: string,
  title: string,
  categories: string[]
): Promise<Board | null> {
  const { data, error } = await supabase
    .from("boards")
    .insert({
      user_id: userId,
      title,
      categories,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating board:", error);
    return null;
  }

  return data;
}

export async function getBoards(userId: string): Promise<Board[]> {
  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching boards:", error);
    return [];
  }

  return data || [];
}

export async function getBoard(boardId: string): Promise<Board | null> {
  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .eq("id", boardId)
    .single();

  if (error) {
    console.error("Error fetching board:", error);
    return null;
  }

  return data;
}

export async function updateBoard(
  boardId: string,
  updates: Partial<Board>
): Promise<boolean> {
  const { error } = await supabase
    .from("boards")
    .update(updates)
    .eq("id", boardId);

  if (error) {
    console.error("Error updating board:", error);
    return false;
  }

  return true;
}

export async function deleteBoard(boardId: string): Promise<boolean> {
  const { error } = await supabase.from("boards").delete().eq("id", boardId);

  if (error) {
    console.error("Error deleting board:", error);
    return false;
  }

  return true;
}

// ============================================================================
// QUESTION OPERATIONS
// ============================================================================

export async function createQuestion(
  question: Omit<Question, "id">
): Promise<Question | null> {
  const { data, error } = await supabase
    .from("questions")
    .insert(question)
    .select()
    .single();

  if (error) {
    console.error("Error creating question:", error);
    return null;
  }

  return data;
}

export async function createQuestions(
  questions: Omit<Question, "id">[]
): Promise<boolean> {
  const { error } = await supabase.from("questions").insert(questions);

  if (error) {
    console.error("Error creating questions:", error);
    return false;
  }

  return true;
}

export async function getQuestions(boardId: string): Promise<Question[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("board_id", boardId)
    .order("category_index")
    .order("point_value");

  if (error) {
    console.error("Error fetching questions:", error);
    return [];
  }

  return data || [];
}

export async function updateQuestion(
  questionId: string,
  updates: Partial<Question>
): Promise<boolean> {
  const { error } = await supabase
    .from("questions")
    .update(updates)
    .eq("id", questionId);

  if (error) {
    console.error("Error updating question:", error);
    return false;
  }

  return true;
}

export async function deleteQuestions(boardId: string): Promise<boolean> {
  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("board_id", boardId);

  if (error) {
    console.error("Error deleting questions:", error);
    return false;
  }

  return true;
}

// ============================================================================
// GAME SESSION OPERATIONS
// ============================================================================

export async function getGameSession(
  sessionPin: string
): Promise<GameSession | null> {
  const { data, error } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("session_pin", sessionPin)
    .single();

  if (error) {
    console.error("Error fetching game session:", error);
    return null;
  }

  return data;
}

export async function updateGameState(
  sessionId: string,
  currentState: any
): Promise<boolean> {
  const { error } = await supabase
    .from("game_sessions")
    .update({ current_state: currentState })
    .eq("id", sessionId);

  if (error) {
    console.error("Error updating game state:", error);
    return false;
  }

  return true;
}

export async function createGameSession(
  boardId: string,
  userId: string,
  gameSettings: GameSettings,
  secondBoardId?: string | null
): Promise<GameSession | null> {
  const sessionPin = generateSessionPin();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 4);

  const { data, error } = await supabase
    .from("game_sessions")
    .insert({
      board_id: boardId,
      second_board_id: secondBoardId || null,
      user_id: userId,
      session_pin: sessionPin,
      current_state: {
        selectedQuestion: null,
        revealedQuestions: [],
        showingAnswer: false,
      },
      game_settings: gameSettings,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating game session:", error);
    return null;
  }

  return data;
}

export async function updateGameSettings(
  sessionId: string,
  gameSettings: GameSettings
): Promise<boolean> {
  const { error } = await supabase
    .from("game_sessions")
    .update({ game_settings: gameSettings })
    .eq("id", sessionId);

  if (error) {
    console.error("Error updating game settings:", error);
    return false;
  }

  return true;
}

export async function deleteGameSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from("game_sessions")
    .delete()
    .eq("id", sessionId);

  if (error) {
    console.error("Error deleting game session:", error);
    return false;
  }

  return true;
}
