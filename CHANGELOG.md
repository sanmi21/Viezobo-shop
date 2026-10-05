# Changelog

## Unreleased

- Added a manually triggered GitHub Actions workflow for a downloadable debug APK, without installing Android Studio locally. Uses three public mobile configuration variables; native cloud build and phone testing are initially unverified.

- Added a React/Capacitor Android client using the website's product, cart and order APIs.
- Added bearer-token authentication alongside website cookies for shared endpoints.
- Replaced signed-in browser-only carts with customer-owned Supabase carts, atomic operations and Realtime subscriptions. Signed-out carts remain local and merge on sign-in.
- Added Android PKCE callback handling and Keystore-encrypted session storage.
- Requires the additive `supabase/mobile-cart.sql` migration, a Supabase native redirect entry, and website redeployment. APK/phone testing remains pending; see `docs/MOBILE.md`.
