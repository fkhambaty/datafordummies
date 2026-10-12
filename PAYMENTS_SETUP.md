# Payments setup (Razorpay + Cloudflare Worker)

Data For Dummies uses the single FKTech live Razorpay account shared with FunBerry and Okavo. Product isolation comes from separate plan ids, a separate webhook secret, and subscription notes containing `product: datafordummies` plus the D1 user id.

## Live plans

- Weekly: ₹99, 52 charges.
- Monthly: ₹349, 12 charges.
- The retired ₹499 monthly plan must not be used.

Plan ids and the live key id are public Worker vars in `cloudflare/worker/wrangler.toml`. `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are Worker secrets. Never place either secret in HTML, JavaScript, logs, or commits.

## Checkout mode

Production defaults to:

```toml
CHECKOUT_MODE = "hosted"
```

Razorpay has not yet approved `datafordummies.in`, so hosted mode sends the customer to the Razorpay-hosted `short_url`. The profile page asks the Worker to fetch the subscription and grants Pro only for an owned `active` or `authenticated` subscription.

After Razorpay approves `datafordummies.in`, change the var to:

```toml
CHECKOUT_MODE = "modal"
```

Then deploy the Worker. Modal checkout displays `FKTech` and automatically falls back to the hosted URL for iframe blocking or website/domain-mismatch failures.

## Webhook

Register this exact URL in the Razorpay dashboard:

`https://datafordummies-api.fkhambaty.workers.dev/v1/payments/razorpay/webhook`

Select:

- `subscription.authenticated`
- `subscription.activated`
- `subscription.charged`
- `subscription.cancelled`
- `subscription.halted`
- `subscription.completed`

The webhook is backup reconciliation. Checkout confirmation and `/v1/profile` also fetch state directly from Razorpay. Webhook signatures are verified against the Data For Dummies-specific secret, and D1 event ids make retries idempotent.

## Deployment

Apply `cloudflare/d1/*.sql` migrations remotely, set secrets through stdin, and deploy from `cloudflare/worker`. Preserve the existing `RESEND_API_KEY`.

The old Supabase payment functions (`create-subscription`, `razorpay-callback`, and `razorpay-webhook`) are retired and must not be deployed or called.
