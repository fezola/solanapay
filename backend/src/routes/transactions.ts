import { FastifyPluginAsync } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { supabaseAdmin } from '../utils/supabase.js';

export const transactionRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply auth middleware to all routes
  fastify.addHook('onRequest', authMiddleware);

  /**
   * Get all transactions (deposits + payouts)
   */
  fastify.get('/', async (request, reply) => {
    const userId = request.userId!;
    const { limit = 50, type } = request.query as { limit?: number; type?: 'deposit' | 'offramp' };

    const transactions = [];

    // Get deposits if requested
    if (!type || type === 'deposit') {
      const { data: deposits } = await supabaseAdmin
        .from('onchain_deposits')
        .select('*')
        .eq('user_id', userId)
        .order('detected_at', { ascending: false })
        .limit(limit);

      if (deposits) {
        transactions.push(
          ...deposits.map((d) => ({
            id: d.id,
            type: 'deposit' as const,
            crypto: d.asset,
            network: d.chain,
            amount: parseFloat(d.amount),
            status: mapDepositStatus(d.status),
            date: d.detected_at,
            tx_hash: d.tx_hash,
            confirmations: d.confirmations,
            required_confirmations: d.required_confirmations,
          }))
        );
      }
    }

    // Get payouts if requested
    if (!type || type === 'offramp') {
      const { data: payouts } = await supabaseAdmin
        .from('payouts')
        .select(`
          *,
          quote:quotes(*),
          beneficiary:bank_accounts(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (payouts) {
        transactions.push(
          ...payouts.map((p: any) => ({
            id: p.id,
            type: 'offramp' as const,
            crypto: p.quote?.asset,
            network: p.quote?.chain,
            amount: parseFloat(p.quote?.crypto_amount || 0),
            nairaAmount: parseFloat(p.fiat_amount),
            rate: parseFloat(p.quote?.spot_price || 0),
            fee: parseFloat(p.quote?.total_fee || 0),
            status: mapPayoutStatus(p.status),
            date: p.created_at,
            bankAccount: {
              bankName: p.beneficiary?.bank_name,
              accountNumber: p.beneficiary?.account_number,
              accountName: p.beneficiary?.account_name,
            },
            payoutReference: p.provider_reference,
          }))
        );
      }
    }

    // Sort by date
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      transactions: transactions.slice(0, limit),
    };
  });

  /**
   * Get transaction details
   */
  fastify.get('/:id', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };

    // Try to find as deposit
    const { data: deposit } = await supabaseAdmin
      .from('onchain_deposits')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (deposit) {
      return {
        transaction: {
          id: deposit.id,
          type: 'deposit',
          crypto: deposit.asset,
          network: deposit.chain,
          amount: parseFloat(deposit.amount),
          status: mapDepositStatus(deposit.status),
          date: deposit.detected_at,
          tx_hash: deposit.tx_hash,
          confirmations: deposit.confirmations,
          required_confirmations: deposit.required_confirmations,
          from_address: deposit.from_address,
          to_address: deposit.address,
          block_number: deposit.block_number,
        },
      };
    }

    // Try to find as payout
    const { data: payout } = await supabaseAdmin
      .from('payouts')
      .select(`
        *,
        quote:quotes(*),
        beneficiary:bank_accounts(*)
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (payout) {
      return {
        transaction: {
          id: payout.id,
          type: 'offramp',
          crypto: (payout as any).quote?.asset,
          network: (payout as any).quote?.chain,
          amount: parseFloat((payout as any).quote?.crypto_amount || 0),
          nairaAmount: parseFloat(payout.fiat_amount),
          rate: parseFloat((payout as any).quote?.spot_price || 0),
          fee: parseFloat((payout as any).quote?.total_fee || 0),
          status: mapPayoutStatus(payout.status),
          date: payout.created_at,
          bankAccount: {
            bankName: (payout as any).beneficiary?.bank_name,
            accountNumber: (payout as any).beneficiary?.account_number,
            accountName: (payout as any).beneficiary?.account_name,
          },
          payoutReference: payout.provider_reference,
          errorReason: payout.error_message,
        },
      };
    }

    return reply.status(404).send({ error: 'Transaction not found' });
  });
};

/**
 * Map deposit status to frontend status
 */
function mapDepositStatus(status: string): string {
  const statusMap: Record<string, string> = {
    detected: 'confirming',
    confirming: 'confirming',
    confirmed: 'completed',
    swept: 'completed',
    failed: 'failed',
  };
  return statusMap[status] || status;
}

/**
 * Map payout status to frontend status
 */
function mapPayoutStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'payout_pending',
    processing: 'payout_pending',
    success: 'completed',
    failed: 'failed',
    reversed: 'failed',
  };
  return statusMap[status] || status;
}

