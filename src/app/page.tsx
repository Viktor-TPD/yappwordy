import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const { userId } = await auth();

  // Redirect authenticated users to dashboard
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "4rem",
          color: "var(--jeopardy-gold)",
          marginBottom: "1rem",
          textShadow: "0 0 20px rgba(255, 204, 0, 0.5)",
        }}
      >
        JEOPARDY
      </h1>

      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "1.2rem",
          color: "var(--text-secondary)",
          marginBottom: "3rem",
          maxWidth: "600px",
        }}
      >
        Create custom Jeopardy games and control them from your phone in
        real-time.
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <Link
          href="/sign-up"
          style={{
            padding: "1rem 2rem",
            background: "var(--jeopardy-gold)",
            color: "var(--jeopardy-dark-blue)",
            fontFamily: "var(--font-display)",
            fontSize: "1.3rem",
            fontWeight: "bold",
            borderRadius: "8px",
            textDecoration: "none",
            transition: "transform 0.2s",
          }}
        >
          GET STARTED
        </Link>

        <Link
          href="/sign-in"
          style={{
            padding: "1rem 2rem",
            border: "2px solid var(--jeopardy-gold)",
            color: "var(--jeopardy-gold)",
            fontFamily: "var(--font-display)",
            fontSize: "1.3rem",
            fontWeight: "bold",
            borderRadius: "8px",
            textDecoration: "none",
            background: "transparent",
            transition: "all 0.2s",
          }}
        >
          SIGN IN
        </Link>
      </div>

      <p
        style={{
          marginTop: "3rem",
          fontSize: "0.9rem",
          color: "var(--text-muted)",
        }}
      >
        Built with Next.js • Clerk • Supabase
      </p>
    </main>
  );
}
