# Fix SMTP Authentication Error

## Current Error:
```
❌ SMTP connection failed!
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

## Problem:
Your Gmail App Password is either:
- ❌ Incorrect
- ❌ Expired or revoked
- ❌ You're using your regular Gmail password instead of an App Password

## Solution:

### Step 1: Generate a New App Password
1. Go to: https://myaccount.google.com/apppasswords
2. Make sure **2-Step Verification** is enabled (required for App Passwords)
3. Select **Mail** as the app
4. Select **Other (Custom name)** as the device
5. Enter "Parking System" as the name
6. Click **Generate**
7. **Copy the 16-character password** (format: `xxxx xxxx xxxx xxxx`)

### Step 2: Update .env File
Open `server/.env` and update:
```env
SMTP_PASS=your-new-16-character-app-password
```
**Important:** Remove all spaces from the App Password!

### Step 3: Restart Server
After updating `.env`, restart your server:
```bash
cd server
npm start
```

### Step 4: Test Again
```bash
cd server
node test-smtp.js
```

You should see:
```
✅ SMTP connection successful!
```

## Quick Commands:

**To run test-smtp.js:**
```powershell
cd server
node test-smtp.js
```

**To run debug-smtp.js:**
```powershell
cd server
node debug-smtp.js
```

## Common Mistakes:
- ❌ Using regular Gmail password instead of App Password
- ❌ Including spaces in the App Password
- ❌ Using an expired/revoked App Password
- ❌ 2-Step Verification not enabled

