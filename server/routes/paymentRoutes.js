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

router.post("/create-checkout-session", async (req, res) => {
  try {
    if (!stripeSecret) {
      return res.status(500).json({ message: "Stripe secret key not configured" });
    }

    const { amount, currency, description } = req.body || {};
    const majorAmount = Number(amount);
    const curr = (currency || "bdt").toLowerCase();
    if (!majorAmount || !Number.isFinite(majorAmount) || majorAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const unitAmount = Math.max(8000, Math.round(majorAmount * 100));
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: curr,
            product_data: { name: description || "Parking Spot Booking" },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      success_url: `${clientUrl}/my-bookings?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/book-spot?checkout=cancelled`,
    });

    res.json({ url: session.url, id: session.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
