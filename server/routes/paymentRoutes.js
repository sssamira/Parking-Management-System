import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import SSLCommerzPayment from "sslcommerz-lts";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import Booking from "../models/Booking.js";
import Fine from "../models/Fine.js";

dotenv.config();

const router = express.Router();

const useSSL =
  (process.env.PAYMENT_GATEWAY || "").toLowerCase() === "sslcommerz" ||
  Boolean(process.env.SSLCOMMERZ_STORE_ID && process.env.SSLCOMMERZ_STORE_PASSWD);

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = !useSSL && stripeSecret ? new Stripe(stripeSecret) : null;

const extractUserId = async (req) => {
  try {
    const auth = req.headers.authorization || "";
    if (auth.startsWith("Bearer ")) {
      const token = auth.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded?.id) {
        const user = await User.findById(decoded.id).select("_id");
        if (user) return user._id;
      }
    }
  } catch (_) {}
  return null;
};

router.post("/create-checkout-session", async (req, res) => {
  const { amount, currency, description, bookingId, fineId } = req.body || {};
  const majorAmount = Number(amount);
  const curr = (currency || "bdt").toUpperCase();
  if (!majorAmount || !Number.isFinite(majorAmount) || majorAmount <= 0) {
    return res.status(400).json({ message: "Invalid amount" });
  }
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const userId = await extractUserId(req);

  if (useSSL) {
    try {
      const store_id = process.env.SSLCOMMERZ_STORE_ID;
      const store_passwd = process.env.SSLCOMMERZ_STORE_PASSWD;
      const is_live = process.env.SSLCOMMERZ_LIVE === "true";

      const sslcommerz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      
      const tran_id = `tran_${Date.now()}`;
      const serverBase = process.env.SERVER_URL || req.protocol + "://" + req.get("host");
      
      const payload = {
        total_amount: Math.round(majorAmount),
        currency: curr,
        tran_id,
        success_url: `${serverBase}/api/payment/ssl-success`,
        fail_url: `${serverBase}/api/payment/ssl-fail`,
        cancel_url: `${serverBase}/api/payment/ssl-cancel`,
        ipn_url: `${serverBase}/api/payment/ssl-ipn`,
        shipping_method: "NO",
        product_name: description || "Parking Spot Booking",
        product_category: "Parking",
        product_profile: "general",
        cus_name: "Customer",
        cus_email: "customer@example.com",
        cus_add1: "Dhaka",
        cus_city: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: "01700000000",
        value_a: bookingId || "",
        value_b: fineId || "",
        value_c: clientUrl, // Pass client URL as value_c for redirection
      };

      const apiResponse = await sslcommerz.init(payload);

      try {
        await Transaction.create({
          gateway: "sslcommerz",
          status: "pending",
          amount: Math.round(majorAmount),
          currency: curr,
          description: description || "Parking Spot Booking",
          user: userId || undefined,
          bookingId: bookingId || undefined,
          fineId: fineId || undefined,
          tran_id: tran_id,
          sessionkey: apiResponse?.sessionkey || null,
        });

        // Create initial pending booking if bookingId is not present but it is a new booking request
        if (!bookingId && !fineId) {
             // We can't easily create a booking here without more info.
             // The frontend should ideally create a pending booking FIRST, then pass the bookingId here.
             // However, for now, we rely on the transaction to track it.
        }

      } catch (dbErr) {
        console.error("Transaction create error:", dbErr);
      }

      if (apiResponse?.GatewayPageURL) {
        return res.json({ url: apiResponse.GatewayPageURL, tran_id });
      } else {
        return res.status(400).json({ message: "Failed to initiate SSLCOMMERZ payment", data: apiResponse });
      }
    } catch (err) {
      console.error("SSLCommerz init error:", err);
      return res.status(500).json({ error: err.message || "Payment initiation failed" });
    }
  }

  if (!stripeSecret || !stripe) {
    return res.status(500).json({ message: "Stripe secret key not configured" });
  }
  try {
    const unitAmount = Math.max(8000, Math.round(majorAmount * 100));
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: curr.toLowerCase(),
            product_data: { name: description || "Parking Spot Booking" },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      success_url: `${clientUrl}/my-bookings?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/book-spot?checkout=cancelled`,
    });
    return res.json({ url: session.url, id: session.id });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.post("/ssl-success", async (req, res) => {
  const body = req.body || {};
  const tran_id = body.tran_id || null;
  const clientUrl = body.value_c || process.env.CLIENT_URL || "http://localhost:3000";
  
  let redirect = `${clientUrl}/my-bookings?checkout=success`;

  if (tran_id) {
    try {
      const transaction = await Transaction.findOneAndUpdate(
        { tran_id, gateway: "sslcommerz" },
        {
          status: "success",
          val_id: body.val_id || null,
          card_type: body.card_type || null,
          bank_tran_id: body.bank_tran_id || null,
          store_amount: body.store_amount || null,
          currency_type: body.currency_type || null,
          risk_title: body.risk_title || null,
          risk_level: body.risk_level || null,
          rawSuccessPayload: body,
        },
        { new: true }
      );

      if (transaction) {
        if (transaction.bookingId) {
          // Find the booking first to get its current status
          const currentBooking = await Booking.findById(transaction.bookingId);
          
          let updateData = {
            paymentStatus: 'paid',
            chargedAt: new Date(),
            chargedAmount: transaction.amount,
            paymentMethod: 'sslcommerz',
            paymentIntentId: transaction.tran_id
          };

          // If the booking was pending (waiting for payment), we can auto-approve it or mark it as booked
          // depending on your business logic. 
          // If the user booked a specific spot, we can mark it as 'approved' or 'booked'.
          // If it was a general search query converted to booking, we might need to be careful.
          
          if (currentBooking) {
            let statusToSet = currentBooking.status;
            
            // Only auto-approve if it's currently pending and has a spot assigned
            if (currentBooking.status === 'pending' && currentBooking.parkingSpot) {
               statusToSet = 'approved'; 
            }

            updateData.status = statusToSet;
            
            await Booking.findByIdAndUpdate(transaction.bookingId, updateData);
          }
          
          // Redirect to my bookings to show the paid booking
          redirect = `${clientUrl}/my-bookings?checkout=success`;
        }
        if (transaction.fineId) {
          await Fine.findByIdAndUpdate(transaction.fineId, {
            isPaid: true,
            status: 'paid',
            paidAt: new Date(),
            paymentStatus: 'completed',
            paymentMethod: 'sslcommerz',
            transactionId: transaction.tran_id
          });
          // Redirect to user fines page
          redirect = `${clientUrl}/user-fines?checkout=success`;
        }
      }
    } catch (_) {}
  }
  res.redirect(302, redirect);
});

router.post("/ssl-fail", async (req, res) => {
  const body = req.body || {};
  const tran_id = body.tran_id || null;
  const clientUrl = body.value_c || process.env.CLIENT_URL || "http://localhost:3000";
  const redirect = `${clientUrl}/book-spot?checkout=failed`;

  if (tran_id) {
    try {
      await Transaction.findOneAndUpdate(
        { tran_id, gateway: "sslcommerz" },
        {
          status: "failed",
          val_id: body.val_id || null,
          card_type: body.card_type || null,
          bank_tran_id: body.bank_tran_id || null,
          rawSuccessPayload: body,
        },
        { new: true }
      );
    } catch (_) {}
  }
  res.redirect(302, redirect);
});

router.post("/ssl-cancel", async (req, res) => {
  const body = req.body || {};
  const tran_id = body.tran_id || null;
  const clientUrl = body.value_c || process.env.CLIENT_URL || "http://localhost:3000";
  const redirect = `${clientUrl}/book-spot?checkout=cancelled`;

  if (tran_id) {
    try {
      await Transaction.findOneAndUpdate(
        { tran_id, gateway: "sslcommerz" },
        {
          status: "cancelled",
          rawSuccessPayload: body,
        },
        { new: true }
      );
    } catch (_) {}
  }
  res.redirect(302, redirect);
});

router.post("/ssl-ipn", async (req, res) => {
  const body = req.body || {};
  const tran_id = body.tran_id || null;
  if (tran_id) {
    try {
      await Transaction.findOneAndUpdate(
        { tran_id, gateway: "sslcommerz" },
        { rawIpnPayload: body },
        { upsert: true, new: true }
      );
    } catch (_) {}
  }
  res.json({ received: true });
});

export default router;
