# How to Get Your Stripe API Keys (Step-by-Step)

## Quick Steps:

### 1. Go to Stripe Dashboard
Open: https://dashboard.stripe.com/test/apikeys

### 2. Sign Up or Log In
- If you don't have an account, click "Sign up" (it's free)
- If you have an account, click "Log in"
- You can use your Google account to sign up quickly

### 3. Make Sure You're in Test Mode
- Look at the top right of the Stripe dashboard
- You should see a toggle that says "Test mode" - make sure it's ON (blue/green)
- If it says "Live mode", click it to switch to Test mode

### 4. Get Your Publishable Key
- On the API keys page, you'll see "Publishable key"
- It starts with `pk_test_...`
- Click the "Copy" button or select and copy the entire key
- This is what goes in `client/.env`

### 5. Get Your Secret Key
- On the same page, you'll see "Secret key"
- It starts with `sk_test_...`
- Click "Reveal test key" button
- Click the "Copy" button or select and copy the entire key
- This is what goes in `server/.env`
- ⚠️ Keep this secret! Never share it publicly.

### 6. Update Your .env Files

**Edit `client/.env`:**
```
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_51... (paste your actual key here)
```

**Edit `server/.env`:**
```
STRIPE_SECRET_KEY=sk_test_51... (paste your actual key here)
```

### 7. Restart Your Servers
- Stop both client and server (press Ctrl+C in each terminal)
- Start client: `cd client && npm start`
- Start server: `cd server && npm start`

## That's It!

After restarting, the payment method page should work. You can test with:
- Card: 4242 4242 4242 4242
- Expiry: 12/34
- CVC: 123

## Need Help?

- Stripe Support: https://support.stripe.com
- Stripe Documentation: https://stripe.com/docs

