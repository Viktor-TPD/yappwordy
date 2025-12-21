"use client";

import { useState } from "react";
import { PresentationView } from "@/components/PresentationView";
import { RemoteControl } from "@/components/RemoteControl";
import { Board, Question, GameSession, GameSettings } from "@/types";

interface PlayPageClientProps {
  userId: string;
  board: Board;
  questions: Question[];
  availableBoards: Board[];
}

export function PlayPageClient({
  userId,
  board,
  questions,
  availableBoards,
}: PlayPageClientProps) {
  const [gameStarted, setGameStarted] = useState(false);
  const [session, setSession] = useState<GameSession | null>(null);
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
  const [secondBoard, setSecondBoard] = useState<Board | null>(null);
  const [processedQuestions, setProcessedQuestions] = useState<Question[]>([]);
  const [secondQuestions, setSecondQuestions] = useState<Question[]>([]);
  const [showSetup, setShowSetup] = useState(true);
  const [showRoundTransition, setShowRoundTransition] = useState(false);
  const [isRemoteView, setIsRemoteView] = useState(false);

  const [contestants, setContestants] = useState<
    Array<{ id: string; name: string; score: number }>
  >([]);
  const [newContestantName, setNewContestantName] = useState("");
  const [enableDailyDoubles, setEnableDailyDoubles] = useState(true);
  const [secondBoardId, setSecondBoardId] = useState<string>("");

  const addContestant = () => {
    if (newContestantName.trim() && contestants.length < 5) {
      setContestants([
        ...contestants,
        { id: Date.now().toString(), name: newContestantName.trim(), score: 0 },
      ]);
      setNewContestantName("");
    }
  };

  const removeContestant = (id: string) => {
    setContestants(contestants.filter((c) => c.id !== id));
  };

  const assignDailyDoubles = (
    questionsArray: Question[],
    enabled: boolean
  ): Question[] => {
    if (!enabled) {
      return questionsArray.map((q) => ({ ...q, is_daily_double: false }));
    }
    const modifiedQuestions = questionsArray.map((q) => ({
      ...q,
      is_daily_double: false,
    }));
    const numDailyDoubles = Math.floor(Math.random() * 2) + 1;
    const selectedIndices: number[] = [];

    for (let i = 0; i < numDailyDoubles; i++) {
      let attempts = 0;
      while (attempts < 20) {
        const randomIdx = Math.floor(Math.random() * modifiedQuestions.length);
        if (!selectedIndices.includes(randomIdx)) {
          selectedIndices.push(randomIdx);
          modifiedQuestions[randomIdx].is_daily_double = true;
          break;
        }
        attempts++;
      }
    }
    return modifiedQuestions;
  };

  const handleStartGame = async () => {
    if (contestants.length === 0) {
      alert("Please add at least one contestant");
      return;
    }

    try {
      const round1Questions = assignDailyDoubles(questions, enableDailyDoubles);
      setProcessedQuestions(round1Questions);

      let round2Questions: Question[] = [];
      if (secondBoardId) {
        const [boardRes, questionsRes] = await Promise.all([
          fetch(`/api/board/${secondBoardId}`),
          fetch(`/api/questions/${secondBoardId}`),
        ]);
        if (boardRes.ok && questionsRes.ok) {
          const fetchedBoard = await boardRes.json();
          const fetchedQuestions = await questionsRes.json();
          setSecondBoard(fetchedBoard);
          round2Questions = assignDailyDoubles(
            fetchedQuestions,
            enableDailyDoubles
          );
          setSecondQuestions(round2Questions);
        }
      }

      const settings: GameSettings = {
        enable_daily_doubles: enableDailyDoubles,
        contestants,
        current_round: 1,
      };

      const response = await fetch("/api/game/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId: board.id,
          secondBoardId: secondBoardId || null,
          userId,
          gameSettings: settings,
        }),
      });

      if (!response.ok) throw new Error("Failed to create session");

      const newSession = await response.json();
      setSession(newSession);
      setGameSettings(settings);
      setGameStarted(true);
      setShowSetup(false);
    } catch (error) {
      console.error("Error creating game session:", error);
      alert("Failed to start game. Please try again.");
    }
  };

  const handleStartRound2 = () => {
    // Show transition modal
    setShowRoundTransition(true);
  };

  const startRound2 = () => {
    if (gameSettings) {
      // Update to Round 2 with preserved scores
      setGameSettings({
        ...gameSettings,
        current_round: 2,
      });
      setShowRoundTransition(false);
    }
  };

  const secondBoardOptions = availableBoards.filter((b) => b.id !== board.id);

  // Check URL for remote view
  if (typeof window !== "undefined" && !isRemoteView) {
    const isRemote = window.location.pathname.includes("/remote/");
    if (isRemote) {
      setIsRemoteView(true);
    }
  }

  if (showSetup) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "2rem",
          background:
            "linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0d1842 100%)",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "3rem",
              fontWeight: 700,
              color: "var(--jeopardy-gold)",
              margin: "0 0 2rem 0",
              textAlign: "center",
              textShadow: "0 0 30px rgba(255, 204, 0, 0.6)",
              letterSpacing: "0.05em",
            }}
          >
            GAME SETUP
          </h1>

          <div
            style={{
              background: "var(--bg-secondary)",
              padding: "2rem",
              borderRadius: "12px",
              border: "2px solid var(--border-color)",
              marginBottom: "1.5rem",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.3rem",
                color: "var(--jeopardy-gold)",
                margin: "0 0 1.5rem 0",
              }}
            >
              BOARDS
            </h2>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "1rem",
                  background: "var(--bg-primary)",
                  borderRadius: "8px",
                  border: "2px solid rgba(255, 204, 0, 0.2)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "0.9rem",
                    color: "var(--text-secondary)",
                    minWidth: "80px",
                  }}
                >
                  ROUND 1:
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.2rem",
                    color: "white",
                    flex: 1,
                  }}
                >
                  {board.title}
                </span>
                <span
                  style={{
                    padding: "0.25rem 0.75rem",
                    background: "rgba(255, 204, 0, 0.2)",
                    border: "1px solid var(--jeopardy-gold)",
                    borderRadius: "4px",
                    fontFamily: "var(--font-display)",
                    fontSize: "0.85rem",
                    color: "var(--jeopardy-gold)",
                  }}
                >
                  $100-$500
                </span>
              </div>

              <div
                style={{
                  padding: "1rem",
                  background: "var(--bg-primary)",
                  borderRadius: "8px",
                  border: "2px solid rgba(255, 204, 0, 0.2)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "0.9rem",
                      color: "var(--text-secondary)",
                      minWidth: "80px",
                    }}
                  >
                    ROUND 2:
                  </span>
                  <select
                    value={secondBoardId}
                    onChange={(e) => setSecondBoardId(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: "200px",
                      padding: "0.75rem",
                      background: "var(--bg-secondary)",
                      border: "2px solid rgba(255, 204, 0, 0.3)",
                      borderRadius: "6px",
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-display)",
                      fontSize: "1rem",
                    }}
                  >
                    <option value="">No second round</option>
                    {secondBoardOptions.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title}
                      </option>
                    ))}
                  </select>
                  {secondBoardId && (
                    <span
                      style={{
                        padding: "0.25rem 0.75rem",
                        background: "rgba(255, 204, 0, 0.2)",
                        border: "1px solid var(--jeopardy-gold)",
                        borderRadius: "4px",
                        fontFamily: "var(--font-display)",
                        fontSize: "0.85rem",
                        color: "var(--jeopardy-gold)",
                      }}
                    >
                      $200-$1000
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              background: "var(--bg-secondary)",
              padding: "2rem",
              borderRadius: "12px",
              border: "2px solid var(--border-color)",
              marginBottom: "1.5rem",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.3rem",
                color: "var(--jeopardy-gold)",
                margin: "0 0 1.5rem 0",
              }}
            >
              DAILY DOUBLES
            </h2>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={enableDailyDoubles}
                onChange={(e) => setEnableDailyDoubles(e.target.checked)}
                style={{ width: "24px", height: "24px" }}
              />
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.1rem",
                  color: "white",
                }}
              >
                Enable Daily Doubles (1-2 random per round)
              </span>
            </label>
          </div>

          <div
            style={{
              background: "var(--bg-secondary)",
              padding: "2rem",
              borderRadius: "12px",
              border: "2px solid var(--border-color)",
              marginBottom: "1.5rem",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.3rem",
                color: "var(--jeopardy-gold)",
                margin: "0 0 1.5rem 0",
              }}
            >
              CONTESTANTS ({contestants.length}/5)
            </h2>
            {contestants.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  marginBottom: "1.5rem",
                }}
              >
                {contestants.map((contestant, index) => (
                  <div
                    key={contestant.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      padding: "1rem",
                      background: "var(--bg-primary)",
                      borderRadius: "8px",
                      border: "2px solid rgba(255, 204, 0, 0.2)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "0.9rem",
                        color: "var(--text-secondary)",
                        minWidth: "30px",
                      }}
                    >
                      #{index + 1}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "1.2rem",
                        color: "white",
                        flex: 1,
                      }}
                    >
                      {contestant.name}
                    </span>
                    <button
                      onClick={() => removeContestant(contestant.id)}
                      style={{
                        width: "32px",
                        height: "32px",
                        background: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "1.5rem",
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {contestants.length < 5 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addContestant();
                }}
                style={{ display: "flex", gap: "0.75rem" }}
              >
                <input
                  type="text"
                  value={newContestantName}
                  onChange={(e) => setNewContestantName(e.target.value)}
                  placeholder="Enter contestant name..."
                  maxLength={30}
                  style={{
                    flex: 1,
                    padding: "1rem",
                    background: "var(--bg-primary)",
                    border: "2px solid rgba(255, 204, 0, 0.3)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-body)",
                    fontSize: "1rem",
                  }}
                />
                <button
                  type="submit"
                  disabled={!newContestantName.trim()}
                  style={{
                    padding: "1rem 2rem",
                    background: "#16a34a",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontFamily: "var(--font-display)",
                    fontSize: "1rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    opacity: newContestantName.trim() ? 1 : 0.5,
                  }}
                >
                  ADD
                </button>
              </form>
            )}
          </div>

          <button
            onClick={handleStartGame}
            disabled={contestants.length === 0}
            style={{
              width: "100%",
              padding: "1.5rem 2rem",
              background:
                "linear-gradient(135deg, var(--jeopardy-gold) 0%, #ffd700 100%)",
              color: "var(--jeopardy-dark-blue)",
              border: "none",
              borderRadius: "12px",
              fontFamily: "var(--font-display)",
              fontSize: "1.5rem",
              fontWeight: 700,
              cursor: "pointer",
              opacity: contestants.length === 0 ? 0.5 : 1,
            }}
          >
            START GAME
          </button>
        </div>
      </div>
    );
  }

  if (!gameStarted || !session || !gameSettings) return null;

  // Round transition modal (shows on TV)
  if (showRoundTransition && secondBoard) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0d1842 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "4rem",
              fontWeight: 700,
              color: "var(--jeopardy-gold)",
              margin: "0 0 1rem 0",
              textShadow: "0 0 40px rgba(255, 204, 0, 0.8)",
              letterSpacing: "0.1em",
            }}
          >
            ROUND 2!
          </h1>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "2.5rem",
              fontWeight: 600,
              color: "white",
              margin: "0 0 3rem 0",
              textShadow: "0 0 20px rgba(255, 255, 255, 0.5)",
            }}
          >
            {secondBoard.title}
          </h2>
          <button
            onClick={startRound2}
            style={{
              padding: "1.5rem 3rem",
              background:
                "linear-gradient(135deg, var(--jeopardy-gold) 0%, #ffd700 100%)",
              color: "var(--jeopardy-dark-blue)",
              border: "none",
              borderRadius: "12px",
              fontFamily: "var(--font-display)",
              fontSize: "1.5rem",
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: "0.05em",
              boxShadow: "0 8px 32px rgba(255, 204, 0, 0.4)",
            }}
          >
            BEGIN ROUND 2
          </button>
        </div>
      </div>
    );
  }

  const currentBoard =
    gameSettings.current_round === 1 ? board : secondBoard || board;
  const currentQuestions =
    gameSettings.current_round === 1 ? processedQuestions : secondQuestions;
  const hasSecondRound = Boolean(secondBoard && secondQuestions.length > 0);

  // Render remote control view
  if (isRemoteView) {
    return (
      <RemoteControl
        session={session}
        board={currentBoard}
        questions={currentQuestions}
        hasSecondRound={hasSecondRound}
        sessionId={session.id}
      />
    );
  }

  // Render presentation view
  return (
    <PresentationView
      board={currentBoard}
      questions={currentQuestions}
      session={session}
      gameSettings={gameSettings}
      hasSecondRound={hasSecondRound}
      onStartRound2={handleStartRound2}
    />
  );
}
