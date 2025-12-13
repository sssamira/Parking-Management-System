# Quick SMTP Setup - Interactive Configuration
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Gmail SMTP Quick Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "📧 This will configure Gmail SMTP for sending booking emails`n" -ForegroundColor Yellow

Write-Host "STEP 1: Get Gmail App Password" -ForegroundColor Green
Write-Host "1. Go to: https://myaccount.google.com/apppasswords"
Write-Host "2. Enable 2-Step Verification if not already enabled"
Write-Host "3. Generate App Password for 'Mail' → 'Other' → Name it 'Parking System'"
Write-Host "4. Copy the 16-character password (looks like: xxxx xxxx xxxx xxxx)`n"

$continue = Read-Host "Have you generated the App Password? (y/n)"
if ($continue -ne 'y' -and $continue -ne 'Y') {
    Write-Host "`n⚠️  Please generate the App Password first, then run this script again.`n" -ForegroundColor Yellow
    exit
}

Write-Host "`nSTEP 2: Enter Your Gmail Credentials`n" -ForegroundColor Green

$email = Read-Host "Enter your Gmail address (e.g., yourname@gmail.com)"
if (-not $email -or -not $email.Contains('@')) {
    Write-Host "`n❌ Invalid email address!`n" -ForegroundColor Red
    exit 1
}

$appPassword = Read-Host "Enter your 16-character App Password" -AsSecureString
$appPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($appPassword)
)

if (-not $appPasswordPlain -or $appPasswordPlain.Length -lt 10) {
    Write-Host "`n❌ App Password is required and should be at least 10 characters!`n" -ForegroundColor Red
    exit 1
}

# Remove spaces from app password (Gmail sometimes shows it with spaces)
$appPasswordPlain = $appPasswordPlain -replace '\s', ''

Write-Host "`n📝 Updating .env file...`n" -ForegroundColor Yellow

# Read current .env
$envPath = Join-Path $PSScriptRoot ".env"
$envContent = Get-Content $envPath -Raw

# Remove all existing SMTP configurations
$envContent = $envContent -replace "(?s)# SMTP Configuration.*?MAIL_FROM=.*?\r?\n", ""
$envContent = $envContent -replace "SMTP_HOST=.*?\r?\n", ""
$envContent = $envContent -replace "SMTP_PORT=.*?\r?\n", ""
$envContent = $envContent -replace "SMTP_SECURE=.*?\r?\n", ""
$envContent = $envContent -replace "SMTP_USER=.*?\r?\n", ""
$envContent = $envContent -replace "SMTP_PASS=.*?\r?\n", ""
$envContent = $envContent -replace "MAIL_FROM=.*?\r?\n", ""

# Add new SMTP configuration
$smtpConfig = @"

# SMTP Configuration for Email Sending
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=$($email.Trim())
SMTP_PASS=$($appPasswordPlain.Trim())
MAIL_FROM="Parking Management" <$($email.Trim())>
"@

# Append SMTP config
$envContent = $envContent.TrimEnd() + "`n" + $smtpConfig

# Write back
Set-Content -Path $envPath -Value $envContent -NoNewline

Write-Host "✅ SMTP configuration updated successfully!`n" -ForegroundColor Green
Write-Host "📋 Configuration Summary:" -ForegroundColor Cyan
Write-Host "   SMTP_HOST: smtp.gmail.com"
Write-Host "   SMTP_PORT: 587"
Write-Host "   SMTP_USER: $($email.Trim())"
Write-Host "   SMTP_PASS: $('*' * [Math]::Min($appPasswordPlain.Length, 16))"
Write-Host "   MAIL_FROM: `"Parking Management`" <$($email.Trim())>`n"

Write-Host "⚠️  IMPORTANT: Restart your server now!`n" -ForegroundColor Yellow
Write-Host "1. Stop the server (Ctrl+C in the terminal where it's running)" -ForegroundColor White
Write-Host "2. Start it again (npm start or node index.js)" -ForegroundColor White
Write-Host "3. Look for this message: '✅ SMTP configured successfully'" -ForegroundColor White
Write-Host "4. Try approving a booking - email should be sent!`n" -ForegroundColor White

Write-Host "✨ Setup complete! Restart your server to apply changes.`n" -ForegroundColor Green






