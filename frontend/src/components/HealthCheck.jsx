import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Database, 
  Server, 
  Globe, 
  Shield,
  Clock,
  Activity,
  Zap,
  Wifi,
  WifiOff
} from 'lucide-react';

const HealthCheck = () => {
  const [services, setServices] = useState({
    backend: { status: 'checking', responseTime: 0, lastCheck: null, error: null },
    database: { status: 'checking', responseTime: 0, lastCheck: null, error: null },
    rabbitAPI: { status: 'checking', responseTime: 0, lastCheck: null, error: null },
    frontend: { status: 'checking', responseTime: 0, lastCheck: null, error: null },
    socketIO: { status: 'checking', responseTime: 0, lastCheck: null, error: null }
  });
  const [isChecking, setIsChecking] = useState(false);
  const [lastFullCheck, setLastFullCheck] = useState(null);

  const checkService = async (serviceName, url, options = {}) => {
    const startTime = Date.now();
    try {
      const response = await fetch(url, {
        method: 'GET',
        timeout: 10000,
        ...options
      });
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          status: 'healthy',
          responseTime,
          lastCheck: new Date(),
          error: null
        };
      } else {
        return {
          status: 'error',
          responseTime,
          lastCheck: new Date(),
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'error',
        responseTime,
        lastCheck: new Date(),
        error: error.message
      };
    }
  };

  const checkBackendHealth = async () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    return await checkService('backend', `${apiBase}/health`);
  };

  const checkDatabase = async () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    return await checkService('database', `${apiBase}/health/database`);
  };

  const checkRabbitAPI = async () => {
    // Check Rabbit API through backend to avoid CORS issues
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    return await checkService('rabbitAPI', `${apiBase}/health/rabbit`);
  };

  const checkFrontend = async () => {
    return await checkService('frontend', window.location.origin);
  };

  const checkSocketIO = async () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    return await checkService('socketIO', `${apiBase}/health/socketio`);
  };

  const runHealthCheck = async () => {
    setIsChecking(true);
    console.log('🔍 Starting comprehensive health check...');

    try {
      const [backendResult, databaseResult, rabbitResult, frontendResult, socketResult] = await Promise.allSettled([
        checkBackendHealth(),
        checkDatabase(),
        checkRabbitAPI(),
        checkFrontend(),
        checkSocketIO()
      ]);

      setServices({
        backend: backendResult.status === 'fulfilled' ? backendResult.value : { status: 'error', responseTime: 0, lastCheck: new Date(), error: backendResult.reason?.message || 'Promise rejected' },
        database: databaseResult.status === 'fulfilled' ? databaseResult.value : { status: 'error', responseTime: 0, lastCheck: new Date(), error: databaseResult.reason?.message || 'Promise rejected' },
        rabbitAPI: rabbitResult.status === 'fulfilled' ? rabbitResult.value : { status: 'error', responseTime: 0, lastCheck: new Date(), error: rabbitResult.reason?.message || 'Promise rejected' },
        frontend: frontendResult.status === 'fulfilled' ? frontendResult.value : { status: 'error', responseTime: 0, lastCheck: new Date(), error: frontendResult.reason?.message || 'Promise rejected' },
        socketIO: socketResult.status === 'fulfilled' ? socketResult.value : { status: 'error', responseTime: 0, lastCheck: new Date(), error: socketResult.reason?.message || 'Promise rejected' }
      });

      setLastFullCheck(new Date());
      console.log('✅ Health check completed');
    } catch (error) {
      console.error('❌ Health check failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(runHealthCheck, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'checking':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'checking':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      default:
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
    }
  };

  const getServiceIcon = (serviceName) => {
    switch (serviceName) {
      case 'backend':
        return <Server className="h-5 w-5" />;
      case 'database':
        return <Database className="h-5 w-5" />;
      case 'rabbitAPI':
        return <Zap className="h-5 w-5" />;
      case 'frontend':
        return <Globe className="h-5 w-5" />;
      case 'socketIO':
        return <Wifi className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  const getOverallStatus = () => {
    const statuses = Object.values(services).map(s => s.status);
    if (statuses.includes('error')) return 'error';
    if (statuses.includes('checking')) return 'checking';
    return 'healthy';
  };

  const overallStatus = getOverallStatus();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Shield className="h-8 w-8" />
              API Status Monitor
            </h1>
            <p className="text-slate-600 mt-1">Real-time monitoring of all web services and APIs</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={runHealthCheck} 
              disabled={isChecking}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Checking...' : 'Refresh'}
            </Button>
            {lastFullCheck && (
              <div className="text-sm text-slate-500 flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Last check: {lastFullCheck.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* Overall Status */}
        <Card className={getStatusColor(overallStatus)}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              {getStatusIcon(overallStatus)}
              <div>
                <h3 className="font-semibold text-lg">
                  {overallStatus === 'healthy' && '✅ All Systems Operational'}
                  {overallStatus === 'error' && '❌ System Issues Detected'}
                  {overallStatus === 'checking' && '🔄 Checking System Status...'}
                </h3>
                <p className="text-sm opacity-80">
                  {overallStatus === 'healthy' && 'All monitored services are running normally'}
                  {overallStatus === 'error' && 'One or more services are experiencing issues'}
                  {overallStatus === 'checking' && 'Performing system health checks...'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(services).map(([serviceName, service]) => (
            <Card key={serviceName} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {getServiceIcon(serviceName)}
                  <span className="capitalize">{serviceName}</span>
                  {getStatusIcon(service.status)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className={`p-3 rounded-lg border ${getStatusColor(service.status)}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {service.status === 'healthy' && '✅ Healthy'}
                      {service.status === 'error' && '❌ Error'}
                      {service.status === 'checking' && '🔄 Checking...'}
                    </span>
                    {service.responseTime > 0 && (
                      <span className="text-sm opacity-80">
                        {service.responseTime}ms
                      </span>
                    )}
                  </div>
                  {service.error && (
                    <div className="mt-2 text-sm opacity-80">
                      <strong>Error:</strong> {service.error}
                    </div>
                  )}
                </div>
                
                {service.lastCheck && (
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last checked: {service.lastCheck.toLocaleTimeString()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional System Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
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
                <strong>Rabbit API:</strong> {import.meta.env.VITE_RABBIT_API_URL || 'https://api.pgw.rabbit.co.th'}
              </div>
              <div>
                <strong>Environment:</strong> {import.meta.env.VITE_APP_ENV || 'development'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HealthCheck;
