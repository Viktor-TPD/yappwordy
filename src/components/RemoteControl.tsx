"use client";

import { useState, useEffect, useRef } from "react";
import { Board, Question, GameSession, getPointValue } from "@/types";
import { createRealtimeChannel } from "@/lib/supabase";
import Link from "next/link";
import styles from "./RemoteControl.module.css";

interface RemoteControlProps {
  session: GameSession;
  board: Board;
  questions: Question[];
  hasSecondRound: boolean;
}

interface Contestant {
  id: string;
  name: string;
  score: number;
}

export function RemoteControl({
  session,
  board: initialBoard,
  questions: initialQuestions,
  hasSecondRound,
}: RemoteControlProps) {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<{
    categoryIndex: number;
    rowNumber: number;
    pointValue: number;
  } | null>(null);
  const [showingAnswer, setShowingAnswer] = useState(false);
  const [selectedContestant, setSelectedContestant] = useState<string | null>(
    null
  );
  const [revealedQuestions, setRevealedQuestions] = useState<Set<string>>(
    new Set()
  );
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [currentRound, setCurrentRound] = useState<1 | 2>(1);
  const [board, setBoard] = useState<Board>(initialBoard);
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const channelRef = useRef<any>(null);
  const syncRequestedRef = useRef(false);

  const allQuestionsRevealed =
    questions.length > 0 && revealedQuestions.size === questions.length;
  const canStartRound2 =
    allQuestionsRevealed && hasSecondRound && currentRound === 1;

  // Fetch Round 2 board and questions
  const fetchRound2Data = async () => {
    if (!session.second_board_id) return;

    try {
      const [boardRes, questionsRes] = await Promise.all([
        fetch(`/api/board/${session.second_board_id}`),
        fetch(`/api/questions/${session.second_board_id}`),
      ]);

      if (boardRes.ok && questionsRes.ok) {
        const fetchedBoard = await boardRes.json();
        const fetchedQuestions = await questionsRes.json();
        setBoard(fetchedBoard);
        setQuestions(fetchedQuestions);
      }
    } catch (error) {
      console.error("Error fetching Round 2 data:", error);
    }
  };

  useEffect(() => {
    const channel = createRealtimeChannel(session.session_pin);
    channelRef.current = channel;

    channel
      .on(
        "broadcast",
        { event: "contestants-update" },
        (payload: { payload: { contestants: Contestant[] } }) => {
          setContestants(payload.payload.contestants);
        }
      )
      .on(
        "broadcast",
        { event: "state-sync" },
        (payload: {
          payload: {
            contestants: Contestant[];
            revealedQuestions: string[];
            currentRound: 1 | 2;
          };
        }) => {
          setContestants(payload.payload.contestants);
          setRevealedQuestions(new Set(payload.payload.revealedQuestions));
          setCurrentRound(payload.payload.currentRound);
          // If syncing to round 2, fetch the board data
          if (payload.payload.currentRound === 2 && currentRound === 1) {
            fetchRound2Data();
          }
        }
      )
      .on(
        "broadcast",
        { event: "round-2-confirmed" },
        async (payload: { payload: { contestants: Contestant[] } }) => {
          // TV confirmed Round 2, update state and fetch new board
          setCurrentRound(2);
          setRevealedQuestions(new Set());
          if (payload.payload.contestants) {
            setContestants(payload.payload.contestants);
          }
          // Fetch Round 2 board and questions
          await fetchRound2Data();
        }
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          if (!syncRequestedRef.current) {
            syncRequestedRef.current = true;
            setTimeout(() => {
              if (channelRef.current) {
                channelRef.current.send({
                  type: "broadcast",
                  event: "sync-request",
                  payload: {},
                });
              }
            }, 500);
          }
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [session.session_pin]);

  const sendMessage = (type: string, payload?: any) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "game-action",
        payload: { type, payload },
      });
    }
  };

  const broadcastContestants = (updatedContestants: Contestant[]) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "contestants-update",
        payload: { contestants: updatedContestants },
      });
    }
  };

  const selectQuestion = (categoryIndex: number, rowNumber: number) => {
    const key = `${categoryIndex}-${rowNumber}`;
    if (revealedQuestions.has(key)) return;

    const pointValue = getPointValue(rowNumber, currentRound);
    setCurrentQuestion({ categoryIndex, rowNumber, pointValue });
    setShowingAnswer(false);
    setSelectedContestant(null);
    sendMessage("SELECT_QUESTION", { categoryIndex, rowNumber });
  };

  const revealAnswer = () => {
    setShowingAnswer(true);
    sendMessage("REVEAL_ANSWER");
  };

  const handleCorrect = () => {
    if (currentQuestion && selectedContestant) {
      const updatedContestants = contestants.map((c) =>
        c.id === selectedContestant
          ? { ...c, score: c.score + currentQuestion.pointValue }
          : c
      );
      setContestants(updatedContestants);
      broadcastContestants(updatedContestants);
      markComplete();
    }
  };

  const handleWrong = () => {
    if (currentQuestion && selectedContestant) {
      const updatedContestants = contestants.map((c) =>
        c.id === selectedContestant
          ? { ...c, score: c.score - currentQuestion.pointValue }
          : c
      );
      setContestants(updatedContestants);
      broadcastContestants(updatedContestants);
      markComplete();
    }
  };

  const markComplete = () => {
    if (currentQuestion) {
      const key = `${currentQuestion.categoryIndex}-${currentQuestion.rowNumber}`;
      setRevealedQuestions((prev) => new Set([...prev, key]));
      sendMessage("MARK_COMPLETE");
    }
    setCurrentQuestion(null);
    setShowingAnswer(false);
    setSelectedCategory(null);
    setSelectedContestant(null);
  };

  const resetView = () => {
    setCurrentQuestion(null);
    setShowingAnswer(false);
    setSelectedCategory(null);
    setSelectedContestant(null);
    sendMessage("RESET_VIEW");
  };

  const handleStartRound2 = () => {
    // Send broadcast with current contestant scores
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "start-round-2",
        payload: { contestants },
      });
    }
  };

  const questionsByCategory: Record<number, Question[]> = {};
  questions.forEach((q) => {
    if (!questionsByCategory[q.category_index]) {
      questionsByCategory[q.category_index] = [];
    }
    questionsByCategory[q.category_index].push(q);
  });

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>REMOTE CONTROL</h1>
          <p className={styles.subtitle}>{board.title}</p>
          <p className={styles.pin}>
            PIN: {session.session_pin} | Round {currentRound}
          </p>
        </div>

        {canStartRound2 && (
          <div className={styles.section}>
            <div
              style={{
                background:
                  "linear-gradient(135deg, var(--jeopardy-gold) 0%, #ffd700 100%)",
                padding: "2rem",
                borderRadius: "12px",
                textAlign: "center",
                border: "3px solid var(--jeopardy-gold)",
                boxShadow: "0 8px 32px rgba(255, 204, 0, 0.4)",
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.8rem",
                  color: "var(--jeopardy-dark-blue)",
                  margin: "0 0 1rem 0",
                  fontWeight: 700,
                }}
              >
                🎉 ROUND 1 COMPLETE! 🎉
              </h2>
              <button
                onClick={handleStartRound2}
                style={{
                  padding: "1rem 2rem",
                  background: "var(--jeopardy-dark-blue)",
                  color: "var(--jeopardy-gold)",
                  border: "none",
                  borderRadius: "8px",
                  fontFamily: "var(--font-display)",
                  fontSize: "1.3rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: "0.05em",
                }}
              >
                START ROUND 2 →
              </button>
            </div>
          </div>
        )}

        {currentQuestion && (
          <div className={styles.currentQuestion}>
            <p className={styles.currentLabel}>Selected Question</p>
            <p className={styles.currentCategory}>
              {board.categories[currentQuestion.categoryIndex]}
            </p>
            <p className={styles.currentValue}>${currentQuestion.pointValue}</p>

            {!showingAnswer && (
              <div className={styles.questionActions}>
                <button onClick={revealAnswer} className={styles.revealButton}>
                  REVEAL ANSWER
                </button>
                <button onClick={resetView} className={styles.backButton}>
                  ← BACK TO BOARD
                </button>
              </div>
            )}

            {showingAnswer && (
              <>
                {contestants.length > 0 ? (
                  <div className={styles.contestantSelection}>
                    <p className={styles.contestantSelectionTitle}>
                      WHO ANSWERED?
                    </p>
                    <div className={styles.contestantButtons}>
                      {contestants.map((contestant) => (
                        <button
                          key={contestant.id}
                          onClick={() => setSelectedContestant(contestant.id)}
                          className={`${styles.contestantButton} ${
                            selectedContestant === contestant.id
                              ? styles.contestantButtonSelected
                              : ""
                          }`}
                        >
                          {contestant.name}
                        </button>
                      ))}
                    </div>
                    {selectedContestant && (
                      <div className={styles.scoreActions}>
                        <button
                          onClick={handleCorrect}
                          className={styles.correctButton}
                        >
                          ✓ CORRECT
                        </button>
                        <button
                          onClick={handleWrong}
                          className={styles.wrongButton}
                        >
                          ✗ WRONG
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={styles.contestantSelection}>
                    <p className={styles.contestantSelectionTitle}>
                      No contestants added yet
                    </p>
                  </div>
                )}
                <div className={styles.questionActions}>
                  <button
                    onClick={markComplete}
                    className={styles.correctButton}
                  >
                    SKIP (No Score)
                  </button>
                  <button onClick={resetView} className={styles.backButton}>
                    ← BACK TO BOARD
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {!currentQuestion && selectedCategory === null && !canStartRound2 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>SELECT CATEGORY</h2>
            <div className={styles.categoryGrid}>
              {board.categories.map((category, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedCategory(index)}
                  className={styles.categoryButton}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedCategory !== null && !currentQuestion && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              {board.categories[selectedCategory]}
            </h2>
            <div className={styles.questionGrid}>
              {[1, 2, 3, 4, 5].map((rowNumber) => {
                const question = questionsByCategory[selectedCategory]?.find(
                  (q) => q.row_number === rowNumber
                );
                const key = `${selectedCategory}-${rowNumber}`;
                const isRevealed = revealedQuestions.has(key);
                const pointValue = getPointValue(rowNumber, currentRound);

                if (!question) {
                  return (
                    <div
                      key={rowNumber}
                      className={`${styles.questionButton} ${styles.questionDisabled}`}
                    >
                      ${pointValue}
                    </div>
                  );
                }

                return (
                  <button
                    key={rowNumber}
                    onClick={() => selectQuestion(selectedCategory, rowNumber)}
                    disabled={isRevealed}
                    className={`${styles.questionButton} ${
                      isRevealed ? styles.questionRevealed : ""
                    }`}
                  >
                    <span className={styles.questionValue}>${pointValue}</span>
                    {question.is_daily_double && !isRevealed && (
                      <span className={styles.questionDD}>DAILY DOUBLE</span>
                    )}
                    {isRevealed && (
                      <span className={styles.questionCompleted}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setSelectedCategory(null)}
              className={styles.backButton}
            >
              ← BACK TO CATEGORIES
            </button>
          </div>
        )}

        {!currentQuestion && selectedCategory === null && !canStartRound2 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>QUICK ACTIONS</h3>
            <div className={styles.actions}>
              <button onClick={resetView} className={styles.actionButton}>
                🔄 RESET BOARD VIEW
              </button>
              <Link href="/dashboard" className={styles.actionButton}>
                ✕ END GAME
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
