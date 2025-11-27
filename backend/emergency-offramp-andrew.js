/**
 * EMERGENCY SCRIPT: Complete Andrew's stuck offramp
 * 
 * His $5 USDC is stuck in Bread wallet because BASE_TREASURY_PRIVATE_KEY
 * is not on Render. This script calls Bread Africa API directly to complete
 * the offramp from the Bread wallet to his bank account.
 */

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const BREAD_API_URL = 'https://processor-prod.up.railway.app';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Andrew's details from database
const ANDREW_USER_ID = '6487af16-14e0-46b1-af5f-00af960123a8';
const BREAD_WALLET_ID = '6921925b5908e7571e4aad40';
const BENEFICIARY_ID = '6920d80e196a18d7bd675e03';
const AMOUNT = 4.996587;
const ASSET = 'base:usdc';

async function emergencyOfframp() {
  console.log('\n🚨 EMERGENCY OFFRAMP FOR ANDREW\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('User: andrew (andrance004@gmail.com)');
  console.log('Amount: 4.996587 USDC on Base');
  console.log('Bank: UBA 2115710973 (Ogunleye Oladele)');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Check if we have BREAD_API_KEY locally
    console.log('⚠️  This script needs BREAD_API_KEY to work.');
    console.log('   The key is stored on Render, not in local .env\n');

    const BREAD_API_KEY = process.env.BREAD_API_KEY;
    
    if (!BREAD_API_KEY) {
      console.log('❌ BREAD_API_KEY not found in local .env\n');
      console.log('SOLUTION: Get the BREAD_API_KEY from Render and add it to .env:');
      console.log('');
      console.log('1. Go to: https://dashboard.render.com');
      console.log('2. Click on your backend service');
      console.log('3. Go to Environment tab');
      console.log('4. Find BREAD_API_KEY and copy its value');
      console.log('5. Add to backend/.env:');
      console.log('   BREAD_API_KEY=<paste-value-here>');
      console.log('6. Run this script again');
      console.log('');
      console.log('OR - Just add BASE_TREASURY_PRIVATE_KEY to Render and try offramp from app!');
      return;
    }

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

    if (!quoteResponse.ok) {
      const errorData = await quoteResponse.json();
      console.error('❌ Quote failed:', errorData);
      return;
    }

    const quoteData = await quoteResponse.json();
    console.log('✅ Quote received:');
    console.log(`   Rate: ₦${quoteData.data.rate} per USDC`);
    console.log(`   You will receive: ₦${quoteData.data.output_amount.toLocaleString()}`);
    console.log('');

    // Step 2: Execute offramp
    console.log('Step 2: Executing offramp to bank account...');
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

    if (!offrampResponse.ok) {
      const errorData = await offrampResponse.json();
      console.error('❌ Offramp failed:', errorData);
      return;
    }

    const offrampData = await offrampResponse.json();
    console.log('✅ OFFRAMP SUCCESSFUL!');
    console.log(`   Transaction ID: ${offrampData.data.id}`);
    console.log(`   Status: ${offrampData.data.status}`);
    console.log(`   Amount: ₦${offrampData.data.output_amount?.toLocaleString() || quoteData.data.output_amount.toLocaleString()}`);
    console.log('');
    console.log('💰 Money is on the way to UBA 2115710973!');
    console.log('   Should arrive within 5-10 minutes.');
    console.log('');

    // Save to database
    console.log('Step 3: Saving to database...');

    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data: payout, error } = await supabase
        .from('payouts')
        .insert({
          user_id: ANDREW_USER_ID,
          beneficiary_id: BENEFICIARY_ID,
          fiat_amount: (quoteData.data.output_amount || 0).toString(),
          currency: 'NGN',
          provider: 'bread',
          provider_reference: offrampData.data.id,
          status: 'processing',
        })
        .select()
        .single();

      if (error) {
        console.log('⚠️  Failed to save to database:', error.message);
        console.log('   But the offramp was successful! Money is on the way.');
      } else {
        console.log('✅ Saved to database');
      }
    } else {
      console.log('⚠️  Supabase credentials not found, skipping database save');
      console.log('   But the offramp was successful! Money is on the way.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

emergencyOfframp();

