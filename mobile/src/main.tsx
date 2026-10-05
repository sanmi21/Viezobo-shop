import { createRoot } from "react-dom/client";
import { SharedCartProvider } from "../../shared/cart-context";
import { supabase, configured } from "./services/supabase";
import { request } from "./services/api";
import { App } from "./App";
import "./theme.css";
createRoot(document.getElementById("root")!).render(
  configured ? (
    <SharedCartProvider client={supabase} request={request}>
      <App />
    </SharedCartProvider>
  ) : (
    <main>
      <h1>VieZobo setup required</h1>
      <p>Configure mobile/.env using mobile/.env.example, then rebuild.</p>
    </main>
  ),
);
