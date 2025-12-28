# Gmail SMTP Configuration Script
# This script helps you configure Gmail SMTP for sending booking emails

Write-Host "`n📧 Gmail SMTP Configuration Setup`n" -ForegroundColor Cyan
Write-Host "To use Gmail SMTP, you need:" -ForegroundColor Yellow
Write-Host "1. A Gmail account"
Write-Host "2. 2-Step Verification enabled"
Write-Host "3. An App Password (not your regular password)`n"
Write-Host "To generate an App Password:" -ForegroundColor Yellow
Write-Host "   - Go to: https://myaccount.google.com/apppasswords"
Write-Host "   - Or: Google Account > Security > 2-Step Verification > App passwords`n"

$email = Read-Host "Enter your Gmail address"
$appPassword = Read-Host "Enter your Gmail App Password" -AsSecureString
$appPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($appPassword)
)

if (-not $email -or -not $appPasswordPlain) {
    Write-Host "`n❌ Email and App Password are required!`n" -ForegroundColor Red
    exit 1
}

# Read current .env file
$envPath = Join-Path $PSScriptRoot ".env"
$envContent = Get-Content $envPath -Raw

# Remove all existing SMTP configurations
$envContent = $envContent -replace "(?s)# SMTP Configuration.*?MAIL_FROM=.*?\n", ""
$envContent = $envContent -replace "SMTP_HOST=.*?\n", ""
$envContent = $envContent -replace "SMTP_PORT=.*?\n", ""
$envContent = $envContent -replace "SMTP_SECURE=.*?\n", ""
$envContent = $envContent -replace "SMTP_USER=.*?\n", ""
$envContent = $envContent -replace "SMTP_PASS=.*?\n", ""
$envContent = $envContent -replace "MAIL_FROM=.*?\n", ""

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

# Append SMTP config to .env
$envContent = $envContent.TrimEnd() + "`n" + $smtpConfig

# Write back to .env
Set-Content -Path $envPath -Value $envContent -NoNewline

Write-Host "`n✅ SMTP configuration updated successfully!`n" -ForegroundColor Green
Write-Host "📝 Configuration added:" -ForegroundColor Cyan
Write-Host "   SMTP_HOST: smtp.gmail.com"
Write-Host "   SMTP_PORT: 587"
Write-Host "   SMTP_USER: $($email.Trim())"
Write-Host "   SMTP_PASS: $('*' * $appPasswordPlain.Length)"
Write-Host "   MAIL_FROM: `"Parking Management`" <$($email.Trim())>`n"
Write-Host "⚠️  IMPORTANT: Restart your server for changes to take effect!`n" -ForegroundColor Yellow
















