'use client';

import { useState } from 'react';
import { Shield, Lock } from 'lucide-react';

const CORRECT_PASSWORD = 'xerxes2026';

interface PasswordGateProps {
  onUnlock: () => void;
}

export function PasswordGate({ onUnlock }: PasswordGateProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      onUnlock();
      localStorage.setItem('xerxes_authenticated', 'true');
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  // Check if already authenticated
  if (typeof window !== 'undefined') {
    const isAuth = localStorage.getItem('xerxes_authenticated') === 'true';
    if (isAuth) {
      onUnlock();
      return null;
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen w-full" style={{ background: 'var(--shell-gradient)' }}>
      {/* Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <div className="relative z-10 w-full max-w-md p-8 mx-4">
        <div className="glass-panel rounded-2xl p-8 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Shield className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            XERXES Command Center
          </h1>
          <p className="text-gray-400 mb-8">Orchestrate your AI workforce</p>

          {/* Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter access code"
                className={`w-full pl-12 pr-4 py-4 bg-black/30 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                  error 
                    ? 'border-red-500 focus:ring-red-500/50' 
                    : 'border-white/10 focus:ring-blue-500/50 focus:border-blue-500/50'
                }`}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm animate-pulse">Invalid access code</p>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20"
            >
              Enter Command Center
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-xs text-gray-500">
            Authorized access only
          </p>
        </div>
      </div>
    </div>
  );
}
