import { z } from "zod";
import { apiClient } from "@/lib/api-auth";
import { json, preflight } from "@/lib/api-response";
import { hasSupabaseEnv } from "@/lib/supabase/config";
export const OPTIONS = preflight;
const mutation = z.object({
  operationId: z.string().uuid(),
  action: z.enum(["add", "set", "remove", "clear", "merge"]),
  productId: z.string().uuid().optional(),
  quantity: z.number().int().min(0).max(50).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(50),
      }),
    )
    .max(20)
    .optional(),
});
async function handle(request: Request, write: boolean) {
  if (!hasSupabaseEnv())
    return json(request, { error: "Shop not configured" }, 503);
  try {
    const client = await apiClient(request);
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user)
      return json(request, { error: "Sign in required" }, 401);
    if (write) {
      const result = mutation.safeParse(await request.json());
      if (!result.success)
        return json(request, { error: "Invalid cart operation" }, 400);
      const input = result.data;
      const { error } = await client.rpc("mutate_cart", {
        p_operation_id: input.operationId,
        p_action: input.action,
        p_product_id: input.productId ?? null,
        p_quantity: input.quantity ?? 0,
        p_items: input.items ?? [],
      });
      if (error)
        return json(
          request,
          {
            error:
              "Cart update failed. Check availability and migration setup.",
          },
          400,
        );
    }
    const { data: cart, error } = await client
      .from("carts")
      .select("items,revision")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (error) return json(request, { error: "Shared cart unavailable" }, 503);
    const lines = (cart?.items ?? []) as {
      productId: string;
      quantity: number;
    }[];
    if (!lines.length)
      return json(request, { cart: [], revision: cart?.revision ?? 0 });
    const { data: products, error: productError } = await client
      .from("products")
      .select("id,name,description,size,price,image_url,stock_status")
      .in(
        "id",
        lines.map((item) => item.productId),
      );
    if (productError)
      return json(request, { error: "Cart products unavailable" }, 503);
    return json(request, {
      cart: lines.flatMap((item) => {
        const product = products?.find(
          (product) => product.id === item.productId,
        );
        return product ? [{ product, quantity: item.quantity }] : [];
      }),
      revision: cart?.revision ?? 0,
    });
  } catch {
    return json(request, { error: "Invalid request or authorization" }, 400);
  }
}
export const GET = (request: Request) => handle(request, false);
export const POST = (request: Request) => handle(request, true);
