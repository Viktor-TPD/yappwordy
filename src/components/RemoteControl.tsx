"use client";

import { useState, useEffect, useRef } from "react";
import {
  Board,
  Question,
  GameSession,
  POINT_VALUES_SINGLE,
  POINT_VALUES_DOUBLE,
} from "@/types";
import { createRealtimeChannel } from "@/lib/supabase";
import { getQuestionKey } from "@/lib/utils";
import Link from "next/link";
import styles from "./RemoteControl.module.css";

interface RemoteControlProps {
  session: GameSession;
  board: Board;
  questions: Question[];
}

interface Contestant {
  id: string;
  name: string;
  score: number;
}

const STORED_VALUES = [200, 400, 600, 800, 1000];

export function RemoteControl({
  session,
  board,
  questions,
}: RemoteControlProps) {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<{
    categoryIndex: number;
    storedValue: number;
    displayValue: number;
  } | null>(null);
  const [showingAnswer, setShowingAnswer] = useState(false);
  const [selectedContestant, setSelectedContestant] = useState<string | null>(
    null
  );
  const [revealedQuestions, setRevealedQuestions] = useState<Set<string>>(
    new Set()
  );
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [pointMode, setPointMode] = useState<"single" | "double">("single");
  const channelRef = useRef<any>(null);
  const syncRequestedRef = useRef(false);

  const displayValues =
    pointMode === "single" ? POINT_VALUES_SINGLE : POINT_VALUES_DOUBLE;

  useEffect(() => {
    const channel = createRealtimeChannel(session.session_pin);
    channelRef.current = channel;

    channel
      .on(
        "broadcast",
        { event: "contestants-update" },
        (payload: { payload: { contestants: Contestant[] } }) => {
          console.log(
            "Received contestants update:",
            payload.payload.contestants
          );
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
            pointMode: "single" | "double";
          };
        }) => {
          console.log("Received state sync:", payload.payload);
          setContestants(payload.payload.contestants);
          setRevealedQuestions(new Set(payload.payload.revealedQuestions));
          setPointMode(payload.payload.pointMode);
        }
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          console.log("Connected to game channel");
          if (!syncRequestedRef.current) {
            syncRequestedRef.current = true;
            setTimeout(() => {
              if (channelRef.current) {
                console.log("Requesting state sync...");
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

  const selectQuestion = (
    categoryIndex: number,
    storedValue: number,
    displayValue: number
  ) => {
    const key = getQuestionKey(categoryIndex, storedValue);
    if (revealedQuestions.has(key)) return;

    setCurrentQuestion({ categoryIndex, storedValue, displayValue });
    setShowingAnswer(false);
    setSelectedContestant(null);
    sendMessage("SELECT_QUESTION", { categoryIndex, storedValue });
  };

  const revealAnswer = () => {
    setShowingAnswer(true);
    sendMessage("REVEAL_ANSWER");
  };

  const handleCorrect = () => {
    if (currentQuestion && selectedContestant) {
      const updatedContestants = contestants.map((c) =>
        c.id === selectedContestant
          ? { ...c, score: c.score + currentQuestion.displayValue }
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
          ? { ...c, score: c.score - currentQuestion.displayValue }
          : c
      );
      setContestants(updatedContestants);
      broadcastContestants(updatedContestants);
      markComplete();
    }
  };

  const markComplete = () => {
    if (currentQuestion) {
      const key = getQuestionKey(
        currentQuestion.categoryIndex,
        currentQuestion.storedValue
      );
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
          <p className={styles.pin}>PIN: {session.session_pin}</p>
        </div>

        {currentQuestion && (
          <div className={styles.currentQuestion}>
            <p className={styles.currentLabel}>Selected Question</p>
            <p className={styles.currentCategory}>
              {board.categories[currentQuestion.categoryIndex]}
            </p>
            <p className={styles.currentValue}>
              ${currentQuestion.displayValue}
            </p>

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

        {!currentQuestion && selectedCategory === null && (
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
              {STORED_VALUES.map((storedValue, idx) => {
                const question = questionsByCategory[selectedCategory]?.find(
                  (q) => q.point_value === storedValue
                );
                const key = getQuestionKey(selectedCategory, storedValue);
                const isRevealed = revealedQuestions.has(key);
                const displayValue = displayValues[idx];

                if (!question) {
                  return (
                    <div
                      key={storedValue}
                      className={`${styles.questionButton} ${styles.questionDisabled}`}
                    >
                      ${displayValue}
                    </div>
                  );
                }

                return (
                  <button
                    key={storedValue}
                    onClick={() =>
                      selectQuestion(
                        selectedCategory,
                        storedValue,
                        displayValue
                      )
                    }
                    disabled={isRevealed}
                    className={`${styles.questionButton} ${
                      isRevealed ? styles.questionRevealed : ""
                    }`}
                  >
                    <span className={styles.questionValue}>
                      ${displayValue}
                    </span>
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

        {!currentQuestion && selectedCategory === null && (
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
