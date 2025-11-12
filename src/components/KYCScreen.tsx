import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { PageHeader } from './ui/page-header';
import {
  CheckCircle2,
  Upload,
  Camera,
  FileText,
  Shield,
  AlertCircle,
  Clock,
  ChevronRight,
  User,
  CreditCard,
  Home as HomeIcon,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { kycApi } from '../services/api';

interface KYCScreenProps {
  currentTier: number;
  kycStatus: 'not_started' | 'pending' | 'approved' | 'rejected';
  onComplete: () => void;
  onBack: () => void;
}

type KYCStep = 'tier_info' | 'sumsub_verification' | 'review';

// Declare Sumsub SDK types
declare global {
  interface Window {
    snsWebSdk?: any;
  }
}

export function KYCScreen({ currentTier, kycStatus, onComplete, onBack }: KYCScreenProps) {
  const [step, setStep] = useState<KYCStep>('tier_info');
  const [isVerifying, setIsVerifying] = useState(false);
  const [sumsubAccessToken, setSumsubAccessToken] = useState<string | null>(null);
  const [sumsubApplicantId, setSumsubApplicantId] = useState<string | null>(null);
  const sumsubContainerRef = useRef<HTMLDivElement>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkInitialized, setSdkInitialized] = useState(false);

  const tiers = [
    {
      level: 0,
      name: 'Preview',
      limits: { daily: 0, monthly: 0 },
      requirements: ['Email or Phone'],
      features: ['View app', 'See rates', 'No off-ramp'],
    },
    {
      level: 1,
      name: 'Basic',
      limits: { daily: 5000000, monthly: 50000000 },
      requirements: ['BVN Verification', 'Government ID', 'Selfie Liveness'],
      features: ['Off-ramp enabled', '₦5M daily limit', '₦50M monthly limit'],
    },
    {
      level: 2,
      name: 'Advanced',
      limits: { daily: 10000000, monthly: 100000000 },
      requirements: ['Tier 1 + Address Proof', 'Source of Funds'],
      features: ['Higher limits', '₦10M daily', '₦100M monthly', 'Priority support'],
    },
  ];

  // Load Sumsub SDK script
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.snsWebSdk) {
      const script = document.createElement('script');
      script.src = 'https://static.sumsub.com/idensic/static/sns-websdk-builder.js';
      script.async = true;
      script.onload = () => {
        setSdkLoaded(true);
        console.log('Sumsub SDK loaded');
      };
      script.onerror = () => {
        toast.error('Failed to load verification SDK');
      };
      document.body.appendChild(script);
    } else if (window.snsWebSdk) {
      setSdkLoaded(true);
    }
  }, []);

  // Initialize Sumsub when step changes to verification
  useEffect(() => {
    // Only proceed if we're on the Sumsub verification step
    if (step !== 'sumsub_verification') {
      // Reset initialization state when leaving the step
      setSdkInitialized(false);
      return;
    }

    // Don't initialize twice
    if (sdkInitialized) {
      console.log('⏭️ SDK already initialized, skipping...');
      return;
    }

    console.log('🔍 Sumsub initialization check:', {
      step,
      sdkLoaded,
      hasAccessToken: !!sumsubAccessToken,
      hasContainer: !!sumsubContainerRef.current,
      windowSdk: !!window.snsWebSdk,
    });

    // Wait for all conditions to be met
    if (!sdkLoaded || !sumsubAccessToken) {
      console.log('⚠️ Waiting for SDK or token...');
      return;
    }

    // Give React and Framer Motion time to render the container
    // Framer Motion animations can delay DOM rendering
    const timer = setTimeout(() => {
      const container = document.getElementById('sumsub-websdk-container');
      console.log('🔍 Checking container after delay:', {
        containerById: !!container,
        containerByRef: !!sumsubContainerRef.current,
      });

      if (container) {
        console.log('✅ All conditions met, initializing Sumsub SDK...');
        // Update the ref if it's not set
        if (!sumsubContainerRef.current) {
          (sumsubContainerRef as any).current = container;
        }
        initializeSumsubSDK();
        setSdkInitialized(true);
      } else {
        console.error('❌ Container still not available after delay');
        console.error('DOM state:', {
          step,
          bodyHTML: document.body.innerHTML.includes('sumsub-websdk-container'),
        });
        toast.error('Verification widget failed to load. Please try again.');
      }
    }, 500); // Increased delay for Framer Motion animation

    return () => clearTimeout(timer);
  }, [step, sdkLoaded, sumsubAccessToken, sdkInitialized]);

  const steps = [
    { id: 'tier_info', label: 'Overview', tier: 0 },
    { id: 'sumsub_verification', label: 'Identity Verification', tier: 1 },
    { id: 'review', label: 'Review', tier: 1 },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleStartKYC = async () => {
    setIsVerifying(true);
    try {
      console.log('🔵 Starting KYC verification...');

      // Call backend to initialize Sumsub
      const response = await kycApi.startKYC();

      console.log('✅ KYC initialization response:', response);

      if (response.provider === 'sumsub' && response.accessToken && response.applicantId) {
        setSumsubAccessToken(response.accessToken);
        setSumsubApplicantId(response.applicantId);
        setStep('sumsub_verification');
        toast.success('KYC verification initialized');
      } else {
        console.error('❌ Invalid KYC response:', response);
        toast.error('KYC provider not configured. Please contact support.');
      }
    } catch (error: any) {
      console.error('❌ Failed to start KYC:', error);
      toast.error(error.message || 'Failed to start KYC verification');
    } finally {
      setIsVerifying(false);
    }
  };

  const initializeSumsubSDK = () => {
    console.log('🚀 initializeSumsubSDK called');

    if (!window.snsWebSdk) {
      console.error('❌ window.snsWebSdk not available');
      toast.error('Verification SDK not loaded. Please refresh the page.');
      return;
    }

    if (!sumsubAccessToken) {
      console.error('❌ sumsubAccessToken not available');
      toast.error('Verification token missing. Please try again.');
      return;
    }

    if (!sumsubContainerRef.current) {
      console.error('❌ sumsubContainerRef.current not available');
      toast.error('Verification container not ready. Please try again.');
      return;
    }

    try {
      console.log('🔧 Building Sumsub SDK instance...');

      const snsWebSdkInstance = window.snsWebSdk
        .init(sumsubAccessToken, () => sumsubAccessToken)
        .withConf({
          lang: 'en',
          theme: 'light',
          uiConf: {
            customCssStr: `
              :root {
                --black: #000000;
                --grey: #6B7280;
                --grey-darker: #4B5563;
                --border-color: #E5E7EB;
              }
            `,
          },
        })
        .withOptions({ addViewportTag: false, adaptIframeHeight: true })
        .on('idCheck.onStepCompleted', (payload: any) => {
          console.log('✅ Step completed:', payload);
        })
        .on('idCheck.onError', (error: any) => {
          console.error('❌ Sumsub error:', error);
          toast.error('Verification error: ' + error.message);
        })
        .on('idCheck.applicantStatus', (payload: any) => {
          console.log('📊 Applicant status:', payload);
          if (payload.reviewStatus === 'completed') {
            toast.success('Verification completed! Processing your submission...');
            setStep('review');
          }
        })
        .build();

      console.log('✅ SDK instance built, launching...');

      // Mount the SDK
      snsWebSdkInstance.launch(sumsubContainerRef.current);

      console.log('✅ SDK launched successfully');
    } catch (error: any) {
      console.error('❌ Failed to initialize Sumsub SDK:', error);
      toast.error('Failed to load verification widget: ' + error.message);
    }
  };

  const handleSubmitKYC = async () => {
    setIsVerifying(true);
    try {
      await kycApi.completeKYC();
      toast.success('KYC submitted for review! We\'ll notify you within 24 hours.');
      onComplete();
    } catch (error: any) {
      console.error('Failed to complete KYC:', error);
      toast.error(error.message || 'Failed to submit KYC');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="pb-safe-nav bg-white min-h-screen">
      <PageHeader
        title="Identity Verification"
        description="Complete KYC to unlock off-ramp features"
        onBack={onBack}
      />

      {step !== 'tier_info' && (
        <div className="px-6 mt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600">Step {currentStepIndex + 1} of {steps.length}</p>
            <p className="text-gray-600">{Math.round(progress)}%</p>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      <div className="px-6 space-y-4">
        <AnimatePresence mode="wait">
          {step === 'tier_info' && (
            <motion.div
              key="tier_info"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {tiers.map((tier) => (
                <Card key={tier.level} className={`p-6 border ${currentTier >= tier.level ? 'border-green-200 bg-green-50' : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3>Tier {tier.level}: {tier.name}</h3>
                        {currentTier >= tier.level && (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-600">
                        {tier.level === 0 ? 'Preview only' : `₦${(tier.limits.daily / 1000).toFixed(0)}K daily / ₦${(tier.limits.monthly / 1000000).toFixed(0)}M monthly`}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-gray-700 mb-2">Requirements:</p>
                      <ul className="space-y-1">
                        {tier.requirements.map((req, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-gray-600">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 text-gray-400" />
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="text-gray-700 mb-2">Features:</p>
                      <ul className="space-y-1">
                        {tier.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-gray-600">
                            <ChevronRight className="w-4 h-4 mt-0.5 text-gray-400" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {currentTier < tier.level && tier.level === 1 && (
                    <Button
                      onClick={handleStartKYC}
                      disabled={isVerifying}
                      className="w-full mt-4"
                    >
                      {isVerifying ? 'Initializing...' : `Upgrade to Tier ${tier.level}`}
                    </Button>
                  )}
                  {currentTier < tier.level && tier.level > 1 && (
                    <Button
                      disabled
                      className="w-full mt-4"
                    >
                      Complete Tier 1 First
                    </Button>
                  )}
                </Card>
              ))}
            </motion.div>
          )}

          {step === 'sumsub_verification' && (
            <div key="sumsub_verification">
              <Card className="p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="mb-1">Identity Verification</h3>
                    <p className="text-gray-600">Complete verification with Sumsub</p>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl mb-4 border border-blue-100">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-blue-900 font-medium mb-1">Secure Verification</p>
                      <p className="text-blue-800 text-sm">
                        You'll be asked to provide a government-issued ID and take a selfie.
                        All data is encrypted and processed securely by Sumsub.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Document Requirements Warning */}
                <div className="bg-red-50 p-4 rounded-xl mb-6 border border-red-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-red-900 font-semibold mb-2">⚠️ Important: Document Requirements</p>
                      <ul className="space-y-2 text-red-800 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-red-600 font-bold">•</span>
                          <span><strong>Clear & Readable:</strong> All text and photos must be clearly visible. No blurry or dark images.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600 font-bold">•</span>
                          <span><strong>Name Must Match:</strong> The name on your ID must exactly match your registered name. Any mismatch will result in rejection.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600 font-bold">•</span>
                          <span><strong>Valid Documents:</strong> Use government-issued ID (National ID, International Passport, or Driver's License).</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600 font-bold">•</span>
                          <span><strong>Good Lighting:</strong> Take photos in a well-lit area. Avoid shadows, glare, or reflections.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600 font-bold">•</span>
                          <span><strong>Complete Document:</strong> Ensure all four corners of your ID are visible in the photo.</span>
                        </li>
                      </ul>
                      <div className="mt-3 pt-3 border-t border-red-200">
                        <p className="text-red-900 font-medium text-sm">
                          ❌ Blurry documents, name mismatches, or incomplete photos will be automatically rejected.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Loading state while SDK initializes */}
                {!sdkInitialized && (
                  <div className="flex items-center justify-center h-[500px] border border-gray-200 rounded-xl bg-white mb-6">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading verification widget...</p>
                    </div>
                  </div>
                )}

                {/* Sumsub SDK Container */}
                <div
                  ref={sumsubContainerRef}
                  id="sumsub-websdk-container"
                  className="min-h-[500px] rounded-xl overflow-hidden border border-gray-200 bg-white"
                  style={{ minHeight: '500px', display: sdkInitialized ? 'block' : 'none' }}
                />

                <div className="mt-6">
                  <Button
                    onClick={() => setStep('tier_info')}
                    variant="outline"
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            </div>
          )}



          {step === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="mb-1">Verification Complete</h3>
                    <p className="text-gray-600">Your documents have been submitted</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="text-gray-900">Identity Verified</p>
                        <p className="text-gray-600">Documents submitted to Sumsub</p>
                      </div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>

                  {sumsubApplicantId && (
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-600" />
                        <div>
                          <p className="text-gray-900">Applicant ID</p>
                          <p className="text-gray-600 text-sm font-mono">{sumsubApplicantId.slice(0, 16)}...</p>
                        </div>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 p-4 rounded-xl mb-6 border border-blue-100">
                  <p className="text-blue-900 mb-2">What happens next?</p>
                  <p className="text-blue-800">
                    Our compliance team will review your documents within 24-48 hours.
                    You'll receive an email notification once your verification is approved.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSubmitKYC}
                    disabled={isVerifying}
                    className="flex-1"
                  >
                    {isVerifying ? 'Finalizing...' : 'Complete Verification'}
                  </Button>
                  <Button
                    onClick={onBack}
                    variant="outline"
                    className="flex-1"
                  >
                    Done
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {kycStatus === 'pending' && (
          <Card className="p-6 border border-yellow-100 bg-yellow-50">
            <div className="flex items-start gap-3">
              <Clock className="w-6 h-6 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="text-yellow-900 mb-1">KYC Under Review</p>
                <p className="text-yellow-800">
                  Your documents are being reviewed. This usually takes up to 24 hours.
                  We'll notify you via email once complete.
                </p>
              </div>
            </div>
          </Card>
        )}

        {kycStatus === 'rejected' && (
          <Card className="p-6 border border-red-100 bg-red-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-red-900 mb-1">Verification Failed</p>
                <p className="text-red-800 mb-3">
                  We couldn't verify your documents. Please ensure they are clear and valid, then try again.
                </p>
                <Button onClick={handleStartKYC} variant="outline" className="border-red-600 text-red-600">
                  Retry Verification
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
