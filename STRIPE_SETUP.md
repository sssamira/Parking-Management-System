# Stripe Payment Setup Guide

This guide will help you set up Stripe payment processing for the Parking Management System.

## Step 1: Get Your Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Sign in or create a free Stripe account
3. Make sure you're in **Test mode** (toggle in the top right)
4. Copy your **Publishable key** (starts with `pk_test_...`)
5. Click "Reveal test key" and copy your **Secret key** (starts with `sk_test_...`)

## Step 2: Configure Client (Frontend)

1. Create a file `client/.env` in the client directory
2. Add the following:

```env
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_PUBLISHABLE_KEY_HERE
```

3. Restart your React development server

## Step 3: Configure Server (Backend)

1. Create or update `server/.env` file
2. Add the following:

```env
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_SECRET_KEY_HERE
```

3. Restart your Node.js server

## Step 4: Test the Setup

1. Start both client and server
2. Log in as a user
3. Go to the Payment Method page
4. Try adding a test card:
   - **Card Number:** `4242 4242 4242 4242`
   - **Expiry:** Any future date (e.g., `12/34`)
   - **CVC:** Any 3 digits (e.g., `123`)
   - **ZIP:** Any 5 digits (e.g., `12345`)

## Important Notes

- **Test Mode:** Always use test keys (`pk_test_` and `sk_test_`) during development
- **Production:** When ready for production, switch to live keys (`pk_live_` and `sk_live_`)
- **Security:** Never commit your `.env` files to version control
- **Matching Keys:** The publishable and secret keys must be from the same Stripe account

## Troubleshooting

### "Invalid API Key" Error
- Make sure you copied the entire key (they're long!)
- Verify the key starts with `pk_test_` (publishable) or `sk_test_` (secret)
- Ensure there are no extra spaces or line breaks
- Restart both client and server after adding keys

### "Stripe Not Configured" Message
- Check that your `.env` files are in the correct directories (`client/.env` and `server/.env`)
- Verify the environment variable names are exactly:
  - `REACT_APP_STRIPE_PUBLISHABLE_KEY` (client)
  - `STRIPE_SECRET_KEY` (server)
- Restart your servers after creating/updating `.env` files

## More Information

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Test Cards](https://stripe.com/docs/testing#cards)
- [Stripe Dashboard](https://dashboard.stripe.com)

