import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

const stripeSecret = process.env.STRIPE_SECRET_KEY;
let stripe = null;
if (stripeSecret) {
  stripe = new Stripe(stripeSecret);
}
console.log('Stripe configured:', Boolean(stripeSecret));

router.post("/create-payment-intent", async (req, res) => {
  try {
    if (!stripeSecret) {
      return res.status(500).json({ message: "Stripe secret key not configured" });
    }

    const { amount, currency } = req.body || {};
    const minorAmount = Number(amount);
    const curr = (currency || "bdt").toLowerCase();

    if (!minorAmount || minorAmount <= 0 || !Number.isFinite(minorAmount)) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(minorAmount),
      currency: curr,
      automatic_payment_methods: { enabled: true },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
