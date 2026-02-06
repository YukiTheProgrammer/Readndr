import { searchPapers } from "@/lib/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) {
    return Response.json({ error: "Missing query parameter" }, { status: 400 });
  }

  try {
    const results = await searchPapers(q);
    return Response.json({ results });
  } catch (error) {
    console.error("Search failed:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
