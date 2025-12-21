import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getBoard, getQuestions, createGameSession } from "@/lib/database";
import { PresentationView } from "@/components/PresentationView";

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
  const session = await createGameSession(params.id, userId);

  if (!session) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "2rem",
              color: "var(--jeopardy-gold)",
              marginBottom: "1rem",
            }}
          >
            Failed to create game session
          </h1>
          <a href="/dashboard" style={{ color: "var(--text-secondary)" }}>
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <PresentationView board={board} questions={questions} session={session} />
  );
}
