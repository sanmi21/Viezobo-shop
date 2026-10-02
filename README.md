# VieZobo Shop

VieZobo is a full-stack Next.js shop MVP for a Nigerian zobo business. Products are loaded from Supabase, customers authenticate with Google, checkout runs through a transactional PostgreSQL function, and Mailgun sends the order confirmation.

## Features

- Database-backed product catalogue
- Persistent cart using React Context and `localStorage`
- Google OAuth through Supabase Auth
- Authenticated checkout with server-side validation
- Atomic order and order-item creation
- Server-authoritative pricing and delivery fee
- Mailgun HTML order confirmation
- Customer-scoped Row Level Security policies
- Responsive VieZobo storefront, checkout and success pages

## Requirements

- Node.js 20 or newer
- pnpm
- Supabase project
- Google Cloud project
- Mailgun account
- Vercel account for deployment

## Installation

```bash
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

On macOS or Linux, use `cp .env.example .env.local` instead of `Copy-Item`.

Open `http://localhost:3000`.

## Environment variables

Add these values to `.env.local` and to the Vercel project settings:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL from Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anon key from Project Settings → API |
| `MAILGUN_API_KEY` | Private Mailgun API key; server-side only |
| `MAILGUN_DOMAIN` | Mailgun sandbox or verified sending domain |
| `MAILGUN_FROM_EMAIL` | Sender, for example `VieZobo <postmaster@your-domain>` |
| `MAILGUN_API_BASE_URL` | Optional; set to `https://api.eu.mailgun.net` for an EU-region Mailgun domain |

Never prefix the Mailgun key with `NEXT_PUBLIC_`. This application does not need the Supabase service-role key.

## Supabase database setup

1. Create a Supabase project.
2. Open **SQL Editor**.
3. Copy and run the complete [`supabase/setup.sql`](supabase/setup.sql) file.
4. Confirm that `products`, `orders`, and `order_items` appear in Table Editor.
5. Confirm the three seeded products appear in `products`.

The SQL enables RLS. Products are publicly readable. Authenticated users can only read their own orders and corresponding order items. Direct client inserts are not permitted. `create_shop_order` performs validation, looks up current product prices, calculates totals, and inserts the order and its items in one database transaction.

The delivery fee is currently `1500` NGN in `public.get_delivery_fee()` inside the SQL file. Change that value before running the SQL if the business uses a different fee. Re-running the `create or replace function` statement updates it later.

## Google authentication

### Google Cloud Console

1. Create or select a Google Cloud project.
2. Open **Google Auth Platform** and configure the branding/consent screen.
3. While the app is in testing mode, add every tester under **Audience → Test users**.
4. Create an OAuth client with application type **Web application**.
5. Add the Supabase callback below as an **Authorized redirect URI**:

   ```text
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```

6. Copy the Google Client ID and Client Secret.

### Supabase Auth

1. Open **Authentication → Providers → Google**.
2. Enable Google and enter the Client ID and Client Secret.
3. Open **Authentication → URL Configuration**.
4. Set the production Site URL to the Vercel URL.
5. Add both callback URLs to the redirect allow list:

   ```text
   http://localhost:3000/auth/callback
   https://YOUR-VERCEL-DOMAIN/auth/callback
   ```

The app starts OAuth at `/auth/signin`, exchanges the returned authorization code at `/auth/callback`, and refreshes session cookies through the root Next.js proxy.

## Mailgun setup

1. Create a Mailgun account and obtain the private API key.
2. For a quick demo, open the provided sandbox domain.
3. Add the checkout email address as an authorized recipient.
4. Open the verification message and approve that recipient.
5. Set `MAILGUN_DOMAIN`, `MAILGUN_API_KEY`, and `MAILGUN_FROM_EMAIL`.

A Mailgun sandbox can only send to verified authorized recipients. To email arbitrary customers, add and verify a real sending domain in Mailgun. If Mailgun rejects an email, the database transaction remains valid and the success page explains that email delivery is pending.

## Local verification

```bash
pnpm typecheck
pnpm build
pnpm start
```

Test the complete flow with a Google test user: add a product, sign in, complete checkout, confirm the order and items in Supabase, and check the authorized Mailgun recipient inbox.

## Vercel deployment

1. Push the project to a GitHub repository.
2. Import the repository into Vercel.
3. Add all production environment variables from `.env.example`.
4. Deploy the project.
5. Add the production `/auth/callback` URL to the Supabase redirect allow list.
6. Set the production Site URL in Supabase.
7. Redeploy after changing environment variables.

Do not place secret values in Git, screenshots, client components, or variables beginning with `NEXT_PUBLIC_`.
