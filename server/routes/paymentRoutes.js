import express from "express";
import Stripe from "stripe";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const stripe = new Stripe("sk_test_51SafMe4uUluNRMATQsV9RaT4e8147AoLf45c4z5JGmCZDVZqm7rfQ9pWAJbqG6UL9ioFNxFRfaZNrd17Ubk7U9Kw00CCUwMU2P"); // sk_test_xxx

// Create Payment Intent
app.post("/create-payment-intent", async (req, res) => {
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: 12000,     // 120 SEK → amount in öre
            currency: "BDT",
            automatic_payment_methods: { enabled: true },
        });

        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (err) {
        res.status(400).send({ error: err.message });
    }
});

app.get("/payment-status", async (req, res) => {
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
    res.send({
        status: session.status,
        customer_email: session.customer_details.email
    });
});

app.listen(4242, () => console.log("Server running on port 4242"));
