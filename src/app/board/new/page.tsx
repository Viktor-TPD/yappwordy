import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BoardBuilder } from "@/components/BoardBuilder";

export default async function NewBoardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

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
          CREATE NEW BOARD
        </h1>
        <BoardBuilder userId={userId} />
      </div>
    </div>
  );
}
