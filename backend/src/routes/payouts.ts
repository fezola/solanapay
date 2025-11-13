import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { supabaseAdmin } from '../utils/supabase.js';
import { BreadService } from '../services/bread/index.js';
import { env } from '../config/env.js';
import { nanoid } from 'nanoid';
import type { Asset, Chain } from '../types/index.js';

// Initialize Bread service
const breadService = new BreadService({
  apiKey: env.BREAD_API_KEY!,
  baseUrl: env.BREAD_API_URL,
});

const createBeneficiarySchema = z.object({
  bank_code: z.string(),
  account_number: z.string().length(10),
  bread_beneficiary_id: z.string().optional(), // Optional - if already verified
  account_name: z.string().optional(), // Optional - if already verified
});

const confirmQuoteSchema = z.object({
  quote_id: z.string().uuid(),
  beneficiary_id: z.string().uuid(),
});

const executeOfframpSchema = z.object({
  asset: z.string(),
  chain: z.string(),
  amount: z.number().positive(),
  currency: z.string().default('NGN'),
  beneficiary_id: z.string().uuid(),
});

const getRateSchema = z.object({
  asset: z.enum(['USDC', 'SOL', 'USDT', 'ETH']).optional().default('USDC'),
  chain: z.enum(['solana', 'base', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'bsc']).optional().default('solana'),
  currency: z.enum(['NGN']).optional().default('NGN'),
});

const getQuoteSchema = z.object({
  asset: z.enum(['USDC', 'SOL', 'USDT', 'ETH']),
  chain: z.enum(['solana', 'base', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'bsc']),
  amount: z.number().positive(),
  currency: z.enum(['NGN']).optional().default('NGN'),
});

