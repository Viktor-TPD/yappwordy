import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sessionId, round, contestants } = await request.json();

    // Update game_settings in database
    const { data: session, error: fetchError } = await supabase
      .from("game_sessions")
      .select("game_settings, user_id")
      .eq("id", sessionId)
      .single();

    if (fetchError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.user_id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update settings with new round and contestants
    const updatedSettings = {
      ...session.game_settings,
      current_round: round,
      contestants: contestants || session.game_settings.contestants,
    };

    const { error: updateError } = await supabase
      .from("game_sessions")
      .update({ game_settings: updatedSettings })
      .eq("id", sessionId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, game_settings: updatedSettings });
  } catch (error) {
    console.error("Error updating round:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
