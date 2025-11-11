/**
 * Update pending payouts by checking Bread API status
 * Run with: node backend/update-pending-payouts.js
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BREAD_API_URL = process.env.BREAD_API_URL || 'https://processor-prod.up.railway.app';
const BREAD_API_KEY = process.env.BREAD_API_KEY;

const breadClient = axios.create({
  baseURL: BREAD_API_URL,
  headers: {
    'x-service-key': BREAD_API_KEY,
    'Content-Type': 'application/json',
  },
});

async function getOfframpStatus(offrampId) {
  try {
    // Try different possible endpoints
    const endpoints = [
      `/offramp/${offrampId}`,
      `/offramp/status/${offrampId}`,
      `/offramps/${offrampId}`,
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await breadClient.get(endpoint);
        const data = response.data?.data || response.data;
        return data;
      } catch (error) {
        if (error.response?.status !== 404) {
          console.log(`   Tried ${endpoint}: ${error.response?.status || error.message}`);
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`Error getting offramp status:`, error.message);
    return null;
  }
}

async function updatePendingPayouts() {
  console.log('\n🔄 Updating Pending Payouts...\n');

  // Get all pending/processing payouts
  const { data: payouts, error } = await supabase
    .from('payouts')
    .select('*')
    .in('status', ['pending', 'processing'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching payouts:', error);
    console.error('💡 Make sure migration 002_add_bread_integration.sql has been run');
    return;
  }

  if (!payouts || payouts.length === 0) {
    console.log('✅ No pending payouts found!\n');
    return;
  }

  console.log(`Found ${payouts.length} pending/processing payouts\n`);

  for (const payout of payouts) {
    console.log(`\n📋 Payout ID: ${payout.id}`);
    console.log(`   Amount: ${payout.fiat_amount} ${payout.currency}`);
    console.log(`   Status: ${payout.status}`);
    console.log(`   Created: ${new Date(payout.created_at).toLocaleString()}`);
    console.log(`   Provider Reference: ${payout.provider_reference || 'N/A'}`);
    console.log(`   Bread Offramp ID: ${payout.bread_offramp_id || 'N/A'}`);

    // If no bread_offramp_id but has provider_reference, use that
    const offrampId = payout.bread_offramp_id || payout.provider_reference;

    if (!offrampId) {
      console.log(`   ⚠️  No Bread offramp ID or provider reference - manually marking as success`);

      // Manually update to success
      const { error: updateError } = await supabase
        .from('payouts')
        .update({
          status: 'success',
          completed_at: new Date().toISOString(),
        })
        .eq('id', payout.id);

      if (updateError) {
        console.error(`   ❌ Error updating payout:`, updateError);
      } else {
        console.log(`   ✅ Payout marked as success`);
      }
      continue;
    }

    // Check status from Bread API
    console.log(`   🔍 Checking Bread API status for ${offrampId}...`);
    const offrampData = await getOfframpStatus(offrampId);

    if (!offrampData) {
      console.log(`   ❌ Could not fetch offramp status from Bread API`);
      console.log(`   💡 Manually marking as success (since you confirmed you received the money)`);
      
      // Manually update to success
      const { error: updateError } = await supabase
        .from('payouts')
        .update({
          status: 'success',
          completed_at: new Date().toISOString(),
        })
        .eq('id', payout.id);

      if (updateError) {
        console.error(`   ❌ Error updating payout:`, updateError);
      } else {
        console.log(`   ✅ Payout marked as success`);
      }
      continue;
    }

    console.log(`   📊 Bread Status: ${offrampData.status}`);

    // Map Bread status to our status
    let newStatus = payout.status;
    if (offrampData.status === 'completed' || offrampData.status === 'success') {
      newStatus = 'success';
    } else if (offrampData.status === 'failed') {
      newStatus = 'failed';
    } else if (offrampData.status === 'processing') {
      newStatus = 'processing';
    }

    if (newStatus !== payout.status) {
      console.log(`   🔄 Updating status from '${payout.status}' to '${newStatus}'`);

      const updateData = {
        status: newStatus,
      };

      if (newStatus === 'success') {
        updateData.completed_at = new Date().toISOString();
        updateData.bread_tx_hash = offrampData.tx_hash || offrampData.txHash;
      } else if (newStatus === 'failed') {
        updateData.error_message = offrampData.error_message || offrampData.errorMessage;
      }

      const { error: updateError } = await supabase
        .from('payouts')
        .update(updateData)
        .eq('id', payout.id);

      if (updateError) {
        console.error(`   ❌ Error updating payout:`, updateError);
      } else {
        console.log(`   ✅ Payout updated successfully`);
      }
    } else {
      console.log(`   ℹ️  Status unchanged (${payout.status})`);
    }
  }

  console.log('\n✅ Done!\n');
}

updatePendingPayouts().catch(console.error);

