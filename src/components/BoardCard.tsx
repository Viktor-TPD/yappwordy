"use client";

import { useState } from "react";
import { Board } from "@/types";
import { deleteBoard } from "@/lib/database";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./BoardCard.module.css";

interface BoardCardProps {
  board: Board;
}

export function BoardCard({ board }: BoardCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${board.title}"? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);

    try {
      const success = await deleteBoard(board.id);
      if (success) {
        router.refresh();
      } else {
        alert("Failed to delete board");
        setIsDeleting(false);
      }
    } catch (error) {
      console.error("Error deleting board:", error);
      alert("Failed to delete board");
      setIsDeleting(false);
    }
  };

  const handlePlay = () => {
    router.push(`/play/${board.id}`);
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>{board.title}</h3>
        <div className={styles.categoryCount}>
          {board.categories.length} categories
        </div>
      </div>

      <div className={styles.categories}>
        {board.categories.slice(0, 3).map((cat, idx) => (
          <span key={idx} className={styles.category}>
            {cat}
          </span>
        ))}
        {board.categories.length > 3 && (
          <span className={styles.category}>
            +{board.categories.length - 3} more
          </span>
        )}
      </div>

      <div className={styles.actions}>
        <button onClick={handlePlay} className={styles.playButton}>
          PLAY
        </button>
        <Link href={`/board/${board.id}`} className={styles.editButton}>
          EDIT
        </Link>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className={styles.deleteButton}
        >
          {isDeleting ? "..." : "DELETE"}
        </button>
      </div>
    </div>
  );
}
