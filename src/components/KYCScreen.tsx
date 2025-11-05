import { useState } from 'react';
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
  Home as HomeIcon
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface KYCScreenProps {
  currentTier: number;
  kycStatus: 'not_started' | 'pending' | 'approved' | 'rejected';
  onComplete: () => void;
  onBack: () => void;
}

type KYCStep = 'tier_info' | 'bvn' | 'document' | 'selfie' | 'address' | 'review';

export function KYCScreen({ currentTier, kycStatus, onComplete, onBack }: KYCScreenProps) {
  const [step, setStep] = useState<KYCStep>('tier_info');
  const [bvn, setBvn] = useState('');
  const [documentType, setDocumentType] = useState<'nin' | 'passport' | ''>('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState({
    document: false,
    selfie: false,
    address: false,
  });

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

  const steps = [
    { id: 'tier_info', label: 'Overview', tier: 0 },
    { id: 'bvn', label: 'BVN', tier: 1 },
    { id: 'document', label: 'ID Document', tier: 1 },
    { id: 'selfie', label: 'Selfie', tier: 1 },
    { id: 'address', label: 'Address', tier: 2 },
    { id: 'review', label: 'Review', tier: 1 },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleBVNVerify = async () => {
    if (bvn.length !== 11) {
      toast.error('BVN must be 11 digits');
      return;
    }
    
    setIsVerifying(true);
    // Simulate BVN verification
    setTimeout(() => {
      setIsVerifying(false);
      toast.success('BVN verified successfully!');
      setStep('document');
    }, 2000);
  };

  const handleDocumentUpload = () => {
    if (!documentType || !documentNumber) {
      toast.error('Please fill in all document fields');
      return;
    }
    
    // Simulate document upload
    setUploadedDocs(prev => ({ ...prev, document: true }));
    toast.success('Document uploaded successfully!');
    setStep('selfie');
  };

  const handleSelfieCapture = () => {
    // Simulate selfie capture
    setUploadedDocs(prev => ({ ...prev, selfie: true }));
    toast.success('Selfie captured successfully!');
    setStep('review');
  };

  const handleSubmitKYC = async () => {
    setIsVerifying(true);
    // Simulate KYC submission
    setTimeout(() => {
      setIsVerifying(false);
      toast.success('KYC submitted for review! We\'ll notify you within 24 hours.');
      onComplete();
    }, 1500);
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

                  {currentTier < tier.level && (
                    <Button 
                      onClick={() => setStep('bvn')}
                      className="w-full mt-4"
                    >
                      Upgrade to Tier {tier.level}
                    </Button>
                  )}
                </Card>
              ))}
            </motion.div>
          )}

          {step === 'bvn' && (
            <motion.div
              key="bvn"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="mb-1">BVN Verification</h3>
                    <p className="text-gray-600">Verify your Bank Verification Number</p>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl mb-6 border border-blue-100">
                  <p className="text-blue-900 mb-2">Why we need your BVN</p>
                  <p className="text-blue-800">
                    BVN verification is required by Nigerian regulations for financial services. 
                    Your BVN is encrypted and never shared with third parties.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Bank Verification Number (BVN)</Label>
                    <Input
                      type="text"
                      placeholder="Enter 11-digit BVN"
                      value={bvn}
                      onChange={(e) => setBvn(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      maxLength={11}
                    />
                    <p className="text-gray-500">Dial *565*0# to get your BVN</p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleBVNVerify}
                      disabled={bvn.length !== 11 || isVerifying}
                      className="flex-1"
                    >
                      {isVerifying ? 'Verifying...' : 'Verify BVN'}
                    </Button>
                    <Button
                      onClick={() => setStep('tier_info')}
                      variant="outline"
                      className="flex-1"
                    >
                      Back
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {step === 'document' && (
            <motion.div
              key="document"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="mb-1">Identity Document</h3>
                    <p className="text-gray-600">Upload a government-issued ID</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Document Type</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setDocumentType('nin')}
                        className={`p-4 border-2 rounded-xl transition-colors ${
                          documentType === 'nin' 
                            ? 'border-gray-900 bg-gray-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <FileText className="w-6 h-6 mx-auto mb-2 text-gray-700" />
                        <p className="text-gray-900">NIN Card</p>
                      </button>
                      <button
                        onClick={() => setDocumentType('passport')}
                        className={`p-4 border-2 rounded-xl transition-colors ${
                          documentType === 'passport' 
                            ? 'border-gray-900 bg-gray-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <FileText className="w-6 h-6 mx-auto mb-2 text-gray-700" />
                        <p className="text-gray-900">Passport</p>
                      </button>
                    </div>
                  </div>

                  {documentType && (
                    <div className="space-y-2">
                      <Label>Document Number</Label>
                      <Input
                        type="text"
                        placeholder={documentType === 'nin' ? 'Enter NIN' : 'Enter Passport Number'}
                        value={documentNumber}
                        onChange={(e) => setDocumentNumber(e.target.value)}
                      />
                    </div>
                  )}

                  {documentType && documentNumber && (
                    <div className="space-y-2">
                      <Label>Upload Document</Label>
                      <button className="w-full p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-colors">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-600">Click to upload or drag and drop</p>
                        <p className="text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                      </button>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      onClick={handleDocumentUpload}
                      disabled={!documentType || !documentNumber}
                      className="flex-1"
                    >
                      Continue
                    </Button>
                    <Button
                      onClick={() => setStep('bvn')}
                      variant="outline"
                      className="flex-1"
                    >
                      Back
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {step === 'selfie' && (
            <motion.div
              key="selfie"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <Camera className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="mb-1">Selfie Verification</h3>
                    <p className="text-gray-600">Take a quick selfie for liveness check</p>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-xl mb-6 border border-yellow-100">
                  <p className="text-yellow-900 mb-2">Instructions</p>
                  <ul className="text-yellow-800 space-y-1">
                    <li>• Ensure good lighting</li>
                    <li>• Remove glasses and hats</li>
                    <li>• Look directly at the camera</li>
                    <li>• Keep your face in the frame</li>
                  </ul>
                </div>

                <div className="w-full aspect-square bg-gray-100 rounded-xl mb-6 flex items-center justify-center">
                  <Camera className="w-16 h-16 text-gray-400" />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSelfieCapture}
                    className="flex-1"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Capture Selfie
                  </Button>
                  <Button
                    onClick={() => setStep('document')}
                    variant="outline"
                    className="flex-1"
                  >
                    Back
                  </Button>
                </div>
              </Card>
            </motion.div>
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
                    <h3 className="mb-1">Review & Submit</h3>
                    <p className="text-gray-600">Check your information before submitting</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="text-gray-900">BVN Verified</p>
                        <p className="text-gray-600">••• •••• {bvn.slice(-4)}</p>
                      </div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="text-gray-900">{documentType === 'nin' ? 'NIN' : 'Passport'}</p>
                        <p className="text-gray-600">{documentNumber}</p>
                      </div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Camera className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="text-gray-900">Selfie Verification</p>
                        <p className="text-gray-600">Liveness check passed</p>
                      </div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl mb-6 border border-blue-100">
                  <p className="text-blue-900 mb-2">What happens next?</p>
                  <p className="text-blue-800">
                    Our compliance team will review your documents within 24 hours. 
                    You'll receive an email notification once approved.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSubmitKYC}
                    disabled={isVerifying}
                    className="flex-1"
                  >
                    {isVerifying ? 'Submitting...' : 'Submit for Review'}
                  </Button>
                  <Button
                    onClick={() => setStep('selfie')}
                    variant="outline"
                    className="flex-1"
                  >
                    Back
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
                <Button onClick={() => setStep('bvn')} variant="outline" className="border-red-600 text-red-600">
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
