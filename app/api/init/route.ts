import { initDb } from "@/lib/db";

export async function GET() {
  try {
    await initDb();
    return Response.json({ success: true, message: "Database initialized" });
  } catch (error) {
    console.error("Init error:", error);
    return Response.json(
      { error: "Failed to initialize database" },
      { status: 500 }
    );
  }
}
