-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Boards table
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  categories TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX boards_user_id_idx ON boards(user_id);

-- Questions table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  category_index INTEGER NOT NULL,
  point_value INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  is_daily_double BOOLEAN DEFAULT FALSE,
  CONSTRAINT valid_point_value CHECK (point_value IN (200, 400, 600, 800, 1000))
);

-- Create indexes for faster queries
CREATE INDEX questions_board_id_idx ON questions(board_id);
CREATE INDEX questions_category_idx ON questions(board_id, category_index);

-- Game Sessions table
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  session_pin TEXT NOT NULL UNIQUE,
  current_state JSONB DEFAULT '{"selectedQuestion": null, "revealedQuestions": [], "scores": {}, "showingAnswer": false}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Create indexes
CREATE INDEX game_sessions_pin_idx ON game_sessions(session_pin);
CREATE INDEX game_sessions_user_id_idx ON game_sessions(user_id);
CREATE INDEX game_sessions_expires_idx ON game_sessions(expires_at);

-- Enable Row Level Security (RLS)
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for boards
CREATE POLICY "Users can view their own boards"
  ON boards FOR SELECT
  USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can insert their own boards"
  ON boards FOR INSERT
  WITH CHECK (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update their own boards"
  ON boards FOR UPDATE
  USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can delete their own boards"
  ON boards FOR DELETE
  USING (user_id = auth.jwt() ->> 'sub');

-- RLS Policies for questions
CREATE POLICY "Users can view questions for their boards"
  ON questions FOR SELECT
  USING (
    board_id IN (
      SELECT id FROM boards WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can insert questions for their boards"
  ON questions FOR INSERT
  WITH CHECK (
    board_id IN (
      SELECT id FROM boards WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can update questions for their boards"
  ON questions FOR UPDATE
  USING (
    board_id IN (
      SELECT id FROM boards WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can delete questions for their boards"
  ON questions FOR DELETE
  USING (
    board_id IN (
      SELECT id FROM boards WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

-- RLS Policies for game_sessions
CREATE POLICY "Users can view their own game sessions"
  ON game_sessions FOR SELECT
  USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can insert their own game sessions"
  ON game_sessions FOR INSERT
  WITH CHECK (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update their own game sessions"
  ON game_sessions FOR UPDATE
  USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can delete their own game sessions"
  ON game_sessions FOR DELETE
  USING (user_id = auth.jwt() ->> 'sub');

-- Function to clean up expired sessions (optional, run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM game_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Note: You may want to set up a cron job or scheduled function to run cleanup_expired_sessions() periodically