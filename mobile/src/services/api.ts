import { supabase } from "./supabase";
export async function request(path: string, body?: unknown): Promise<unknown> {
  const { data } = await supabase!.auth.getSession();
  const token = data.session?.access_token;
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "")}${path}`,
    {
      method: body ? "POST" : "GET",
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Please try again");
  return result;
}
