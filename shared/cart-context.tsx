"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CartItem, Product } from "../types/shop";

export type CartMutation = {
  action: "add" | "set" | "remove" | "clear" | "merge";
  productId?: string;
  quantity?: number;
  items?: { productId: string; quantity: number }[];
  operationId?: string;
};
type CartValue = {
  cart: CartItem[];
  hydrated: boolean;
  itemCount: number;
  subtotal: number;
  syncError: string;
  busy: boolean;
  addToCart: (p: Product) => void;
  updateQuantity: (id: string, change: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => Promise<void>;
};
const Context = createContext<CartValue | null>(null);
const storageKey = "viezobo-cart-v1";
export function SharedCartProvider({
  client,
  request,
  children,
}: {
  client: SupabaseClient | null;
  request: (path: string, body?: unknown) => Promise<unknown>;
  children: ReactNode;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [syncError, setError] = useState("");
  const [pending, setPending] = useState(0);
  const user = useRef<string | null>(null);
  const current = useRef(cart);
  current.current = cart;
  const queue = useRef(Promise.resolve());
  const revision = useRef(-1);
  const active = useRef(true);
  const readGuest = () => {
    try {
      const items = JSON.parse(
        localStorage.getItem(storageKey) ?? "[]",
      ) as CartItem[];
      return Array.isArray(items)
        ? items
            .filter(
              (i) =>
                i?.product?.id &&
                Number.isInteger(i.quantity) &&
                i.quantity > 0,
            )
            .map((i) => ({ ...i, quantity: Math.min(50, i.quantity) }))
        : [];
    } catch {
      return [];
    }
  };
  async function refresh(expected: string) {
    const result = (await request("/api/cart")) as {
      cart: CartItem[];
      revision: number;
    };
    if (
      active.current &&
      user.current === expected &&
      result.revision >= revision.current
    ) {
      revision.current = result.revision;
      setCart(result.cart);
      setError("");
    }
  }
  function mutate(input: CartMutation): Promise<void> {
    const expected = user.current;
    if (!expected) return Promise.resolve();
    setPending((n) => n + 1);
    const operationId = input.operationId ?? crypto.randomUUID();
    const task = queue.current
      .catch(() => {})
      .then(async () => {
        if (user.current !== expected)
          throw new Error("Account changed; try again.");
        // One automatic retry uses the same ID; the database applies it only once.
        let result: { cart: CartItem[]; revision: number };
        try {
          result = (await request("/api/cart", {
            ...input,
            operationId,
          })) as typeof result;
        } catch {
          result = (await request("/api/cart", {
            ...input,
            operationId,
          })) as typeof result;
        }
        if (
          user.current === expected &&
          active.current &&
          result.revision >= revision.current
        ) {
          revision.current = result.revision;
          setCart(result.cart);
          setError("");
        }
      });
    queue.current = task
      .catch((error) => {
        if (active.current)
          setError(error instanceof Error ? error.message : "Cart sync failed");
      })
      .finally(() => {
        if (active.current) setPending((n) => n - 1);
      });
    return task;
  }
  useEffect(() => {
    active.current = true;
    let channel: ReturnType<SupabaseClient["channel"]> | null = null;
    let generation = 0;
    let initialized = false;
    async function connect(id: string | null) {
      if (initialized && user.current === id) return;
      initialized = true;
      const ticket = ++generation;
      if (channel && client) {
        void client.removeChannel(channel);
        channel = null;
      }
      user.current = id;
      revision.current = -1;
      setCart([]);
      setHydrated(false);
      if (!id) {
        setCart(readGuest());
        setHydrated(true);
        setError("");
        return;
      }
      try {
        const guest = readGuest();
        if (guest.length) {
          const mergeKey = `viezobo-merge-${id}`;
          let operationId = localStorage.getItem(mergeKey);
          if (!operationId) {
            operationId = crypto.randomUUID();
            localStorage.setItem(mergeKey, operationId);
          }
          await mutate({
            action: "merge",
            operationId,
            items: guest.map((i) => ({
              productId: i.product.id,
              quantity: i.quantity,
            })),
          });
          localStorage.removeItem(storageKey);
          localStorage.removeItem(mergeKey);
        }
        if (ticket !== generation || !active.current) return;
        channel = client!
          .channel(`cart-${id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "carts",
              filter: `user_id=eq.${id}`,
            },
            () => {
              void refresh(id).catch(() =>
                setError("Cart sync interrupted. Reconnecting…"),
              );
            },
          )
          .subscribe((status) => {
            if (status === "SUBSCRIBED")
              void refresh(id).catch(() => setError("Cart could not load"));
          });
        await refresh(id);
      } catch (error) {
        if (ticket === generation)
          setError(
            error instanceof Error ? error.message : "Cart could not load",
          );
      } finally {
        if (ticket === generation && active.current) setHydrated(true);
      }
    }
    const subscription = client?.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        if (active.current) void connect(session?.user.id ?? null);
      }, 0);
    });
    if (client)
      void client.auth.getSession().then(({ data }) => {
        if (active.current) void connect(data.session?.user.id ?? null);
      });
    else void connect(null);
    const recover = () => {
      if (user.current)
        void refresh(user.current).catch(() =>
          setError("Cart could not reconnect"),
        );
    };
    const timer = setInterval(recover, 10000);
    window.addEventListener("focus", recover);
    window.addEventListener("online", recover);
    return () => {
      active.current = false;
      generation++;
      clearInterval(timer);
      subscription?.data.subscription.unsubscribe();
      if (channel && client) void client.removeChannel(channel);
      window.removeEventListener("focus", recover);
      window.removeEventListener("online", recover);
    };
  }, [client, request]); // Stable clients and transports are passed by each application.
  function guestUpdate(next: CartItem[]) {
    current.current = next;
    setCart(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }
  const value = useMemo<CartValue>(
    () => ({
      cart,
      hydrated,
      syncError,
      busy: pending > 0,
      itemCount: cart.reduce((s, i) => s + i.quantity, 0),
      subtotal: cart.reduce((s, i) => s + i.quantity * i.product.price, 0),
      addToCart(product) {
        if (user.current) {
          void mutate({
            action: "add",
            productId: product.id,
            quantity: 1,
          }).catch(() => {});
          return;
        }
        const found = current.current.find((i) => i.product.id === product.id);
        guestUpdate(
          found
            ? current.current.map((i) =>
                i.product.id === product.id
                  ? { product, quantity: Math.min(50, i.quantity + 1) }
                  : i,
              )
            : [...current.current, { product, quantity: 1 }],
        );
      },
      updateQuantity(id, change) {
        const quantity = Math.max(
          0,
          Math.min(
            50,
            (current.current.find((i) => i.product.id === id)?.quantity ?? 0) +
              change,
          ),
        );
        if (user.current) {
          void mutate({ action: "set", productId: id, quantity }).catch(
            () => {},
          );
          return;
        }
        guestUpdate(
          current.current
            .map((i) => (i.product.id === id ? { ...i, quantity } : i))
            .filter((i) => i.quantity > 0),
        );
      },
      removeFromCart(id) {
        if (user.current) {
          void mutate({ action: "remove", productId: id }).catch(() => {});
          return;
        }
        guestUpdate(current.current.filter((i) => i.product.id !== id));
      },
      async clearCart() {
        if (user.current) {
          await mutate({ action: "clear" });
          return;
        }
        guestUpdate([]);
      },
    }),
    [cart, hydrated, syncError, pending],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCart() {
  const value = useContext(Context);
  if (!value) throw new Error("Cart provider missing");
  return value;
}
