'use client';
import { Bell, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 md:px-6 gap-4">
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <button className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <Bell className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
          {user?.firstName?.[0]}
          {user?.lastName?.[0]}
        </div>
      </div>
    </header>
  );
}
