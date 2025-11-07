import { ethers } from 'ethers';
import { supabaseAdmin } from '../../utils/supabase.js';
import { baseWalletService } from '../wallet/base.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';

// ERC20 Transfer event signature (unused for now, but kept for future use)
// const ERC20_TRANSFER_EVENT = 'Transfer(address,address,uint256)';

export class BaseMonitor {
  private isRunning = false;
  private pollInterval = 12000; // 12 seconds (Base block time)
  private lastProcessedBlock = 0;

  /**
   * Start monitoring Base deposits
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Base monitor already running');
      return;
    }

    this.isRunning = true;
    logger.info('🔍 Starting Base deposit monitor...');

    const provider = baseWalletService.getProvider();
    this.lastProcessedBlock = await provider.getBlockNumber();

    logger.info(`Starting from block ${this.lastProcessedBlock}`);

    // Start polling
    this.poll();
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.isRunning = false;
    logger.info('Stopped Base monitor');
  }

  /**
   * Poll for new blocks
   */
  private async poll() {
    while (this.isRunning) {
      try {
        await this.checkDeposits();
      } catch (error) {
        logger.error('Error in Base monitor poll:', error);
      }

      await new Promise((resolve) => setTimeout(resolve, this.pollInterval));
    }
  }

  /**
   * Check for new deposits
   */
  private async checkDeposits() {
    const provider = baseWalletService.getProvider();
    const currentBlock = await provider.getBlockNumber();

    if (currentBlock <= this.lastProcessedBlock) {
      return; // No new blocks
    }

    // Get all active deposit addresses
    const { data: addresses } = await supabaseAdmin
      .from('deposit_addresses')
      .select('*')
      .eq('network', 'base');

    if (!addresses || addresses.length === 0) {
      this.lastProcessedBlock = currentBlock;
      return;
    }

    // Check blocks from last processed to current
    const fromBlock = this.lastProcessedBlock + 1;
    const toBlock = Math.min(currentBlock, fromBlock + 100); // Process max 100 blocks at a time

    logger.debug(`Checking Base blocks ${fromBlock} to ${toBlock}`);

    for (const depositAddress of addresses) {
      try {
        // Check ETH deposits
        if (depositAddress.asset === 'ETH') {
          await this.checkETHDeposits(depositAddress, fromBlock, toBlock);
        }

        // Check USDC deposits
        if (depositAddress.asset === 'USDC') {
          await this.checkUSDCDeposits(depositAddress, fromBlock, toBlock);
        }
      } catch (error) {
        logger.error(`Error checking address ${depositAddress.address}:`, error);
      }
    }

    this.lastProcessedBlock = toBlock;
  }

  /**
   * Check ETH deposits
   */
  private async checkETHDeposits(
    depositAddress: any,
    fromBlock: number,
    toBlock: number
  ) {
    const provider = baseWalletService.getProvider();

    // Get transaction history for address (unused for now, but kept for future use)
    await provider.send('eth_getLogs', [
      {
        fromBlock: ethers.toQuantity(fromBlock),
        toBlock: ethers.toQuantity(toBlock),
        address: depositAddress.address,
      },
    ]);

    // Note: ETH transfers don't emit events, need to check transactions directly
    for (let blockNum = fromBlock; blockNum <= toBlock; blockNum++) {
      const block = await provider.getBlock(blockNum, true);
      if (!block || !block.transactions) continue;

      for (const txData of block.transactions) {
        if (typeof txData === 'string') continue;

        const tx = txData as any; // Type assertion for transaction object
        if (tx.to?.toLowerCase() === depositAddress.address.toLowerCase() && tx.value > 0n) {
          await this.processETHDeposit(tx, depositAddress);
        }
      }
    }
  }

