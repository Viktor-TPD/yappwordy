"use client";

import { useState, useEffect, useRef } from "react";
import { Board, Question, GameSession, RealtimeMessage } from "@/types";
import { createRealtimeChannel } from "@/lib/supabase";
import { getQuestionKey } from "@/lib/utils";
import QRCode from "qrcode";
import styles from "./PresentationView.module.css";

interface PresentationViewProps {
  board: Board;
  questions: Question[];
  session: GameSession;
}

export function PresentationView({
  board,
  questions,
  session,
}: PresentationViewProps) {
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(
    null
  );
  const [showAnswer, setShowAnswer] = useState(false);
  const [revealedQuestions, setRevealedQuestions] = useState<Set<string>>(
    new Set()
  );
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const channelRef = useRef<any>(null);

  const controlUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/remote/${session.session_pin}`
      : "";

  useEffect(() => {
    // Generate QR code
    if (controlUrl) {
      QRCode.toDataURL(controlUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#060CE9",
          light: "#FFFFFF",
        },
      }).then(setQrCodeUrl);
    }

    // Setup realtime channel
    const channel = createRealtimeChannel(session.session_pin);
    channelRef.current = channel;

    channel
      .on(
        "broadcast",
        { event: "game-action" },
        (payload: { payload: RealtimeMessage }) => {
          const message = payload.payload;

          switch (message.type) {
            case "SELECT_QUESTION":
              const question = questions.find(
                (q) =>
                  q.category_index === message.payload.categoryIndex &&
                  q.point_value === message.payload.pointValue
              );
              if (question) {
                setSelectedQuestion(question);
                setShowAnswer(false);
              }
              break;

            case "REVEAL_ANSWER":
              setShowAnswer(true);
              break;

            case "MARK_COMPLETE":
              if (selectedQuestion) {
                setRevealedQuestions(
                  (prev) =>
                    new Set([
                      ...prev,
                      getQuestionKey(
                        selectedQuestion.category_index,
                        selectedQuestion.point_value
                      ),
                    ])
                );
                setSelectedQuestion(null);
                setShowAnswer(false);
              }
              break;

            case "RESET_VIEW":
              setSelectedQuestion(null);
              setShowAnswer(false);
              break;
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [session.session_pin, questions, selectedQuestion, controlUrl]);

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
      {!selectedQuestion ? (
        // Board View
        <div className={styles.boardView}>
          {/* Header with QR Code */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>{board.title}</h1>
              <p className={styles.pin}>
                Session PIN:{" "}
                <span className={styles.pinCode}>{session.session_pin}</span>
              </p>
            </div>

            <div className={styles.qrSection}>
              <p className={styles.qrLabel}>Scan to Control</p>
              {qrCodeUrl && (
                <img
                  src={qrCodeUrl}
                  alt="Control QR Code"
                  className={styles.qrCode}
                />
              )}
            </div>
          </div>

          {/* Game Board */}
          <div className={styles.board}>
            <div
              className={styles.boardGrid}
              style={{
                gridTemplateColumns: `repeat(${board.categories.length}, 1fr)`,
              }}
            >
              {/* Category Headers */}
              {board.categories.map((category, index) => (
                <div key={index} className={styles.categoryHeader}>
                  <h3 className={styles.categoryTitle}>{category}</h3>
                </div>
              ))}

              {/* Question Tiles */}
              {[200, 400, 600, 800, 1000].map((pointValue) =>
                board.categories.map((_, categoryIndex) => {
                  const question = questionsByCategory[categoryIndex]?.find(
                    (q) => q.point_value === pointValue
                  );
                  const key = getQuestionKey(categoryIndex, pointValue);
                  const isRevealed = revealedQuestions.has(key);

                  return (
                    <div
                      key={key}
                      className={`${styles.questionTile} ${
                        isRevealed ? styles.revealed : ""
                      }`}
                    >
                      {!isRevealed && question && (
                        <>
                          <span className={styles.pointValue}>
                            ${pointValue}
                          </span>
                          {question.is_daily_double && (
                            <div className={styles.dailyDouble}>DD</div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        // Question View
        <div className={styles.questionView}>
          <div className={styles.questionCard}>
            <div className={styles.questionHeader}>
              <span className={styles.questionValue}>
                ${selectedQuestion.point_value}
              </span>
              {selectedQuestion.is_daily_double && (
                <div className={styles.dailyDoubleBadge}>
                  ⭐ DAILY DOUBLE ⭐
                </div>
              )}
            </div>

            <div className={styles.questionText}>
              {selectedQuestion.question_text}
            </div>

            {showAnswer && (
              <div className={styles.answerSection}>
                <p className={styles.answerLabel}>ANSWER:</p>
                <p className={styles.answerText}>
                  {selectedQuestion.answer_text}
                </p>
              </div>
            )}
          </div>

          <p className={styles.hint}>
            Use your remote control to reveal the answer or return to the board
          </p>
        </div>
      )}
    </div>
  );
}
