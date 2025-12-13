#!/usr/bin/env node

/**
 * Test Email Sending Script
 * Sends a test email to verify the email system is working
 */

import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, MAIL_FROM } = process.env;

console.log('\n📧 Testing Email Sending...\n');

// Check configuration
if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
  console.log('❌ SMTP Configuration Missing!\n');
  process.exit(1);
}

// Get test email from command line or use default
const testEmail = process.argv[2] || SMTP_USER;

console.log('Configuration:');
console.log(`  SMTP_HOST: ${SMTP_HOST}`);
console.log(`  SMTP_PORT: ${SMTP_PORT}`);
console.log(`  SMTP_USER: ${SMTP_USER}`);
console.log(`  SMTP_PASS: ${'*'.repeat(Math.min(SMTP_PASS.length, 16))}`);
console.log(`  Test Email To: ${testEmail}\n`);

// Create transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST.trim(),
  port: Number(SMTP_PORT),
  secure: SMTP_SECURE === 'true',
  auth: {
    user: SMTP_USER.trim(),
    pass: SMTP_PASS.trim(),
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

// Test sending email
async function testSendEmail() {
  try {
    console.log('🔄 Attempting to send test email...\n');
    
    // Don't verify first - just try to send
    const info = await transporter.sendMail({
      from: MAIL_FROM || `"Parking Management" <${SMTP_USER}>`,
      to: testEmail,
      subject: 'Test Email - Parking Management System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4F46E5;">Test Email</h2>
          <p>This is a test email from the Parking Management System.</p>
          <p><strong>Time sent:</strong> ${new Date().toLocaleString()}</p>
          <p>If you received this email, your SMTP configuration is working correctly!</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">This is an automated test email.</p>
        </div>
      `,
      text: `Test Email - Parking Management System\n\nTime sent: ${new Date().toLocaleString()}\n\nIf you received this email, your SMTP configuration is working correctly!`,
    });
    
    console.log('✅ Email sent successfully!\n');
    console.log('Details:');
    console.log(`  Message ID: ${info.messageId || 'N/A'}`);
    console.log(`  Response: ${info.response || 'N/A'}`);
    console.log(`  Accepted: ${info.accepted.join(', ')}`);
    if (info.rejected && info.rejected.length > 0) {
      console.log(`  Rejected: ${info.rejected.join(', ')}`);
    }
    console.log('\n💡 Check your inbox (and spam folder) for the test email.\n');
    
    process.exit(0);
  } catch (error) {
    console.log('❌ Failed to send email!\n');
    console.log('Error Details:');
    console.log(`  Message: ${error.message}`);
    console.log(`  Code: ${error.code || 'N/A'}`);
    if (error.response) {
      console.log(`  SMTP Response: ${error.response}`);
    }
    if (error.responseCode) {
      console.log(`  Response Code: ${error.responseCode}`);
    }
    if (error.command) {
      console.log(`  Command: ${error.command}`);
    }
    console.log('\n💡 Troubleshooting:');
    console.log('  1. Check your App Password is correct');
    console.log('  2. Verify 2-Step Verification is enabled');
    console.log('  3. Check spam/junk folder');
    console.log('  4. Verify recipient email address is correct\n');
    
    process.exit(1);
  }
}

testSendEmail();

