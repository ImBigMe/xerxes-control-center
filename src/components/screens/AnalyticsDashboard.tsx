'use client';

import { useState, useCallback, useMemo } from 'react';
import { useMissionControl } from '@/lib/store';
import { BarChart3, Upload, TrendingUp, Users, Eye, Heart, MessageCircle, Repeat, Bookmark, Share2, Filter, Calendar, ArrowUpDown, X, ExternalLink } from 'lucide-react';

export function AnalyticsDashboard() {
  const { 
    analyticsDaily, 
    analyticsTweets, 
    setAnalyticsDaily, 
    setAnalyticsTweets,
    clearAnalytics 
  } = useMissionControl();
  
  const [isDragging, setIsDragging] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [sortBy, setSortBy] = useState<'engagements' | 'impressions' | 'likes' | 'date'>('engagements');
  const [sortDesc, setSortDesc] = useState(true);
  const [selectedTweet, setSelectedTweet] = useState<typeof analyticsTweets[0] | null>(null);

  const parseCSV = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return null;

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const isDailySummary = headers.includes('Date') && headers.includes('Impressions') && !headers.includes('Post id');
    const isPerPost = headers.includes('Post id') || headers.includes('Post Link');

    if (isDailySummary) {
      return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        const getVal = (name: string) => {
          const idx = headers.indexOf(name);
          return idx >= 0 ? values[idx] : '0';
        };
        return {
          date: getVal('Date'),
          impressions: parseInt(getVal('Impressions')) || 0,
          likes: parseInt(getVal('Likes')) || 0,
          engagements: parseInt(getVal('Engagements')) || 0,
          bookmarks: parseInt(getVal('Bookmarks')) || 0,
          shares: parseInt(getVal('Shares')) || 0,
          newFollows: parseInt(getVal('New follows')) || 0,
          unfollows: parseInt(getVal('Unfollows')) || 0,
          replies: parseInt(getVal('Replies')) || 0,
          reposts: parseInt(getVal('Reposts')) || 0,
          profileVisits: parseInt(getVal('Profile visits')) || 0,
          posts: parseInt(getVal('Create Post')) || 0,
          videoViews: parseInt(getVal('Video views')) || 0,
          mediaViews: parseInt(getVal('Media views')) || 0,
        };
      });
    }

    if (isPerPost) {
      return lines.slice(1).map(line => {
        const values: string[] = [];
        let inQuotes = false;
        let current = '';
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
          else current += char;
        }
        values.push(current.trim());

        const getVal = (name: string) => {
          const idx = headers.indexOf(name);
          const val = idx >= 0 ? values[idx] : '0';
          return val.replace(/^["']|["']$/g, '');
        };
        
        return {
          id: getVal('Post id'),
          date: getVal('Date'),
          text: getVal('Post text'),
          link: getVal('Post Link'),
          impressions: parseInt(getVal('Impressions')) || 0,
          likes: parseInt(getVal('Likes')) || 0,
          engagements: parseInt(getVal('Engagements')) || 0,
          bookmarks: parseInt(getVal('Bookmarks')) || 0,
          shares: parseInt(getVal('Shares')) || 0,
          newFollows: parseInt(getVal('New follows')) || 0,
          replies: parseInt(getVal('Replies')) || 0,
          reposts: parseInt(getVal('Reposts')) || 0,
          profileVisits: parseInt(getVal('Profile visits')) || 0,
        };
      });
    }
    return null;
  };

  const handleFileUpload = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) { alert('Please upload a CSV file'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      const parsed = parseCSV(csvText);
      if (parsed && parsed.length > 0) {
        if ('date' in parsed[0] && !('text' in parsed[0])) {
          setAnalyticsDaily(parsed as any);
        } else {
          setAnalyticsTweets(parsed as any);
        }
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      }
    };
    reader.readAsText(file);
  }, [setAnalyticsDaily, setAnalyticsTweets]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleFileUpload(files[0]);
  }, [handleFileUpload]);

  // Calculated stats
  const stats = useMemo(() => {
    const totalImpressions = analyticsDaily.reduce((sum, d) => sum + d.impressions, 0);
    const totalEngagements = analyticsDaily.reduce((sum, d) => sum + d.engagements, 0);
    const totalLikes = analyticsDaily.reduce((sum, d) => sum + d.likes, 0);
    const totalFollows = analyticsDaily.reduce((sum, d) => sum + d.newFollows, 0);
    const totalPosts = analyticsDaily.reduce((sum, d) => sum + d.posts, 0);
    const avgEngagementRate = totalImpressions > 0 ? ((totalEngagements / totalImpressions) * 100).toFixed(2) : '0';
    return { totalImpressions, totalEngagements, totalLikes, totalFollows, totalPosts, avgEngagementRate };
  }, [analyticsDaily]);

  // Filtered and sorted tweets
  const filteredTweets = useMemo(() => {
    let tweets = [...analyticsTweets];
    if (filterText) {
      tweets = tweets.filter(t => t.text.toLowerCase().includes(filterText.toLowerCase()));
    }
    tweets.sort((a, b) => {
      const valA = sortBy === 'date' ? new Date(a.date).getTime() : a[sortBy];
      const valB = sortBy === 'date' ? new Date(b.date).getTime() : b[sortBy];
      return sortDesc ? valB - valA : valA - valB;
    });
    return tweets;
  }, [analyticsTweets, filterText, sortBy, sortDesc]);

  const topTweets = useMemo(() => [...analyticsTweets].sort((a, b) => b.engagements - a.engagements).slice(0, 5), [analyticsTweets]);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            Analytics Dashboard
          </h2>
          <p className="text-sm text-gray-400 mt-1">Twitter/X analytics for @BiblicallyAccAI</p>
        </div>
        {(analyticsDaily.length > 0 || analyticsTweets.length > 0) && (
          <button onClick={clearAnalytics} className="text-xs text-red-400 hover:text-red-300">
            Clear All Data
          </button>
        )}
      </div>

      {/* Upload Area */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        className={`glass-panel p-6 text-center border-2 border-dashed transition-all ${
          isDragging ? 'border-blue-400 bg-blue-500/10' : uploadSuccess ? 'border-green-400 bg-green-500/10' : 'border-white/20'
        }`}
      >
        <Upload className={`w-8 h-8 mx-auto mb-2 ${uploadSuccess ? 'text-green-400' : 'text-gray-500'}`} />
        <h3 className={`font-semibold mb-1 ${uploadSuccess ? 'text-green-400' : 'text-white'}`}>
          {uploadSuccess ? 'Upload Successful!' : 'Drop CSV here or click to upload'}
        </h3>
        <input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} className="hidden" id="csv-upload" />
        <label htmlFor="csv-upload" className="btn-primary inline-flex items-center gap-2 cursor-pointer text-sm mt-2">
          Select CSV
        </label>
      </div>

      {/* Stats Overview */}
      {analyticsDaily.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard icon={Eye} label="Impressions" value={stats.totalImpressions.toLocaleString()} color="blue" />
          <StatCard icon={Heart} label="Likes" value={stats.totalLikes.toLocaleString()} color="pink" />
          <StatCard icon={TrendingUp} label="Engagements" value={stats.totalEngagements.toLocaleString()} color="green" />
          <StatCard icon={Users} label="New Follows" value={stats.totalFollows.toLocaleString()} color="purple" />
          <StatCard icon={MessageCircle} label="Posts" value={stats.totalPosts.toLocaleString()} color="yellow" />
          <StatCard icon={TrendingUp} label="Eng. Rate" value={`${stats.avgEngagementRate}%`} color="cyan" />
        </div>
      )}

      {/* Filters */}
      {analyticsTweets.length > 0 && (
        <div className="glass-panel p-4 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Filter className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filter tweets..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
            />
            {filterText && <button onClick={() => setFilterText('')} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>}
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-gray-400" />
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="engagements">Engagements</option>
              <option value="impressions">Impressions</option>
              <option value="likes">Likes</option>
              <option value="date">Date</option>
            </select>
            <button onClick={() => setSortDesc(!sortDesc)} className="btn-ghost text-xs">
              {sortDesc ? '↓ Desc' : '↑ Asc'}
            </button>
          </div>
          <div className="text-xs text-gray-500">
            {filteredTweets.length} tweets
          </div>
        </div>
      )}

      {/* Tweet Detail Modal */}
      {selectedTweet && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedTweet(null)}>
          <div className="glass-panel max-w-2xl w-full max-h-[80vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-white">Tweet Details</h3>
              <button onClick={() => setSelectedTweet(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-white mb-4 text-lg">{selectedTweet.text}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <MetricBox label="Impressions" value={selectedTweet.impressions} />
              <MetricBox label="Likes" value={selectedTweet.likes} />
              <MetricBox label="Engagements" value={selectedTweet.engagements} />
              <MetricBox label="Replies" value={selectedTweet.replies} />
              <MetricBox label="Reposts" value={selectedTweet.reposts} />
              <MetricBox label="Bookmarks" value={selectedTweet.bookmarks} />
              <MetricBox label="New Follows" value={selectedTweet.newFollows} />
              <MetricBox label="Profile Visits" value={selectedTweet.profileVisits} />
            </div>
            <a href={selectedTweet.link} target="_blank" rel="noopener" className="btn-primary inline-flex items-center gap-2">
              View on X <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      {/* All Tweets List */}
      {filteredTweets.length > 0 && (
        <div className="glass-panel p-6">
          <h3 className="text-lg font-semibold text-white mb-4">All Tweets</h3>
          <div className="space-y-3 max-h-[500px] overflow-auto">
            {filteredTweets.map((tweet, i) => (
              <div 
                key={tweet.id} 
                onClick={() => setSelectedTweet(tweet)}
                className="flex items-start gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
              >
                <span className="text-gray-500 text-sm w-6">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{tweet.text}</p>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                    <span>{tweet.date}</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {tweet.impressions.toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {tweet.likes}</span>
                    <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {tweet.engagements}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {analyticsDaily.length === 0 && analyticsTweets.length === 0 && (
        <div className="glass-panel p-12 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <h3 className="text-lg font-semibold text-white mb-2">No Analytics Data</h3>
          <p className="text-sm text-gray-500">Upload your Twitter/X analytics CSV to get started</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
  const colors: Record<string, string> = { blue: 'text-blue-400', pink: 'text-pink-400', green: 'text-green-400', purple: 'text-purple-400', yellow: 'text-yellow-400', cyan: 'text-cyan-400' };
  return (
    <div className="glass-panel p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${colors[color]}`} />
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function MetricBox({ label, value }: { label: string, value: number }) {
  return (
    <div className="bg-white/5 rounded-lg p-3 text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-xl font-bold text-white">{value.toLocaleString()}</p>
    </div>
  );
}
