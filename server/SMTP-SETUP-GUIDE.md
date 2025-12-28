# Gmail SMTP Setup Guide

## Quick Setup Steps

### Step 1: Enable 2-Step Verification
1. Go to your Google Account: https://myaccount.google.com/
2. Click **Security** in the left sidebar
3. Under "Signing in to Google", enable **2-Step Verification**

### Step 2: Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
   - Or: Google Account > Security > 2-Step Verification > App passwords
2. Select **Mail** as the app
3. Select **Other (Custom name)** as the device
4. Enter "Parking System" as the name
5. Click **Generate**
6. **Copy the 16-character password** (you'll need this!)

### Step 3: Update .env File

Open `server/.env` and update these lines:

```env
SMTP_USER=your-actual-email@gmail.com
SMTP_PASS=your-16-character-app-password
MAIL_FROM="Parking Management" <your-actual-email@gmail.com>
```

**Important:** 
- Use your actual Gmail address (not the placeholder)
- Use the 16-character App Password (not your regular Gmail password)
- Keep the quotes around "Parking Management" in MAIL_FROM

### Step 4: Restart Server

After updating `.env`, restart your server:
```bash
# Stop the server (Ctrl+C)
# Then start it again
npm start
```

### Step 5: Test

Try approving a booking - you should see:
- ✅ "Booking approved successfully! Confirmation email has been sent to the user."
- Email should arrive in the user's inbox

## Alternative: Use the Setup Script

You can also run the PowerShell script:
```powershell
cd server
.\configure-smtp.ps1
```

This will prompt you for your Gmail and App Password and update the `.env` file automatically.

## Troubleshooting

**Error: "SMTP not configured"**
- Check that SMTP_USER and SMTP_PASS are set in `.env`
- Make sure you're using an App Password, not your regular password
- Restart the server after updating `.env`

**Error: "Invalid login" or "Authentication failed"**
- Verify 2-Step Verification is enabled
- Make sure you're using the App Password (16 characters, no spaces)
- Check that SMTP_USER is your full Gmail address

**Emails not arriving**
- Check spam/junk folder
- Verify the recipient email address is correct
- Check server console logs for email errors















