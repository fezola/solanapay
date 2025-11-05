# Crypto Off-Ramp Backend Setup Script (PowerShell)

Write-Host "🚀 Setting up Crypto Off-Ramp Backend..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed. Please install npm first." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "⚠️  .env file not found. Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "📝 Please edit .env file with your actual values before running the server." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Required environment variables:" -ForegroundColor Cyan
    Write-Host "  - SUPABASE_URL"
    Write-Host "  - SUPABASE_SERVICE_ROLE_KEY"
    Write-Host "  - ENCRYPTION_KEY (generate with: node -e `"console.log(require('crypto').randomBytes(32).toString('hex'))`")"
    Write-Host "  - SOLANA_RPC_URL"
    Write-Host "  - BASE_RPC_URL"
    Write-Host "  - PAYSTACK_SECRET_KEY"
    Write-Host ""
} else {
    Write-Host "✅ .env file found" -ForegroundColor Green
}

# Generate encryption key if needed
$envContent = Get-Content .env -Raw
if ($envContent -match "ENCRYPTION_KEY=your-32-byte-hex-key") {
    Write-Host "🔑 Generating encryption key..." -ForegroundColor Yellow
    $encryptionKey = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    $envContent = $envContent -replace "ENCRYPTION_KEY=your-32-byte-hex-key", "ENCRYPTION_KEY=$encryptionKey"
    Set-Content .env $envContent
    Write-Host "✅ Encryption key generated and saved to .env" -ForegroundColor Green
} else {
    Write-Host "✅ Encryption key already set" -ForegroundColor Green
}

# Build TypeScript
Write-Host "🔨 Building TypeScript..." -ForegroundColor Yellow
npm run build

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Edit .env file with your actual values"
Write-Host "  2. Run database migrations (see backend/README.md)"
Write-Host "  3. Start the server with: npm run dev"
Write-Host ""

