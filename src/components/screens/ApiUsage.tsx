'use client';

import { useState, useCallback, useMemo } from 'react';
import { useMissionControl } from '@/lib/store';
import { Database, Upload, TrendingUp, CreditCard, Activity, ArrowUpRight, Zap, Layers, RefreshCw, X, ChevronRight, DollarSign, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ApiProvider {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  trackingMode: 'tokens' | 'dollars';
  balance?: number;
  usageLimit?: number;
  usageThisMonth: number;
  tokensIn?: number;
  tokensOut?: number;
  lastUpdated: string;
}

interface MonthlySpend {
  month: string;
  provider: string;
  amount: number;
  tokensIn?: number;
  tokensOut?: number;
}

export function ApiUsage() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [monthlyData, setMonthlyData] = useState<MonthlySpend[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Set<string>>(new Set());
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [providers, setProviders] = useState<ApiProvider[]>([
    { id: 'openrouter', name: 'OpenRouter', status: 'active', trackingMode: 'dollars', balance: 45.20, usageThisMonth: 12.45, lastUpdated: new Date().toISOString() },
    { id: 'google', name: 'Google Cloud (Gemini)', status: 'active', trackingMode: 'tokens', tokensIn: 2400000, tokensOut: 890000, usageThisMonth: 8.50, lastUpdated: new Date().toISOString() },
    { id: 'anthropic', name: 'Anthropic', status: 'active', trackingMode: 'tokens', tokensIn: 450000, tokensOut: 120000, usageThisMonth: 15.20, lastUpdated: new Date().toISOString() },
    { id: 'moonshot', name: 'Moonshot AI', status: 'active', trackingMode: 'dollars', balance: 10.00, usageThisMonth: 12.25, lastUpdated: new Date().toISOString() },
  ]);

  const parseExcel = (text: string): MonthlySpend[] | null => {
    // DEBUG: Log everything
    console.log('=== PARSE ATTEMPT ===');
    console.log('Text length:', text?.length);
    console.log('First 200 chars:', text?.slice(0, 200));
    console.log('First line:', text?.split('\n')[0]);
    
    // Simple CSV/TSV parser for Excel exports
    // Remove BOM if present and normalize line endings
    const cleanText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = cleanText.trim().split('\n');
    console.log('Total lines:', lines.length);
    if (lines.length < 2) {
      console.log('ERROR: Less than 2 lines');
      return null;
    }

    // Try to detect format
    const firstLine = lines[0]?.trim();
    console.log('Detecting format...');
    console.log('First line:', firstLine);
    
    const isMoonshotFormat = firstLine.includes('Time Range') && firstLine.includes('Deduction');
    console.log('Is Moonshot?', isMoonshotFormat);
    const isAnthropicCostFormat = firstLine.includes('usage_date_utc') && firstLine.includes('cost_usd');
    console.log('Is Anthropic Cost?', isAnthropicCostFormat);
    const isAnthropicTokenFormat = firstLine.includes('usage_date_utc') && firstLine.includes('usage_input_tokens');
    console.log('Is Anthropic Token?', isAnthropicTokenFormat);
    
    if (isAnthropicCostFormat) {
      // Parse Anthropic cost CSV
      const data: MonthlySpend[] = [];
      const dailyTotals: Record<string, number> = {};
      
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length >= 9) {
          const date = cols[0]?.trim();
          const cost = parseFloat(cols[7]?.trim() || '0');
          if (date && cost > 0) {
            dailyTotals[date] = (dailyTotals[date] || 0) + cost;
          }
        }
      }
      
      Object.entries(dailyTotals).forEach(([date, amount]) => {
        data.push({ month: date, provider: 'Anthropic', amount });
      });
      
      return data;
    }
    
    if (isAnthropicTokenFormat) {
      // Parse Anthropic token CSV - aggregate by date
      const data: MonthlySpend[] = [];
      const dailyTotals: Record<string, { tokensIn: number; tokensOut: number }> = {};
      
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length >= 12) {
          const date = cols[0]?.trim();
          const inputNoCache = parseInt(cols[6]?.trim() || '0');
          const inputCacheWrite5m = parseInt(cols[7]?.trim() || '0');
          const inputCacheWrite1h = parseInt(cols[8]?.trim() || '0');
          const inputCacheRead = parseInt(cols[9]?.trim() || '0');
          const outputTokens = parseInt(cols[10]?.trim() || '0');
          
          const totalIn = inputNoCache + inputCacheWrite5m + inputCacheWrite1h + inputCacheRead;
          const totalOut = outputTokens;
          
          if (date) {
            if (!dailyTotals[date]) {
              dailyTotals[date] = { tokensIn: 0, tokensOut: 0 };
            }
            dailyTotals[date].tokensIn += totalIn;
            dailyTotals[date].tokensOut += totalOut;
          }
        }
      }
      
      Object.entries(dailyTotals).forEach(([date, tokens]) => {
        data.push({ 
          month: date, 
          provider: 'Anthropic', 
          amount: 0, // Unknown cost from token file
          tokensIn: tokens.tokensIn,
          tokensOut: tokens.tokensOut
        });
      });
      
      return data;
    }
    
    // OpenRouter daily summary format
    const isOpenRouterDaily = firstLine.includes('Date') && firstLine.includes('Slug') && firstLine.includes('Usage');
    console.log('Is OpenRouter Daily?', isOpenRouterDaily);
    if (isOpenRouterDaily) {
      const data: MonthlySpend[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length >= 8) {
          const date = cols[0]?.replace(/"/g, '').trim();
          const slug = cols[1]?.replace(/"/g, '').trim();
          const usage = parseFloat(cols[2]?.replace(/"/g, '') || '0');
          const requests = parseInt(cols[4]?.replace(/"/g, '') || '0');
          const promptTokens = parseInt(cols[5]?.replace(/"/g, '') || '0');
          const completionTokens = parseInt(cols[6]?.replace(/"/g, '') || '0');
          
          if (date && usage > 0) {
            data.push({
              month: date,
              provider: 'OpenRouter',
              amount: usage,
              tokensIn: promptTokens,
              tokensOut: completionTokens,
            });
          }
        }
      }
      
      return data;
    }
    
    // OpenRouter detailed format (per-request)
    const isOpenRouterDetailed = firstLine.includes('generation_id') && firstLine.includes('cost_total');
    console.log('Is OpenRouter Detailed?', isOpenRouterDetailed);
    if (isOpenRouterDetailed) {
      const data: MonthlySpend[] = [];
      const dailyTotals: Record<string, { amount: number; tokensIn: number; tokensOut: number }> = {};
      
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length >= 20) {
          const createdAt = cols[1]?.trim();
          const cost = parseFloat(cols[2]?.trim() || '0');
          const promptTokens = parseInt(cols[8]?.trim() || '0');
          const completionTokens = parseInt(cols[9]?.trim() || '0');
          
          // Extract date from created_at (2026-02-25 15:07:01.195)
          const date = createdAt?.split(' ')[0];
          
          if (date && cost > 0) {
            if (!dailyTotals[date]) {
              dailyTotals[date] = { amount: 0, tokensIn: 0, tokensOut: 0 };
            }
            dailyTotals[date].amount += cost;
            dailyTotals[date].tokensIn += promptTokens;
            dailyTotals[date].tokensOut += completionTokens;
          }
        }
      }
      
      Object.entries(dailyTotals).forEach(([date, totals]) => {
        data.push({
          month: date,
          provider: 'OpenRouter',
          amount: totals.amount,
          tokensIn: totals.tokensIn,
          tokensOut: totals.tokensOut,
        });
      });
      
      return data;
    }
    
    if (isMoonshotFormat) {
      // Parse Moonshot Excel format
      const data: MonthlySpend[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('\t'); // Tab-separated from Excel
        if (cols.length >= 6) {
          const timeRange = cols[0]?.replace(/"/g, '').trim();
          const rechargeAmount = parseFloat(cols[4]?.replace(/"/g, '') || '0');
          const voucherAmount = parseFloat(cols[5]?.replace(/"/g, '') || '0');
          const totalAmount = rechargeAmount + voucherAmount;
          
          if (totalAmount > 0) {
            data.push({
              month: timeRange,
              provider: 'Moonshot AI',
              amount: totalAmount,
            });
          }
        }
      }
      return data;
    }
    
    console.log('ERROR: No format matched!');
    return null;
  };


  // Generate a simple hash of file content to detect duplicates
  const generateHash = (content: string): string => {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  };

  // Check for duplicate entries in data
  const dedupeData = (newData: MonthlySpend[], existingData: MonthlySpend[]): MonthlySpend[] => {
    const seen = new Set<string>();
    
    // Add existing entries to seen set
    existingData.forEach(d => {
      seen.add(`${d.month}-${d.provider}-${d.amount}`);
    });
    
    // Filter out duplicates from new data
    return newData.filter(d => {
      const key = `${d.month}-${d.provider}-${d.amount}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  const handleFileUpload = useCallback((file: File) => {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCSV = file.name.endsWith('.csv');
    
    if (!isExcel && !isCSV) {
      alert('Please upload an Excel (.xlsx) or CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const fileContent = e.target?.result as string;
      
      // Try to parse regardless of file type
      const parsed = parseExcel(fileContent);
      if (parsed && parsed.length > 0) {
        // Deduplicate against existing data
        const uniqueData = dedupeData(parsed, monthlyData);
        
        if (uniqueData.length === 0) {
          setDuplicateWarning('All entries in this file are already imported.');
          setTimeout(() => setDuplicateWarning(null), 3000);
          return;
        }
        
        if (uniqueData.length < parsed.length) {
          setDuplicateWarning(`${parsed.length - uniqueData.length} duplicate entries skipped.`);
          setTimeout(() => setDuplicateWarning(null), 3000);
        }
        
        // Track this file as uploaded
        setUploadedFiles(prev => new Set(prev).add(generateHash(file.name + fileContent.slice(0, 1000))));
        
        setMonthlyData(prev => [...prev, ...uniqueData]);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
        
        // Update provider based on detected format
        const isAnthropic = fileContent.includes('usage_date_utc') && fileContent.includes('claude');
        const isOpenRouter = fileContent.includes('generation_id') || (fileContent.includes('OpenRouter') || fileContent.includes('Slug'));
        const isMoonshot = fileContent.includes('Time Range') || fileContent.includes('Moonshot');
        
        
        if (isAnthropic) {
          setProviders(prev => prev.map(p => 
            p.id === 'anthropic'
              ? { ...p, usageThisMonth: parsed.reduce((sum, d) => sum + (d.amount || 0), 0) || p.usageThisMonth, 
                  tokensIn: parsed.reduce((sum, d) => sum + (d.tokensIn || 0), 0) || p.tokensIn,
                  tokensOut: parsed.reduce((sum, d) => sum + (d.tokensOut || 0), 0) || p.tokensOut,
                  lastUpdated: new Date().toISOString() }
              : p
          ));
        } else if (isOpenRouter) {
          setProviders(prev => prev.map(p => 
            p.id === 'openrouter'
              ? { ...p, usageThisMonth: parsed.reduce((sum, d) => sum + d.amount, 0) || p.usageThisMonth,
                  tokensIn: parsed.reduce((sum, d) => sum + (d.tokensIn || 0), 0) || p.tokensIn,
                  tokensOut: parsed.reduce((sum, d) => sum + (d.tokensOut || 0), 0) || p.tokensOut,
                  lastUpdated: new Date().toISOString() }
              : p
          ));
        } else if (isMoonshot) {
          setProviders(prev => prev.map(p => 
            p.id === 'moonshot' 
              ? { ...p, usageThisMonth: parsed.reduce((sum, d) => sum + (d.amount || 0), 0) || p.usageThisMonth, 
                  tokensIn: parsed.reduce((sum, d) => sum + (d.tokensIn || 0), 0) || p.tokensIn,
                  tokensOut: parsed.reduce((sum, d) => sum + (d.tokensOut || 0), 0) || p.tokensOut,
                  lastUpdated: new Date().toISOString() }
              : p
          ));
        } else if (isOpenRouter) {
          setProviders(prev => prev.map(p => 
            p.id === 'openrouter' 
              ? { ...p, usageThisMonth: parsed.reduce((sum, d) => sum + d.amount, 0) || p.usageThisMonth,
                  tokensIn: parsed.reduce((sum, d) => sum + (d.tokensIn || 0), 0) || p.tokensIn,
                  tokensOut: parsed.reduce((sum, d) => sum + (d.tokensOut || 0), 0) || p.tokensOut,
                  lastUpdated: new Date().toISOString() }
              : p
          ));
        } else if (isMoonshot) {
          setProviders(prev => prev.map(p => 
            p.id === 'moonshot' 
              ? { ...p, usageThisMonth: parsed.reduce((sum, d) => sum + d.amount, 0), lastUpdated: new Date().toISOString() }
              : p
          ));
        }
      } else {
        // Show error in UI
        const errorText = `Failed to parse ${file.name}. Check console for details.`;
        setErrorMsg(errorText);
        setTimeout(() => setErrorMsg(null), 5000);
        console.error('=== PARSE ERROR ===');
        console.error('File:', file.name);
        console.error('Type:', file.type);
        console.error('Size:', file.size);
        console.error('Content preview (first 500 chars):', fileContent?.slice(0, 500));
        console.error('===================');
      }
    };
    reader.readAsText(file);
  }, []);

  const totalSpend = useMemo(() => providers.reduce((sum, p) => sum + p.usageThisMonth, 0), [providers]);
  const dollarProviders = providers.filter(p => p.trackingMode === 'dollars');
  const tokenProviders = providers.filter(p => p.trackingMode === 'tokens');

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
            Track spend across all AI providers — tokens or dollars
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Total Monthly Spend</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-white">${totalSpend.toFixed(2)}</p>
          <p className="text-[10px] text-green-400 mt-1">All providers combined</p>
        </div>
        
        <div className="glass-panel p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Token-Based</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white">{tokenProviders.length}</p>
          <p className="text-[10px] text-gray-500">Anthropic, Google Gemini</p>
        </div>

        <div className="glass-panel p-5 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Dollar-Based</span>
            <DollarSign className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-white">{dollarProviders.length}</p>
          <p className="text-[10px] text-gray-500">Moonshot, OpenRouter</p>
        </div>

        <div className="glass-panel p-5 border-l-4 border-l-yellow-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Total Credits</span>
            <CreditCard className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-3xl font-bold text-white">${providers.reduce((s, p) => s + (p.balance || 0), 0).toFixed(0)}</p>
          <p className="text-[10px] text-gray-500">Remaining balance</p>
        </div>
      </div>

      {/* Provider List */}
      <div className="glass-panel p-0 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Provider Details</h3>
          <div className="flex gap-2">
            <span className="text-[10px] px-2 py-1 rounded bg-blue-500/20 text-blue-300">Token Tracking</span>
            <span className="text-[10px] px-2 py-1 rounded bg-green-500/20 text-green-300">Dollar Tracking</span>
          </div>
        </div>
        <div className="divide-y divide-white/5">
          {providers.map(provider => (
            <div key={provider.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${provider.trackingMode === 'tokens' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                  <Zap className={`w-5 h-5 ${provider.trackingMode === 'tokens' ? 'text-blue-400' : 'text-green-400'}`} />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white">{provider.name}</h4>
                  <p className="text-[10px] text-gray-500">
                    {provider.trackingMode === 'tokens' 
                      ? `In: ${(provider.tokensIn || 0).toLocaleString()} tokens` 
                      : 'Dollar-based tracking'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                {provider.tokensOut && (
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-gray-400">Output</p>
                    <p className="text-sm text-white">{(provider.tokensOut / 1000).toFixed(1)}k tokens</p>
                  </div>
                )}
                <div className="text-right">
                  <p className="text-sm font-bold text-white">${provider.usageThisMonth.toFixed(2)}</p>
                  <p className="text-[10px] text-gray-500">Monthly</p>
                </div>
                {provider.balance !== undefined && (
                  <div className="text-right w-24">
                    <p className="text-sm font-bold text-green-400">${provider.balance.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-500">Balance</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); const files = Array.from(e.dataTransfer.files); files[0] && handleFileUpload(files[0]); }}
          className={`glass-panel p-6 border-2 border-dashed transition-all ${isDragging ? 'border-blue-400 bg-blue-500/10' : errorMsg ? 'border-red-400 bg-red-500/10' : uploadSuccess ? 'border-green-400 bg-green-500/10' : 'border-white/10'}`}
        >
          <FileSpreadsheet className={`w-10 h-10 mb-3 ${errorMsg ? 'text-red-400' : (uploadSuccess ? 'text-green-400' : 'text-gray-500')}`} />
          <h4 className={`text-sm font-semibold mb-1 ${errorMsg ? 'text-red-400' : 'text-white'}`}>
            {errorMsg ? errorMsg : (uploadSuccess ? 'Upload Successful!' : 'Import Billing Excel')}
          </h4>
          <p className="text-xs text-gray-500 mb-4">
            Supports Anthropic & Moonshot CSV exports<br/>
            Google/OpenRouter: API auto-sync coming Sunday
          </p>
          <label className="btn-primary w-full inline-flex items-center justify-center gap-2 cursor-pointer text-xs py-2">
            <Upload className="w-3 h-3" />
            Select Excel File
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
          </label>
        </div>

        <div className="glass-panel p-5">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            Recent Imports
          </h4>
          {monthlyData.length > 0 ? (
            <div className="space-y-2">
              {monthlyData.map((data, i) => (
                <div key={i} className="flex justify-between items-center p-2 bg-white/5 rounded text-xs">
                  <span className="text-gray-400">{data.month}</span>
                  <span className="text-white font-medium">{data.provider}</span>
                  <span className="text-green-400">${data.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No imports yet. Upload your Moonshot Excel to see data here.</p>
          )}
        </div>
      </div>
    </div>
  );
}
// Force redeploy Fri Feb 27 22:14:30 UTC 2026
