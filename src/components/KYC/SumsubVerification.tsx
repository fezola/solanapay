/**
 * Sumsub KYC Verification Component
 * Integrates Sumsub Web SDK for document verification
 */

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';

interface SumsubVerificationProps {
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function SumsubVerification({ onComplete, onError }: SumsubVerificationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'completed' | 'error'>('idle');
  const [accessToken, setAccessToken] = useState<string | null>(null);

  /**
   * Initialize Sumsub SDK
   */
  const initializeSumsub = async () => {
    try {
      setLoading(true);
      setError(null);
      setStatus('loading');

      // Start KYC verification to get access token
      const response = await api.post('/api/kyc/start', {});

      if (response.data.provider !== 'sumsub') {
        throw new Error('Sumsub not configured on backend');
      }

      const token = response.data.accessToken;
      setAccessToken(token);

      // Load Sumsub SDK
      await loadSumsubSDK();

      // Initialize Sumsub Web SDK
      if (window.snsWebSdk && containerRef.current) {
        const snsWebSdkInstance = window.snsWebSdk
          .init(token, () => token)
          .withConf({
            lang: 'en',
            theme: 'dark',
            uiConf: {
              customCssStr: `
                :root {
                  --black: #000000;
                  --grey: #1a1a1a;
                  --grey-darker: #0a0a0a;
                  --border-color: #333333;
                }
              `,
            },
          })
          .withOptions({ addViewportTag: false, adaptIframeHeight: true })
          .on('idCheck.onStepCompleted', (payload: any) => {
            console.log('Step completed:', payload);
          })
          .on('idCheck.onApplicantSubmitted', (payload: any) => {
            console.log('Applicant submitted:', payload);
            setStatus('completed');
            onComplete?.();
          })
          .on('idCheck.onError', (error: any) => {
            console.error('Sumsub error:', error);
            setError(error.message || 'Verification failed');
            setStatus('error');
            onError?.(error.message);
          })
          .build();

        // Mount SDK to container
        snsWebSdkInstance.launch(containerRef.current);
        setStatus('ready');
      }
    } catch (err: any) {
      console.error('Failed to initialize Sumsub:', err);
      setError(err.message || 'Failed to initialize verification');
      setStatus('error');
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load Sumsub SDK script
   */
  const loadSumsubSDK = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.snsWebSdk) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://static.sumsub.com/idensic/static/sns-websdk-builder.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Sumsub SDK'));
      document.body.appendChild(script);
    });
  };

  /**
   * Retry verification
   */
  const retryVerification = async () => {
    try {
      setLoading(true);
      setError(null);
      setStatus('loading');

      // Retry KYC verification
      const response = await api.post('/api/kyc/retry', {});

      if (response.data.provider !== 'sumsub') {
        throw new Error('Sumsub not configured on backend');
      }

      const token = response.data.accessToken;
      setAccessToken(token);

      // Reload SDK with new token
      if (window.snsWebSdk && containerRef.current) {
        const snsWebSdkInstance = window.snsWebSdk
          .init(token, () => token)
          .withConf({
            lang: 'en',
            theme: 'dark',
          })
          .withOptions({ addViewportTag: false, adaptIframeHeight: true })
          .on('idCheck.onApplicantSubmitted', () => {
            setStatus('completed');
            onComplete?.();
          })
          .on('idCheck.onError', (error: any) => {
            setError(error.message || 'Verification failed');
            setStatus('error');
            onError?.(error.message);
          })
          .build();

        snsWebSdkInstance.launch(containerRef.current);
        setStatus('ready');
      }
    } catch (err: any) {
      console.error('Failed to retry verification:', err);
      setError(err.message || 'Failed to retry verification');
      setStatus('error');
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Identity Verification</CardTitle>
        <CardDescription>
          Complete your identity verification to unlock full access to SolPay
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'idle' && (
          <div className="text-center py-8">
            <Button onClick={initializeSumsub} disabled={loading} size="lg">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Verification
            </Button>
          </div>
        )}

        {status === 'loading' && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-lg">Loading verification...</span>
          </div>
        )}

        {status === 'ready' && (
          <div ref={containerRef} className="min-h-[600px]" />
        )}

        {status === 'completed' && (
          <Alert className="bg-green-500/10 border-green-500/50">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-500">
              Verification submitted successfully! We'll review your documents and notify you once approved.
            </AlertDescription>
          </Alert>
        )}

        {status === 'error' && error && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="text-center">
              <Button onClick={retryVerification} variant="outline" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Retry Verification
              </Button>
            </div>
          </div>
        )}

        {status !== 'idle' && status !== 'completed' && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Make sure you have a valid government-issued ID (National ID, Driver's License, or Passport) ready.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// Extend Window interface for Sumsub SDK
declare global {
  interface Window {
    snsWebSdk?: any;
  }
}

