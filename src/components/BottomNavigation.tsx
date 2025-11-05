import { Home, ArrowUpRight, Wallet, Clock, Settings } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'offramp', label: 'Off-ramp', icon: ArrowUpRight },
    { id: 'wallets', label: 'Wallets', icon: Wallet },
    { id: 'transactions', label: 'History', icon: Clock },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
      <div className="max-w-lg mx-auto grid grid-cols-5 pb-safe">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                isActive ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
              <span className={`text-[10px] ${isActive ? 'font-medium' : ''}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
