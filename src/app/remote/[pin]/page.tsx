import { redirect } from "next/navigation";
import { getGameSession, getBoard, getQuestions } from "@/lib/database";
import { RemoteControl } from "@/components/RemoteControl";

export default async function RemotePage({
  params,
}: {
  params: { pin: string };
}) {
  // No auth check - PIN is the security token!
  const session = await getGameSession(params.pin);

  if (!session) {
    // Invalid PIN - redirect to home
    redirect("/");
  }

  const board = await getBoard(session.board_id);
  const questions = await getQuestions(session.board_id);

  if (!board) {
    redirect("/");
  }

  const hasSecondRound = Boolean(session.second_board_id);

  return (
    <RemoteControl
      session={session}
      board={board}
      questions={questions}
      hasSecondRound={hasSecondRound}
    />
  );
}
