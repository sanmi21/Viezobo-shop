import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { supabase } from "./supabase";
export const callback = "com.viezobo.shop://auth/callback";
let handling = false;
async function handleUrl(url: string) {
  if (!url.startsWith(callback) || handling) return;
  handling = true;
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has("error"))
      throw new Error("Google sign-in failed");
    const code = parsed.searchParams.get("code");
    if (!code) throw new Error("Missing sign-in code");
    const { error } = await supabase!.auth.exchangeCodeForSession(code);
    if (error) throw error;
    await Browser.close().catch(() => {});
  } finally {
    handling = false;
  }
}
export async function startGoogle() {
  const { data, error } = await supabase!.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: Capacitor.isNativePlatform()
        ? callback
        : window.location.origin,
      skipBrowserRedirect: true,
    },
  });
  if (error || !data.url)
    throw error ?? new Error("Google sign-in unavailable");
  if (Capacitor.isNativePlatform()) await Browser.open({ url: data.url });
  else window.location.assign(data.url);
}
export async function listenForAuth(onError: (message: string) => void) {
  if (!Capacitor.isNativePlatform()) return () => {};
  const handle = await App.addListener("appUrlOpen", (event) => {
    void handleUrl(event.url).catch((e) => onError(e.message));
  });
  const launch = await App.getLaunchUrl();
  if (launch) void handleUrl(launch.url).catch((e) => onError(e.message));
  return () => {
    void handle.remove();
  };
}
