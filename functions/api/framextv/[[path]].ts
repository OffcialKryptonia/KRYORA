const UPSTREAM = "https://api.framextv.tech";
const ALLOWED_ENDPOINTS = new Set(["home", "search", "details", "season"]);

type PagesContext = {
  request: Request;
  params: { path?: string | string[] };
};

export async function onRequest(context: PagesContext): Promise<Response> {
  const pathValue = context.params.path;
  const endpoint = Array.isArray(pathValue) ? pathValue.join("/") : pathValue ?? "";

  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    return Response.json({ error: "FrameXTV endpoint not allowed." }, { status: 404 });
  }

  const incoming = new URL(context.request.url);
  const upstream = new URL(`${UPSTREAM}/api/${endpoint}`);

  const allowedParams: Record<string, string[]> = {
    home: [],
    search: ["q"],
    details: ["id", "type"],
    season: ["id", "season"],
  };

  for (const key of allowedParams[endpoint]) {
    const value = incoming.searchParams.get(key);
    if (value !== null) upstream.searchParams.set(key, value);
  }

  if ((endpoint === "search" && !upstream.searchParams.get("q")) ||
      (endpoint === "details" && (!upstream.searchParams.get("id") || !upstream.searchParams.get("type"))) ||
      (endpoint === "season" && (!upstream.searchParams.get("id") || !upstream.searchParams.get("season")))) {
    return Response.json({ error: "Required FrameXTV query parameters are missing." }, { status: 400 });
  }

  try {
    const response = await fetch(upstream.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const body = await response.text();
    const contentType = response.headers.get("content-type") ?? "";

    if (!response.ok) {
      return Response.json(
        { error: `FrameXTV upstream returned HTTP ${response.status}.`, upstreamStatus: response.status },
        { status: response.status >= 400 && response.status < 500 ? 502 : 503 },
      );
    }
    if (!contentType.includes("application/json")) {
      return Response.json({ error: "FrameXTV returned an unexpected response format." }, { status: 502 });
    }

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": endpoint === "home" ? "public, max-age=60, s-maxage=120" : "public, max-age=30, s-maxage=60",
        "X-KRYORA-Provider": "FrameXTV",
      },
    });
  } catch {
    return Response.json(
      { error: "KRYORA could not reach the FrameXTV catalogue service. Please try again shortly." },
      { status: 502 },
    );
  }
}
