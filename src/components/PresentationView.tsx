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
  secondBoardName?: string;
  onStartRound2?: () => void;
}

export function PresentationView({
  board,
  questions,
  session,
  gameSettings: initialGameSettings,
  hasSecondRound,
  secondBoardName,
  onStartRound2,
}: PresentationViewProps) {
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(
    null
  );
  const [showAnswer, setShowAnswer] = useState(false);
  const [revealedQuestions, setRevealedQuestions] = useState<Set<string>>(
    new Set()
  );
  const [contestants, setContestants] = useState(
    initialGameSettings.contestants
  );
  const [currentRound, setCurrentRound] = useState(
    initialGameSettings.current_round
  );
  const [showSettings, setShowSettings] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [showRoundTransition, setShowRoundTransition] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [winner, setWinner] = useState<{ name: string; score: number } | null>(
    null
  );
  const [confettiPieces, setConfettiPieces] = useState<
    Array<{
      id: number;
      left: string;
      delay: string;
      duration: string;
      color: string;
    }>
  >([]);
  const channelRef = useRef<any>(null);

  // Use local IP if available (for local network testing), otherwise use production URL
  const controlUrl =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_LOCAL_IP
        ? `http://${process.env.NEXT_PUBLIC_LOCAL_IP}:3000/remote/${session.session_pin}`
        : `${window.location.origin}/remote/${session.session_pin}`
      : "";

  const allQuestionsRevealed =
    questions.length > 0 && revealedQuestions.size === questions.length;
  const canStartRound2 =
    allQuestionsRevealed && hasSecondRound && currentRound === 1;

  // Generate confetti when winner is shown
  useEffect(() => {
    if (showWinner) {
      const colors = ["#ffcc00", "#060ce9", "#10b981", "#ef4444", "#ffffff"];
      const pieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 3}s`,
        duration: `${3 + Math.random() * 2}s`,
        color: colors[Math.floor(Math.random() * colors.length)],
      }));
      setConfettiPieces(pieces);
    }
  }, [showWinner]);

  // Check for winner when round 2 ends
  useEffect(() => {
    if (currentRound === 2 && allQuestionsRevealed && contestants.length > 0) {
      setTimeout(() => {
        const sortedContestants = [...contestants].sort(
          (a, b) => b.score - a.score
        );
        const topContestant = sortedContestants[0];

        if (topContestant.score > 0) {
          setWinner({ name: topContestant.name, score: topContestant.score });
          setShowWinner(true);
        }
      }, 1000); // Delay to let final question complete
    }
  }, [currentRound, allQuestionsRevealed, revealedQuestions, contestants]);

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
      .on(
        "broadcast",
        { event: "start-round-2" },
        (payload: { payload: { contestants: any[] } }) => {
          // Update contestants with scores from remote
          if (payload.payload.contestants) {
            setContestants(payload.payload.contestants);
          }
          // Show transition modal
          setShowRoundTransition(true);
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
              currentRound: currentRound,
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
    currentRound,
  ]);

  const handleConfirmRound2 = () => {
    // Update local round
    setCurrentRound(2);
    setRevealedQuestions(new Set());
    setShowRoundTransition(false);

    // Broadcast to remote
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "round-2-confirmed",
        payload: { contestants },
      });
    }

    // Tell parent to switch boards
    if (onStartRound2) {
      onStartRound2();
    }
  };

  const questionsByCategory: Record<number, Question[]> = {};
  questions.forEach((q) => {
    if (!questionsByCategory[q.category_index]) {
      questionsByCategory[q.category_index] = [];
    }
    questionsByCategory[q.category_index].push(q);
  });

  // Winner overlay
  if (showWinner && winner) {
    return (
      <div className={styles.winnerOverlay}>
        {confettiPieces.map((piece) => (
          <div
            key={piece.id}
            className={styles.confetti}
            style={{
              left: piece.left,
              animationDelay: piece.delay,
              animationDuration: piece.duration,
              animation: `confettiFall ${piece.duration} linear ${piece.delay} infinite`,
              background: piece.color,
            }}
          />
        ))}
        <div className={styles.winnerContent}>
          <div className={styles.winnerEmoji}>🏆</div>
          <h1 className={styles.winnerTitle}>WINNER!</h1>
          <h2 className={styles.winnerName}>{winner.name}</h2>
          <div className={styles.winnerScore}>
            ${winner.score.toLocaleString()}
          </div>
          <button
            onClick={() => {
              setShowWinner(false);
              setWinner(null);
            }}
            className={styles.winnerButton}
          >
            CLOSE
          </button>
        </div>
      </div>
    );
  }

  // Round 2 transition modal
  if (showRoundTransition && secondBoardName) {
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
            {secondBoardName}
          </h2>
          <button
            onClick={handleConfirmRound2}
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

  return (
    <div className={styles.container}>
      <button
        className={styles.settingsButton}
        onClick={() => setShowSettings(true)}
      >
        <span className={styles.settingsIcon}>⚙️</span>
      </button>

      {/* TV Button for Round 2 */}
      {canStartRound2 && (
        <button
          onClick={() => setShowRoundTransition(true)}
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
                      const pointValue = getPointValue(rowNumber, currentRound);

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
                              {initialGameSettings.enable_daily_doubles &&
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
                  ${getPointValue(selectedQuestion.row_number, currentRound)}
                </span>
                {initialGameSettings.enable_daily_doubles &&
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
                <p className={styles.settingsValue}>Round {currentRound}</p>
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
