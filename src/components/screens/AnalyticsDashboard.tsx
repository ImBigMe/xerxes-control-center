'use client';

import { useState, useCallback } from 'react';
import { BarChart3, Upload, TrendingUp, Users, Eye, Heart, MessageCircle, Repeat, Bookmark, Share2 } from 'lucide-react';

interface TwitterMetrics {
  date: string;
  impressions: number;
  likes: number;
  engagements: number;
  bookmarks: number;
  shares: number;
  newFollows: number;
  unfollows: number;
  replies: number;
  reposts: number;
  profileVisits: number;
  posts: number;
  videoViews: number;
  mediaViews: number;
}

interface TweetDetail {
  id: string;
  date: string;
  text: string;
  link: string;
  impressions: number;
  likes: number;
  engagements: number;
  bookmarks: number;
  shares: number;
  newFollows: number;
  replies: number;
  reposts: number;
  profileVisits: number;
}

export function AnalyticsDashboard() {
  const [dailyData, setDailyData] = useState<TwitterMetrics[]>([]);
  const [tweetData, setTweetData] = useState<TweetDetail[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const parseCSV = (csvText: string): TwitterMetrics[] | TweetDetail[] | null => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return null;

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    
    // Check if it's daily summary or per-post data
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
        // Handle quoted values that may contain commas
        const values: string[] = [];
        let inQuotes = false;
        let current = '';
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
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
        } as TweetDetail;
      });
    }

    return null;
  };

  const handleFileUpload = useCallback((file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      const parsed = parseCSV(csvText);
      
      if (parsed && parsed.length > 0) {
        if ('date' in parsed[0] && !('text' in parsed[0])) {
          setDailyData(parsed as TwitterMetrics[]);
        } else {
          setTweetData(parsed as TweetDetail[]);
        }
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      }
    };
    reader.readAsText(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  // Calculate totals
  const totalImpressions = dailyData.reduce((sum, d) => sum + d.impressions, 0);
  const totalEngagements = dailyData.reduce((sum, d) => sum + d.engagements, 0);
  const totalLikes = dailyData.reduce((sum, d) => sum + d.likes, 0);
  const totalFollows = dailyData.reduce((sum, d) => sum + d.newFollows, 0);
  const totalPosts = dailyData.reduce((sum, d) => sum + d.posts, 0);
  const avgEngagementRate = totalImpressions > 0 ? ((totalEngagements / totalImpressions) * 100).toFixed(2) : '0';

  const topTweets = [...tweetData].sort((a, b) => b.engagements - a.engagements).slice(0, 5);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            Analytics Dashboard
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Import Twitter analytics CSV files to track your @BiblicallyAccAI performance
          </p>
        </div>
      </div>

      {/* Upload Area */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`glass-panel p-8 text-center border-2 border-dashed transition-all ${
          isDragging 
            ? 'border-blue-400 bg-blue-500/10' 
            : uploadSuccess
            ? 'border-green-400 bg-green-500/10'
            : 'border-white/20'
        }`}
      >
        <Upload className={`w-12 h-12 mx-auto mb-4 ${uploadSuccess ? 'text-green-400' : 'text-gray-500'}`} />
        <h3 className={`text-lg font-semibold mb-2 ${uploadSuccess ? 'text-green-400' : 'text-white'}`}>
          {uploadSuccess ? 'Upload Successful!' : 'Drop your analytics CSV here'}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Supports Twitter/X analytics exports (daily summary or per-post data)
        </p>
        <label className="btn-primary inline-flex items-center gap-2 cursor-pointer">
          <Upload className="w-4 h-4" />
          Select CSV File
          <input
            type="file"
            accept=".csv"
            onChange={onFileInputChange}
            className="hidden"
          />
        </label>
      </div>

      {/* Stats Overview */}
      {dailyData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">Impressions</span>
            </div>
            <p className="text-2xl font-bold text-white">{totalImpressions.toLocaleString()}</p>
          </div>
          
          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-pink-400" />
              <span className="text-xs text-gray-400">Likes</span>
            </div>
            <p className="text-2xl font-bold text-white">{totalLikes.toLocaleString()}</p>
          </div>
          
          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-400">Engagements</span>
            </div>
            <p className="text-2xl font-bold text-white">{totalEngagements.toLocaleString()}</p>
          </div>
          
          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-gray-400">New Follows</span>
            </div>
            <p className="text-2xl font-bold text-white">{totalFollows.toLocaleString()}</p>
          </div>
          
          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-gray-400">Posts</span>
            </div>
            <p className="text-2xl font-bold text-white">{totalPosts.toLocaleString()}</p>
          </div>
          
          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-gray-400">Eng. Rate</span>
            </div>
            <p className="text-2xl font-bold text-white">{avgEngagementRate}%</p>
          </div>
        </div>
      )}

      {/* Top Performing Tweets */}
      {topTweets.length > 0 && (
        <div className="glass-panel p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Top Performing Tweets
          </h3>
          <div className="space-y-4">
            {topTweets.map((tweet, i) => (
              <div key={tweet.id} className="flex items-start gap-4 p-4 bg-white/5 rounded-xl">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white mb-2 line-clamp-2">{tweet.text}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {tweet.impressions.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" /> {tweet.likes.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> {tweet.replies.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Repeat className="w-3 h-3" /> {tweet.reposts.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Bookmark className="w-3 h-3" /> {tweet.bookmarks.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Share2 className="w-3 h-3" /> {tweet.shares.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-lg font-bold text-white">{tweet.engagements.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">engagements</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {dailyData.length === 0 && tweetData.length === 0 && (
        <div className="glass-panel p-12 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <h3 className="text-lg font-semibold text-white mb-2">No Analytics Data</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Upload your Twitter/X analytics CSV to see performance metrics, engagement trends, and top-performing content.
          </p>
        </div>
      )}
    </div>
  );
}
