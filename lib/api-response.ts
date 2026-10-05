import { NextResponse } from "next/server";

const allowed = new Set([
  "https://localhost",
  "capacitor://localhost",
  "http://localhost:5173",
]);
export function corsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const headers: Record<string, string> = {
    Vary: "Origin",
    "Cache-Control": "no-store",
  };
  if (origin && allowed.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
  }
  return headers;
}
export function json(request: Request, body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders(request) });
}
export function preflight(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
