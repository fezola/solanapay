import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

async function checkUserBalances(userEmail: string) {
  console.log(`🔍 Checking balances for user: ${userEmail}\n`);

  // Get user
  const { data: user } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', userEmail)
    .single();

  if (!user) {
    console.error('❌ User not found');
    return;
  }

  console.log(`✅ Found user: ${user.email} (${user.id})\n`);

  // Get deposit addresses
  const { data: addresses } = await supabase
    .from('deposit_addresses')
    .select('*')
    .eq('user_id', user.id);

  if (!addresses || addresses.length === 0) {
    console.error('❌ No deposit addresses found');
    return;
  }

  console.log(`📍 Deposit Addresses:\n`);
  
  // Group by network
  const baseAddresses = addresses.filter(a => a.network === 'base');
  const polygonAddresses = addresses.filter(a => a.network === 'polygon');
  const solanaAddresses = addresses.filter(a => a.network === 'solana');

  // Check Base balances
  if (baseAddresses.length > 0) {
    console.log('💎 BASE NETWORK:');
    const baseProvider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
    
    for (const addr of baseAddresses) {
      console.log(`   ${addr.asset_symbol}: ${addr.address}`);
      
      if (addr.asset_symbol === 'USDC') {
        const usdcContract = new ethers.Contract(
          process.env.BASE_USDC_CONTRACT!,
          ERC20_ABI,
          baseProvider
        );
        const balance = await usdcContract.balanceOf(addr.address);
        const formatted = ethers.formatUnits(balance, 6);
        console.log(`      Balance: ${formatted} USDC`);
      } else if (addr.asset_symbol === 'USDT') {
        const usdtContract = new ethers.Contract(
          process.env.BASE_USDT_CONTRACT!,
          ERC20_ABI,
          baseProvider
        );
        const balance = await usdtContract.balanceOf(addr.address);
        const formatted = ethers.formatUnits(balance, 6);
        console.log(`      Balance: ${formatted} USDT`);
      }
    }
    console.log();
  }

  // Check Polygon balances
  if (polygonAddresses.length > 0) {
    console.log('🟣 POLYGON NETWORK:');
    const polygonProvider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    
    for (const addr of polygonAddresses) {
      console.log(`   ${addr.asset_symbol}: ${addr.address}`);
      
      if (addr.asset_symbol === 'USDC') {
        const usdcContract = new ethers.Contract(
          process.env.POLYGON_USDC_CONTRACT!,
          ERC20_ABI,
          polygonProvider
        );
        const balance = await usdcContract.balanceOf(addr.address);
        const formatted = ethers.formatUnits(balance, 6);
        console.log(`      Balance: ${formatted} USDC`);
      } else if (addr.asset_symbol === 'USDT') {
        const usdtContract = new ethers.Contract(
          process.env.POLYGON_USDT_CONTRACT!,
          ERC20_ABI,
          polygonProvider
        );
        const balance = await usdtContract.balanceOf(addr.address);
        const formatted = ethers.formatUnits(balance, 6);
        console.log(`      Balance: ${formatted} USDT`);
      }
    }
    console.log();
  }

  // Check Solana addresses
  if (solanaAddresses.length > 0) {
    console.log('☀️ SOLANA NETWORK:');
    for (const addr of solanaAddresses) {
      console.log(`   ${addr.asset_symbol}: ${addr.address}`);
    }
    console.log('   (Check balances on Solana explorer)\n');
  }
}

const userEmail = process.argv[2] || 'fezola004@gmail.com';
checkUserBalances(userEmail).catch(console.error);

