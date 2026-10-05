import { createClient } from "@supabase/supabase-js";
import { Capacitor, registerPlugin } from "@capacitor/core";
interface Vault {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
}
const vault = registerPlugin<Vault>("SessionVault");
const storage = {
  async getItem(key: string) {
    return Capacitor.isNativePlatform()
      ? (await vault.get({ key })).value
      : localStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    if (Capacitor.isNativePlatform()) await vault.set({ key, value });
    else localStorage.setItem(key, value);
  },
  async removeItem(key: string) {
    if (Capacitor.isNativePlatform()) await vault.remove({ key });
    else localStorage.removeItem(key);
  },
};
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured = Boolean(
  url && key && import.meta.env.VITE_API_BASE_URL,
);
export const supabase = configured
  ? createClient(url, key, {
      auth: {
        storage,
        flowType: "pkce",
        detectSessionInUrl: !Capacitor.isNativePlatform(),
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
