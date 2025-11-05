#!/bin/bash

# Crypto Off-Ramp Backend Setup Script

set -e

echo "🚀 Setting up Crypto Off-Ramp Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env file with your actual values before running the server."
    echo ""
    echo "Required environment variables:"
    echo "  - SUPABASE_URL"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    echo "  - ENCRYPTION_KEY (generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")"
    echo "  - SOLANA_RPC_URL"
    echo "  - BASE_RPC_URL"
    echo "  - PAYSTACK_SECRET_KEY"
    echo ""
else
    echo "✅ .env file found"
fi

# Generate encryption key if needed
if ! grep -q "ENCRYPTION_KEY=your-32-byte-hex-key" .env 2>/dev/null; then
    echo "✅ Encryption key already set"
else
    echo "🔑 Generating encryption key..."
    ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/ENCRYPTION_KEY=your-32-byte-hex-key/ENCRYPTION_KEY=$ENCRYPTION_KEY/" .env
    else
        # Linux
        sed -i "s/ENCRYPTION_KEY=your-32-byte-hex-key/ENCRYPTION_KEY=$ENCRYPTION_KEY/" .env
    fi
    echo "✅ Encryption key generated and saved to .env"
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env file with your actual values"
echo "  2. Run database migrations (see backend/README.md)"
echo "  3. Start the server with: npm run dev"
echo ""

