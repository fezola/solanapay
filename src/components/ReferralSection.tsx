import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Copy, Share2, Gift, Users, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../services/supabase';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

interface ReferralStats {
  total_referrals: number;
  pending_referrals: number;
  completed_referrals: number;
  total_earnings: {
    usd: number;
    ngn: number;
  };
}

interface ReferralHistory {
  id: string;
  status: 'pending' | 'completed' | 'cancelled';
  reward_amount_usd: number;
  reward_credited: boolean;
  created_at: string;
  completed_at: string | null;
}

interface ReferralSectionProps {
  userId: string;
}

export function ReferralSection({ userId }: ReferralSectionProps) {
  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [history, setHistory] = useState<ReferralHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferralData();
  }, [userId]);

  const loadReferralData = async () => {
    try {
      setLoading(true);

      // Get access token from Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        console.error('No access token found');
        toast.error('Please log in to view referral data');
        return;
      }

      // Get referral code
      const codeResponse = await fetch(`${API_BASE_URL}/api/referrals/code`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!codeResponse.ok) {
        const errorText = await codeResponse.text();
        console.error('Failed to fetch referral code:', codeResponse.status, errorText);
        throw new Error(`Failed to fetch referral code: ${codeResponse.status}`);
      }

      const codeData = await codeResponse.json();
      console.log('Referral code data:', codeData);
      setReferralCode(codeData.code || '');
      setReferralLink(codeData.link || '');

      // Get stats
      const statsResponse = await fetch(`${API_BASE_URL}/api/referrals/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!statsResponse.ok) {
        console.error('Failed to fetch stats:', statsResponse.status);
        throw new Error(`Failed to fetch stats: ${statsResponse.status}`);
      }

      const statsData = await statsResponse.json();
      console.log('Referral stats:', statsData);
      setStats(statsData);

      // Get history
      const historyResponse = await fetch(`${API_BASE_URL}/api/referrals/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!historyResponse.ok) {
        console.error('Failed to fetch history:', historyResponse.status);
        throw new Error(`Failed to fetch history: ${historyResponse.status}`);
      }

      const historyData = await historyResponse.json();
      console.log('Referral history:', historyData);
      setHistory(historyData.referrals || []);
    } catch (error) {
      console.error('Failed to load referral data:', error);
      toast.error('Failed to load referral data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const shareReferralLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join SolPay',
          text: `Use my referral code ${referralCode} to join SolPay and start converting crypto to cash!`,
          url: referralLink,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      copyToClipboard(referralLink, 'Referral link');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full mb-4">
          <Gift className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Refer & Earn</h2>
        <p className="text-gray-600">
          Invite friends and earn $0.70 USD for each successful referral!
        </p>
      </motion.div>

      {/* Referral Code Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-6 border border-gray-100 bg-gradient-to-br from-blue-50 to-purple-50">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Your Referral Link</h3>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 bg-white rounded-lg px-4 py-3 border-2 border-dashed border-blue-300">
              <p className="text-sm font-semibold text-gray-900 text-center break-all">
                {referralLink || 'Loading...'}
              </p>
            </div>
            <Button
              onClick={() => copyToClipboard(referralLink, 'Referral link')}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={!referralLink}
            >
              <Copy className="w-4 h-4" />
              Copy
            </Button>
          </div>
          <Button
            onClick={shareReferralLink}
            className="w-full text-white"
            style={{
              background: 'linear-gradient(to right, rgb(147, 51, 234), rgb(37, 99, 235))',
              color: 'white'
            }}
            disabled={!referralLink}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Referral Link
          </Button>
        </Card>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-4"
      >
        <Card className="p-4 border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.total_referrals || 0}</p>
              <p className="text-xs text-gray-500">Total Referrals</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                ₦{stats?.total_earnings.ngn.toLocaleString() || 0}
              </p>
              <p className="text-xs text-gray-500">Total Earnings</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.completed_referrals || 0}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.pending_referrals || 0}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* How it Works */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">How It Works</h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">1</span>
              </div>
              <div>
                <p className="text-gray-900 font-medium">Share your code</p>
                <p className="text-gray-600 text-sm">Send your referral code to friends</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">2</span>
              </div>
              <div>
                <p className="text-gray-900 font-medium">They sign up</p>
                <p className="text-gray-600 text-sm">Your friend creates an account using your code</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">3</span>
              </div>
              <div>
                <p className="text-gray-900 font-medium">They complete KYC</p>
                <p className="text-gray-600 text-sm">Once they verify their identity, you both win!</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold text-sm">✓</span>
              </div>
              <div>
                <p className="text-gray-900 font-medium">Earn $0.70 USD</p>
                <p className="text-gray-600 text-sm">Reward is automatically credited to your wallet</p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Referral History */}
      {history.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Referral History</h3>
            <div className="space-y-3">
              {history.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {referral.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-600" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {referral.status === 'completed' ? 'Completed' : 'Pending KYC'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(referral.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      ${referral.reward_amount_usd.toFixed(2)}
                    </p>
                    {referral.reward_credited && (
                      <p className="text-xs text-green-600">Credited</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

