import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// Check multiple possible Solana addresses
const addresses = [
  'CmZzUSAux8ahGDrPfLEx8c3oJMKSisycMqUdx8ZSDRbW', // From .env SOLANA_TREASURY_ADDRESS
  'CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG', // From .env PLATFORM_TREASURY_ADDRESS_SOLANA
  '7uTT8Xi5RWXzy7h9XL244GRgEycDYDhLjr3ZyNdXi8pZ', // The address you mentioned earlier
];

async function checkSolanaAddresses() {
  console.log('\n🔍 CHECKING ALL SOLANA ADDRESSES\n');
  console.log('='.repeat(80));

  const connection = new Connection(SOLANA_RPC, 'confirmed');

  for (const address of addresses) {
    console.log(`\n📍 ${address}`);
    console.log('-'.repeat(80));

    try {
      const publicKey = new PublicKey(address);

      // SOL balance
      const solBalance = await connection.getBalance(publicKey);
      const solFormatted = (solBalance / LAMPORTS_PER_SOL).toFixed(6);
      const solUSD = (parseFloat(solFormatted) * 200).toFixed(2);
      console.log(`  💎 SOL: ${solFormatted} SOL (~$${solUSD})`);

      // USDC balance
      const usdcMint = new PublicKey(USDC_MINT);
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        mint: usdcMint,
      });

      if (tokenAccounts.value.length > 0) {
        const usdcBalance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        console.log(`  💵 USDC: ${usdcBalance} USDC`);
        
        if (usdcBalance >= 30) {
          console.log(`  ✅ THIS IS THE WALLET WITH $30 USDC!`);
        }
      } else {
        console.log(`  💵 USDC: 0 USDC (no token account)`);
      }

      console.log(`  🔗 Solscan: https://solscan.io/account/${address}`);

    } catch (error) {
      console.error(`  ❌ Error:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n');
}

checkSolanaAddresses();

