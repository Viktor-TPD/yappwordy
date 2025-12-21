import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: session, error } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.user_id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
