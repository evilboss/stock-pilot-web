'use client';
import { useState } from 'react';
import Sidebar from './sidebar';
import Header from './header';
import BottomNav from './bottom-nav';
import ScrollToTop from './scroll-to-top';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col md:ml-64 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main
          id="main-scroll"
          className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6"
        >
          {children}
        </main>
      </div>

      <BottomNav />
      <ScrollToTop />
    </div>
  );
}
