"use client";
import { useMemo, type ReactNode } from "react";
import { SharedCartProvider, useCart } from "@/shared/cart-context";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/config";
export { useCart };
async function request(path: string, body?: unknown) {
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Request failed");
  return data;
}
export function CartProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => (hasSupabaseEnv() ? createClient() : null), []);
  return (
    <SharedCartProvider client={client} request={request}>
      {children}
      <CartStatus />
    </SharedCartProvider>
  );
}
function CartStatus() {
  const { syncError } = useCart();
  return syncError ? (
    <div
      role="alert"
      className="fixed bottom-4 left-4 right-4 z-[80] rounded-xl bg-[#351522] p-4 text-sm text-white"
    >
      {syncError}
    </div>
  ) : null;
}
