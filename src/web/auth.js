// Shared-token auth for the dashboard API (interim).
// The dashboard UI sends:  Authorization: Bearer <EMBED_DASHBOARD_TOKEN>
// or ?token=<EMBED_DASHBOARD_TOKEN>.

export function requireToken(req, url) {
  const expected = process.env.EMBED_DASHBOARD_TOKEN || "";
  if (!expected) {
    return {
      ok: false,
      status: 401,
      error:
        "EMBED_DASHBOARD_TOKEN is not set. Add it to .env to enable the dashboard API.",
    };
  }

  const header = req.headers["authorization"] || "";
  const fromHeader = header.startsWith("Bearer ")
    ? header.slice(7).trim()
    : "";
  const fromQuery = url.searchParams.get("token") || "";
  const provided = fromHeader || fromQuery;

  if (!provided || provided !== expected) {
    return { ok: false, status: 401, error: "Invalid or missing dashboard token." };
  }
  return { ok: true };
}
