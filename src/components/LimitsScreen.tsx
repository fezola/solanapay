import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { PageHeader } from './ui/page-header';
import {
  TrendingUp,
  CheckCircle2,
  Lock,
  ArrowRight,
  Shield,
  Clock,
  Award
} from 'lucide-react';

interface LimitsScreenProps {
  currentTier: number;
  limits: {
    daily: {
      limit: number;
      used: number;
      resets: string;
    };
    weekly: {
      limit: number;
      used: number;
      resets: string;
    };
    monthly: {
      limit: number;
      used: number;
      resets: string;
    };
  };
  onUpgrade: () => void;
  onBack: () => void;
}

export function LimitsScreen({ currentTier, limits, onUpgrade, onBack }: LimitsScreenProps) {
  const tiers = [
    {
      level: 0,
      name: 'Preview',
      color: 'gray',
      limits: { daily: 0, weekly: 0, monthly: 0 },
      features: [
        'View app features',
        'Check live rates',
        'No transactions',
      ],
      requirements: ['Email or Phone verification'],
    },
    {
      level: 1,
      name: 'Basic',
      color: 'blue',
      limits: { daily: 5000000, weekly: 25000000, monthly: 50000000 },
      features: [
        'Off-ramp enabled',
        'All supported assets',
        'Standard processing',
        'Email support',
      ],
      requirements: ['BVN verification', 'Government ID', 'Selfie liveness check'],
    },
    {
      level: 2,
      name: 'Advanced',
      color: 'green',
      limits: { daily: 10000000, weekly: 50000000, monthly: 100000000 },
      features: [
        'Higher limits',
        'Priority processing',
        'Dedicated support',
        'Lower fees (0.8%)',
        'API access',
      ],
      requirements: ['Tier 1 completion', 'Address proof', 'Source of funds documentation'],
    },
  ];

  const currentTierInfo = tiers[currentTier];
  const nextTierInfo = currentTier < tiers.length - 1 ? tiers[currentTier + 1] : null;

  const calculatePercentage = (used: number, limit: number) => {
    if (limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `₦${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `₦${(amount / 1000).toFixed(0)}K`;
    }
    return `₦${amount}`;
  };

  const getTimeUntilReset = (resetDate: string) => {
    const now = new Date();
    const reset = new Date(resetDate);
    const diff = reset.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="pb-24 bg-white min-h-screen">
      <PageHeader
        title="Limits & Tier"
        description="Manage your transaction limits"
        onBack={onBack}
      />

      <div className="px-6 space-y-4">
        {/* Current Tier */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 border border-gray-100 bg-gradient-to-br from-gray-50 to-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Current Tier</p>
                  <h3 className="text-gray-900">{currentTierInfo.name}</h3>
                </div>
              </div>
              <Badge className="bg-gray-900 text-white">
                Tier {currentTier}
              </Badge>
            </div>

            {currentTier > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-white p-3 rounded-lg border border-gray-100">
                  <p className="text-gray-600 mb-1">Daily</p>
                  <p className="text-gray-900">{formatCurrency(currentTierInfo.limits.daily)}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-100">
                  <p className="text-gray-600 mb-1">Weekly</p>
                  <p className="text-gray-900">{formatCurrency(currentTierInfo.limits.weekly)}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-100">
                  <p className="text-gray-600 mb-1">Monthly</p>
                  <p className="text-gray-900">{formatCurrency(currentTierInfo.limits.monthly)}</p>
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Usage Stats */}
        {currentTier > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3>Daily Limit</h3>
                  <p className="text-gray-600">
                    Resets in {getTimeUntilReset(limits.daily.resets)}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-600">Used</p>
                    <p className="text-gray-900">
                      {formatCurrency(limits.daily.used)} / {formatCurrency(limits.daily.limit)}
                    </p>
                  </div>
                  <Progress value={calculatePercentage(limits.daily.used, limits.daily.limit)} />
                  <p className="text-gray-500">
                    {formatCurrency(limits.daily.limit - limits.daily.used)} remaining
                  </p>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3>Weekly Limit</h3>
                  <p className="text-gray-600">
                    Resets in {getTimeUntilReset(limits.weekly.resets)}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-600">Used</p>
                    <p className="text-gray-900">
                      {formatCurrency(limits.weekly.used)} / {formatCurrency(limits.weekly.limit)}
                    </p>
                  </div>
                  <Progress value={calculatePercentage(limits.weekly.used, limits.weekly.limit)} />
                  <p className="text-gray-500">
                    {formatCurrency(limits.weekly.limit - limits.weekly.used)} remaining
                  </p>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3>Monthly Limit</h3>
                  <p className="text-gray-600">
                    Resets in {getTimeUntilReset(limits.monthly.resets)}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-600">Used</p>
                    <p className="text-gray-900">
                      {formatCurrency(limits.monthly.used)} / {formatCurrency(limits.monthly.limit)}
                    </p>
                  </div>
                  <Progress value={calculatePercentage(limits.monthly.used, limits.monthly.limit)} />
                  <p className="text-gray-500">
                    {formatCurrency(limits.monthly.limit - limits.monthly.used)} remaining
                  </p>
                </div>
              </Card>
            </motion.div>
          </>
        )}

        {/* Upgrade Path */}
        {nextTierInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="p-6 border border-green-100 bg-green-50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-green-900 mb-1">Upgrade Available</p>
                  <h3 className="text-green-900">Tier {nextTierInfo.level}: {nextTierInfo.name}</h3>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <p className="text-green-900 mb-2">Increased Limits</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white p-2 rounded-lg">
                      <p className="text-green-800">{formatCurrency(nextTierInfo.limits.daily)}</p>
                      <p className="text-green-700">daily</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg">
                      <p className="text-green-800">{formatCurrency(nextTierInfo.limits.weekly)}</p>
                      <p className="text-green-700">weekly</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg">
                      <p className="text-green-800">{formatCurrency(nextTierInfo.limits.monthly)}</p>
                      <p className="text-green-700">monthly</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-green-900 mb-2">Additional Features</p>
                  <ul className="space-y-1">
                    {nextTierInfo.features.slice(0, 3).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-green-800">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-green-900 mb-2">Requirements</p>
                  <ul className="space-y-1">
                    {nextTierInfo.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-green-800">
                        <Shield className="w-4 h-4 mt-0.5 text-green-600" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <Button onClick={onUpgrade} className="w-full bg-green-600 hover:bg-green-700">
                Upgrade to Tier {nextTierInfo.level}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>
          </motion.div>
        )}

        {/* All Tiers Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-6 border border-gray-100">
            <h3 className="mb-4">All Tiers</h3>
            <div className="space-y-4">
              {tiers.map((tier) => (
                <div
                  key={tier.level}
                  className={`p-4 rounded-xl border-2 ${
                    tier.level === currentTier
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3>Tier {tier.level}: {tier.name}</h3>
                      {tier.level === currentTier && (
                        <Badge className="bg-gray-900 text-white">Current</Badge>
                      )}
                      {tier.level > currentTier && (
                        <Badge className="bg-gray-200 text-gray-700">
                          <Lock className="w-3 h-3 mr-1" />
                          Locked
                        </Badge>
                      )}
                    </div>
                  </div>

                  {tier.level > 0 && (
                    <div className="flex items-center gap-2 mb-3 text-gray-600">
                      <p>{formatCurrency(tier.limits.daily)} daily</p>
                      <span>•</span>
                      <p>{formatCurrency(tier.limits.monthly)} monthly</p>
                    </div>
                  )}

                  <ul className="space-y-1">
                    {tier.features.slice(0, 3).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-700">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-gray-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Info Card */}
        <Card className="p-6 border border-blue-100 bg-blue-50">
          <div className="flex gap-3">
            <Clock className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-blue-900 mb-1">About Limits</p>
              <p className="text-blue-800">
                Limits are calculated based on total transaction volume across all supported assets.
                Daily limits reset every 24 hours, weekly limits reset every Monday, and monthly limits reset on the 1st of each month.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
