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

  // Clean the key (remove any line breaks, whitespace, and ensure no extra characters)
  let cleanStripeKey = stripeSecretKey.trim().replace(/\r?\n/g, '').replace(/\s+/g, '');
  
  // Additional validation - ensure it's exactly the right format
  if (!cleanStripeKey.match(/^sk_(test|live)_[a-zA-Z0-9]{99,}$/)) {
    console.error('❌ Invalid Stripe secret key format!');
    console.error('   Key should start with sk_test_ or sk_live_ and be ~107 characters');
    console.error('   Current key length:', cleanStripeKey.length);
    console.error('   Current key starts with:', cleanStripeKey.substring(0, 20));
    return null;
  }

  try {
    // Initialize Stripe - the key will be validated on first API call
    stripe = new Stripe(cleanStripeKey);
    console.log('✅ Stripe initialized successfully');
    console.log('   Key length:', cleanStripeKey.length);
    console.log('   Key type:', cleanStripeKey.startsWith('sk_test_') ? 'TEST' : 'LIVE');
    console.log('   ⚠️  Note: Key will be verified on first API call');
    return stripe;
  } catch (error) {
    console.error('❌ Stripe initialization failed:', error.message);
    console.error('   Error type:', error.type);
    console.error('   Error code:', error.code);
    console.error('   This usually means:');
    console.error('   1. The key is invalid or has been revoked in Stripe dashboard');
    console.error('   2. The key is from a different Stripe account');
    console.error('   3. There are extra spaces or characters in the key');
    console.error('   4. The server needs to be restarted after updating .env');
    console.error('   Please verify your STRIPE_SECRET_KEY in server/.env');
    console.error('   Get a new key from: https://dashboard.stripe.com/test/apikeys');
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
    // Validate payment method ID format
    if (!paymentMethodId || typeof paymentMethodId !== 'string' || !paymentMethodId.startsWith('pm_')) {
      console.error('❌ Invalid payment method ID format:', paymentMethodId);
      throw new Error('Invalid payment method ID format. Please try entering your card details again.');
    }

    console.log(`🔗 Attaching payment method ${paymentMethodId} to customer ${customerId}...`);

    let paymentMethod;
    
    // First, try to verify the payment method exists by retrieving it
    // This helps us understand if the payment method was created successfully
    try {
      paymentMethod = await stripeInstance.paymentMethods.retrieve(paymentMethodId);
      console.log(`✅ Payment method exists and retrieved successfully`);
      console.log(`   Type: ${paymentMethod.type}`);
      console.log(`   Currently attached to customer: ${paymentMethod.customer || 'NONE'}`);
    } catch (retrieveError) {
      console.error('❌ Payment method retrieval failed:', retrieveError);
      console.error('   Code:', retrieveError.code);
      console.error('   Type:', retrieveError.type);
      console.error('   Message:', retrieveError.message);
      
      // If payment method doesn't exist, it means it wasn't created properly
      if (retrieveError.code === 'resource_missing' || 
          retrieveError.message?.includes('No such') ||
          retrieveError.message?.includes('does not exist')) {
        console.error('❌ Payment method does not exist in Stripe');
        console.error('   This usually means:');
        console.error('   1. The payment method was not created successfully on the frontend');
        console.error('   2. There is a mismatch between frontend and backend Stripe accounts');
        console.error('   3. The payment method ID is incorrect');
        throw new Error('Payment method not found. Please make sure your Stripe keys are configured correctly and try entering your card details again.');
      }
      // For other errors, we'll still try to attach (might be a temporary issue)
      console.log(`⚠️  Could not retrieve payment method, but will try to attach anyway...`);
    }

    // Now try to attach the payment method
    try {
      // If payment method is already attached to this customer, we're good
      if (paymentMethod && paymentMethod.customer === customerId) {
        console.log(`✅ Payment method already attached to this customer`);
      } else if (paymentMethod && paymentMethod.customer && paymentMethod.customer !== customerId) {
        // Attached to different customer, detach and reattach
        console.log(`⚠️  Payment method attached to different customer (${paymentMethod.customer}), reattaching...`);
      await stripeInstance.paymentMethods.detach(paymentMethodId);
        await stripeInstance.paymentMethods.attach(paymentMethodId, {
          customer: customerId,
        });
        console.log(`✅ Payment method reattached to correct customer`);
        paymentMethod = await stripeInstance.paymentMethods.retrieve(paymentMethodId);
      } else {
        // Not attached, attach it
        console.log(`🔗 Attaching payment method to customer...`);
      await stripeInstance.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
        console.log(`✅ Payment method attached successfully`);
        paymentMethod = await stripeInstance.paymentMethods.retrieve(paymentMethodId);
      }
    } catch (attachError) {
      console.error('❌ Attach error:', attachError);
      console.error('   Code:', attachError.code);
      console.error('   Type:', attachError.type);
      console.error('   Message:', attachError.message);
      
      // Check if it's already attached (this is OK)
      if (attachError.code === 'resource_already_exists' || 
          attachError.message?.includes('already been attached') ||
          attachError.message?.includes('already attached')) {
        console.log(`ℹ️  Payment method already attached, retrieving...`);
        paymentMethod = await stripeInstance.paymentMethods.retrieve(paymentMethodId);
      } else if (attachError.code === 'resource_missing' || 
                 attachError.message?.includes('No such') ||
                 attachError.message?.includes('does not exist')) {
        // Payment method doesn't exist
        throw new Error('Payment method not found. Please make sure your Stripe keys are configured correctly and try entering your card details again.');
      } else {
        // Other error
        throw new Error(`Failed to save payment method: ${attachError.message || 'Please try entering your card details again.'}`);
      }
    }

    // Set as default payment method
    try {
    await stripeInstance.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
      console.log(`✅ Set as default payment method`);
    } catch (updateError) {
      console.warn('⚠️  Warning: Failed to set default payment method:', updateError.message);
      // Don't fail the whole operation if this fails
    }

    // Retrieve payment method details after attachment
    // If we already have paymentMethod from earlier, use it; otherwise retrieve
    let updatedPaymentMethod = paymentMethod;
    if (!updatedPaymentMethod) {
      try {
        updatedPaymentMethod = await stripeInstance.paymentMethods.retrieve(paymentMethodId);
      } catch (retrieveError) {
        // If retrieve fails after attach, wait a moment and try again (timing issue)
        console.log(`⏳ Payment method not immediately available, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
        updatedPaymentMethod = await stripeInstance.paymentMethods.retrieve(paymentMethodId);
      }
    }

    if (!updatedPaymentMethod || !updatedPaymentMethod.card) {
      throw new Error('Payment method saved but card details could not be retrieved. Please try again.');
    }

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
      if (error.code === 'resource_missing' || 
          error.message?.includes('No such') ||
          error.message?.includes('does not exist')) {
        console.error('❌ Payment method does not exist in Stripe');
        throw new Error('Payment method not found. Please try entering your card details again.');
      } else if (error.message?.includes('already been attached') || 
                 error.message?.includes('already attached')) {
        // This is actually OK - it means it's already attached
        console.log('ℹ️  Payment method already attached, retrieving details...');
        try {
          const pm = await stripeInstance.paymentMethods.retrieve(paymentMethodId);
          return {
            id: pm.id,
            last4: pm.card?.last4 || null,
            brand: pm.card?.brand || null,
            expMonth: pm.card?.exp_month || null,
            expYear: pm.card?.exp_year || null,
          };
        } catch (retrieveError) {
          throw new Error('Payment method already saved but could not retrieve details. Please try again.');
        }
      } else if (error.message?.includes('Invalid')) {
        throw new Error('Invalid payment method. Please check your card details and try again.');
      }
    } else if (error.type === 'StripeCardError') {
      throw new Error(`Card error: ${error.message || 'Please check your card details.'}`);
      }
    
    // If it's already our custom error message, re-throw it
    if (error.message && (error.message.includes('Payment method not found') || 
                         error.message.includes('Invalid payment method') ||
                         error.message.includes('Invalid payment method ID'))) {
    throw error;
    }
    
    throw new Error(`Failed to save payment method: ${error.message || 'Please try again.'}`);
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

  // Stripe requires minimum $0.50 USD for payments
  // For BDT, based on current exchange rate (~1 USD = 110-120 BDT)
  // ৳50 = ~$0.41 (too low), so we need at least ৳60-65 to meet $0.50 minimum
  // Using ৳65 as a safe minimum to ensure it converts to at least $0.50 USD
  const STRIPE_MINIMUM_AMOUNT = {
    'bdt': 65,  // ৳65 minimum (ensures it converts to at least $0.50 USD)
    'usd': 0.50,
    'default': 65
  };

  const minAmount = STRIPE_MINIMUM_AMOUNT[currency.toLowerCase()] || STRIPE_MINIMUM_AMOUNT.default;
  
  // Validate and ensure amount is a valid number
  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error(`Invalid amount: ${amount}. Amount must be a positive number.`);
  }
  
  // Payment logic:
  // - If amount < ৳65 (minimum) → automatically charge ৳65
  // - If amount >= ৳65 → charge the actual calculated amount
  // This ensures we never attempt to charge below Stripe's minimum requirement ($0.50 USD)
  let chargeAmount = Math.max(numericAmount, minAmount);
  const minimumChargeApplied = chargeAmount > numericAmount;

  // Double-check: ensure chargeAmount is never below minimum (safety check)
  if (chargeAmount < minAmount) {
    console.warn(`⚠️  Safety check: chargeAmount (৳${chargeAmount.toFixed(2)}) was below minimum (৳${minAmount.toFixed(2)}). Forcing to minimum.`);
    chargeAmount = minAmount;
  }

  if (minimumChargeApplied) {
    console.log(`⚠️  Amount ৳${numericAmount.toFixed(2)} is below Stripe minimum (৳${minAmount.toFixed(2)}). Automatically applying minimum charge of ৳${chargeAmount.toFixed(2)}.`);
  } else {
    console.log(`✅ Amount ৳${numericAmount.toFixed(2)} is above minimum. Charging full amount.`);
  }

  console.log(`💳 Attempting to charge: ৳${chargeAmount.toFixed(2)} (original: ৳${numericAmount.toFixed(2)}, minimum applied: ${minimumChargeApplied})`);

  try {
    // Create payment intent with the chargeAmount (which includes minimum if needed)
    const paymentIntent = await stripeInstance.paymentIntents.create({
      amount: Math.round(chargeAmount * 100), // Convert to smallest currency unit (paise for BDT)
      currency: currency.toLowerCase(),
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true, // Indicates this is a saved payment method
      confirm: true, // Automatically confirm the payment
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        originalAmount: numericAmount.toString(),
        chargeAmount: chargeAmount.toString(),
        minimumChargeApplied: minimumChargeApplied.toString(),
      },
    });

    return {
      success: paymentIntent.status === 'succeeded',
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100, // Convert back to main currency unit
      originalAmount: numericAmount,
      chargedAmount: paymentIntent.amount / 100,
      minimumChargeApplied: minimumChargeApplied,
      currency: paymentIntent.currency,
    };
  } catch (error) {
    console.error('Error charging payment method:', error);
    console.error(`   Attempted to charge: ৳${chargeAmount.toFixed(2)} (original: ৳${numericAmount.toFixed(2)})`);
    console.error(`   Minimum charge applied: ${minimumChargeApplied}`);
    console.error(`   Minimum required: ৳${minAmount.toFixed(2)}`);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      throw new Error(`Payment failed: ${error.message}`);
    } else if (error.type === 'StripeInvalidRequestError') {
      // Check if payment method doesn't exist (invalid or deleted)
      // Stripe error messages can vary, so check for multiple patterns
      const errorMsg = error.message || '';
      if (errorMsg.includes('No such PaymentMethod') || 
          errorMsg.includes('No such payment_method') ||
          errorMsg.includes('No such Payment') ||
          (errorMsg.includes('PaymentMethod') && errorMsg.includes('does not exist'))) {
        // Return a special error object to indicate invalid payment method
        const invalidPaymentMethodError = new Error(`Payment method not found or invalid. Please update your payment method.`);
        invalidPaymentMethodError.code = 'INVALID_PAYMENT_METHOD';
        invalidPaymentMethodError.originalError = error.message;
        throw invalidPaymentMethodError;
      }
      
      // Provide a more user-friendly error message for minimum amount errors
      if (error.message && (error.message.includes('50 cents') || error.message.includes('minimum'))) {
        // If minimum was already applied but still failed, this is a different issue
        if (minimumChargeApplied) {
          throw new Error(`Invalid payment request: Minimum charge of ৳${chargeAmount.toFixed(2)} was applied, but payment still failed: ${error.message}`);
        } else {
          // This shouldn't happen if minimum charge logic is working, but handle it anyway
          throw new Error(`Invalid payment request: Amount must be at least ৳${minAmount.toFixed(2)}. Your amount of ৳${numericAmount.toFixed(2)} is too low.`);
        }
      }
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




