import { NextRequest, NextResponse } from "next/server";
import { movieboxGet, MovieBoxServiceError } from "../../../../src/lib/moviebox/server";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  const parts = request.nextUrl.pathname.split("/").filter(Boolean).slice(2);
  const [resource, id] = parts;
  const query = request.nextUrl.searchParams;
  let path: string;
  const params = new URLSearchParams();

  if (parts.length === 1 && ["home", "movies", "tv-series"].includes(resource)) {
    path = resource;
    if (resource !== "home") {
      const page = query.get("page") ?? "1";
      if (!/^\d{1,4}$/.test(page) || Number(page) < 1) {
        return NextResponse.json({ error: "Invalid page number." }, { status: 400, headers: noStore });
      }
      params.set("page", page);
    }
  } else if (parts.length === 1 && resource === "search") {
    const q = (query.get("q") ?? "").trim();
    if (!q || q.length > 120) return NextResponse.json({ error: "Enter a search term (up to 120 characters)." }, { status: 400, headers: noStore });
    path = "search";
    params.set("q", q);
    const page = query.get("page") ?? "1";
    if (!/^\d{1,4}$/.test(page) || Number(page) < 1) return NextResponse.json({ error: "Invalid page number." }, { status: 400, headers: noStore });
    params.set("page", page);
  } else if (parts.length === 2 && ["detail", "episodes"].includes(resource) && id && /^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    path = `${resource}/${id}`;
  } else {
    return NextResponse.json({ error: "Unsupported MovieBox catalogue route." }, { status: 404, headers: noStore });
  }

  try {
    const data = await movieboxGet(path, params);
    return NextResponse.json(data, { headers: noStore });
  } catch (error) {
    const status = error instanceof MovieBoxServiceError ? error.status : 502;
    const message = error instanceof Error ? error.message : "MovieBox service unavailable.";
    return NextResponse.json({ error: message }, { status, headers: noStore });
  }
}
