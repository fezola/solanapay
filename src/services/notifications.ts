import { toast } from 'sonner';
import { supabase } from './supabase';

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface Notification {
  id: string;
  user_id: string;
  type: 'transaction' | 'kyc' | 'bank_account' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  created_at: string;
}

// ============================================================================
// NOTIFICATION SERVICE
// ============================================================================

export const notificationService = {
  // Show success notification
  success(message: string, description?: string) {
    if (description) {
      toast.success(message, {
        description,
        duration: 4000,
      });
    } else {
      toast.success(message, {
        duration: 3000,
      });
    }
  },

  // Show error notification
  error(message: string, description?: string) {
    if (description) {
      toast.error(message, {
        description,
        duration: 5000,
      });
    } else {
      toast.error(message, {
        duration: 4000,
      });
    }
  },

  // Show info notification
  info(message: string, description?: string) {
    if (description) {
      toast.info(message, {
        description,
        duration: 4000,
      });
    } else {
      toast.info(message, {
        duration: 3000,
      });
    }
  },

  // Show warning notification
  warning(message: string, description?: string) {
    if (description) {
      toast.warning(message, {
        description,
        duration: 4000,
      });
    } else {
      toast.warning(message, {
        duration: 3000,
      });
    }
  },

  // Show loading notification
  loading(message: string) {
    return toast.loading(message);
  },

  // Dismiss notification
  dismiss(toastId: string | number) {
    toast.dismiss(toastId);
  },

  // Transaction notifications
  transactionCreated(type: string, amount: string) {
    this.success(
      'Transaction Created',
      `Your ${type} transaction for ${amount} has been initiated`
    );
  },

  transactionPending(type: string) {
    this.info(
      'Transaction Pending',
      `Your ${type} transaction is being processed`
    );
  },

  transactionCompleted(type: string, amount: string) {
    this.success(
      'Transaction Completed! 🎉',
      `Your ${type} transaction for ${amount} has been completed successfully`
    );
  },

  transactionFailed(type: string, reason?: string) {
    this.error(
      'Transaction Failed',
      reason || `Your ${type} transaction could not be completed`
    );
  },

  // Deposit notifications
  depositDetected(asset: string, amount: string) {
    this.info(
      'Deposit Detected',
      `${amount} ${asset} deposit detected. Waiting for confirmations...`
    );
  },

  depositConfirmed(asset: string, amount: string) {
    this.success(
      'Deposit Confirmed! ✅',
      `${amount} ${asset} has been credited to your account`
    );
  },

  // Off-ramp notifications
  offrampInitiated(cryptoAmount: string, fiatAmount: string) {
    this.info(
      'Off-Ramp Initiated',
      `Converting ${cryptoAmount} to ${fiatAmount}`
    );
  },

  offrampProcessing(fiatAmount: string) {
    this.info(
      'Processing Payout',
      `Sending ${fiatAmount} to your bank account...`
    );
  },

  offrampCompleted(fiatAmount: string, bankAccount: string) {
    this.success(
      'Payout Successful! 💰',
      `${fiatAmount} has been sent to ${bankAccount}`
    );
  },

  // KYC notifications
  kycSubmitted() {
    this.success(
      'KYC Submitted',
      'Your verification documents have been submitted for review'
    );
  },

  kycApproved(tier: number) {
    this.success(
      'KYC Approved! 🎉',
      `You are now verified at Tier ${tier}. Higher limits unlocked!`
    );
  },

  kycRejected(reason?: string) {
    this.error(
      'KYC Verification Failed',
      reason || 'Please review your documents and try again'
    );
  },

  kycPending() {
    this.info(
      'KYC Under Review',
      'Your verification is being reviewed. This usually takes 24-48 hours'
    );
  },

  // Bank account notifications
  bankAccountAdded(bankName: string, accountNumber: string) {
    this.success(
      'Bank Account Added',
      `${bankName} - ${accountNumber} has been added successfully`
    );
  },

  bankAccountVerified(bankName: string) {
    this.success(
      'Account Verified ✅',
      `Your ${bankName} account has been verified`
    );
  },

  bankAccountDeleted() {
    this.info(
      'Bank Account Removed',
      'The bank account has been deleted'
    );
  },

  // System notifications
  sessionExpired() {
    this.warning(
      'Session Expired',
      'Please sign in again to continue'
    );
  },

  networkError() {
    this.error(
      'Network Error',
      'Please check your internet connection and try again'
    );
  },

  maintenanceMode() {
    this.warning(
      'Maintenance Mode',
      'The system is currently under maintenance. Please try again later'
    );
  },

  // Limit notifications
  limitReached(period: string, limit: string) {
    this.warning(
      `${period} Limit Reached`,
      `You have reached your ${period.toLowerCase()} limit of ${limit}. Upgrade your KYC tier for higher limits.`
    );
  },

  limitWarning(period: string, remaining: string) {
    this.info(
      `Approaching ${period} Limit`,
      `You have ${remaining} remaining in your ${period.toLowerCase()} limit`
    );
  },
};

