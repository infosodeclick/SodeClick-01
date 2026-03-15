import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { 
  Monitor, 
  Cpu, 
  HardDrive, 
  MemoryStick, 
  Network, 
  Users, 
  MessageCircle,
  Database,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';

const SystemMonitor = () => {
  const [systemStats, setSystemStats] = useState({
    users: { total: 0, online: 0, premium: 0 },
    messages: { total: 0, today: 0 },
    database: { size: 0, connections: 0 },
    performance: { responseTime: 0, uptime: 0 },
    errors: { count: 0, lastError: null }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchSystemStats = async () => {
    setIsLoading(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const token = localStorage.getItem('token');
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Fetch multiple stats in parallel
      const [healthRes, usersRes, messagesRes] = await Promise.allSettled([
        fetch(`${apiBase}/health`),
        fetch(`${apiBase}/api/admin/users/stats`, { headers }),
        fetch(`${apiBase}/api/admin/messages/stats`, { headers })
      ]);

      const stats = {
        users: { total: 0, online: 0, premium: 0 },
        messages: { total: 0, today: 0 },
        database: { size: 0, connections: 0 },
        performance: { responseTime: 0, uptime: 0 },
        errors: { count: 0, lastError: null }
      };

      // Process health data
      if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
        try {
          const healthData = await healthRes.value.json();
          stats.performance.uptime = healthData.uptime || 0;
          stats.performance.responseTime = healthData.responseTime || 0;
          stats.database.connections = healthData.database_status === 'connected' ? 1 : 0;
        } catch (e) {
          console.error('Error parsing health data:', e);
        }
      } else if (healthRes.status === 'rejected') {
        console.error('Health check failed:', healthRes.reason);
      }

      // Process users data
      if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
        try {
          const usersData = await usersRes.value.json();
          if (usersData.success) {
            stats.users = {
              total: usersData.total || 0,
              online: usersData.online || 0,
              premium: usersData.premium || 0
            };
          }
        } catch (e) {
          console.error('Error parsing users stats:', e);
        }
      } else if (usersRes.status === 'rejected') {
        console.error('Users stats fetch failed:', usersRes.reason);
      } else if (usersRes.status === 'fulfilled' && !usersRes.value.ok) {
        const errorData = await usersRes.value.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Users stats API error:', errorData);
      }

      // Process messages data
      if (messagesRes.status === 'fulfilled' && messagesRes.value.ok) {
        try {
          const messagesData = await messagesRes.value.json();
          if (messagesData.success) {
            stats.messages = {
              total: messagesData.total || 0,
              today: messagesData.today || 0
            };
          }
        } catch (e) {
          console.error('Error parsing messages stats:', e);
        }
      } else if (messagesRes.status === 'rejected') {
        console.error('Messages stats fetch failed:', messagesRes.reason);
      } else if (messagesRes.status === 'fulfilled' && !messagesRes.value.ok) {
        const errorData = await messagesRes.value.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Messages stats API error:', errorData);
      }

      setSystemStats(stats);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch system stats:', error);
      setSystemStats(prev => ({
        ...prev,
        errors: { count: prev.errors.count + 1, lastError: error.message }
      }));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemStats();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchSystemStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Monitor className="h-8 w-8" />
              System Monitor
            </h1>
            <p className="text-slate-600 mt-1">Real-time system performance and statistics</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={fetchSystemStats} 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Updating...' : 'Refresh'}
            </Button>
            {lastUpdate && (
              <div className="text-sm text-slate-500">
                Last update: {lastUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.users.total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {systemStats.users.online} online
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Premium Users</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.users.premium.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {systemStats.users.total > 0 ? 
                  ((systemStats.users.premium / systemStats.users.total) * 100).toFixed(1) + '%' : 
                  '0%'
                } of total users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages Today</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.messages.today.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {systemStats.messages.total.toLocaleString()} total messages
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatUptime(systemStats.performance.uptime)}</div>
              <p className="text-xs text-muted-foreground">
                {systemStats.performance.responseTime}ms avg response
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Response Time</span>
                <span className="text-sm text-muted-foreground">
                  {systemStats.performance.responseTime}ms
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Database Connections</span>
                <span className="text-sm text-muted-foreground">
                  {systemStats.database.connections}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">System Status</span>
                <div className="flex items-center gap-1">
                  {systemStats.database.connections > 0 ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">Healthy</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-600">Issues</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Connection Status</span>
                <div className="flex items-center gap-1">
                  {systemStats.database.connections > 0 ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">Connected</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-600">Disconnected</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Database Name</span>
                <span className="text-sm text-muted-foreground">sodeclick</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Environment</span>
                <span className="text-sm text-muted-foreground">
                  {import.meta.env.VITE_APP_ENV || 'development'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Monitoring */}
        {systemStats.errors.count > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                Error Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-red-800">Error Count</span>
                  <span className="text-sm text-red-600">{systemStats.errors.count}</span>
                </div>
                {systemStats.errors.lastError && (
                  <div className="text-sm text-red-700">
                    <strong>Last Error:</strong> {systemStats.errors.lastError}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Frontend URL:</strong> {window.location.origin}
              </div>
              <div>
                <strong>Backend API:</strong> {import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}
              </div>
              <div>
                <strong>Environment:</strong> {import.meta.env.VITE_APP_ENV || 'development'}
              </div>
              <div>
                <strong>Browser:</strong> {navigator.userAgent.split(' ')[0]}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemMonitor;
