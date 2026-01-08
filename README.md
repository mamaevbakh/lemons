This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Stripe marketplace flow

### Order creation (webhook-driven)

Orders are created server-side when Stripe confirms payment:

- `app/api/stripe/checkout/route.ts` creates a Checkout Session and stores identifiers in `metadata`.
- `app/api/stripe/webhooks/route.ts` listens for `checkout.session.completed` and inserts/updates a row in `public.orders`.

**Required webhook events**

- `checkout.session.completed` (recommended)
- `checkout.session.async_payment_succeeded` (optional, for async methods)

**Idempotency**

The webhook handler is idempotent by `stripe_checkout_session_id`.
For production, add a unique constraint/index in Postgres on that column:

```sql
create unique index if not exists orders_stripe_checkout_session_id_key
	on public.orders (stripe_checkout_session_id)
	where stripe_checkout_session_id is not null;
```

We also store `stripe_payment_intent_id` when available.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
