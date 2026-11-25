import { NextResponse } from "next/server";

const UPSTREAM = "https://api.framextv.tech";
const ALLOWED: Record<string, string[]> = { home: [], search: ["q"], details: ["id", "type"], season: ["id", "season"] };

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const endpoint = path.join("/");
  const allowedParams = ALLOWED[endpoint];
  if (!allowedParams) return NextResponse.json({ error: "FrameXTV endpoint not allowed." }, { status: 404 });
  const incoming = new URL(request.url);
  const upstream = new URL(`${UPSTREAM}/api/${endpoint}`);
  for (const key of allowedParams) {
    const value = incoming.searchParams.get(key);
    if (value !== null) {
      if (value.length > 300) return NextResponse.json({ error: "Query parameter is too long." }, { status: 400 });
      upstream.searchParams.set(key, value);
    }
  }
  const id = upstream.searchParams.get("id");
  const season = upstream.searchParams.get("season");
  if ((endpoint === "search" && !upstream.searchParams.get("q")?.trim()) ||
      (endpoint === "details" && (!id || !/^\d+$/.test(id) || !["movie", "tv"].includes(upstream.searchParams.get("type") ?? ""))) ||
      (endpoint === "season" && (!id || !/^\d+$/.test(id) || !season || !/^\d+$/.test(season)))) {
    return NextResponse.json({ error: "Required or valid FrameXTV query parameters are missing." }, { status: 400 });
  }
  try {
    const response = await fetch(upstream, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000), cache: "no-store" });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok) return NextResponse.json({ error: `FrameXTV upstream returned HTTP ${response.status}.` }, { status: response.status >= 400 && response.status < 500 ? 502 : 503 });
    if (!contentType.includes("application/json")) return NextResponse.json({ error: "FrameXTV returned an unexpected response format." }, { status: 502 });
    const body = await response.text();
    return new Response(body, { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": endpoint === "home" ? "public, max-age=60, s-maxage=120" : "public, max-age=30, s-maxage=60", "X-KRYORA-Provider": "FrameXTV" } });
  } catch {
    return NextResponse.json({ error: "KRYORA could not reach the FrameXTV catalogue service. Please try again shortly." }, { status: 502 });
  }
}
