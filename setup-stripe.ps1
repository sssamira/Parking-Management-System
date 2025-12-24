# Stripe Setup Helper Script
# This script helps you set up your Stripe API keys

Write-Host "`n═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  STRIPE API KEY SETUP HELPER" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════`n" -ForegroundColor Cyan

# Check current status
Write-Host "Checking current configuration...`n" -ForegroundColor White

$clientEnv = "client\.env"
$serverEnv = "server\.env"

# Check client .env
if (Test-Path $clientEnv) {
    $clientKey = (Get-Content $clientEnv | Select-String "REACT_APP_STRIPE_PUBLISHABLE_KEY").ToString() -replace "REACT_APP_STRIPE_PUBLISHABLE_KEY=", ""
    if ($clientKey -match "YOUR_PUBLISHABLE_KEY" -or $clientKey -match "placeholder") {
        Write-Host "❌ Client .env: Placeholder key detected" -ForegroundColor Red
        $needsClientKey = $true
    } else {
        Write-Host "✅ Client .env: Has a key configured" -ForegroundColor Green
        $needsClientKey = $false
    }
} else {
    Write-Host "❌ Client .env: File not found" -ForegroundColor Red
    $needsClientKey = $true
}

# Check server .env
if (Test-Path $serverEnv) {
    $serverKey = (Get-Content $serverEnv | Select-String "STRIPE_SECRET_KEY").ToString() -replace "STRIPE_SECRET_KEY=", ""
    if ($serverKey -match "YOUR_SECRET_KEY" -or $serverKey -match "placeholder") {
        Write-Host "❌ Server .env: Placeholder key detected" -ForegroundColor Red
        $needsServerKey = $true
    } else {
        Write-Host "✅ Server .env: Has a key configured" -ForegroundColor Green
        $needsServerKey = $false
    }
} else {
    Write-Host "❌ Server .env: File not found" -ForegroundColor Red
    $needsServerKey = $true
}

Write-Host "`n" -NoNewline

if ($needsClientKey -or $needsServerKey) {
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host "  SETUP REQUIRED" -ForegroundColor Yellow
    Write-Host "═══════════════════════════════════════════════════`n" -ForegroundColor Yellow
    
    Write-Host "To get your Stripe API keys:" -ForegroundColor White
    Write-Host "1. Go to: https://dashboard.stripe.com/test/apikeys" -ForegroundColor Cyan
    Write-Host "2. Log in to your Stripe account" -ForegroundColor Cyan
    Write-Host "3. Make sure you're in TEST MODE (toggle in top right)" -ForegroundColor Cyan
    Write-Host "4. Copy your keys from the dashboard`n" -ForegroundColor Cyan
    
    if ($needsClientKey) {
        Write-Host "📝 CLIENT KEY NEEDED:" -ForegroundColor Yellow
        Write-Host "   You need the PUBLISHABLE KEY (starts with pk_test_)" -ForegroundColor White
        Write-Host "   It will go in: client\.env" -ForegroundColor Gray
        Write-Host "   Variable: REACT_APP_STRIPE_PUBLISHABLE_KEY`n" -ForegroundColor Gray
        
        $publishableKey = Read-Host "Enter your Stripe Publishable Key (pk_test_...) or press Enter to skip"
        if ($publishableKey -and $publishableKey -notmatch "YOUR_PUBLISHABLE_KEY" -and $publishableKey.StartsWith("pk_test_")) {
            # Update client .env
            $clientContent = Get-Content $clientEnv -Raw
            $clientContent = $clientContent -replace "REACT_APP_STRIPE_PUBLISHABLE_KEY=.*", "REACT_APP_STRIPE_PUBLISHABLE_KEY=$publishableKey"
            Set-Content $clientEnv -Value $clientContent -NoNewline
            Write-Host "✅ Updated client\.env with your publishable key!`n" -ForegroundColor Green
        } elseif ($publishableKey) {
            Write-Host "⚠️  Invalid key format. Key should start with 'pk_test_'" -ForegroundColor Yellow
            Write-Host "   Please update client\.env manually`n" -ForegroundColor Yellow
        }
    }
    
    if ($needsServerKey) {
        Write-Host "📝 SERVER KEY NEEDED:" -ForegroundColor Yellow
        Write-Host "   You need the SECRET KEY (starts with sk_test_)" -ForegroundColor White
        Write-Host "   It will go in: server\.env" -ForegroundColor Gray
        Write-Host "   Variable: STRIPE_SECRET_KEY`n" -ForegroundColor Gray
        
        $secretKey = Read-Host "Enter your Stripe Secret Key (sk_test_...) or press Enter to skip"
        if ($secretKey -and $secretKey -notmatch "YOUR_SECRET_KEY" -and $secretKey.StartsWith("sk_test_")) {
            # Update server .env
            $serverContent = Get-Content $serverEnv -Raw
            $serverContent = $serverContent -replace "STRIPE_SECRET_KEY=.*", "STRIPE_SECRET_KEY=$secretKey"
            Set-Content $serverEnv -Value $serverContent -NoNewline
            Write-Host "✅ Updated server\.env with your secret key!`n" -ForegroundColor Green
        } elseif ($secretKey) {
            Write-Host "⚠️  Invalid key format. Key should start with 'sk_test_'" -ForegroundColor Yellow
            Write-Host "   Please update server\.env manually`n" -ForegroundColor Yellow
        }
    }
    
    Write-Host "`n═══════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  NEXT STEPS" -ForegroundColor Yellow
    Write-Host "═══════════════════════════════════════════════════`n" -ForegroundColor Cyan
    Write-Host "1. If you updated keys, RESTART both servers:" -ForegroundColor White
    Write-Host "   - Stop client and server (Ctrl+C)" -ForegroundColor Gray
    Write-Host "   - Start client: cd client && npm start" -ForegroundColor Gray
    Write-Host "   - Start server: cd server && npm start" -ForegroundColor Gray
    Write-Host "`n2. Test the payment method page" -ForegroundColor White
    Write-Host "`n3. Use test card: 4242 4242 4242 4242" -ForegroundColor White
    Write-Host "   Expiry: 12/34, CVC: 123`n" -ForegroundColor Gray
    
} else {
    Write-Host "✅ All Stripe keys are configured!" -ForegroundColor Green
    Write-Host "   If you're still seeing errors, make sure you restarted your servers.`n" -ForegroundColor White
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

