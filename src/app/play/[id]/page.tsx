import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getBoard, getQuestions, getBoards } from "@/lib/database";
import { PlayPageClient } from "./PlayPageClient";

export default async function PlayPage({ params }: { params: { id: string } }) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const board = await getBoard(params.id);

  if (!board || board.user_id !== userId) {
    redirect("/dashboard");
  }

  const questions = await getQuestions(params.id);

  // Get all user's boards for round 2 selection
  const allBoards = await getBoards(userId);

  return (
    <PlayPageClient
      userId={userId}
      board={board}
      questions={questions}
      availableBoards={allBoards}
    />
  );
}
