import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { Button } from './button';

interface PageHeaderProps {
  title: string;
  description?: string;
  onBack?: () => void;
  showBack?: boolean;
}

export function PageHeader({ title, description, onBack, showBack = true }: PageHeaderProps) {
  return (
    <div className="px-6 pb-6" style={{ paddingTop: `calc(3rem + env(safe-area-inset-top))` }}>
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        {showBack && onBack && (
          <Button
            onClick={onBack}
            variant="ghost"
            className="mb-4 -ml-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
        )}
        <h1 className="text-gray-900 mb-2">{title}</h1>
        {description && <p className="text-gray-500">{description}</p>}
      </motion.div>
    </div>
  );
}