export const payoutRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply auth middleware to all routes
  fastify.addHook('onRequest', authMiddleware);

  /**
   * Get list of Nigerian banks
   */
  fastify.get('/banks', async (request, reply) => {
    try {
      const banks = await breadService.offramp.getBanks();
      return { banks, provider: 'bread' };
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch banks');
      return reply.status(500).send({ error: 'Failed to fetch banks' });
    }
  });

  /**
   * Get current exchange rate for crypto → NGN
   * GET /api/payouts/rate?asset=USDC&chain=solana&currency=NGN
   *
   * Note: Bread Africa doesn't support SOL offramp, so we use CoinGecko for SOL pricing
   */
  fastify.get('/rate', async (request, reply) => {
    const query = getRateSchema.parse(request.query);

    try {
      // Special handling for SOL - Bread doesn't support SOL offramp
      if (query.asset.toUpperCase() === 'SOL') {
        request.log.info({
          msg: 'Fetching SOL price from CoinGecko (Bread does not support SOL)',
          asset: query.asset,
          chain: query.chain,
        });

        try {
          // Fetch SOL price from CoinGecko
          const response = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
          );
          const data = (await response.json()) as { solana?: { usd?: number } };
          const solPriceUSD = data.solana?.usd || 157; // Fallback to ~$157

          // Convert to NGN (using approximate rate of 1600 NGN/USD)
          const usdToNgnRate = 1600;
          const solPriceNGN = solPriceUSD * usdToNgnRate;

          request.log.info({
            msg: 'SOL price fetched from CoinGecko',
            solPriceUSD,
            solPriceNGN,
          });

          return {
            asset: query.asset,
            chain: query.chain,
            currency: query.currency,
            rate: solPriceNGN,
            provider: 'coingecko',
            timestamp: new Date().toISOString(),
          };
        } catch (coinGeckoError: any) {
          request.log.error({ error: coinGeckoError }, 'Failed to fetch SOL price from CoinGecko');

          // Fallback to hardcoded SOL price
          return {
            asset: query.asset,
            chain: query.chain,
            currency: query.currency,
            rate: 250000, // ~$157 * 1600 NGN/USD
            provider: 'fallback',
            timestamp: new Date().toISOString(),
          };
        }
      }

      // For other assets (USDC, USDT), use Bread Africa
      request.log.info({
        msg: 'Fetching Bread exchange rate',
        asset: query.asset,
        chain: query.chain,
        currency: query.currency,
      });

      const rateResponse = await breadService.offramp.getRate(
        query.asset as Asset,
        query.chain as Chain
      );

      request.log.info({
        msg: 'Bread rate fetched successfully',
        rate: rateResponse.data.rate,
      });

      return {
        asset: query.asset,
        chain: query.chain,
        currency: query.currency,
        rate: rateResponse.data.rate,
        provider: 'bread',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      request.log.error({ error }, 'Failed to fetch rate from Bread');

      // Return detailed error from Bread API
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch rate';
      const breadError = error.response?.data;

      return reply.status(error.response?.status || 500).send({
        error: 'Failed to fetch rate',
        message: errorMessage,
        bread_error: breadError, // Include Bread's error for debugging
      });
    }
  });

  /**
   * Get precise quote for crypto → NGN conversion
   * POST /api/payouts/quote
   * Body: { asset: 'USDC', chain: 'solana', amount: 50, currency: 'NGN' }
   */
  fastify.post('/quote', async (request, reply) => {
    const body = getQuoteSchema.parse(request.body);

    try {
      request.log.info({
        msg: 'Getting Bread offramp quote',
        asset: body.asset,
        chain: body.chain,
        amount: body.amount,
        currency: body.currency,
      });

      const quoteResponse = await breadService.offramp.getQuote(
        body.asset as Asset,
        body.chain as Chain,
        body.amount
      );

      request.log.info({
        msg: 'Bread quote fetched successfully',
        rate: quoteResponse.data.rate,
        outputAmount: quoteResponse.data.output_amount,
        fee: quoteResponse.data.fee,
      });

      return {
        asset: body.asset,
        chain: body.chain,
        currency: body.currency,
        input_amount: body.amount,
        rate: quoteResponse.data.rate,
        output_amount: quoteResponse.data.output_amount,
        fee: quoteResponse.data.fee,
        expiry: quoteResponse.data.expiry,
        provider: 'bread',
        timestamp: new Date().toISOString(),
        // Helpful display values
        display: {
          you_send: `${body.amount} ${body.asset}`,
          you_receive: `₦${quoteResponse.data.output_amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          rate_display: `1 ${body.asset} = ₦${quoteResponse.data.rate.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          fee_display: `₦${quoteResponse.data.fee.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          expires_in: quoteResponse.data.expiry ? `${Math.floor((new Date(quoteResponse.data.expiry).getTime() - Date.now()) / 1000)}s` : 'N/A',
        },
      };
    } catch (error: any) {
      request.log.error({ error }, 'Failed to get quote from Bread');

      // Return detailed error from Bread API
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get quote';
      const breadError = error.response?.data;

      return reply.status(error.response?.status || 500).send({
        error: 'Failed to get quote',
        message: errorMessage,
        bread_error: breadError, // Include Bread's error for debugging
      });
    }
  });

  /**
   * Execute offramp in one step (no quote creation needed)
   * POST /api/payouts/execute
   * Body: { asset: 'USDC', chain: 'solana', amount: 1, currency: 'NGN', beneficiary_id: 'uuid' }
   *
   * This endpoint sends crypto directly to the user's bank account via Bread Africa.
   */
  fastify.post('/execute', async (request, reply) => {
    const userId = request.userId!;
    const body = executeOfframpSchema.parse(request.body);

    request.log.info({ body }, '🚀 Executing direct offramp to bank account');

    // Minimum offramp amount check
    if (body.amount < 1) {
      return reply.status(400).send({
        error: 'Amount too low',
        message: 'Minimum off-ramp amount is 1 USD',
      });
    }

    try {
      // Step 1: Get beneficiary (bank account)
      const { data: beneficiary } = await supabaseAdmin
        .from('bank_accounts')
        .select('*')
        .eq('id', body.beneficiary_id)
        .eq('user_id', userId)
        .single();

      if (!beneficiary) {
        return reply.status(404).send({ error: 'Bank account not found' });
      }

      if (!beneficiary.bread_beneficiary_id) {
        return reply.status(400).send({
          error: 'Bank account not synced with Bread',
          message: 'Please re-add your bank account',
        });
      }

      // Step 2: Get quote from Bread
      const quoteResponse = await breadService.offramp.getQuote(
        body.asset as Asset,
        body.chain as Chain,
        body.amount
      );

      request.log.info({ quote: quoteResponse.data }, 'Quote received from Bread');

      // Step 3: Get deposit address with Bread wallet
      const { data: depositAddress, error: depositAddressError } = await supabaseAdmin
        .from('deposit_addresses')
        .select('address, private_key_encrypted, bread_wallet_id, bread_wallet_address')
        .eq('user_id', userId)
        .eq('network', body.chain)
        .eq('asset_symbol', body.asset)
        .single();

      if (depositAddressError || !depositAddress) {
        request.log.error({ error: depositAddressError }, 'Deposit address not found');
        return reply.status(404).send({
          error: 'Deposit address not found',
          message: `No deposit address found for ${body.asset} on ${body.chain}`,
        });
      }

      if (!depositAddress.bread_wallet_id) {
        return reply.status(400).send({
          error: 'Bread wallet not found',
          message: 'Please contact support to set up your Bread wallet',
        });
      }

      request.log.info({ depositAddress: depositAddress.address }, 'Deposit address found');

      // Step 3.5: Collect platform fee in crypto BEFORE sending to Bread
      const { collectPlatformFee } = await import('../services/platform-fee-collector.js');

      const feeCollection = await collectPlatformFee({
        userId,
        cryptoAmount: body.amount,
        asset: body.asset,
        chain: body.chain,
        exchangeRate: quoteResponse.data.rate,
        fromAddress: depositAddress.address,
      });

      request.log.info({
        platformFee: feeCollection.platformFee,
        amountToBread: feeCollection.amountToBread,
        treasuryTxHash: feeCollection.treasuryTxHash,
        feeCollected: !!feeCollection.treasuryTxHash,
      }, '💰 Platform fee collection complete');

      // Step 4: Transfer crypto from deposit address to Bread wallet (AFTER fee deduction)
      const { transferToBreadWallet, checkBreadWalletBalance } = await import('../services/transfer.js');

      request.log.info({
        from: depositAddress.address,
        to: depositAddress.bread_wallet_address,
        originalAmount: body.amount,
        platformFee: feeCollection.platformFee,
        amountToBread: feeCollection.amountToBread,
        asset: body.asset,
      }, '🔄 Transferring crypto to Bread wallet (after platform fee)');

      const transferResult = await transferToBreadWallet({
        chain: body.chain,
        asset: body.asset,
        amount: feeCollection.amountToBread, // Send reduced amount (after fee)
        fromAddress: depositAddress.address,
        toAddress: depositAddress.bread_wallet_address!,
        userId,
      });

      request.log.info({
        txHash: transferResult.txHash,
        amount: transferResult.amount,
        platformFeeCollected: feeCollection.platformFee,
      }, '✅ Transfer to Bread wallet completed (platform fee collected)');

      // Step 5: Check Bread wallet balance
      const breadBalance = await checkBreadWalletBalance({
        chain: body.chain,
        asset: body.asset,
        walletAddress: depositAddress.bread_wallet_address!,
      });

      request.log.info({
        breadBalance,
        requestedAmount: body.amount,
        asset: body.asset,
      }, '💰 Bread wallet balance checked');

      // Use minimum of requested and available
      const actualOfframpAmount = Math.min(body.amount, breadBalance);

      if (actualOfframpAmount <= 0) {
        return reply.status(400).send({
          error: 'Insufficient balance',
          message: `Insufficient ${body.asset} balance in wallet. Available: ${breadBalance}`,
        });
      }

      if (breadBalance < body.amount) {
        request.log.warn({
          breadBalance,
          requestedAmount: body.amount,
          actualOfframpAmount,
        }, '⚠️ Using partial amount due to insufficient balance');
      }

      // Step 6: Execute Bread offramp to bank account
      request.log.info({
        breadWalletId: depositAddress.bread_wallet_id,
        amount: actualOfframpAmount,
        beneficiaryId: beneficiary.bread_beneficiary_id,
        asset: `${body.chain}:${body.asset.toLowerCase()}`,
      }, '🔵 Executing Bread offramp to bank account');

      const offrampResult = await breadService.offramp.executeOfframp({
        wallet_id: depositAddress.bread_wallet_id,
        amount: actualOfframpAmount,
        beneficiary_id: beneficiary.bread_beneficiary_id,
        asset: `${body.chain}:${body.asset.toLowerCase()}` as any,
      });

      request.log.info({
        offrampId: offrampResult.data?.id,
        status: offrampResult.data?.status,
      }, '✅ Bread offramp executed successfully');

      // Step 7: Create quote record
      const lockExpiresAt = quoteResponse.data.expiry
        ? new Date(quoteResponse.data.expiry)
        : new Date(Date.now() + 300 * 1000);

      const { data: quoteRecord, error: quoteError } = await supabaseAdmin
        .from('quotes')
        .insert({
          user_id: userId,
          crypto_asset: body.asset,
          crypto_network: body.chain,
          crypto_amount: actualOfframpAmount.toString(),
          spot_price: quoteResponse.data.rate.toString(),
          fx_rate: quoteResponse.data.rate.toString(),
          spread_bps: 0,
          flat_fee: (quoteResponse.data.fee * actualOfframpAmount).toString(),
          variable_fee_bps: Math.floor(quoteResponse.data.fee * 10000),
          total_fees: (quoteResponse.data.fee * actualOfframpAmount).toString(),
          fiat_amount: quoteResponse.data.output_amount.toString(),
          final_amount: quoteResponse.data.output_amount.toString(),
          locked_until: lockExpiresAt.toISOString(),
          is_used: true,
          used_at: new Date().toISOString(),
          metadata: {
            currency: body.currency,
            provider: 'bread',
            bread_quote_type: quoteResponse.data.type,
          },
        })
        .select()
        .single();

      if (quoteError) {
        request.log.error({ error: quoteError }, 'Failed to create quote record');
        return reply.status(500).send({
          error: 'Failed to create quote record',
          message: quoteError.message,
        });
      }

      // Step 8: Create payout record
      const { data: payout, error: payoutError } = await supabaseAdmin
        .from('payouts')
        .insert({
          user_id: userId,
          quote_id: quoteRecord.id,
          beneficiary_id: beneficiary.id,
          fiat_amount: quoteResponse.data.output_amount.toString(),
          currency: body.currency,
          provider: 'bread',
          provider_reference: offrampResult.data?.id || `OFFRAMP-${nanoid(16)}`,
          status: 'processing',
        })
        .select()
        .single();

      if (payoutError) {
        request.log.error({ error: payoutError }, 'Failed to create payout record');
        return reply.status(500).send({
          error: 'Failed to create payout record',
          message: payoutError.message,
        });
      }

      request.log.info({ payoutId: payout.id }, '✅ Payout record created successfully');

      return {
        success: true,
        message: `₦${quoteResponse.data.output_amount.toLocaleString()} sent to ${beneficiary.bank_name}`,
        payout,
        transfer: {
          reference: offrampResult.data?.id,
          status: offrampResult.data?.status || 'processing',
          provider: 'bread',
        },
        bankAccount: {
          bankName: beneficiary.bank_name,
          accountNumber: beneficiary.account_number,
          accountName: beneficiary.account_name,
        },
        quote: quoteResponse.data,
      };
    } catch (error: any) {
      request.log.error({ error: error.message, stack: error.stack }, 'Offramp execution failed');
      return reply.status(500).send({
        error: 'Offramp failed',
        message: error.message,
        details: error.response?.data,
      });
    }
  });

  /**
   * Verify bank account using Bread's lookup endpoint
   * This MUST be called before creating a beneficiary
   */
  fastify.post('/verify-account', async (request, reply) => {
    const body = createBeneficiarySchema.parse(request.body);

    try {
      // Get bank name from Bread's bank list to validate the bank code
      const banks = await breadService.offramp.getBanks();
      const bank = banks.find((b: any) => b.code === body.bank_code);

      if (!bank) {
        return reply.status(400).send({
          error: 'Invalid bank code',
          message: 'The selected bank is not supported by Bread Africa'
        });
      }

      // Validate account number format (10 digits for Nigerian banks)
      if (!/^\d{10}$/.test(body.account_number)) {
        return reply.status(400).send({
          error: 'Invalid account number',
          message: 'Account number must be exactly 10 digits'
        });
      }

      // Use Bread's lookup endpoint to verify the account
      request.log.info({
        msg: 'Calling Bread lookup API',
        bankCode: body.bank_code,
        accountNumber: body.account_number,
      });

      const lookupResult = await breadService.offramp.lookupAccount(
        body.bank_code,
        body.account_number
      );

      request.log.info({
        msg: 'Bread lookup successful',
        accountName: lookupResult.account_name,
      });

      return {
        account_number: lookupResult.account_number,
        account_name: lookupResult.account_name,
        bank_code: lookupResult.bank_code,
        bank_name: bank.name,
      };
    } catch (error: any) {
      request.log.error('Bank account lookup failed:', error);
      return reply.status(400).send({
        error: 'Bank account verification failed',
        message: error.message || 'Could not verify bank account details',
      });
    }
  });

  /**
   * Create and verify beneficiary
   * This creates a beneficiary in both Bread and our database
   * Bread will automatically verify the bank account during creation
   */
  fastify.post('/beneficiaries', async (request, reply) => {
    const userId = request.userId!;

    request.log.info({
      msg: '🔵 BENEFICIARY ENDPOINT CALLED',
      userId,
      body: request.body,
    });

    const body = createBeneficiarySchema.parse(request.body);

    try {
      // Get bank name from Bread's bank list
      const banks = await breadService.offramp.getBanks();
      const bank = banks.find((b: any) => b.code === body.bank_code);

      if (!bank) {
        return reply.status(400).send({ error: 'Invalid bank code' });
      }

      // Check if beneficiary already exists in our database
      const { data: existing } = await supabaseAdmin
        .from('bank_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('account_number', body.account_number)
        .eq('bank_code', body.bank_code)
        .single();

      if (existing) {
        return { beneficiary: existing };
      }

      // Get user details to create/get Bread identity
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Get or create Bread identity
      let breadIdentityId = user.bread_identity_id;

      if (!breadIdentityId) {
        // Parse full name into first and last name
        const fullName = user.full_name || user.email.split('@')[0];
        const nameParts = fullName.trim().split(' ');
        const firstName = nameParts[0] || 'User';
        const lastName = nameParts.slice(1).join(' ') || 'Name';

        // Ensure phone number is in international format
        let phoneNumber = user.phone || user.phone_number || '';
        if (phoneNumber && !phoneNumber.startsWith('+')) {
          // Assume Nigerian number if no country code
          phoneNumber = phoneNumber.startsWith('0')
            ? '+234' + phoneNumber.slice(1)
            : '+234' + phoneNumber;
        }
        if (!phoneNumber) {
          phoneNumber = '+2348000000000'; // Placeholder if no phone
        }

        // Create Bread identity for the user
        const breadIdentity = await breadService.identity.createIdentity({
          firstName,
          lastName,
          email: user.email,
          phoneNumber,
          address: {
            country: 'NG',
          },
        });

        breadIdentityId = breadIdentity.id;

        // Save Bread identity ID to user record
        await supabaseAdmin
          .from('users')
          .update({ bread_identity_id: breadIdentityId })
          .eq('id', userId);
      }

      // STEP 1: Lookup account to verify it exists (required by Bread)
      request.log.info({
        msg: 'Step 1: Looking up bank account',
        bankCode: body.bank_code,
        accountNumber: body.account_number,
      });

      const lookupResult = await breadService.offramp.lookupAccount(
        body.bank_code,
        body.account_number
      );

      request.log.info({
        msg: 'Bank account lookup successful',
        accountName: lookupResult.account_name,
      });

      // STEP 2: Create beneficiary in Bread with verified account details
      let breadBeneficiaryId = body.bread_beneficiary_id;
      let accountName = lookupResult.account_name; // Use verified name from lookup

      if (!breadBeneficiaryId) {
        request.log.info({
          msg: 'Step 2: Creating beneficiary in Bread',
          identityId: breadIdentityId,
          bankCode: body.bank_code,
          accountNumber: body.account_number,
        });

        const breadBeneficiary = await breadService.beneficiary.createBeneficiary({
          identityId: breadIdentityId,
          bankCode: body.bank_code,
          accountNumber: body.account_number,
          currency: 'NGN',
        });

        breadBeneficiaryId = breadBeneficiary.id;
        // Use account name from lookup, fallback to beneficiary response or placeholder
        accountName = lookupResult.account_name || breadBeneficiary.accountName || 'Account Holder';

        request.log.info({
          msg: 'Beneficiary created in Bread',
          beneficiaryId: breadBeneficiaryId,
          accountName,
        });

        // 🔥 CRITICAL: Create Bread wallet for offramp after beneficiary is created
        // This wallet is required for the offramp to work
        request.log.info({
          msg: '🔵 Creating Bread offramp wallet',
          identityId: breadIdentityId,
          beneficiaryId: breadBeneficiaryId,
        });

        try {
          // Create wallet for each supported chain (Solana and Base)
          const solanaWallet = await breadService.wallet.createWallet(
            breadIdentityId,
            'solana',
            'offramp',
            breadBeneficiaryId
          );

          const baseWallet = await breadService.wallet.createWallet(
            breadIdentityId,
            'base',
            'offramp',
            breadBeneficiaryId
          );

          // Extract addresses - handle both string and object formats
          const solanaAddress = typeof solanaWallet.address === 'string'
            ? solanaWallet.address
            : (solanaWallet.address as any).svm || solanaWallet.address;

          const baseAddress = typeof baseWallet.address === 'string'
            ? baseWallet.address
            : (baseWallet.address as any).evm || baseWallet.address;

          request.log.info({
            msg: '✅ Bread wallets created successfully',
            solanaWalletId: solanaWallet.id,
            solanaAddress,
            baseWalletId: baseWallet.id,
            baseAddress,
          });

          // Update deposit_addresses table with Bread wallet IDs
          // Solana wallet
          await supabaseAdmin
            .from('deposit_addresses')
            .update({
              bread_wallet_id: solanaWallet.id,
              bread_wallet_address: solanaAddress,
              bread_wallet_type: 'offramp',
              bread_synced_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('network', 'solana');

          // Base wallet
          await supabaseAdmin
            .from('deposit_addresses')
            .update({
              bread_wallet_id: baseWallet.id,
              bread_wallet_address: baseAddress,
              bread_wallet_type: 'offramp',
              bread_synced_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('network', 'base');

          request.log.info({
            msg: '✅ Deposit addresses updated with Bread wallet IDs',
          });
        } catch (walletError: any) {
          request.log.error({
            error: walletError,
            message: walletError.message,
            response: walletError.response?.data,
          }, '❌ Failed to create Bread wallets');

          // Don't fail the beneficiary creation if wallet creation fails
          // User can still add the bank, but offramp won't work until wallets are created
          request.log.warn({
            msg: '⚠️ Beneficiary created but Bread wallets failed. Offramp will not work until wallets are created.',
          });
        }
      }

      // Save beneficiary to our database with verified account name from Bread
      const { data: beneficiary, error } = await supabaseAdmin
        .from('bank_accounts')
        .insert({
          user_id: userId,
          bank_code: body.bank_code,
          bank_name: bank.name,
          account_number: body.account_number,
          account_name: accountName!,
          bread_beneficiary_id: breadBeneficiaryId,
          is_verified: true,
          verified_at: new Date().toISOString(),
          bread_synced_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        request.log.error({ error }, 'Failed to create beneficiary in database');
        return reply.status(500).send({ error: 'Failed to save beneficiary' });
      }

      return { beneficiary };
    } catch (error: any) {
      request.log.error('Beneficiary creation failed:', error);

      // Extract detailed error information
      const errorMessage = error.message || 'Could not create beneficiary. Please check account details.';
      const errorCode = error.code || 'UNKNOWN_ERROR';
      const errorDetails = error.details || {};

      return reply.status(400).send({
        error: 'Beneficiary creation failed',
        message: errorMessage,
        code: errorCode,
        details: errorDetails,
      });
    }
  });

  /**
   * Get user's beneficiaries
   */
  fastify.get('/beneficiaries', async (request, reply) => {
    const userId = request.userId!;

    const { data: beneficiaries, error } = await supabaseAdmin
      .from('bank_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch beneficiaries' });
    }

    return { beneficiaries };
  });

  /**
   * Delete beneficiary
   */
  fastify.delete('/beneficiaries/:id', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };

    const { error } = await supabaseAdmin
      .from('bank_accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return reply.status(500).send({ error: 'Failed to delete beneficiary' });
    }

    return { message: 'Beneficiary deleted successfully' };
  });

  /**
   * Confirm quote and initiate payout
   */
  fastify.post('/confirm', async (request, reply) => {
    const userId = request.userId!;
    const body = confirmQuoteSchema.parse(request.body);

    // Get quote
    const { data: quote } = await supabaseAdmin
      .from('quotes')
      .select('*')
      .eq('id', body.quote_id)
      .eq('user_id', userId)
      .single();

    if (!quote) {
      return reply.status(404).send({ error: 'Quote not found' });
    }

    // Validate quote
    if (quote.is_used) {
      return reply.status(400).send({ error: 'Quote has already been used' });
    }

    const isExpired = new Date(quote.locked_until) < new Date();
    if (isExpired) {
      return reply.status(400).send({ error: 'Quote has expired' });
    }

    // Get beneficiary
    const { data: beneficiary } = await supabaseAdmin
      .from('bank_accounts')
      .select('*')
      .eq('id', body.beneficiary_id)
      .eq('user_id', userId)
      .single();

    if (!beneficiary) {
      return reply.status(404).send({ error: 'Beneficiary not found' });
    }

    // Check user has sufficient balance
    const { data: deposits } = await supabaseAdmin
      .from('onchain_deposits')
      .select('id, amount')
      .eq('user_id', userId)
      .eq('asset', quote.crypto_asset)  // Changed from quote.asset
      .eq('chain', quote.crypto_network)  // Changed from quote.chain
      .in('status', ['confirmed']);

    const totalDeposits = deposits?.reduce((sum, d) => sum + parseFloat(d.amount), 0) || 0;
    const requiredAmount = parseFloat(quote.crypto_amount);

    if (totalDeposits < requiredAmount) {
      return reply.status(400).send({
        error: 'Insufficient balance',
        message: `You need ${requiredAmount} ${quote.crypto_asset} but only have ${totalDeposits} ${quote.crypto_asset}`,
        available: totalDeposits,
        required: requiredAmount,
      });
    }

    try {
      const reference = `PAYOUT_${nanoid(16)}`;
      let provider = 'bread';

      // Get Bread beneficiary ID from bank_accounts table
      const { data: bankAccount, error: bankError } = await supabaseAdmin
        .from('bank_accounts')
        .select('bread_beneficiary_id')
        .eq('id', beneficiary.id)
        .single();

      if (bankError || !bankAccount?.bread_beneficiary_id) {
        request.log.error({ error: bankError, beneficiaryId: beneficiary.id }, 'Beneficiary not synced with Bread');
        return reply.status(400).send({
          error: 'Beneficiary not synced',
          message: 'Please re-add your bank account to sync with Bread Africa',
        });
      }

      // Get Bread wallet ID from deposit_addresses table
      const { data: depositAddress, error: walletError } = await supabaseAdmin
        .from('deposit_addresses')
        .select('bread_wallet_id, bread_wallet_address, address, private_key_encrypted')
        .eq('user_id', userId)
        .eq('network', quote.crypto_network)  // Changed from quote.chain
        .eq('asset_symbol', quote.crypto_asset)  // Changed from quote.asset
        .single();

      if (walletError || !depositAddress?.bread_wallet_id) {
        request.log.error({
          error: walletError,
          chain: quote.crypto_network,
          asset: quote.crypto_asset,
          depositAddress,
        }, '❌ Wallet not synced with Bread');

        return reply.status(400).send({
          error: 'Wallet not synced',
          message: 'No Bread wallet found. Please re-add your bank account to create the required Bread wallet.',
          details: {
            chain: quote.crypto_network,
            asset: quote.crypto_asset,
            hasDepositAddress: !!depositAddress,
            hasBreadWalletId: !!depositAddress?.bread_wallet_id,
          },
        });
      }

      // STEP 1: Check Bread wallet balance and transfer if needed
      request.log.info({
        msg: '🔵 Step 1: Checking Bread wallet balance',
        breadWalletId: depositAddress.bread_wallet_id,
        breadWalletAddress: depositAddress.bread_wallet_address,
        requestedAmount: quote.crypto_amount,
        asset: quote.crypto_asset,
        chain: quote.crypto_network,
      });

      // Get Bread wallet balance
      const { checkBreadWalletBalance } = await import('../services/transfer.js');
      const breadBalance = await checkBreadWalletBalance({
        chain: quote.crypto_network,
        asset: quote.crypto_asset,
        walletAddress: depositAddress.bread_wallet_address!,
      });

      request.log.info({
        msg: '💰 Bread wallet balance checked',
        breadBalance,
        requestedAmount: parseFloat(quote.crypto_amount),
        asset: quote.crypto_asset,
      });

      // Determine actual offramp amount (use minimum of requested and available)
      const requestedAmount = parseFloat(quote.crypto_amount);
      const actualOfframpAmount = Math.min(requestedAmount, breadBalance);

      if (breadBalance < requestedAmount) {
        request.log.warn({
          msg: '⚠️ Bread wallet has less than requested amount',
          breadBalance,
          requestedAmount,
          actualOfframpAmount,
          asset: quote.crypto_asset,
        });
      }

      if (actualOfframpAmount <= 0) {
        throw new Error(
          `Insufficient ${quote.crypto_asset} balance in Bread wallet. ` +
          `Available: ${breadBalance} ${quote.crypto_asset}, Requested: ${requestedAmount} ${quote.crypto_asset}`
        );
      }

      // STEP 2: Execute Bread offramp with actual available amount
      request.log.info({
        msg: '🔵 Step 2: Executing Bread offramp',
        quoteId: quote.id,
        asset: quote.crypto_asset,
        chain: quote.crypto_network,
        requestedAmount,
        actualAmount: actualOfframpAmount,
        beneficiary: beneficiary.account_number,
        breadWalletId: depositAddress.bread_wallet_id,
        breadBeneficiaryId: bankAccount.bread_beneficiary_id,
      });

      // Call Bread Africa's offramp API with actual available amount
      const offrampResult = await breadService.offramp.executeOfframp({
        wallet_id: depositAddress.bread_wallet_id,
        amount: actualOfframpAmount,
        beneficiary_id: bankAccount.bread_beneficiary_id,
        asset: `${quote.crypto_network}:${quote.crypto_asset.toLowerCase()}` as any,
      });

      request.log.info({
        offrampId: offrampResult.data?.id,
        status: offrampResult.data?.status,
      }, 'Bread offramp executed successfully');

      // Create payout record
      const { data: payout, error: payoutError } = await supabaseAdmin
        .from('payouts')
        .insert({
          user_id: userId,
          quote_id: quote.id,
          beneficiary_id: beneficiary.id,
          fiat_amount: quote.final_amount,  // Changed from quote.fiat_amount to quote.final_amount
          currency: quote.metadata?.currency || 'NGN',  // Get currency from metadata
          provider,
          provider_reference: offrampResult.data?.id || reference,
          status: 'processing',
        })
        .select()
        .single();

      if (payoutError) {
        request.log.error({ error: payoutError }, 'Failed to create payout record');
        return reply.status(500).send({ error: 'Failed to create payout' });
      }

      // Mark quote as used
      await supabaseAdmin
        .from('quotes')
        .update({
          is_used: true,
          used_at: new Date().toISOString(),
        })
        .eq('id', quote.id);

      // Mark deposits as used (swept status)
      // This prevents double-spending
      let remainingAmount = requiredAmount;
      for (const deposit of deposits || []) {
        if (remainingAmount <= 0) break;

        const depositAmount = parseFloat(deposit.amount);
        if (depositAmount > 0) {
          await supabaseAdmin
            .from('onchain_deposits')
            .update({ status: 'swept', swept_at: new Date().toISOString() })
            .eq('id', (deposit as any).id);

          remainingAmount -= depositAmount;
        }
      }

      // Update limits
      await updateUserLimits(userId, parseFloat(quote.fiat_amount));

      return {
        payout,
        transfer: {
          reference: offrampResult.data?.id || reference,
          status: offrampResult.data?.status || 'processing',
          provider,
        },
      };
    } catch (error: any) {
      // Log the REAL Bread error for debugging
      request.log.error({
        msg: 'Payout failed:',
        error: error.message,
        breadError: error.response?.data,
        breadStatus: error.response?.status,
        stack: error.stack,
      });

      // Return detailed error to frontend
      return reply.status(500).send({
        error: 'Payout failed',
        message: error.message,
        breadError: error.response?.data,
        details: error.response?.data?.message || error.message,
      });
    }
  });

  /**
   * Get payout history
   */
  fastify.get('/', async (request, reply) => {
    const userId = request.userId!;
    const { limit = 20 } = request.query as { limit?: number };

    const { data: payouts, error } = await supabaseAdmin
      .from('payouts')
      .select(`
        *,
        quote:quotes(*),
        beneficiary:bank_accounts(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch payouts' });
    }

    return { payouts };
  });

  /**
   * Get specific payout
   */
  fastify.get('/:id', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };

    const { data: payout, error } = await supabaseAdmin
      .from('payouts')
      .select(`
        *,
        quote:quotes(*),
        beneficiary:bank_accounts(*)
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !payout) {
      return reply.status(404).send({ error: 'Payout not found' });
    }

    return { payout };
  });
};

/**
 * Update user limits after payout
 */
async function updateUserLimits(userId: string, amount: number) {
  const periods = ['daily', 'weekly', 'monthly'];

  for (const period of periods) {
    const { data: limit } = await supabaseAdmin
      .from('transaction_limits')
      .select('*')
      .eq('user_id', userId)
      .eq('period', period)
      .single();

    if (limit) {
      const newUsed = parseFloat(limit.used_amount) + amount;

      await supabaseAdmin
        .from('transaction_limits')
        .update({ used_amount: newUsed.toString() })
        .eq('id', limit.id);
    }
  }
}