// ============================================================================
// REAL-TIME NOTIFICATION LISTENER
// ============================================================================

export class NotificationListener {
  private userId: string;
  private depositChannel: any;
  private payoutChannel: any;
  private profileChannel: any;

  constructor(userId: string) {
    this.userId = userId;
  }

  // Start listening for real-time updates
  start() {
    // Listen for deposit updates (onchain_deposits table)
    this.depositChannel = supabase
      .channel('deposit_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'onchain_deposits',
          filter: `user_id=eq.${this.userId}`,
        },
        (payload) => {
          this.handleDepositUpdate(payload);
        }
      )
      .subscribe();

    // Listen for payout updates (payouts table)
    this.payoutChannel = supabase
      .channel('payout_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payouts',
          filter: `user_id=eq.${this.userId}`,
        },
        (payload) => {
          this.handlePayoutUpdate(payload);
        }
      )
      .subscribe();

    // Listen for profile/KYC updates
    this.profileChannel = supabase
      .channel('profile_notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${this.userId}`,
        },
        (payload) => {
          this.handleProfileUpdate(payload);
        }
      )
      .subscribe();
  }

  // Stop listening
  stop() {
    if (this.depositChannel) {
      supabase.removeChannel(this.depositChannel);
    }
    if (this.payoutChannel) {
      supabase.removeChannel(this.payoutChannel);
    }
    if (this.profileChannel) {
      supabase.removeChannel(this.profileChannel);
    }
  }

  // Handle deposit updates (onchain_deposits table)
  private handleDepositUpdate(payload: any) {
    const deposit = payload.new;
    const oldDeposit = payload.old;

    console.log('🔔 Deposit update received:', { event: payload.eventType, deposit });

    // New deposit detected
    if (payload.eventType === 'INSERT') {
      const amount = `${parseFloat(deposit.amount).toFixed(6)} ${deposit.asset}`;

      if (deposit.status === 'confirmed') {
        // Deposit is already confirmed
        notificationService.depositConfirmed(deposit.asset, amount);

        // Reload balance and transactions
        window.dispatchEvent(new CustomEvent('deposit-confirmed', { detail: deposit }));
      } else {
        // Deposit detected but not confirmed yet
        notificationService.depositDetected(deposit.asset, amount);
      }
    }

    // Deposit status changed
    if (payload.eventType === 'UPDATE' && oldDeposit?.status !== deposit.status) {
      const amount = `${parseFloat(deposit.amount).toFixed(6)} ${deposit.asset}`;

      switch (deposit.status) {
        case 'confirmed':
          notificationService.depositConfirmed(deposit.asset, amount);
          // Reload balance and transactions
          window.dispatchEvent(new CustomEvent('deposit-confirmed', { detail: deposit }));
          break;

        case 'failed':
          notificationService.transactionFailed('deposit', 'Deposit confirmation failed');
          break;
      }
    }
  }

  // Handle payout updates (payouts table)
  private handlePayoutUpdate(payload: any) {
    const payout = payload.new;
    const oldPayout = payload.old;

    console.log('🔔 Payout update received:', { event: payload.eventType, payout });

    // New payout created
    if (payload.eventType === 'INSERT') {
      notificationService.offrampInitiated(
        `${payout.fiat_amount} NGN`,
        `₦${parseFloat(payout.fiat_amount).toLocaleString()}`
      );
    }

    // Payout status changed
    if (payload.eventType === 'UPDATE' && oldPayout?.status !== payout.status) {
      switch (payout.status) {
        case 'processing':
          notificationService.offrampProcessing(`₦${parseFloat(payout.fiat_amount).toLocaleString()}`);
          break;

        case 'success':
          notificationService.offrampCompleted(
            `₦${parseFloat(payout.fiat_amount).toLocaleString()}`,
            'your bank account'
          );
          // Reload balance and transactions
          window.dispatchEvent(new CustomEvent('payout-completed', { detail: payout }));
          break;

        case 'failed':
          notificationService.transactionFailed('offramp', payout.error_message || 'Payout failed');
          break;
      }
    }
  }

  // Handle profile/KYC updates
  private handleProfileUpdate(payload: any) {
    const user = payload.new;
    const oldUser = payload.old;

    // KYC status changed
    if (oldUser?.kyc_status !== user.kyc_status) {
      switch (user.kyc_status) {
        case 'pending':
          notificationService.kycPending();
          break;
        case 'approved':
          notificationService.kycApproved(user.kyc_tier);
          break;
        case 'rejected':
          notificationService.kycRejected();
          break;
      }
    }
  }
}

