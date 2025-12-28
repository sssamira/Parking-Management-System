#!/usr/bin/env node

/**
 * SMTP Configuration Helper Script
 * This script helps you configure Gmail SMTP for sending booking emails
 */

import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupSMTP() {
  console.log('\n📧 Gmail SMTP Configuration Setup\n');
  console.log('To use Gmail SMTP, you need:');
  console.log('1. A Gmail account');
  console.log('2. 2-Step Verification enabled');
  console.log('3. An App Password (not your regular password)\n');
  console.log('To generate an App Password:');
  console.log('   - Go to: https://myaccount.google.com/apppasswords');
  console.log('   - Or: Google Account > Security > 2-Step Verification > App passwords\n');

  const email = await question('Enter your Gmail address: ');
  const appPassword = await question('Enter your Gmail App Password: ');

  if (!email || !appPassword) {
    console.log('\n❌ Email and App Password are required!');
    rl.close();
    return;
  }

  // Read current .env file
  const envPath = path.join(__dirname, '.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    
    // Remove old SMTP configurations
    envContent = envContent.replace(/# SMTP Configuration.*?MAIL_FROM=.*?\n/gs, '');
    envContent = envContent.replace(/SMTP_HOST=.*?\n/g, '');
    envContent = envContent.replace(/SMTP_PORT=.*?\n/g, '');
    envContent = envContent.replace(/SMTP_SECURE=.*?\n/g, '');
    envContent = envContent.replace(/SMTP_USER=.*?\n/g, '');
    envContent = envContent.replace(/SMTP_PASS=.*?\n/g, '');
    envContent = envContent.replace(/MAIL_FROM=.*?\n/g, '');
  }

  // Add new SMTP configuration
  const smtpConfig = `
# SMTP Configuration for Email Sending
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=${email.trim()}
SMTP_PASS=${appPassword.trim()}
MAIL_FROM="Parking Management" <${email.trim()}>
`;

  // Append SMTP config to .env
  envContent += smtpConfig;

  // Write back to .env
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ SMTP configuration updated successfully!');
  console.log('\n📝 Configuration added:');
  console.log(`   SMTP_HOST: smtp.gmail.com`);
  console.log(`   SMTP_PORT: 587`);
  console.log(`   SMTP_USER: ${email.trim()}`);
  console.log(`   SMTP_PASS: ${'*'.repeat(appPassword.length)}`);
  console.log(`   MAIL_FROM: "Parking Management" <${email.trim()}>\n`);
  console.log('⚠️  IMPORTANT: Restart your server for changes to take effect!\n');

  rl.close();
}

setupSMTP().catch(console.error);
















