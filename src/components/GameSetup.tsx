"use client";

import { useState } from "react";
import { Board, Contestant, GameSettings } from "@/types";
import styles from "./GameSetup.module.css";

interface GameSetupProps {
  board: Board;
  availableBoards: Board[]; // All user's boards for selection
  userId: string;
  onStartGame: (settings: GameSettings, secondBoardId: string | null) => void;
}

export function GameSetup({
  board,
  availableBoards,
  userId,
  onStartGame,
}: GameSetupProps) {
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [newContestantName, setNewContestantName] = useState("");
  const [enableDailyDoubles, setEnableDailyDoubles] = useState(true);
  const [secondBoardId, setSecondBoardId] = useState<string>("");

  const addContestant = () => {
    if (newContestantName.trim() && contestants.length < 5) {
      setContestants([
        ...contestants,
        {
          id: Date.now().toString(),
          name: newContestantName.trim(),
          score: 0,
        },
      ]);
      setNewContestantName("");
    }
  };

  const removeContestant = (id: string) => {
    setContestants(contestants.filter((c) => c.id !== id));
  };

  const handleStartGame = () => {
    if (contestants.length === 0) {
      alert("Please add at least one contestant");
      return;
    }

    const settings: GameSettings = {
      point_mode: "single", // Round 1 always uses single
      enable_daily_doubles: enableDailyDoubles,
      contestants,
      current_round: 1,
    };

    onStartGame(settings, secondBoardId || null);
  };

  // Filter out current board from available boards for round 2
  const secondBoardOptions = availableBoards.filter((b) => b.id !== board.id);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>GAME SETUP</h1>

        {/* Board Info */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>BOARDS</h2>
          <div className={styles.boardsList}>
            <div className={styles.boardItem}>
              <span className={styles.roundLabel}>ROUND 1:</span>
              <span className={styles.boardTitle}>{board.title}</span>
              <span className={styles.pointBadge}>$100-$500</span>
            </div>

            {/* Second Board Selector */}
            <div className={styles.boardSelector}>
              <label className={styles.boardSelectorLabel}>
                <span className={styles.roundLabel}>ROUND 2:</span>
                <select
                  value={secondBoardId}
                  onChange={(e) => setSecondBoardId(e.target.value)}
                  className={styles.boardSelect}
                >
                  <option value="">No second round</option>
                  {secondBoardOptions.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
                {secondBoardId && (
                  <span className={styles.pointBadge}>$200-$1000</span>
                )}
              </label>
            </div>
          </div>
        </div>

        {/* Daily Doubles */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>DAILY DOUBLES</h2>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={enableDailyDoubles}
              onChange={(e) => setEnableDailyDoubles(e.target.checked)}
              className={styles.checkbox}
            />
            <span>Enable Daily Doubles</span>
          </label>
        </div>

        {/* Contestants */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            CONTESTANTS ({contestants.length}/5)
          </h2>

          {contestants.length > 0 && (
            <div className={styles.contestantsList}>
              {contestants.map((contestant, index) => (
                <div key={contestant.id} className={styles.contestantItem}>
                  <span className={styles.contestantNumber}>#{index + 1}</span>
                  <span className={styles.contestantName}>
                    {contestant.name}
                  </span>
                  <button
                    onClick={() => removeContestant(contestant.id)}
                    className={styles.removeButton}
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
              className={styles.addForm}
            >
              <input
                type="text"
                value={newContestantName}
                onChange={(e) => setNewContestantName(e.target.value)}
                placeholder="Enter contestant name..."
                className={styles.input}
                maxLength={30}
              />
              <button
                type="submit"
                disabled={!newContestantName.trim()}
                className={styles.addButton}
              >
                ADD
              </button>
            </form>
          )}
        </div>

        {/* Start Game */}
        <div className={styles.actions}>
          <button
            onClick={handleStartGame}
            disabled={contestants.length === 0}
            className={styles.startButton}
          >
            START GAME
          </button>
        </div>
      </div>
    </div>
  );
}
