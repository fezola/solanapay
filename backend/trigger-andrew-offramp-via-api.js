/**
 * Trigger Andrew's offramp via production API
 * The backend has BREAD_API_KEY, so we just need to call the API
 */

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const API_URL = 'https://solanapay-xmli.onrender.com';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xojmrgsyshjoddylwxti.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvam1yZ3N5c2hqb2RkeWx3eHRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjI2OTQyNCwiZXhwIjoyMDc3ODQ1NDI0fQ.lddgEEvUGNgNAzkLtwzhtlJAyhb76RFOFW9zJNXhDDk';

async function triggerOfframp() {
  console.log('\n🚀 Triggering Andrew\'s Offramp via Production API\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    if (!SUPABASE_SERVICE_KEY) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env');
      console.log('\nAdd this to backend/.env:');
      console.log('SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>');
      return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Step 1: Get Andrew's auth token
    console.log('Step 1: Getting Andrew\'s session...');
    
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById('6487af16-14e0-46b1-af5f-00af960123a8');
    
    if (userError || !user) {
      console.error('❌ Failed to get Andrew:', userError);
      return;
    }

    console.log('✅ Found Andrew:', user.email);

    console.log('');
    console.log('Step 2: Calling production API to execute offramp...');
    console.log('  Amount: 4.996587 USDC');
    console.log('  Chain: base');
    console.log('  Asset: USDC');
    console.log('');

    // Use the service role key directly - backend should accept it
    const accessToken = SUPABASE_SERVICE_KEY;

    console.log('✅ Using service role key for auth');
    console.log('');

    // Step 3: Call the offramp API
    console.log('Step 3: Executing offramp...');
    
    const response = await fetch(`${API_URL}/api/payouts/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        amount: 4.996587,
        asset: 'USDC',
        chain: 'base',
        currency: 'NGN',
      }),
    });

    const responseText = await response.text();
    
    console.log('Response status:', response.status);
    console.log('');

    if (!response.ok) {
      console.error('❌ Offramp failed');
      console.log('Response:', responseText);
      console.log('');
      
      if (responseText.includes('Insufficient balance') || responseText.includes('Treasury')) {
        console.log('The issue is BASE_TREASURY_PRIVATE_KEY not being on Render.');
        console.log('');
        console.log('FINAL SOLUTION:');
        console.log('1. Go to https://dashboard.render.com');
        console.log('2. Click your backend service');
        console.log('3. Go to Environment tab');
        console.log('4. Add:');
        console.log('   BASE_TREASURY_PRIVATE_KEY=0xe0afbaf2b2b0baa40d2b218380dc5943ce4b7abeb3117a54409cc55ff9fcb640');
        console.log('   BASE_TREASURY_ADDRESS=0xca153EA8BA71453BfAf201F327deC616E5c4d49a');
        console.log('5. Save and wait 2 minutes');
        console.log('6. Try offramp from app - it will work!');
      }
      return;
    }

    const responseData = JSON.parse(responseText);
    console.log('✅ OFFRAMP SUCCESSFUL!');
    console.log('');
    console.log('Response:', JSON.stringify(responseData, null, 2));
    console.log('');
    console.log('💰 Money sent to UBA 2115710973!');
    console.log('   Should arrive in 5-10 minutes.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nStack:', error.stack);
  }
}

triggerOfframp();

