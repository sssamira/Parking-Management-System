# Email Debugging Guide

## Current Status
Emails are not being received by users even though SMTP is verified.

## Debugging Steps

### Step 1: Check Server Logs
When you approve/reject a booking, you should see these logs in order:

```
🔔 Approving booking - preparing to send email:
   Booking ID: ...
   User: ...
   User Email: ...

📬 About to call sendBookingEmail for approval:
   Email address: user@example.com
   Transporter available: YES ✅

📧 ========== sendBookingEmail CALLED ==========
   To: user@example.com
   Subject: Your parking spot booking is confirmed
   Transporter exists: YES ✅
   Transporter type: object

📧 Attempting to send email...
   From: "Parking Management" <your-email@gmail.com>
   To: user@example.com

✅ Email sent successfully!
   To: user@example.com
   Message ID: <...>
   Response: 250 2.0.0 OK ...
   Accepted: user@example.com
```

### Step 2: Check What's Missing
Look for these in your logs:

**If you see:**
- `Transporter available: NO ❌` → SMTP not configured in .env
- `User Email: MISSING!` → User doesn't have email in database
- `❌ Email send failed` → Check the error message
- No logs at all → Email function not being called

### Step 3: Test Email Directly
Use the test email endpoint:

```bash
# Using curl (replace YOUR_TOKEN with admin token)
curl -X POST http://localhost:3001/api/bookings/test-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"testEmail": "your-email@gmail.com"}'
```

Or use the test script:
```bash
cd server
node test-send-email.js your-email@gmail.com
```

### Step 4: Common Issues

1. **User Email Missing**
   - Check if users have email addresses in database
   - Verify user is populated correctly: `booking.user.email`

2. **Transporter is NULL**
   - Check `.env` file has all SMTP variables
   - Restart server after changing `.env`
   - Run `node debug-smtp.js` to check configuration

3. **Email Sent but Not Received**
   - Check spam/junk folder
   - Verify recipient email is correct
   - Check Gmail "Sent" folder to see if email was actually sent
   - Gmail may delay or filter automated emails

4. **Silent Failures**
   - Check server console for error messages
   - Look for `❌ Email send failed` messages
   - Check `emailError` field in booking response

### Step 5: Verify Email Was Sent
Check your Gmail "Sent" folder - if the email appears there, it was sent successfully. The issue might be:
- Email going to spam
- Wrong recipient email
- Email provider blocking it

## Next Steps
1. Approve/reject a booking
2. Check server logs for the detailed output above
3. Share the logs if emails still don't work
4. Check Gmail "Sent" folder to verify emails are being sent

