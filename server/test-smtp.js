#!/usr/bin/env node

/**
 * SMTP Connection Test Script
 * Tests if Gmail SMTP is configured correctly
 */

import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;

console.log('\n📧 Testing SMTP Configuration...\n');

// Check if all required variables are set
if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
  console.log('❌ SMTP Configuration Missing!\n');
  console.log('Current values:');
  console.log(`  SMTP_HOST: ${SMTP_HOST || 'NOT SET'}`);
  console.log(`  SMTP_PORT: ${SMTP_PORT || 'NOT SET'}`);
  console.log(`  SMTP_USER: ${SMTP_USER || 'NOT SET'}`);
  console.log(`  SMTP_PASS: ${SMTP_PASS ? '***' : 'NOT SET'}\n`);
  console.log('⚠️  Please configure SMTP in your .env file');
  console.log('   Run: .\\quick-smtp-setup.ps1\n');
  process.exit(1);
}

// Check if using placeholder values
if (SMTP_USER.includes('your-email') || SMTP_PASS.includes('your-app-password')) {
  console.log('❌ Placeholder values detected!\n');
  console.log('Current values:');
  console.log(`  SMTP_USER: ${SMTP_USER}`);
  console.log(`  SMTP_PASS: ${SMTP_PASS.includes('your-app-password') ? '*** (placeholder)' : '***'}\n`);
  console.log('⚠️  Please replace placeholder values with your actual Gmail credentials');
  console.log('   Run: .\\quick-smtp-setup.ps1\n');
  process.exit(1);
}

console.log('✅ All SMTP variables are set\n');
console.log('Configuration:');
console.log(`  SMTP_HOST: ${SMTP_HOST}`);
console.log(`  SMTP_PORT: ${SMTP_PORT}`);
console.log(`  SMTP_USER: ${SMTP_USER}`);
console.log(`  SMTP_PASS: ${'*'.repeat(Math.min(SMTP_PASS.length, 16))}\n`);

// Test connection
console.log('🔄 Testing SMTP connection...\n');

try {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === 'true',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  // Verify connection
  await transporter.verify();
  
  console.log('✅ SMTP connection successful!\n');
  console.log('📧 You can now send booking confirmation emails.\n');
  console.log('💡 To test sending an email, approve a booking in the admin panel.\n');
  
  process.exit(0);
} catch (error) {
  console.log('❌ SMTP connection failed!\n');
  console.log('Error:', error.message);
  console.log('\nCommon issues:');
  console.log('  1. Invalid Gmail credentials');
  console.log('  2. Not using App Password (using regular password)');
  console.log('  3. 2-Step Verification not enabled');
  console.log('  4. App Password expired or revoked');
  console.log('\n💡 Solution:');
  console.log('  1. Go to: https://myaccount.google.com/apppasswords');
  console.log('  2. Generate a new App Password');
  console.log('  3. Update SMTP_PASS in .env file');
  console.log('  4. Restart your server\n');
  
  process.exit(1);
}













