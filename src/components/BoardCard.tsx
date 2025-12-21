"use client";

import Link from "next/link";
import { Board } from "@/types";
import { useState } from "react";
import { deleteBoard } from "@/lib/database";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import styles from "./BoardCard.module.css";

interface BoardCardProps {
  board: Board;
}

export function BoardCard({ board }: BoardCardProps) {
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    const success = await deleteBoard(board.id);
    if (success) {
      router.refresh();
    } else {
      setIsDeleting(false);
      alert("Failed to delete board");
    }
  };

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardContent}>
          <div className={styles.header}>
            <h3 className={styles.title}>{board.title}</h3>
            <button
              onClick={() => setShowDelete(true)}
              className={styles.deleteButton}
              aria-label="Delete board"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          <div className={styles.meta}>
            <p className={styles.categories}>
              {board.categories.length} categories
            </p>
            <p className={styles.date}>
              Created {formatDate(board.created_at)}
            </p>
          </div>

          <div className={styles.categoryList}>
            {board.categories.slice(0, 3).map((category, index) => (
              <span key={index} className={styles.categoryTag}>
                {category}
              </span>
            ))}
            {board.categories.length > 3 && (
              <span className={styles.categoryTag}>
                +{board.categories.length - 3} more
              </span>
            )}
          </div>

          <div className={styles.actions}>
            <Link href={`/board/${board.id}`} className={styles.editButton}>
              EDIT
            </Link>
            <Link href={`/play/${board.id}`} className={styles.playButton}>
              PLAY
            </Link>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowDelete(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>DELETE BOARD?</h3>
            <p className={styles.modalText}>
              Are you sure you want to delete "{board.title}"? This action
              cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={styles.confirmDelete}
              >
                {isDeleting ? "DELETING..." : "DELETE"}
              </button>
              <button
                onClick={() => setShowDelete(false)}
                disabled={isDeleting}
                className={styles.cancelDelete}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
