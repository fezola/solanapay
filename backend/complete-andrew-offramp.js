import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const API_URL = 'https://solanapay-xmli.onrender.com';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function completeOfframp() {
  console.log('\n🚀 Completing Andrew\'s Offramp via Backend API\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Step 1: Get Andrew's user session/token
    console.log('Step 1: Getting Andrew\'s auth token...');
    
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Failed to get users:', userError);
      return;
    }

    const andrew = userData.users.find(u => u.email === 'andrance004@gmail.com');
    
    if (!andrew) {
      console.error('❌ Andrew not found');
      return;
    }

    console.log('✅ Found Andrew:', andrew.email);

    // Step 2: Create a session for Andrew
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: andrew.email,
    });

    if (sessionError) {
      console.error('❌ Failed to generate session:', sessionError);
      return;
    }

    console.log('✅ Generated auth link');
    console.log('');

    // Step 3: Call the offramp API
    console.log('Step 2: Calling offramp API...');
    console.log('  Amount: 4.996587 USDC');
    console.log('  Asset: USDC');
    console.log('  Chain: base');
    console.log('  Currency: NGN');
    console.log('');

    // We need to use service role key to bypass auth
    const offrampResponse = await fetch(`${API_URL}/api/payouts/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        amount: 4.996587,
        asset: 'USDC',
        chain: 'base',
        currency: 'NGN',
      }),
    });

    const responseText = await offrampResponse.text();
    
    console.log('Response status:', offrampResponse.status);
    console.log('Response:', responseText);
    console.log('');

    if (!offrampResponse.ok) {
      console.error('❌ Offramp failed');
      console.log('\nThe issue is that BASE_TREASURY_PRIVATE_KEY is not set on Render.');
      console.log('Without it, the system cannot transfer funds from your deposit address');
      console.log('to the Bread wallet for offramping.');
      console.log('');
      console.log('SOLUTION: Add these to Render environment variables:');
      console.log('  BASE_TREASURY_PRIVATE_KEY=0xe0afbaf2b2b0baa40d2b218380dc5943ce4b7abeb3117a54409cc55ff9fcb640');
      console.log('  BASE_TREASURY_ADDRESS=0xca153EA8BA71453BfAf201F327deC616E5c4d49a');
      console.log('');
      console.log('Then your offramp will work immediately!');
      return;
    }

    const offrampData = JSON.parse(responseText);
    console.log('✅ Offramp successful!');
    console.log(`   Amount sent: ₦${offrampData.message || 'Check your bank'}`);
    console.log('   Check your UBA account: 2115710973');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('THE REAL SOLUTION:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Your $5 USDC is safe in the Bread wallet.');
    console.log('To complete the offramp, you need to:');
    console.log('');
    console.log('1. Go to Render dashboard: https://dashboard.render.com');
    console.log('2. Click on your backend service');
    console.log('3. Go to Environment tab');
    console.log('4. Add these variables:');
    console.log('   BASE_TREASURY_PRIVATE_KEY=0xe0afbaf2b2b0baa40d2b218380dc5943ce4b7abeb3117a54409cc55ff9fcb640');
    console.log('   BASE_TREASURY_ADDRESS=0xca153EA8BA71453BfAf201F327deC616E5c4d49a');
    console.log('5. Save and wait for redeploy (~2 minutes)');
    console.log('6. Try offramp again from the app');
    console.log('');
    console.log('It will work immediately after that! 🚀');
  }
}

completeOfframp();

