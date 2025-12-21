import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getBoard, getQuestions } from "@/lib/database";
import { BoardBuilder } from "@/components/BoardBuilder";

export default async function EditBoardPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const board = await getBoard(params.id);

  if (!board) {
    redirect("/dashboard");
  }

  // Security: Only allow the owner to edit
  if (board.user_id !== userId) {
    redirect("/dashboard");
  }

  const questions = await getQuestions(params.id);

  return (
    <div style={{ minHeight: "100vh", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "3rem",
            color: "var(--jeopardy-gold)",
            marginBottom: "2rem",
            textShadow: "0 0 20px rgba(255, 204, 0, 0.5)",
          }}
        >
          EDIT BOARD
        </h1>
        <BoardBuilder
          userId={userId}
          existingBoard={board}
          existingQuestions={questions}
        />
      </div>
    </div>
  );
}