  /**
   * Process ETH deposit
   */
  private async processETHDeposit(tx: any, depositAddress: any) {
    // Check if already processed
    const { data: existing } = await supabaseAdmin
      .from('onchain_deposits')
      .select('id')
      .eq('tx_hash', tx.hash)
      .eq('chain', 'base')
      .single();

    if (existing) return;

    const amount = parseFloat(ethers.formatEther(tx.value));

    // Get current confirmations
    const provider = baseWalletService.getProvider();
    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - tx.blockNumber + 1;

    const status = confirmations >= env.MIN_CONFIRMATIONS_BASE ? 'confirmed' : 'confirming';

    // Record deposit
    const { error } = await supabaseAdmin.from('onchain_deposits').insert({
      user_id: depositAddress.user_id,
      deposit_address_id: depositAddress.id,
      chain: 'base',
      asset: 'ETH',
      address: depositAddress.address,
      tx_hash: tx.hash,
      amount: amount.toString(),
      confirmations,
      required_confirmations: env.MIN_CONFIRMATIONS_BASE,
      status,
      confirmed_at: status === 'confirmed' ? new Date().toISOString() : null,
      block_number: tx.blockNumber,
      from_address: tx.from,
    });

    if (error) {
      logger.error('Failed to record ETH deposit:', error);
      return;
    }

    logger.info(`✅ Detected ETH deposit: ${amount} ETH (${tx.hash})`);

    if (status === 'confirmed' && amount >= 0.01) {
      await this.triggerSweep(depositAddress.id, 'ETH', amount);
    }
  }

  /**
   * Check USDC deposits
   */
  private async checkUSDCDeposits(
    depositAddress: any,
    fromBlock: number,
    toBlock: number
  ) {
    const provider = baseWalletService.getProvider();
    const usdcContract = new ethers.Contract(
      env.BASE_USDC_CONTRACT,
      ['event Transfer(address indexed from, address indexed to, uint256 value)'],
      provider
    );

    // Query Transfer events to our address
    const filter = usdcContract.filters.Transfer(null, depositAddress.address);
    const events = await usdcContract.queryFilter(filter, fromBlock, toBlock);

    for (const event of events) {
      await this.processUSDCDeposit(event, depositAddress);
    }
  }

  /**
   * Process USDC deposit
   */
  private async processUSDCDeposit(event: any, depositAddress: any) {
    const txHash = event.transactionHash;

    // Check if already processed
    const { data: existing } = await supabaseAdmin
      .from('onchain_deposits')
      .select('id')
      .eq('tx_hash', txHash)
      .eq('chain', 'base')
      .single();

    if (existing) return;

    const amount = parseFloat(ethers.formatUnits(event.args.value, 6)); // USDC has 6 decimals

    // Get current confirmations
    const provider = baseWalletService.getProvider();
    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - event.blockNumber + 1;

    const status = confirmations >= env.MIN_CONFIRMATIONS_BASE ? 'confirmed' : 'confirming';

    // Record deposit
    const { error } = await supabaseAdmin.from('onchain_deposits').insert({
      user_id: depositAddress.user_id,
      deposit_address_id: depositAddress.id,
      chain: 'base',
      asset: 'USDC',
      address: depositAddress.address,
      tx_hash: txHash,
      amount: amount.toString(),
      confirmations,
      required_confirmations: env.MIN_CONFIRMATIONS_BASE,
      status,
      confirmed_at: status === 'confirmed' ? new Date().toISOString() : null,
      block_number: event.blockNumber,
      from_address: event.args.from,
    });

    if (error) {
      logger.error('Failed to record USDC deposit:', error);
      return;
    }

    logger.info(`✅ Detected USDC deposit: ${amount} USDC (${txHash})`);

    if (status === 'confirmed' && amount >= 10) {
      await this.triggerSweep(depositAddress.id, 'USDC', amount);
    }
  }

  /**
   * Trigger auto-sweep to treasury
   */
  private async triggerSweep(depositAddressId: string, asset: string, amount: number) {
    logger.info(`Triggering sweep for ${amount} ${asset}`);

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

      if (asset === 'ETH') {
        txHash = await baseWalletService.sweepETH(
          depositAddress.encrypted_private_key,
          amount
        );
      } else if (asset === 'USDC') {
        txHash = await baseWalletService.sweepUSDC(
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

export const baseMonitor = new BaseMonitor();

