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
  if (!userId) redirect("/sign-in");

  const session = await getGameSession(params.pin);
  if (!session) redirect("/dashboard");

  const board = await getBoard(session.board_id);
  const questions = await getQuestions(session.board_id);
  if (!board) redirect("/dashboard");

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
