import { auth, currentUser } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export default async function TestPage() {
  // Test 1: Clerk Authentication
  const { userId } = await auth();
  const user = await currentUser();

  // Test 2: Supabase Connection
  let supabaseStatus = "Not tested";
  let boardCount = 0;

  try {
    const { data, error } = await supabase
      .from("boards")
      .select("id", { count: "exact", head: true });

    if (error) {
      supabaseStatus = `Error: ${error.message}`;
    } else {
      supabaseStatus = "Connected ✅";
      boardCount = data?.length || 0;
    }
  } catch (err: any) {
    supabaseStatus = `Error: ${err.message}`;
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          color: "var(--jeopardy-gold)",
          fontSize: "3rem",
          marginBottom: "2rem",
        }}
      >
        🧪 System Test
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* Test 1: Clerk */}
        <section
          style={{
            background: "var(--bg-secondary)",
            padding: "1.5rem",
            borderRadius: "8px",
            border: "2px solid var(--border-color)",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--jeopardy-gold)",
              marginBottom: "1rem",
            }}
          >
            1. Clerk Authentication
          </h2>
          <div style={{ fontSize: "1rem", lineHeight: "1.8" }}>
            <p>
              <strong>Status:</strong>{" "}
              {userId ? "✅ Authenticated" : "❌ Not authenticated"}
            </p>
            {userId && (
              <>
                <p>
                  <strong>User ID:</strong> {userId}
                </p>
                <p>
                  <strong>Email:</strong>{" "}
                  {user?.emailAddresses[0]?.emailAddress || "N/A"}
                </p>
                <p>
                  <strong>Name:</strong> {user?.firstName || "N/A"}{" "}
                  {user?.lastName || ""}
                </p>
              </>
            )}
            {!userId && (
              <p
                style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}
              >
                Please sign in to test authentication. Go to{" "}
                <a href="/sign-in" style={{ color: "var(--jeopardy-gold)" }}>
                  /sign-in
                </a>
              </p>
            )}
          </div>
        </section>

        {/* Test 2: Supabase */}
        <section
          style={{
            background: "var(--bg-secondary)",
            padding: "1.5rem",
            borderRadius: "8px",
            border: "2px solid var(--border-color)",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--jeopardy-gold)",
              marginBottom: "1rem",
            }}
          >
            2. Supabase Database
          </h2>
          <div style={{ fontSize: "1rem", lineHeight: "1.8" }}>
            <p>
              <strong>Status:</strong> {supabaseStatus}
            </p>
            <p>
              <strong>Boards table:</strong>{" "}
              {supabaseStatus.includes("✅")
                ? `Accessible (${boardCount} boards)`
                : "Not accessible"}
            </p>
            {!supabaseStatus.includes("✅") && (
              <p
                style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}
              >
                Check your .env.local file and make sure you ran the SQL schema
                in Supabase.
              </p>
            )}
          </div>
        </section>

        {/* Test 3: Styles */}
        <section
          style={{
            background: "var(--bg-secondary)",
            padding: "1.5rem",
            borderRadius: "8px",
            border: "2px solid var(--border-color)",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--jeopardy-gold)",
              marginBottom: "1rem",
            }}
          >
            3. Global Styles
          </h2>
          <div style={{ fontSize: "1rem", lineHeight: "1.8" }}>
            <p>
              <strong>CSS Variables:</strong> ✅ Working
            </p>
            <p>
              <strong>Display Font (Oswald):</strong>{" "}
              <span style={{ fontFamily: "var(--font-display)" }}>
                JEOPARDY
              </span>
            </p>
            <p>
              <strong>Body Font (Libre Baskerville):</strong>{" "}
              <span style={{ fontFamily: "var(--font-body)" }}>
                This is body text
              </span>
            </p>
            <div
              style={{
                marginTop: "1rem",
                padding: "1rem",
                background: "var(--jeopardy-blue)",
                border: "3px solid var(--jeopardy-gold)",
                borderRadius: "4px",
                textAlign: "center",
                fontFamily: "var(--font-display)",
                fontSize: "1.5rem",
                color: "var(--jeopardy-gold)",
              }}
            >
              SAMPLE JEOPARDY TILE
            </div>
          </div>
        </section>

        {/* Test 4: Environment Variables */}
        <section
          style={{
            background: "var(--bg-secondary)",
            padding: "1.5rem",
            borderRadius: "8px",
            border: "2px solid var(--border-color)",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--jeopardy-gold)",
              marginBottom: "1rem",
            }}
          >
            4. Environment Variables
          </h2>
          <div style={{ fontSize: "1rem", lineHeight: "1.8" }}>
            <p>
              <strong>Clerk Publishable Key:</strong>{" "}
              {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
                ? "✅ Set"
                : "❌ Missing"}
            </p>
            <p>
              <strong>Clerk Secret Key:</strong>{" "}
              {process.env.CLERK_SECRET_KEY ? "✅ Set" : "❌ Missing"}
            </p>
            <p>
              <strong>Supabase URL:</strong>{" "}
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing"}
            </p>
            <p>
              <strong>Supabase Anon Key:</strong>{" "}
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                ? "✅ Set"
                : "❌ Missing"}
            </p>
          </div>
        </section>

        {/* Navigation */}
        <section
          style={{
            padding: "1.5rem",
            textAlign: "center",
          }}
        >
          <p style={{ marginBottom: "1rem" }}>
            {userId ? (
              <>You're authenticated! Tests complete.</>
            ) : (
              <>
                Go to{" "}
                <a href="/sign-in" style={{ color: "var(--jeopardy-gold)" }}>
                  /sign-in
                </a>{" "}
                to test authentication
              </>
            )}
          </p>
          <a
            href="/"
            style={{
              display: "inline-block",
              padding: "0.75rem 2rem",
              background: "var(--jeopardy-gold)",
              color: "var(--jeopardy-dark-blue)",
              fontFamily: "var(--font-display)",
              fontSize: "1.2rem",
              fontWeight: "bold",
              borderRadius: "4px",
              textDecoration: "none",
            }}
          >
            BACK TO HOME
          </a>
        </section>
      </div>
    </main>
  );
}
