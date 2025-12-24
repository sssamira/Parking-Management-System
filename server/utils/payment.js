import Stripe from 'stripe';

// Initialize Stripe with API key from environment
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error('⚠️ STRIPE_SECRET_KEY is not set in environment variables!');
  console.error('   Please add STRIPE_SECRET_KEY to your server/.env file');
  console.error('   Get your key from: https://dashboard.stripe.com/test/apikeys');
  console.error('   Payment processing will not work until this is configured.');
}

if (stripeSecretKey && !stripeSecretKey.startsWith('sk_test_') && !stripeSecretKey.startsWith('sk_live_')) {
  console.warn('⚠️ STRIPE_SECRET_KEY does not appear to be a valid Stripe secret key');
  console.warn('   Secret keys should start with "sk_test_" (test) or "sk_live_" (live)');
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

/**
 * Create or retrieve Stripe customer for user
 */
export const getOrCreateStripeCustomer = async (user) => {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables.');
  }

  try {
    // If user already has a Stripe customer ID, return it
    if (user.stripeCustomerId) {
      const customer = await stripe.customers.retrieve(user.stripeCustomerId);
      return customer;
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        userId: user._id.toString(),
      },
    });

    return customer;
  } catch (error) {
    console.error('Error creating/retrieving Stripe customer:', error);
    throw error;
  }
};

/**
 * Attach payment method to customer
 */
export const attachPaymentMethod = async (customerId, paymentMethodId) => {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables.');
  }

  try {
    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Retrieve payment method details
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    return {
      id: paymentMethod.id,
      last4: paymentMethod.card?.last4 || null,
      brand: paymentMethod.card?.brand || null,
      expMonth: paymentMethod.card?.exp_month || null,
      expYear: paymentMethod.card?.exp_year || null,
    };
  } catch (error) {
    console.error('Error attaching payment method:', error);
    throw error;
  }
};

/**
 * Charge user's saved payment method
 */
export const chargePaymentMethod = async (customerId, paymentMethodId, amount, currency = 'bdt', metadata = {}) => {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables.');
  }

  try {
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to smallest currency unit (paise for BDT)
      currency: currency.toLowerCase(),
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true, // Indicates this is a saved payment method
      confirm: true, // Automatically confirm the payment
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      success: paymentIntent.status === 'succeeded',
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100, // Convert back to main currency unit
      currency: paymentIntent.currency,
    };
  } catch (error) {
    console.error('Error charging payment method:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      throw new Error(`Payment failed: ${error.message}`);
    } else if (error.type === 'StripeInvalidRequestError') {
      throw new Error(`Invalid payment request: ${error.message}`);
    } else {
      throw new Error(`Payment processing error: ${error.message}`);
    }
  }
};

/**
 * Calculate parking fee based on entry and exit times
 */
export const calculateParkingFee = (entryTime, exitTime, pricePerHour) => {
  if (!entryTime || !exitTime) {
    return 0;
  }

  const entry = new Date(entryTime);
  const exit = new Date(exitTime);

  if (isNaN(entry.getTime()) || isNaN(exit.getTime())) {
    return 0;
  }

  if (exit <= entry) {
    return 0;
  }

  // Calculate duration in milliseconds
  const durationMs = exit.getTime() - entry.getTime();
  
  // Convert to hours (minimum 0.5 hours = 30 minutes)
  const durationHours = Math.max(durationMs / (1000 * 60 * 60), 0.5);
  
  // Round up to nearest 0.5 hours (30 minutes)
  const roundedHours = Math.ceil(durationHours * 2) / 2;
  
  // Calculate total price
  const totalPrice = roundedHours * pricePerHour;
  
  return Math.round(totalPrice * 100) / 100; // Round to 2 decimal places
};




