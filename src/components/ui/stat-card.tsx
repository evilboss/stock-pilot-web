import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
}

const colorMap = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  green: { bg: 'bg-green-50', text: 'text-green-600' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600' },
  red: { bg: 'bg-red-50', text: 'text-red-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
};

export default function StatCard({ title, value, icon: Icon, color = 'blue' }: StatCardProps) {
  const colors = colorMap[color];
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={cn('p-3 rounded-xl', colors.bg)}>
          <Icon className={cn('w-6 h-6', colors.text)} />
        </div>
      </div>
    </div>
  );
}
