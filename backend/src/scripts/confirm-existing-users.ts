/**
 * Script to confirm all existing unconfirmed users
 * Run this after disabling email confirmation in Supabase
 * 
 * Usage: npx tsx src/scripts/confirm-existing-users.ts
 */

import { supabaseAdmin } from '../utils/supabase.js';
import { logger } from '../utils/logger.js';

async function confirmExistingUsers() {
  try {
    logger.info('🔍 Fetching all users...');

    // Get all users using admin API
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      logger.error({ error }, 'Failed to fetch users');
      throw error;
    }

    logger.info(`Found ${users.length} total users`);

    // Filter unconfirmed users
    const unconfirmedUsers = users.filter(user => !user.email_confirmed_at);

    logger.info(`Found ${unconfirmedUsers.length} unconfirmed users`);

    if (unconfirmedUsers.length === 0) {
      logger.info('✅ All users are already confirmed!');
      return;
    }

    // Confirm each user
    let confirmedCount = 0;
    let errorCount = 0;

    for (const user of unconfirmedUsers) {
      try {
        logger.info(`Confirming user: ${user.email} (${user.id})`);

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          { email_confirm: true }
        );

        if (updateError) {
          logger.error({ error: updateError, userId: user.id }, 'Failed to confirm user');
          errorCount++;
        } else {
          logger.info(`✅ Confirmed: ${user.email}`);
          confirmedCount++;
        }
      } catch (err) {
        logger.error({ error: err, userId: user.id }, 'Error confirming user');
        errorCount++;
      }
    }

    logger.info('📊 Summary:');
    logger.info(`  Total users: ${users.length}`);
    logger.info(`  Unconfirmed users: ${unconfirmedUsers.length}`);
    logger.info(`  Successfully confirmed: ${confirmedCount}`);
    logger.info(`  Errors: ${errorCount}`);

    if (confirmedCount > 0) {
      logger.info('✅ Users can now log in without email confirmation!');
    }

  } catch (error) {
    logger.error({ error }, 'Script failed');
    process.exit(1);
  }
}

// Run the script
confirmExistingUsers()
  .then(() => {
    logger.info('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error({ error }, 'Script failed');
    process.exit(1);
  });

