import { apiClient } from "@/lib/api-auth";
import { json, preflight } from "@/lib/api-response";
export const OPTIONS = preflight;
export async function GET(request: Request) {
  try {
    const client = await apiClient(request);
    const { data, error } = await client.auth.getUser();
    if (error || !data.user)
      return json(request, { error: "Sign in required" }, 401);
    const fee = await client.rpc("get_delivery_fee");
    if (fee.error)
      return json(request, { error: "Delivery fee unavailable" }, 503);
    return json(request, { deliveryFee: fee.data });
  } catch {
    return json(request, { error: "Shop unavailable" }, 503);
  }
}
