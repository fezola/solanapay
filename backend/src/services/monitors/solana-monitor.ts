import { PublicKey } from '@solana/web3.js';
import { supabaseAdmin } from '../../utils/supabase.js';
import { solanaWalletService } from '../wallet/solana.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';

export class SolanaMonitor {
  private isRunning = false;
  private pollInterval = 10000; // 10 seconds
  // private lastProcessedSlot = 0; // Unused for now, but kept for future use

  /**
   * Start monitoring Solana deposits
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Solana monitor already running');
      return;
    }

    this.isRunning = true;
    logger.info('🔍 Starting Solana deposit monitor...');

    // Get all active deposit addresses
    const { data: addresses, error } = await supabaseAdmin
      .from('deposit_addresses')
      .select('*')
      .eq('network', 'solana');

    if (error) {
      logger.error('Failed to fetch deposit addresses:', error);
      return;
    }

    logger.info(`Monitoring ${addresses?.length || 0} Solana addresses`);

    // Start polling
    this.poll();
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.isRunning = false;
    logger.info('Stopped Solana monitor');
  }

  /**
   * Poll for new transactions
   */
  private async poll() {
    while (this.isRunning) {
      try {
        await this.checkDeposits();
      } catch (error) {
        logger.error('Error in Solana monitor poll:', error);
      }

      await new Promise((resolve) => setTimeout(resolve, this.pollInterval));
    }
  }

  /**
   * Check for new deposits
   */
  private async checkDeposits() {
    const { data: addresses } = await supabaseAdmin
      .from('deposit_addresses')
      .select('*')
      .eq('network', 'solana');

    if (!addresses || addresses.length === 0) return;

    const connection = solanaWalletService.getConnection();

    for (const depositAddress of addresses) {
      try {
        const publicKey = new PublicKey(depositAddress.address);

        // Check SOL deposits
        if (depositAddress.asset_symbol === 'SOL') {
          const signatures = await connection.getSignaturesForAddress(publicKey, {
            limit: 10,
          });

          for (const sig of signatures) {
            await this.processSOLTransaction(
              sig.signature,
              depositAddress.user_id,
              depositAddress.id,
              depositAddress.address
            );
          }
        }

        // Check USDC/USDT deposits (SPL tokens)
        if (depositAddress.asset_symbol === 'USDC' || depositAddress.asset_symbol === 'USDT') {
          const signatures = await connection.getSignaturesForAddress(publicKey, {
            limit: 10,
          });

          for (const sig of signatures) {
            await this.processSPLTransaction(
              sig.signature,
              depositAddress.user_id,
              depositAddress.id,
              depositAddress.address,
              depositAddress.asset_symbol
            );
          }
        }
      } catch (error) {
        logger.error(`Error checking address ${depositAddress.address}:`, error);
      }
    }
  }

  /**
   * Process SOL transaction
   */
  private async processSOLTransaction(
    signature: string,
    userId: string,
    depositAddressId: string,
    address: string
  ) {
    // Check if already processed
    const { data: existing } = await supabaseAdmin
      .from('onchain_deposits')
      .select('id')
      .eq('tx_hash', signature)
      .eq('chain', 'solana')
      .single();

    if (existing) return; // Already processed

    const connection = solanaWalletService.getConnection();
    const tx = await connection.getTransaction(signature, {
      commitment: 'finalized',
      maxSupportedTransactionVersion: 0,
    });

    if (!tx || !tx.meta) return;

    // Find the transfer to our address
    const publicKey = new PublicKey(address);
    const accountIndex = tx.transaction.message.staticAccountKeys.findIndex(
      (key) => key.equals(publicKey)
    );

    if (accountIndex === -1) return;

    const preBalance = tx.meta.preBalances[accountIndex];
    const postBalance = tx.meta.postBalances[accountIndex];
    const amount = (postBalance - preBalance) / 1e9; // Convert lamports to SOL

    if (amount <= 0) return; // Not a deposit

    // Record deposit
    const { error } = await supabaseAdmin.from('onchain_deposits').insert({
      user_id: userId,
      deposit_address_id: depositAddressId,
      chain: 'solana',
      asset: 'SOL',
      address,
      tx_hash: signature,
      amount: amount.toString(),
      confirmations: 1, // Finalized = confirmed
      required_confirmations: env.MIN_CONFIRMATIONS_SOLANA,
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      block_number: tx.slot,
      from_address: tx.transaction.message.staticAccountKeys[0].toBase58(),
    });

    if (error) {
      logger.error('Failed to record SOL deposit:', error);
      return;
    }

    logger.info(`✅ Detected SOL deposit: ${amount} SOL (${signature})`);

    // Trigger sweep if above threshold
    if (amount >= 0.1) {
      await this.triggerSweep(depositAddressId, 'SOL', amount);
    }
  }

