require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  console.log('Testing Supabase relation query...\n');
  
  // Test the exact query the admin endpoint uses
  const { data, error } = await supabase
    .from('payouts')
    .select(`
      *,
      user:users(id, email, full_name),
      quote:quotes(*)
    `)
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (error) {
    console.log('Error:', error);
    return;
  }
  
  console.log('Results:');
  data.forEach((p, i) => {
    console.log(`\n--- Payout ${i + 1} ---`);
    console.log('ID:', p.id);
    console.log('user_id:', p.user_id);
    console.log('quote_id:', p.quote_id);
    console.log('user:', p.user);
    console.log('quote:', p.quote ? { asset: p.quote.crypto_asset, network: p.quote.crypto_network } : null);
  });
}

test().catch(console.error);

