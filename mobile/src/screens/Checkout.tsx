import { useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { useCart } from "../../../shared/cart-context";
import { request } from "../services/api";
import { Button, money, Notice } from "../components/ui";
export type OrderResult = {
  reference: string;
  emailSent: boolean;
  email: string;
  total: number;
};
export function Checkout({
  user,
  success,
}: {
  user: User;
  success: (result: OrderResult) => void;
}) {
  const { cart, subtotal, busy, clearCart } = useCart();
  const [fee, setFee] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    void request("/api/checkout")
      .then((data) => setFee((data as { deliveryFee: number }).deliveryFee))
      .catch((e) => setError(e.message));
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || fee === null || !cart.length) return;
    setSaving(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = (await request("/api/orders", {
        ...values,
        paymentMethod: "Bank Transfer",
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
      })) as OrderResult;
      await clearCart().catch(() => {});
      success(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Order failed");
      setSaving(false);
    }
  }
  if (!cart.length && !saving) return <Notice>Your cart is empty.</Notice>;
  return (
    <>
      <h1>Checkout</h1>
      <form className="panel form" onSubmit={submit}>
        <label>
          Name
          <input
            name="customerName"
            defaultValue={user.user_metadata.full_name ?? ""}
            required
            minLength={2}
            maxLength={100}
          />
        </label>
        <label>
          Email
          <input
            name="email"
            type="email"
            defaultValue={user.email}
            required
            maxLength={254}
          />
        </label>
        <label>
          Phone
          <input
            name="phone"
            type="tel"
            required
            minLength={7}
            maxLength={30}
          />
        </label>
        <label>
          Delivery area
          <input name="deliveryArea" required minLength={2} maxLength={100} />
        </label>
        <label>
          Address
          <textarea
            name="deliveryAddress"
            required
            minLength={8}
            maxLength={300}
          />
        </label>
        <label>
          Notes (optional)
          <textarea name="notes" maxLength={500} />
        </label>
        <p>
          Payment: Bank Transfer. Payment instructions will be confirmed
          separately.
        </p>
        {cart.map((i) => (
          <div className="total" key={i.product.id}>
            <span>
              {i.product.name} × {i.quantity}
            </span>
            <strong>{money(i.product.price * i.quantity)}</strong>
          </div>
        ))}
        <div className="total">
          <span>Delivery</span>
          <strong>{fee === null ? "Loading…" : money(fee)}</strong>
        </div>
        <div className="total">
          <span>Total</span>
          <strong>{fee === null ? "—" : money(subtotal + fee)}</strong>
        </div>
        {error && <Notice>{error}</Notice>}
        <Button disabled={saving || busy || fee === null}>
          {saving ? "Placing order…" : "Place order"}
        </Button>
      </form>
    </>
  );
}