  /**
   * Process SPL token transaction
   */
  private async processSPLTransaction(
    signature: string,
    userId: string,
    depositAddressId: string,
    address: string,
    asset: 'USDC' | 'USDT'
  ) {
    // Check if already processed
    const { data: existing } = await supabaseAdmin
      .from('onchain_deposits')
      .select('id')
      .eq('tx_hash', signature)
      .eq('chain', 'solana')
      .single();

    if (existing) return;

    const connection = solanaWalletService.getConnection();
    const tx = await connection.getParsedTransaction(signature, {
      commitment: 'finalized',
      maxSupportedTransactionVersion: 0,
    });

    if (!tx || !tx.meta) return;

    // Get the correct mint address for the asset
    const mintAddress = asset === 'USDC' ? env.USDC_SOL_MINT : env.USDT_SOL_MINT;

    // Compare pre and post token balances to detect deposits
    const preBalances = tx.meta.preTokenBalances || [];
    const postBalances = tx.meta.postTokenBalances || [];

    // Find token accounts for our address and the correct mint
    for (const postBalance of postBalances) {
      // Check if this is our address and the correct token mint
      if (postBalance.owner !== address || postBalance.mint !== mintAddress) {
        continue;
      }

      // Find the corresponding pre-balance
      const preBalance = preBalances.find(
        (pre) => pre.accountIndex === postBalance.accountIndex
      );

      const preAmount = preBalance?.uiTokenAmount?.uiAmount || 0;
      const postAmount = postBalance.uiTokenAmount?.uiAmount || 0;
      const depositAmount = postAmount - preAmount;

      // Only process if there was an increase (deposit)
      if (depositAmount <= 0) continue;

      // Record deposit
      const { error } = await supabaseAdmin.from('onchain_deposits').insert({
        user_id: userId,
        deposit_address_id: depositAddressId,
        chain: 'solana',
        asset,
        address,
        tx_hash: signature,
        amount: depositAmount.toString(),
        confirmations: 1,
        required_confirmations: env.MIN_CONFIRMATIONS_SOLANA,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        block_number: tx.slot,
      });

      if (error) {
        logger.error(`Failed to record ${asset} deposit:`, error);
        continue;
      }

      logger.info(`✅ Detected ${asset} deposit: ${depositAmount} ${asset} (${signature})`);

      // Trigger sweep
      if (depositAmount >= 10) {
        await this.triggerSweep(depositAddressId, asset, depositAmount);
      }
    }
  }

  /**
   * Trigger auto-sweep to treasury
   */
  private async triggerSweep(depositAddressId: string, asset: string, amount: number) {
    logger.info(`Triggering sweep for ${amount} ${asset}`);
    
    // Get deposit address with encrypted key
    const { data: depositAddress } = await supabaseAdmin
      .from('deposit_addresses')
      .select('*')
      .eq('id', depositAddressId)
      .single();

    if (!depositAddress || !depositAddress.encrypted_private_key) {
      logger.error('Cannot sweep: no private key found');
      return;
    }

    try {
      let txHash: string;

      if (asset === 'SOL') {
        txHash = await solanaWalletService.sweepSOL(
          depositAddress.encrypted_private_key,
          amount
        );
      } else if (asset === 'USDC') {
        txHash = await solanaWalletService.sweepUSDC(
          depositAddress.encrypted_private_key,
          amount
        );
      } else if (asset === 'USDT') {
        txHash = await solanaWalletService.sweepUSDT(
          depositAddress.encrypted_private_key,
          amount
        );
      } else {
        return;
      }

      // Update deposit record
      await supabaseAdmin
        .from('onchain_deposits')
        .update({
          status: 'swept',
          swept_at: new Date().toISOString(),
        })
        .eq('deposit_address_id', depositAddressId)
        .eq('status', 'confirmed');

      logger.info(`✅ Swept ${amount} ${asset} to treasury: ${txHash}`);
    } catch (error) {
      logger.error('Sweep failed:', error);
    }
  }
}

export const solanaMonitor = new SolanaMonitor();

