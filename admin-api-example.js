/**
 * SolPay Admin API Example
 * 
 * This script demonstrates how to use the admin API endpoints
 * to fetch transaction analytics and platform statistics.
 * 
 * Usage:
 * 1. Set your ADMIN_EMAIL in backend/.env
 * 2. Sign up with that email and get your JWT token
 * 3. Run: node admin-api-example.js YOUR_JWT_TOKEN
 */

const API_BASE_URL = 'http://localhost:3001/api/admin';

// Get JWT token from command line argument
const JWT_TOKEN = process.argv[2];

if (!JWT_TOKEN) {
  console.error('❌ Error: Please provide your JWT token as an argument');
  console.error('Usage: node admin-api-example.js YOUR_JWT_TOKEN');
  process.exit(1);
}

// Helper function to make authenticated API calls
async function adminApiCall(endpoint) {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`\n📡 Calling: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.error || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return null;
  }
}

// Format numbers for display
function formatNumber(num) {
  return new Intl.NumberFormat('en-US', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  }).format(num);
}

function formatCurrency(num, currency = 'NGN') {
  if (currency === 'NGN') {
    return `₦${formatNumber(num)}`;
  }
  return `$${formatNumber(num)}`;
}

// Main function
async function main() {
  console.log('🔐 SolPay Admin Dashboard Analytics\n');
  console.log('=' .repeat(60));

  // 1. Get Dashboard Stats
  console.log('\n📊 DASHBOARD STATS');
  console.log('-'.repeat(60));
  const stats = await adminApiCall('/stats');
  if (stats) {
    console.log(`Total Users: ${stats.users.total}`);
    console.log(`KYC Approved: ${stats.users.kyc_approved}`);
    console.log(`KYC Pending: ${stats.users.kyc_pending}`);
    console.log(`Total Deposits: ${stats.deposits.total_count}`);
    console.log(`Total Payouts: ${stats.payouts.total_count}`);
    console.log(`Successful Payouts: ${stats.payouts.successful_count}`);
  }

  // 2. Get Transaction Analytics
  console.log('\n\n💰 TRANSACTION ANALYTICS');
  console.log('-'.repeat(60));
  const analytics = await adminApiCall('/analytics/transactions');
  if (analytics) {
    console.log('\n📈 Summary:');
    console.log(`  Active Users: ${analytics.summary.active_users} / ${analytics.summary.total_users}`);
    console.log(`  Total Deposits: ${analytics.summary.total_deposits}`);
    console.log(`  Total Offramps: ${analytics.summary.total_offramps}`);
    console.log(`  USDC Deposited: ${formatCurrency(analytics.summary.total_usdc_deposited, 'USD')}`);
    console.log(`  USDC Offramped: ${formatCurrency(analytics.summary.total_usdc_offramped, 'USD')}`);
    console.log(`  USDC Balance: ${formatCurrency(analytics.summary.usdc_balance, 'USD')}`);
    console.log(`  NGN Paid Out: ${formatCurrency(analytics.summary.total_ngn_paid_out)}`);

    console.log('\n📦 Deposits by Asset:');
    for (const [asset, data] of Object.entries(analytics.deposits_by_asset)) {
      console.log(`  ${asset}:`);
      console.log(`    Total: ${formatNumber(data.total_amount)} (${data.total_count} txns)`);
      console.log(`    Confirmed: ${formatNumber(data.confirmed_amount)} (${data.confirmed_count} txns)`);
      console.log(`    Pending: ${formatNumber(data.pending_amount)} (${data.pending_count} txns)`);
    }

    console.log('\n💸 Offramps by Status:');
    for (const [status, data] of Object.entries(analytics.offramps_by_status)) {
      console.log(`  ${status.toUpperCase()}:`);
      console.log(`    Count: ${data.count}`);
      console.log(`    Fiat: ${formatCurrency(data.total_fiat)}`);
      console.log(`    Crypto: ${formatCurrency(data.total_crypto, 'USD')}`);
    }
  }

  // 3. Get Revenue Analytics
  console.log('\n\n💵 REVENUE ANALYTICS');
  console.log('-'.repeat(60));
  const revenue = await adminApiCall('/analytics/revenue');
  if (revenue) {
    console.log(`Total Fees Collected: ${formatCurrency(revenue.total_fees_ngn)}`);
    console.log(`Total Volume: ${formatCurrency(revenue.total_volume_ngn)}`);
    console.log(`Average Fee %: ${revenue.average_fee_percentage.toFixed(2)}%`);
    console.log(`Transaction Count: ${revenue.transaction_count}`);
  }

  // 4. Get Recent Transactions
  console.log('\n\n📋 RECENT TRANSACTIONS (Last 10)');
  console.log('-'.repeat(60));
  const transactions = await adminApiCall('/analytics/all-transactions?limit=10');
  if (transactions && transactions.transactions) {
    transactions.transactions.forEach((tx, index) => {
      console.log(`\n${index + 1}. ${tx.type.toUpperCase()} - ${tx.status}`);
      console.log(`   User: ${tx.user_email}`);
      console.log(`   Asset: ${tx.asset} on ${tx.chain}`);
      
      if (tx.type === 'deposit') {
        console.log(`   Amount: ${formatNumber(tx.amount)} ${tx.asset}`);
        console.log(`   TX Hash: ${tx.tx_hash?.substring(0, 20)}...`);
      } else {
        console.log(`   Crypto: ${formatNumber(tx.crypto_amount)} ${tx.asset}`);
        console.log(`   Fiat: ${formatCurrency(tx.fiat_amount)}`);
        console.log(`   Bank: ${tx.bank_name} - ${tx.account_number}`);
      }
      
      console.log(`   Date: ${new Date(tx.created_at).toLocaleString()}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Admin analytics complete!\n');
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

