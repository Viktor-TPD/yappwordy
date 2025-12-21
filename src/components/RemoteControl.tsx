"use client";

import { useState, useEffect, useRef } from "react";
import { Board, Question, GameSession } from "@/types";
import { createRealtimeChannel } from "@/lib/supabase";
import { getQuestionKey } from "@/lib/utils";
import Link from "next/link";
import styles from "./RemoteControl.module.css";

interface RemoteControlProps {
  session: GameSession;
  board: Board;
  questions: Question[];
}

export function RemoteControl({
  session,
  board,
  questions,
}: RemoteControlProps) {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<{
    categoryIndex: number;
    pointValue: number;
  } | null>(null);
  const [showingAnswer, setShowingAnswer] = useState(false);
  const [revealedQuestions, setRevealedQuestions] = useState<Set<string>>(
    new Set()
  );
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const channel = createRealtimeChannel(session.session_pin);
    channelRef.current = channel;

    channel.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        console.log("Connected to game channel");
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

  const selectQuestion = (categoryIndex: number, pointValue: number) => {
    const key = getQuestionKey(categoryIndex, pointValue);
    if (revealedQuestions.has(key)) {
      return; // Already revealed
    }

    setCurrentQuestion({ categoryIndex, pointValue });
    setShowingAnswer(false);
    sendMessage("SELECT_QUESTION", { categoryIndex, pointValue });
  };

  const revealAnswer = () => {
    setShowingAnswer(true);
    sendMessage("REVEAL_ANSWER");
  };

  const markComplete = () => {
    if (currentQuestion) {
      const key = getQuestionKey(
        currentQuestion.categoryIndex,
        currentQuestion.pointValue
      );
      setRevealedQuestions((prev) => new Set([...prev, key]));
    }
    sendMessage("MARK_COMPLETE");
    setCurrentQuestion(null);
    setShowingAnswer(false);
    setSelectedCategory(null);
  };

  const resetView = () => {
    setCurrentQuestion(null);
    setShowingAnswer(false);
    setSelectedCategory(null);
    sendMessage("RESET_VIEW");
  };

  // Organize questions by category
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
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>REMOTE CONTROL</h1>
          <p className={styles.subtitle}>{board.title}</p>
          <p className={styles.pin}>PIN: {session.session_pin}</p>
        </div>

        {/* Current Question Display */}
        {currentQuestion && (
          <div className={styles.currentQuestion}>
            <p className={styles.currentLabel}>Selected Question</p>
            <p className={styles.currentCategory}>
              {board.categories[currentQuestion.categoryIndex]}
            </p>
            <p className={styles.currentValue}>${currentQuestion.pointValue}</p>

            <div className={styles.questionActions}>
              {!showingAnswer ? (
                <button onClick={revealAnswer} className={styles.revealButton}>
                  REVEAL ANSWER
                </button>
              ) : (
                <button
                  onClick={markComplete}
                  className={styles.completeButton}
                >
                  ✓ MARK COMPLETE
                </button>
              )}

              <button onClick={resetView} className={styles.backButton}>
                ← BACK TO BOARD
              </button>
            </div>
          </div>
        )}

        {/* Category Selection */}
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

        {/* Question Selection */}
        {selectedCategory !== null && !currentQuestion && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              {board.categories[selectedCategory]}
            </h2>

            <div className={styles.questionGrid}>
              {[200, 400, 600, 800, 1000].map((pointValue) => {
                const question = questionsByCategory[selectedCategory]?.find(
                  (q) => q.point_value === pointValue
                );
                const key = getQuestionKey(selectedCategory, pointValue);
                const isRevealed = revealedQuestions.has(key);

                if (!question) {
                  return (
                    <div
                      key={pointValue}
                      className={`${styles.questionButton} ${styles.questionDisabled}`}
                    >
                      ${pointValue}
                    </div>
                  );
                }

                return (
                  <button
                    key={pointValue}
                    onClick={() => selectQuestion(selectedCategory, pointValue)}
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

        {/* Quick Actions */}
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
