import "server-only";

const REQUEST_TIMEOUT_MS = 8_000;
const MAX_RESPONSE_BYTES = 2_000_000;

export class MovieBoxServiceError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = "MovieBoxServiceError";
  }
}

function getConfig() {
  const rawBase = process.env.MOVIEBOX_PARTNER_API_BASE_URL;
  const token = process.env.MOVIEBOX_PARTNER_API_TOKEN;
  if (!rawBase) throw new MovieBoxServiceError("MovieBox service is not configured.", 503);

  let base: URL;
  try {
    base = new URL(rawBase);
  } catch {
    throw new MovieBoxServiceError("MovieBox service URL is invalid.", 503);
  }
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) {
    throw new MovieBoxServiceError("MovieBox service must use a clean HTTPS base URL.", 503);
  }
  return { base, token };
}

/** Calls only fixed, documented catalogue paths on the configured service host. */
export async function movieboxGet(path: string, params?: URLSearchParams): Promise<unknown> {
  const { base, token } = getConfig();
  const normalized = path.replace(/^\/+|\/+$/g, "");
  const allowed =
    normalized === "home" ||
    normalized === "movies" ||
    normalized === "tv-series" ||
    /^search$/.test(normalized) ||
    /^detail\/[A-Za-z0-9_-]{1,128}$/.test(normalized) ||
    /^episodes\/[A-Za-z0-9_-]{1,128}$/.test(normalized);
  if (!allowed) throw new MovieBoxServiceError("Unsupported MovieBox catalogue endpoint.", 404);

  const url = new URL(normalized.split("/").map(encodeURIComponent).join("/"), base.href.endsWith("/") ? base : new URL(base.href + "/"));
  if (params) for (const [key, value] of params) url.searchParams.set(key, value);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok) throw new MovieBoxServiceError(`MovieBox service returned HTTP ${response.status}.`, 502);
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_RESPONSE_BYTES) throw new MovieBoxServiceError("MovieBox response is too large.", 502);
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) {
      throw new MovieBoxServiceError("MovieBox response is too large.", 502);
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new MovieBoxServiceError("MovieBox service returned invalid JSON.", 502);
    }
  } catch (error) {
    if (error instanceof MovieBoxServiceError) throw error;
    throw new MovieBoxServiceError(error instanceof Error && error.name === "AbortError"
      ? "MovieBox service timed out."
      : "MovieBox service could not be reached.", 502);
  } finally {
    clearTimeout(timeout);
  }
}
