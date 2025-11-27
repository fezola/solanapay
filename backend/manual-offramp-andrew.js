import fetch from 'node-fetch';
import 'dotenv/config';

const BREAD_API_URL = 'https://processor-prod.up.railway.app';
const BREAD_API_KEY = process.env.BREAD_API_KEY;

// Andrew's details
const BREAD_WALLET_ID = '6921925b5908e7571e4aad40';
const BENEFICIARY_ID = '6920d80e196a18d7bd675e03';
const AMOUNT = 4.996587; // USDC in Bread wallet
const ASSET = 'USDC_BASE';

async function manualOfframp() {
  console.log('\n🚀 Manual Offramp for Andrew\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Details:');
  console.log(`  Amount: ${AMOUNT} USDC`);
  console.log(`  Bank: United Bank For Africa`);
  console.log(`  Account: 2115710973`);
  console.log(`  Name: Ogunleye Oladele`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Step 1: Get quote
    console.log('Step 1: Getting quote from Bread Africa...');
    const quoteResponse = await fetch(`${BREAD_API_URL}/quote/offramp`, {
      method: 'POST',
      headers: {
        'x-service-key': BREAD_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: AMOUNT,
        currency: 'NGN',
        asset: ASSET,
        is_exact_output: false,
      }),
    });

    const quoteData = await quoteResponse.json();
    
    if (!quoteResponse.ok) {
      console.error('❌ Quote failed:', quoteData);
      return;
    }

    console.log('✅ Quote received:');
    console.log(`   Rate: ₦${quoteData.data.rate} per USDC`);
    console.log(`   You will receive: ₦${quoteData.data.output_amount.toLocaleString()}`);
    console.log(`   Fee: ${(quoteData.data.fee * 100).toFixed(2)}%`);
    console.log('');

    // Step 2: Execute offramp
    console.log('Step 2: Executing offramp...');
    const offrampResponse = await fetch(`${BREAD_API_URL}/offramp`, {
      method: 'POST',
      headers: {
        'x-service-key': BREAD_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wallet_id: BREAD_WALLET_ID,
        beneficiary_id: BENEFICIARY_ID,
        amount: AMOUNT,
        asset: ASSET,
      }),
    });

    const offrampData = await offrampResponse.json();

    if (!offrampResponse.ok) {
      console.error('❌ Offramp failed:', offrampData);
      console.log('\nPossible reasons:');
      console.log('1. Bread wallet doesn\'t have enough USDC');
      console.log('2. Beneficiary not verified');
      console.log('3. API key issue');
      return;
    }

    console.log('✅ Offramp initiated!');
    console.log(`   Transaction ID: ${offrampData.data.id}`);
    console.log(`   Status: ${offrampData.data.status}`);
    console.log(`   Amount: ₦${offrampData.data.output_amount?.toLocaleString() || quoteData.data.output_amount.toLocaleString()}`);
    console.log('');

    // Step 3: Check status
    console.log('Step 3: Checking status...');
    
    const checkStatus = async () => {
      const statusResponse = await fetch(`${BREAD_API_URL}/offramp/${offrampData.data.id}`, {
        headers: {
          'x-service-key': BREAD_API_KEY,
        },
      });

      const statusData = await statusResponse.json();
      
      console.log(`   Status: ${statusData.data?.status || 'unknown'}`);
      
      if (statusData.data?.status === 'success') {
        console.log('\n✅ OFFRAMP COMPLETE!');
        console.log(`   ₦${offrampData.data.output_amount?.toLocaleString() || quoteData.data.output_amount.toLocaleString()} sent to UBA 2115710973`);
        console.log('   Check your bank account!');
        return true;
      } else if (statusData.data?.status === 'failed') {
        console.log('\n❌ OFFRAMP FAILED!');
        console.log(`   Reason: ${statusData.data?.error || 'Unknown'}`);
        return true;
      }
      
      return false;
    };

    // Poll status every 10 seconds for up to 2 minutes
    let attempts = 0;
    const maxAttempts = 12;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      attempts++;
      
      const done = await checkStatus();
      if (done) break;
      
      if (attempts < maxAttempts) {
        console.log(`   Checking again in 10 seconds... (${attempts}/${maxAttempts})`);
      }
    }

    if (attempts >= maxAttempts) {
      console.log('\n⏱️  Status check timeout');
      console.log('   Transaction is still processing');
      console.log(`   Check status manually: ${BREAD_API_URL}/offramp/${offrampData.data.id}`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

manualOfframp();

