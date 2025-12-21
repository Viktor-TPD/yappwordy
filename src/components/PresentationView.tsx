"use client";

import { useState, useEffect, useRef } from "react";
import {
  Board,
  Question,
  GameSession,
  GameSettings,
  RealtimeMessage,
  getPointValue,
} from "@/types";
import { createRealtimeChannel } from "@/lib/supabase";
import QRCode from "qrcode";
import styles from "./PresentationView.module.css";

interface PresentationViewProps {
  board: Board;
  questions: Question[];
  session: GameSession;
  gameSettings: GameSettings;
  hasSecondRound?: boolean;
  onStartRound2?: () => void;
}

const LOCAL_NETWORK_IP = "192.168.40.239";

export function PresentationView({
  board,
  questions,
  session,
  gameSettings,
  hasSecondRound,
  onStartRound2,
}: PresentationViewProps) {
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(
    null
  );
  const [showAnswer, setShowAnswer] = useState(false);
  const [revealedQuestions, setRevealedQuestions] = useState<Set<string>>(
    new Set()
  );
  const [contestants, setContestants] = useState(gameSettings.contestants);
  const [showSettings, setShowSettings] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const channelRef = useRef<any>(null);

  const controlUrl =
    typeof window !== "undefined"
      ? `http://${LOCAL_NETWORK_IP}:3000/remote/${session.session_pin}`
      : "";

  // Check if all questions revealed
  const allQuestionsRevealed =
    questions.length > 0 && revealedQuestions.size === questions.length;
  const canStartRound2 =
    allQuestionsRevealed && hasSecondRound && gameSettings.current_round === 1;

  useEffect(() => {
    if (controlUrl) {
      QRCode.toDataURL(controlUrl, {
        width: 300,
        margin: 2,
        color: { dark: "#060CE9", light: "#FFFFFF" },
      }).then(setQrCodeUrl);
    }

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
                  q.row_number === message.payload.rowNumber
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
                      `${selectedQuestion.category_index}-${selectedQuestion.row_number}`,
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
      .on(
        "broadcast",
        { event: "contestants-update" },
        (payload: { payload: { contestants: any[] } }) => {
          setContestants(payload.payload.contestants);
        }
      )
      .on("broadcast", { event: "sync-request" }, () => {
        if (channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "state-sync",
            payload: {
              contestants: contestants,
              revealedQuestions: Array.from(revealedQuestions),
              currentRound: gameSettings.current_round,
            },
          });
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [
    session.session_pin,
    questions,
    selectedQuestion,
    controlUrl,
    contestants,
    revealedQuestions,
    gameSettings.current_round,
  ]);

  const questionsByCategory: Record<number, Question[]> = {};
  questions.forEach((q) => {
    if (!questionsByCategory[q.category_index]) {
      questionsByCategory[q.category_index] = [];
    }
    questionsByCategory[q.category_index].push(q);
  });

  return (
    <div className={styles.container}>
      <button
        className={styles.settingsButton}
        onClick={() => setShowSettings(true)}
      >
        <span className={styles.settingsIcon}>⚙️</span>
      </button>

      {/* Round 2 Button on TV */}
      {canStartRound2 && onStartRound2 && (
        <button
          onClick={onStartRound2}
          style={{
            position: "fixed",
            bottom: "2rem",
            right: "2rem",
            padding: "1rem 2rem",
            background:
              "linear-gradient(135deg, var(--jeopardy-gold) 0%, #ffd700 100%)",
            color: "var(--jeopardy-dark-blue)",
            border: "3px solid var(--jeopardy-gold)",
            borderRadius: "12px",
            fontFamily: "var(--font-display)",
            fontSize: "1.2rem",
            fontWeight: 700,
            cursor: "pointer",
            zIndex: 100,
            boxShadow: "0 8px 32px rgba(255, 204, 0, 0.6)",
          }}
        >
          START ROUND 2 →
        </button>
      )}

      {!selectedQuestion ? (
        <div className={styles.boardView}>
          <div className={styles.mainContent}>
            <div className={styles.contestantsSection}>
              {contestants.map((contestant, index) => (
                <div key={contestant.id} className={styles.contestantCard}>
                  <div className={styles.contestantHeader}>
                    <span className={styles.contestantNumber}>
                      #{index + 1}
                    </span>
                  </div>
                  <h3 className={styles.contestantName}>{contestant.name}</h3>
                  <div
                    className={`${styles.contestantScore} ${
                      contestant.score > 0
                        ? styles.contestantScorePositive
                        : contestant.score < 0
                        ? styles.contestantScoreNegative
                        : ""
                    }`}
                  >
                    ${contestant.score.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.boardContainer}>
              <div className={styles.board}>
                <div
                  className={styles.boardGrid}
                  style={{
                    gridTemplateColumns: `repeat(${board.categories.length}, 1fr)`,
                    gridTemplateRows: `auto repeat(5, 1fr)`,
                  }}
                >
                  {board.categories.map((category, index) => (
                    <div key={index} className={styles.categoryHeader}>
                      <h3 className={styles.categoryTitle}>{category}</h3>
                    </div>
                  ))}

                  {[1, 2, 3, 4, 5].map((rowNumber) =>
                    board.categories.map((_, categoryIndex) => {
                      const question = questionsByCategory[categoryIndex]?.find(
                        (q) => q.row_number === rowNumber
                      );
                      const key = `${categoryIndex}-${rowNumber}`;
                      const isRevealed = revealedQuestions.has(key);
                      const pointValue = getPointValue(
                        rowNumber,
                        gameSettings.current_round
                      );

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
                              {gameSettings.enable_daily_doubles &&
                                question.is_daily_double && (
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
          </div>
        </div>
      ) : (
        <div className={styles.questionView}>
          <div
            className={`${styles.cardContainer} ${
              showAnswer ? styles.cardFlipped : ""
            }`}
          >
            <div className={styles.cardFront}>
              <div className={styles.questionHeader}>
                <span className={styles.questionValue}>
                  $
                  {getPointValue(
                    selectedQuestion.row_number,
                    gameSettings.current_round
                  )}
                </span>
                {gameSettings.enable_daily_doubles &&
                  selectedQuestion.is_daily_double && (
                    <div className={styles.dailyDoubleBadge}>
                      ⭐ DAILY DOUBLE ⭐
                    </div>
                  )}
              </div>
              <div className={styles.questionText}>
                {selectedQuestion.question_text}
              </div>
            </div>

            <div className={styles.cardBack}>
              <div className={styles.answerSection}>
                <p className={styles.answerLabel}>ANSWER:</p>
                <p className={styles.answerText}>
                  {selectedQuestion.answer_text}
                </p>
                <p className={styles.questionReference}>
                  {selectedQuestion.question_text}
                </p>
              </div>
            </div>
          </div>
          <p className={styles.hint}>
            Use your remote control to reveal the answer or return to the board
          </p>
        </div>
      )}

      {showSettings && (
        <div
          className={styles.settingsOverlay}
          onClick={() => setShowSettings(false)}
        >
          <div
            className={styles.settingsModal}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={styles.settingsTitle}>GAME SETTINGS</h3>
            <div className={styles.settingsContent}>
              <div className={styles.settingsSection}>
                <p className={styles.settingsLabel}>Board</p>
                <p
                  className={`${styles.settingsValue} ${styles.settingsBoardTitle}`}
                >
                  {board.title}
                </p>
              </div>
              <div className={styles.settingsSection}>
                <p className={styles.settingsLabel}>Round</p>
                <p className={styles.settingsValue}>
                  Round {gameSettings.current_round}
                </p>
              </div>
              <div className={styles.settingsSection}>
                <p className={styles.settingsLabel}>Session PIN</p>
                <p className={styles.settingsValue}>{session.session_pin}</p>
              </div>
              <div className={styles.settingsSection}>
                <p className={styles.settingsLabel}>Remote Control</p>
                <div className={styles.qrCodeContainer}>
                  {qrCodeUrl && (
                    <>
                      <img
                        src={qrCodeUrl}
                        alt="QR Code"
                        className={styles.qrCode}
                      />
                      <p className={styles.qrLabel}>
                        Scan to control from phone
                      </p>
                      <p className={styles.qrUrl}>{controlUrl}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className={styles.settingsClose}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
