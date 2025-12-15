import { useEffect, useRef } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Auto-dismiss after 5 seconds if user doesn't interact
    const timer = setTimeout(() => {
      onFinish();
    }, 5000);

    // Listen for messages from the iframe (for button clicks)
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'splashFinish') {
        onFinish();
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('message', handleMessage);
    };
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50">
      <iframe
        ref={iframeRef}
        src="/generated-page (2).html"
        className="w-full h-full border-0"
        title="Solpay Splash Screen"
      />
      {/* Invisible overlay to capture clicks and dismiss splash */}
      <button
        onClick={onFinish}
        className="absolute top-4 right-4 z-50 bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-zinc-200 transition-all shadow-lg"
        style={{ boxShadow: '0 0 20px -5px rgba(255,255,255,0.3)' }}
      >
        Enter App →
      </button>
    </div>
  );
}
