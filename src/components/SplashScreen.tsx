import { useEffect } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  useEffect(() => {
    // Listen for messages from the iframe (for button clicks)
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'splashFinish' || event.data === 'getStarted' || event.data === 'login') {
        onFinish();
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50">
      <iframe
        src="/generated-page (2).html"
        className="w-full h-full border-0"
        title="Solpay Splash Screen"
      />
    </div>
  );
}
