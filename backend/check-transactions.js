import { Connection, PublicKey } from '@solana/web3.js';

const YOUR_DEPOSIT_WALLET = 'An3XCzaVEj2jbCU8qgLW4C4WKKZdt2Y5YX88bx4ePSGa';
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

async function checkTransactions() {
  console.log('\n🔍 CHECKING RECENT TRANSACTIONS...\n');
  
  const yourWalletPubkey = new PublicKey(YOUR_DEPOSIT_WALLET);
  const signatures = await connection.getSignaturesForAddress(yourWalletPubkey, { limit: 10 });
  
  for (const sig of signatures) {
    const tx = await connection.getParsedTransaction(sig.signature, {
      maxSupportedTransactionVersion: 0,
    });
    
    const date = new Date(sig.blockTime * 1000).toLocaleString();
    console.log(`\n📜 Transaction: ${sig.signature}`);
    console.log(`   Time: ${date}`);
    console.log(`   Status: ${sig.err ? '❌ FAILED' : '✅ SUCCESS'}`);
    
    if (tx && tx.meta && tx.meta.postTokenBalances) {
      console.log('   Token Transfers:');
      
      // Find USDC transfers
      const preBalances = tx.meta.preTokenBalances || [];
      const postBalances = tx.meta.postTokenBalances || [];
      
      for (let i = 0; i < postBalances.length; i++) {
        const post = postBalances[i];
        const pre = preBalances.find(p => p.accountIndex === post.accountIndex);
        
        if (post.mint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') { // USDC
          const preAmount = pre ? Number(pre.uiTokenAmount.uiAmount) : 0;
          const postAmount = Number(post.uiTokenAmount.uiAmount);
          const change = postAmount - preAmount;
          
          console.log(`     Account ${post.accountIndex}: ${preAmount} → ${postAmount} USDC (${change > 0 ? '+' : ''}${change})`);
          console.log(`     Owner: ${post.owner}`);
        }
      }
    }
    
    // Check for errors
    if (tx && tx.meta && tx.meta.err) {
      console.log(`   ❌ Error: ${JSON.stringify(tx.meta.err)}`);
    }
    
    // Check logs for errors
    if (tx && tx.meta && tx.meta.logMessages) {
      const errorLogs = tx.meta.logMessages.filter(log => 
        log.includes('Error') || log.includes('failed') || log.includes('insufficient')
      );
      if (errorLogs.length > 0) {
        console.log('   ⚠️ Error Logs:');
        errorLogs.forEach(log => console.log(`     ${log}`));
      }
    }
  }
}

checkTransactions().catch(console.error);

