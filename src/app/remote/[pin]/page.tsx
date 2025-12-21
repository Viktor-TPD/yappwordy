import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getGameSession, getBoard, getQuestions } from "@/lib/database";
import { RemoteControl } from "@/components/RemoteControl";

export default async function RemotePage({
  params,
}: {
  params: { pin: string };
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect(`/sign-in?redirect=/remote/${params.pin}`);
  }

  const session = await getGameSession(params.pin);

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
            Invalid Session PIN
          </h1>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
            The session PIN "{params.pin}" was not found or has expired.
          </p>
          <a href="/dashboard" style={{ color: "var(--jeopardy-gold)" }}>
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (session.user_id !== userId) {
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
            Unauthorized
          </h1>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
            This game session belongs to another user.
          </p>
          <a href="/dashboard" style={{ color: "var(--jeopardy-gold)" }}>
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  const board = await getBoard(session.board_id);
  const questions = await getQuestions(session.board_id);

  if (!board) {
    redirect("/dashboard");
  }

  return (
    <RemoteControl session={session} board={board} questions={questions} />
  );
}
