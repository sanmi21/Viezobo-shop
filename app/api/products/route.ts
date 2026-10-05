import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { json, preflight } from "@/lib/api-response";
export const OPTIONS = preflight;
export async function GET(request: Request) {
  if (!hasSupabaseEnv())
    return json(request, { error: "Shop not configured" }, 503);
  const client = await createClient();
  const { data, error } = await client
    .from("products")
    .select("id,name,description,size,price,image_url,stock_status")
    .order("created_at");
  return error
    ? json(request, { error: "Products unavailable" }, 503)
    : json(request, { products: data });
}
