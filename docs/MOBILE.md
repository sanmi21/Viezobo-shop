# Android app and shared cart

The shared cart, API changes, mobile frontend and Android project are implemented in source. Website and mobile production builds and isolated PostgreSQL cart tests have passed. The live migration, mobile OAuth, native Java build and physical-phone test are not yet verified.

## Shared backend

Run `supabase/mobile-cart.sql` after the original `setup.sql`. This additive migration creates customer-owned carts, idempotent cart mutations, and enables Realtime for `carts`. It does not reseed products. Read policies restrict each user to their own cart. Only `mutate_cart` can write cart records; it takes the user identity from `auth.uid()`, validates products/quantities and locks the cart row during each operation.

Signed-out website carts remain local. On sign-in, their contents merge into the account cart once using a persistent operation ID. Signed-in clients fetch shared cart contents and listen to filtered Realtime notifications. Focus/online recovery and a 10-second fallback fetch recover missed notifications. Updates require connectivity; failed writes show an error rather than claiming to be saved. Retry IDs prevent double application of the same mutation. Concurrent absolute quantity edits are last-write-wins.

## Shared APIs

Website requests use session cookies. Mobile requests use `Authorization: Bearer <Supabase access token>`. Supabase validates the token; no client-supplied user ID is trusted. Native WebView origins and the local Vite development origin have CORS access. Private responses are not cached.

| Method/route | Contract |
| --- | --- |
| GET `/api/products` | Public `{products:[...]}` using database records |
| GET `/api/cart` | Authenticated `{cart:[{product,quantity}],revision}` |
| POST `/api/cart` | Authenticated mutation; returns current cart and revision |
| GET `/api/checkout` | Authenticated `{deliveryFee}` |
| POST `/api/orders` | Existing checkout contract; cookies or mobile bearer token |

Example cart body: `{"operationId":"11111111-1111-4111-8111-111111111111","action":"add","productId":"a9a84059-8927-4a66-aafe-58dc49589f01","quantity":1}`. Actions: `add`, `set`, `remove`, `clear`, `merge`. Merge accepts `items:[{productId,quantity}]`. Use a new operation ID for each distinct action and reuse it on retries. Quantity is limited to 50 and the cart to 20 products. Missing sessions return 401; invalid mutations 400; missing migration/configuration 503. CORS preflight uses OPTIONS.

The mobile app and website share the cart provider under `shared/`. Database prices remain authoritative for orders. Mobile and web sessions are separate but identify the same Supabase account. Mailgun secrets remain on Vercel.

## Mobile structure and editing

`mobile/src/screens/` contains Shop, Cart and Checkout; `App.tsx` arranges navigation, account and success screens. `components/ui.tsx` contains common buttons, messages and money formatting. `services/api.ts` supplies one API transport, `services/auth.ts` handles Google OAuth/deep links, and `services/supabase.ts` configures the session. Change `theme.css` for colours, spacing and typography. `shared/cart-context.tsx` supplies the same cart behaviour to both applications; change screens/components without changing it when redesigning.

## Configuration

From `mobile/`, install with `npm install`. Copy `.env.example` to `.env.local` only if the latter does not exist. Set:

- `VITE_API_BASE_URL`: deployed Next.js origin, e.g. `https://viezobo-shop.vercel.app`.
- `VITE_SUPABASE_URL`: the same project as the website.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: the public publishable/anon key, never a service-role key.

These values are compiled into the app. Do not put Mailgun keys or Google client secrets in mobile variables. Rebuild after changing them.

Add `com.viezobo.shop://auth/callback` to Supabase Auth's redirect allow list. Keep the existing Google → Supabase callback and website callbacks. OAuth opens through the device browser; the Android manifest returns the callback to the app, which exchanges its PKCE code for a session. The native `SessionVault` plugin encrypts session and PKCE storage with an Android Keystore AES-GCM key. Android backup is disabled. The web preview uses localStorage instead. Do not test Google login inside an embedded WebView.

The backend accepts the app's `https://localhost` origin, `capacitor://localhost`, and Vite's `http://localhost:5173`. A preview opened through a LAN IP needs an explicit additional allowed origin; do not enable unrestricted origins to work around this.

## Build and verification

Requirements: Node.js 22+, Android Studio 2025.2.1 or newer, its bundled JDK, Android SDK platform 36 and required build tools. Accept SDK licenses through the setup wizard. Java and the SDK were absent at the initial environment check.

Run in `mobile/`:

```powershell
npm run test:cart
npm run build
npm run android:sync
npm run android:open
```

`test:cart` uses a disposable PGlite database. It checks retries/merge idempotency, mutation rollback, direct-write denial and customer isolation. It does not connect to live Supabase or validate Realtime transport.

The Android project is already generated. Open `mobile/android` in Android Studio and let Gradle sync finish. Build a debug APK using the IDE or, with the JDK and SDK available, run from `mobile/android`:

```powershell
.\gradlew.bat assembleDebug
```

The expected output is `app/build/outputs/apk/debug/app-debug.apk`. A debug APK is automatically signed for testing. It is not a Play Store release artifact. For a release, use Android Studio's Generate Signed Bundle/APK workflow and keep your signing key outside Git.

## Live rollout

### Apply the Supabase changes

Open the Supabase project already used by the website. In **SQL Editor**, create a new query, paste the complete contents of `supabase/mobile-cart.sql`, and select **Run**. Use this additive migration, not `setup.sql`, which contains the original product setup. After a successful run, refresh **Table Editor** and check that `carts` and `cart_operations` exist. An empty table is expected before customers sign in and change their carts. If the query fails, retain the exact error and resolve it before continuing; do not delete existing tables.

In **Authentication → URL Configuration**, add `com.viezobo.shop://auth/callback` under **Redirect URLs** and save. Preserve the existing website URLs. This is the app's return address after Supabase login; it does not replace Google's redirect URI in Google Cloud Console. These steps configure the backend but do not by themselves deploy the new API routes or prove phone login works.

1. Apply `supabase/mobile-cart.sql` in Supabase SQL Editor. Confirm `carts` is included in the Realtime publication.
2. Add the native callback to Supabase's redirect allow list.
3. Deploy the updated Next.js source to the existing Vercel project. Existing environment variables stay the same.
4. Rebuild/sync the app with its configured backend URL and public Supabase settings.
5. Install the APK on the physical phone; enable USB debugging and approve the computer if using ADB.

## Required phone demonstration

Sign in on the website and the phone using the same Google account. Add a website drink while the phone's cart is open: it should appear without refreshing. Repeat quantity changes and removal in both directions. Reopen the app and confirm session/cart persistence. Sign in as a second account to check cart separation. Finally place one real test order and check the saved records and Mailgun email. Record the actual phone and website together for submission evidence.

If changes arrive only after about 10 seconds, the fallback fetch is working but Realtime is not: check the publication, connection and ownership policy. Do not describe that result as instant synchronisation. Google failures require checking the redirect allow list and test-user audience. A `SessionVault` error requires checking plugin registration/native build; it cannot be repaired by exposing tokens in logs.

## Remaining limitations

No Play Store publication, payment verification or order-history UI. Cart writes need connectivity. The database applies each operation once, but changing absolute quantities from both devices is last-write-wins. Clearing the cart after an order currently clears the current shared selection, including items added on another device during checkout. Orders still lack request-level idempotency, so inspect existing records before retrying after a lost response. Cart-operation IDs are retained in the database for deduplication; a retention policy can be added later.
