import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useCart } from "../../shared/cart-context";
import { supabase } from "./services/supabase";
import { listenForAuth, startGoogle } from "./services/auth";
import { Shop } from "./screens/Shop";
import { Cart } from "./screens/Cart";
import { Checkout, type OrderResult } from "./screens/Checkout";
import { Button, money, Notice } from "./components/ui";
type Screen = "shop" | "cart" | "account" | "checkout" | "success";
export function App() {
  const [screen, setScreen] = useState<Screen>("shop");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OrderResult | null>(null);
  const [waiting, setWaiting] = useState(false);
  const { itemCount, syncError } = useCart();
  useEffect(() => {
    let live = true;
    let dispose: (() => void) | undefined;
    void supabase!.auth
      .getSession()
      .then(({ data }) => {
        if (live) setUser(data.session?.user ?? null);
      })
      .catch((e) => setError(e.message));
    const subscription = supabase!.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setWaiting(false);
    });
    void listenForAuth(setError).then((fn) => {
      if (live) dispose = fn;
      else fn();
    });
    return () => {
      live = false;
      dispose?.();
      subscription.data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = NativeApp.addListener("backButton", () => {
      if (screen !== "shop") setScreen("shop");
      else void NativeApp.minimizeApp();
    });
    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [screen]);
  async function login() {
    setWaiting(true);
    setError("");
    try {
      await startGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setWaiting(false);
    }
  }
  return (
    <div className="app">
      <header className="header">
        <button className="brand" onClick={() => setScreen("shop")}>
          VIE
          <br />
          ZOBO
        </button>
        <span>Joy in a bottle</span>
        <button className="bag" onClick={() => setScreen("cart")}>
          Cart ({itemCount})
        </button>
      </header>
      <main>
        {error && <Notice>{error}</Notice>}
        {syncError && <Notice>{syncError}</Notice>}
        {screen === "shop" && <Shop />}
        {screen === "cart" && <Cart checkout={() => setScreen("checkout")} />}
        {(screen === "account" || screen === "checkout") && !user && (
          <section className="panel">
            <h1>Welcome to VieZobo</h1>
            <p>
              Sign in with the same Google account you use on the website. Your
              cart follows you.
            </p>
            <Button disabled={waiting} onClick={() => void login()}>
              {waiting ? "Opening Google…" : "Continue with Google"}
            </Button>
          </section>
        )}
        {screen === "account" && user && (
          <section className="panel">
            <h1>Your account</h1>
            <p>{user.user_metadata.full_name}</p>
            <p>{user.email}</p>
            <p>Cart changes sync with the website while connected.</p>
            <Button
              onClick={() => {
                void supabase!.auth.signOut().catch((e) => setError(e.message));
              }}
            >
              Sign out
            </Button>
          </section>
        )}
        {screen === "checkout" && user && (
          <Checkout
            user={user}
            success={(data) => {
              setResult(data);
              setScreen("success");
            }}
          />
        )}
        {screen === "success" && result && (
          <section className="panel success">
            <span className="check">✓</span>
            <h1>Order received!</h1>
            <strong>{result.reference}</strong>
            <p>{result.email}</p>
            <p>Order total: {money(result.total)}</p>
            <p>
              {result.emailSent
                ? "Mailgun accepted your confirmation email."
                : "Your order is saved; email delivery is pending."}
            </p>
            <Button onClick={() => setScreen("shop")}>Continue shopping</Button>
          </section>
        )}
      </main>
      <nav className="navigation" aria-label="Main navigation">
        {(["shop", "cart", "account"] as const).map((tab) => (
          <button
            className={screen === tab ? "active" : ""}
            key={tab}
            onClick={() => setScreen(tab)}
          >
            {tab === "shop"
              ? "Drinks"
              : tab === "cart"
                ? `Cart (${itemCount})`
                : "Account"}
          </button>
        ))}
      </nav>
    </div>
  );
}
