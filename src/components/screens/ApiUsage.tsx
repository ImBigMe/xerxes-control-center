'use client';

import { useState, useCallback, useMemo } from 'react';
import { useMissionControl } from '@/lib/store';
import { Database, Upload, TrendingUp, CreditCard, Activity, ArrowUpRight, Zap, Layers, RefreshCw, X, ChevronRight } from 'lucide-react';

interface ApiProvider {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  balance?: number;
  usageLimit?: number;
  usageThisMonth: number;
  lastUpdated: string;
}

export function ApiUsage() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Mock data for initial view - eventually we can store this in Zustand
  const [providers, setProviders] = useState<ApiProvider[]>([
    { id: 'openrouter', name: 'OpenRouter', status: 'active', balance: 45.20, usageThisMonth: 12.45, lastUpdated: new Date().toISOString() },
    { id: 'google', name: 'Google Cloud (Gemini)', status: 'active', usageThisMonth: 0.00, lastUpdated: new Date().toISOString() },
    { id: 'anthropic', name: 'Anthropic', status: 'active', balance: 50.00, usageThisMonth: 5.12, lastUpdated: new Date().toISOString() },
    { id: 'moonshot', name: 'Moonshot AI', status: 'active', balance: 10.00, usageThisMonth: 1.20, lastUpdated: new Date().toISOString() },
  ]);

  const handleFileUpload = useCallback((file: File) => {
    // Basic CSV parser shell for API usage exports
    const reader = new FileReader();
    reader.onload = (e) => {
      // In a real implementation, we'd parse the CSV and update the state/store
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    };
    reader.readAsText(file);
  }, []);

  const totalSpend = useMemo(() => providers.reduce((sum, p) => sum + p.usageThisMonth, 0), [providers]);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Database className="w-6 h-6 text-purple-400" />
            API Usage & Billing
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Monitor spend and usage across all AI providers
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Total Monthly Spend</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-white">${totalSpend.toFixed(2)}</p>
          <p className="text-[10px] text-green-400 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> +12% from last month
          </p>
        </div>
        
        <div className="glass-panel p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Active Providers</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white">{providers.filter(p => p.status === 'active').length}</p>
          <p className="text-[10px] text-gray-500 mt-1">OpenRouter, Google, Anthropic, Moonshot</p>
        </div>

        <div className="glass-panel p-5 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Total Credits Remaining</span>
            <CreditCard className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-white">$105.20</p>
          <p className="text-[10px] text-gray-500 mt-1">Prepaid balance across 3 providers</p>
        </div>
      </div>

      {/* Upload & Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Provider List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel p-0 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Provider Status</h3>
              <button className="text-[10px] text-blue-400 hover:underline flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Refresh Auto-Sync
              </button>
            </div>
            <div className="divide-y divide-white/5">
              {providers.map(provider => (
                <div key={provider.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                      <Zap className={`w-5 h-5 ${provider.id === 'openrouter' ? 'text-yellow-400' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white">{provider.name}</h4>
                      <p className="text-[10px] text-gray-500">Last updated: {new Date(provider.lastUpdated).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">${provider.usageThisMonth.toFixed(2)}</p>
                      <p className="text-[10px] text-gray-500">Monthly Usage</p>
                    </div>
                    {provider.balance !== undefined && (
                      <div className="text-right w-24">
                        <p className="text-sm font-bold text-green-400">${provider.balance.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-500">Balance</p>
                      </div>
                    )}
                    <button className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-white transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upload Panel */}
        <div className="space-y-4">
          <div className="glass-panel p-6 border-2 border-dashed border-white/10 text-center">
            <Upload className={`w-10 h-10 mx-auto mb-3 ${uploadSuccess ? 'text-green-400' : 'text-gray-500'}`} />
            <h4 className="text-sm font-semibold text-white mb-1">Manual Billing Import</h4>
            <p className="text-xs text-gray-500 mb-4">Upload usage CSVs from providers</p>
            <label className="btn-primary w-full inline-flex items-center justify-center gap-2 cursor-pointer text-xs py-2">
              <Upload className="w-3 h-3" />
              Select File
              <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
            </label>
          </div>

          <div className="glass-panel p-5">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Recent Alerts
            </h4>
            <div className="space-y-3">
              <div className="text-xs p-2 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-200">
                OpenRouter balance below $10.00
              </div>
              <div className="text-xs p-2 rounded bg-blue-500/10 border border-blue-500/20 text-blue-200">
                Anthropic usage spike (+25% today)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
