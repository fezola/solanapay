import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BREAD_API_KEY = process.env.BREAD_API_KEY;
const BREAD_BASE_URL = 'https://processor-prod.up.railway.app';

async function getBreadWalletAddress() {
  const userId = '3a6f2eb9-4138-4f3b-9c47-3fa26cdee341';
  
  console.log('\n🔍 Getting Bread wallet addresses for user:', userId);
  
  // Get all deposit addresses with bread_wallet_id
  const { data: addresses, error } = await supabase
    .from('deposit_addresses')
    .select('*')
    .eq('user_id', userId)
    .not('bread_wallet_id', 'is', null);
  
  if (error) {
    console.error('❌ Error fetching addresses:', error);
    return;
  }
  
  console.log(`\n✅ Found ${addresses.length} addresses with Bread wallets:\n`);
  
  for (const addr of addresses) {
    console.log(`\n📍 ${addr.network} ${addr.asset_symbol}:`);
    console.log(`   Deposit Address: ${addr.address}`);
    console.log(`   Bread Wallet ID: ${addr.bread_wallet_id}`);
    
    // Fetch Bread wallet details from Bread API
    try {
      const response = await fetch(
        `${BREAD_BASE_URL}/wallet/${addr.bread_wallet_id}`,
        {
          headers: {
            'Authorization': `Bearer ${BREAD_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const breadWallet = await response.json();
      
      if (breadWallet.wallet) {
        console.log(`   Bread Wallet Address: ${breadWallet.wallet.address}`);
        console.log(`   Bread Wallet Type: ${breadWallet.wallet.type}`);
        console.log(`   Bread Wallet Chain: ${breadWallet.wallet.chain}`);
        
        // Get balance
        const balanceResponse = await fetch(
          `${BREAD_BASE_URL}/wallet/${addr.bread_wallet_id}/balance`,
          {
            headers: {
              'Authorization': `Bearer ${BREAD_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        const balanceData = await balanceResponse.json();
        console.log(`   Bread Wallet Balance: ${JSON.stringify(balanceData)}`);
      } else {
        console.log(`   ❌ Error fetching Bread wallet:`, breadWallet);
      }
    } catch (err) {
      console.error(`   ❌ Error fetching Bread wallet details:`, err.message);
    }
  }
  
  console.log('\n✅ Done!\n');
}

getBreadWalletAddress().catch(console.error);

