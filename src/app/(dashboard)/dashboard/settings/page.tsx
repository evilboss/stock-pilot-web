'use client';
import { useAuth } from '@/contexts/auth-context';
import { Package2, User, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account and preferences</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <User className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="font-semibold text-gray-900">Profile</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="form-label">First Name</label>
              <input className="form-input" defaultValue={user?.firstName} readOnly />
            </div>
            <div>
              <label className="form-label">Last Name</label>
              <input className="form-input" defaultValue={user?.lastName} readOnly />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input className="form-input" defaultValue={user?.email} readOnly />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Shield className="w-5 h-5 text-purple-500" />
            </div>
            <h2 className="font-semibold text-gray-900">Access &amp; Role</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="form-label">Role</label>
              <div className="mt-1">
                <span className="badge-blue">{user?.role?.name}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <Package2 className="w-5 h-5 text-green-500" />
            </div>
            <h2 className="font-semibold text-gray-900">About StockPilot</h2>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <span className="font-medium">Version:</span> 1.0.0
            </p>
            <p>
              <span className="font-medium">API:</span>{' '}
              {process.env.NEXT_PUBLIC_API_URL}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
