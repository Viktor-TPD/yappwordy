import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getBoards } from "@/lib/database";
import { BoardCard } from "@/components/BoardCard";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import styles from "./page.module.css";

export default async function DashboardPage() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId) {
    redirect("/sign-in");
  }

  const boards = await getBoards(userId);

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.title}>MY BOARDS</h1>
            <p className={styles.subtitle}>
              Welcome back, {user?.firstName || "Player"}
            </p>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Create New Board Button */}
      <div className={styles.actionBar}>
        <Link href="/board/new" className={styles.createButton}>
          + CREATE NEW BOARD
        </Link>
      </div>

      {/* Boards Grid */}
      <div className={styles.content}>
        {boards.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎯</div>
            <h2 className={styles.emptyTitle}>No boards yet</h2>
            <p className={styles.emptyText}>
              Create your first Jeopardy board to get started
            </p>
            <Link href="/board/new" className={styles.emptyButton}>
              CREATE YOUR FIRST BOARD
            </Link>
          </div>
        ) : (
          <div className={styles.boardsGrid}>
            {boards.map((board, index) => (
              <div
                key={board.id}
                className={styles.boardCardWrapper}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <BoardCard board={board} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
