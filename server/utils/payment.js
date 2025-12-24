import Stripe from 'stripe';

// Lazy initialization - Stripe will be initialized on first use
let stripe = null;

/**
 * Get or initialize Stripe instance
 * This ensures dotenv has loaded before we try to read the key
 */
const getStripe = () => {
  if (stripe) {
    return stripe;
  }

  // Initialize Stripe with API key from environment
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  // Debug logging
  console.log('🔍 Stripe Configuration Check:');
  console.log('   STRIPE_SECRET_KEY exists:', !!stripeSecretKey);
  
  if (stripeSecretKey) {
    console.log('   Key length:', stripeSecretKey.length);
    console.log('   Key starts with:', stripeSecretKey.substring(0, 10) + '...');
    console.log('   Has line breaks:', stripeSecretKey.includes('\n') || stripeSecretKey.includes('\r'));
  }

  if (!stripeSecretKey) {
    console.error('⚠️ STRIPE_SECRET_KEY is not set in environment variables!');
    console.error('   Please add STRIPE_SECRET_KEY to your server/.env file');
    console.error('   Get your key from: https://dashboard.stripe.com/test/apikeys');
    console.error('   Payment processing will not work until this is configured.');
    console.error('   Make sure you RESTARTED your server after updating .env!');
    return null;
  }

  if (stripeSecretKey && !stripeSecretKey.startsWith('sk_test_') && !stripeSecretKey.startsWith('sk_live_')) {
    console.warn('⚠️ STRIPE_SECRET_KEY does not appear to be a valid Stripe secret key');
    console.warn('   Secret keys should start with "sk_test_" (test) or "sk_live_" (live)');
    console.warn('   Current key starts with:', stripeSecretKey.substring(0, 10));
  }

  // Clean the key (remove any line breaks or whitespace)
  const cleanStripeKey = stripeSecretKey.trim().replace(/\r?\n/g, '');

  try {
    stripe = new Stripe(cleanStripeKey);
    console.log('✅ Stripe initialized successfully');
    return stripe;
  } catch (error) {
    console.error('❌ Stripe initialization failed:', error.message);
    return null;
  }
};

/**
 * Create or retrieve Stripe customer for user
 */
export const getOrCreateStripeCustomer = async (user) => {
  const stripeInstance = getStripe();
  if (!stripeInstance) {
    const errorMsg = 'Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables and restart your server.';
    console.error('❌', errorMsg);
    console.error('   Current STRIPE_SECRET_KEY value:', process.env.STRIPE_SECRET_KEY ? 'SET (but invalid)' : 'NOT SET');
    throw new Error(errorMsg);
  }

  try {
    // If user already has a Stripe customer ID, return it
    if (user.stripeCustomerId) {
      const customer = await stripeInstance.customers.retrieve(user.stripeCustomerId);
      return customer;
    }

    // Create new Stripe customer with email for Google Pay integration
    const customer = await stripeInstance.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        userId: user._id.toString(),
      },
      // Enable automatic payment methods for better Google Pay integration
      invoice_settings: {
        default_payment_method: null, // Will be set when payment method is attached
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
  const stripeInstance = getStripe();
  if (!stripeInstance) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables.');
  }

  try {
    // Check if payment method is already attached to a customer
    const paymentMethod = await stripeInstance.paymentMethods.retrieve(paymentMethodId);
    
    // If already attached to a customer, detach it first (unless it's the same customer)
    if (paymentMethod.customer && paymentMethod.customer !== customerId) {
      console.log(`Payment method already attached to customer ${paymentMethod.customer}, detaching...`);
      await stripeInstance.paymentMethods.detach(paymentMethodId);
    }
    
    // Attach payment method to customer (or re-attach if same customer)
    if (!paymentMethod.customer || paymentMethod.customer !== customerId) {
      await stripeInstance.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
    }

    // Set as default payment method
    await stripeInstance.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Retrieve updated payment method details
    const updatedPaymentMethod = await stripeInstance.paymentMethods.retrieve(paymentMethodId);

    return {
      id: updatedPaymentMethod.id,
      last4: updatedPaymentMethod.card?.last4 || null,
      brand: updatedPaymentMethod.card?.brand || null,
      expMonth: updatedPaymentMethod.card?.exp_month || null,
      expYear: updatedPaymentMethod.card?.exp_year || null,
    };
  } catch (error) {
    console.error('Error attaching payment method:', error);
    console.error('Error type:', error.type);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Provide more specific error messages
    if (error.type === 'StripeInvalidRequestError') {
      if (error.code === 'resource_missing') {
        throw new Error('Payment method not found. Please try entering your card details again.');
      } else if (error.message?.includes('already been attached')) {
        throw new Error('This payment method is already saved. Please use a different card or remove the existing one first.');
      }
    }
    
    throw error;
  }
};

/**
 * Charge user's saved payment method
 */
export const chargePaymentMethod = async (customerId, paymentMethodId, amount, currency = 'bdt', metadata = {}) => {
  const stripeInstance = getStripe();
  if (!stripeInstance) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables.');
  }

  try {
    // Create payment intent
    const paymentIntent = await stripeInstance.paymentIntents.create({
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




