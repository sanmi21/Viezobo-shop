import { z } from "zod";
import { apiClient } from "@/lib/api-auth";
import { json, preflight } from "@/lib/api-response";

import { sendOrderConfirmation } from "@/lib/mailgun";
import { hasSupabaseEnv } from "@/lib/supabase/config";
export const OPTIONS = preflight;

const orderSchema = z.object({
  customerName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(30),
  deliveryAddress: z.string().trim().min(8).max(300),
  deliveryArea: z.string().trim().min(2).max(100),
  paymentMethod: z.literal("Bank Transfer"),
  notes: z.string().trim().max(500).optional().default(""),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(50),
      }),
    )
    .min(1)
    .max(20),
});

const resultSchema = z.object({
  reference: z.string(),
  subtotal: z.number(),
  delivery_fee: z.number(),
  total: z.number(),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      unit_price: z.number(),
    }),
  ),
});

export async function POST(request: Request) {
  const NextResponse = {
    json: (body: unknown, options?: { status: number }) =>
      json(request, body, options?.status ?? 200),
  };
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { error: "The shop database is not configured." },
      { status: 503 },
    );
  }

  let supabase;
  try {
    supabase = await apiClient(request);
  } catch {
    return NextResponse.json(
      { error: "Invalid authorization" },
      { status: 401 },
    );
  }
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json(
      { error: "Please sign in with Google before checkout." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please check your checkout details.",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const { data, error } = await supabase.rpc("create_shop_order", {
    p_customer_name: payload.customerName,
    p_email: payload.email,
    p_phone: payload.phone,
    p_delivery_address: payload.deliveryAddress,
    p_delivery_area: payload.deliveryArea,
    p_payment_method: payload.paymentMethod,
    p_notes: payload.notes || null,
    p_items: payload.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
    })),
  });

  if (error) {
    console.error("Order transaction failed:", error);
    return NextResponse.json(
      { error: "We could not place your order. Check the cart and try again." },
      { status: 400 },
    );
  }

  const result = resultSchema.safeParse(data);
  if (!result.success) {
    console.error("Unexpected order result:", result.error);
    return NextResponse.json(
      { error: "The order response was invalid." },
      { status: 500 },
    );
  }

  const emailSent = await sendOrderConfirmation({
    to: payload.email,
    customerName: payload.customerName,
    reference: result.data.reference,
    items: result.data.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
    })),
    total: result.data.total,
    deliveryAddress: payload.deliveryAddress,
    deliveryArea: payload.deliveryArea,
    paymentMethod: payload.paymentMethod,
  });

  return NextResponse.json({
    reference: result.data.reference,
    emailSent,
    total: result.data.total,
    email: payload.email,
  });
}
