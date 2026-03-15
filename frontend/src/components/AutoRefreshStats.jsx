import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import autoRefreshManager from '../services/autoRefreshManager';
import { Activity, Wifi, Clock, RefreshCw, Zap, TrendingUp } from 'lucide-react';

/**
 * Component สำหรับแสดงสถิติการทำงานของระบบ Auto Refresh
 * ออกแบบมาให้ไม่กินทรัพยากรเครื่องมากเกินไปและไม่รบกวนผู้ใช้
 */
const AutoRefreshStats = ({ className = '' }) => {
  const [stats, setStats] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  useEffect(() => {
    // อัปเดตสถิติทุก 5 วินาที
    const interval = setInterval(() => {
      const newStats = autoRefreshManager.getStats();
      setStats(newStats);
      setLastUpdate(Date.now());
    }, 5000);

    // อัปเดตทันทีครั้งแรก
    const initialStats = autoRefreshManager.getStats();
    setStats(initialStats);

    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}ชม ${minutes}นาที ${secs}วินาที`;
    } else if (minutes > 0) {
      return `${minutes}นาที ${secs}วินาที`;
    } else {
      return `${secs}วินาที`;
    }
  };

  const formatMemoryUsage = (mb) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'immediate': return 'bg-red-100 text-red-800';
      case 'fast': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-green-100 text-green-800';
      case 'slow': return 'bg-blue-100 text-blue-800';
      case 'background': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConnectionIcon = (effectiveType) => {
    switch (effectiveType) {
      case '4g': return <Wifi className="w-4 h-4 text-green-600" />;
      case '3g': return <Wifi className="w-4 h-4 text-yellow-600" />;
      case '2g': return <Wifi className="w-4 h-4 text-orange-600" />;
      case 'slow-2g': return <Wifi className="w-4 h-4 text-red-600" />;
      default: return <Wifi className="w-4 h-4 text-gray-600" />;
    }
  };

  if (!stats) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-4">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-gray-200 h-4 w-4"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} transition-all duration-300 hover:shadow-md`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Auto Refresh Status
          </CardTitle>
          <Badge
            variant={stats.isActive ? 'default' : 'secondary'}
            className="text-xs"
          >
            {stats.isActive ? 'กำลังทำงาน' : 'หยุดทำงาน'}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          อัปเดตเมื่อ {new Date(lastUpdate).toLocaleTimeString()}
          {import.meta.env.DEV && (
            <span className="block text-blue-600 mt-1">
              🔧 Development Mode: ใช้ Polling แทน Service Worker
            </span>
          )}
          {import.meta.env.PROD && !stats.serviceWorkerActive && (
            <span className="block text-red-600 mt-1">
              ⚠️ Service Worker ไม่ทำงานใน Production
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* สถานะการทำงาน */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${stats.isVisible ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span>{stats.isVisible ? 'แสดงผล' : 'ซ่อนอยู่'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`text-xs ${getStatusColor(stats.currentFrequency)}`}>
              {stats.currentFrequency === 'immediate' ? 'ทันที' :
               stats.currentFrequency === 'fast' ? 'เร็ว' :
               stats.currentFrequency === 'normal' ? 'ปกติ' :
               stats.currentFrequency === 'slow' ? 'ช้า' : 'พื้นหลัง'}
            </Badge>
          </div>
        </div>

        {/* สถิติการรีเฟรช */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">รีเฟรชทั้งหมด:</span>
            <span className="font-medium">{stats.refreshStats.totalRefreshes}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">สำเร็จ:</span>
            <span className="font-medium text-green-600">{stats.refreshStats.successfulRefreshes}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">อัตราความสำเร็จ:</span>
            <span className="font-medium">{stats.refreshStats.successRate}%</span>
          </div>
        </div>

        {/* ข้อมูลเครือข่ายและประสิทธิภาพ */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            {stats.networkInfo && getConnectionIcon(stats.networkInfo.effectiveType)}
            <span className="text-gray-600">
              {stats.networkInfo?.effectiveType?.toUpperCase() || 'ไม่ทราบ'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-gray-600">
              {formatUptime(stats.uptime)}
            </span>
          </div>
        </div>

        {/* การใช้หน่วยความจำ */}
        {stats.memoryUsage && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">หน่วยความจำ:</span>
            <span className="font-medium">
              {formatMemoryUsage(stats.memoryUsage.used)} / {formatMemoryUsage(stats.memoryUsage.total)}
            </span>
          </div>
        )}

        {/* Service Worker Status */}
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">Service Worker:</span>
          <Badge
            variant={
              import.meta.env.PROD
                ? (stats.serviceWorkerActive ? 'default' : 'outline')
                : (stats.serviceWorkerSupported ? 'secondary' : 'outline')
            }
            className="text-xs"
          >
            {import.meta.env.PROD
              ? (stats.serviceWorkerActive ? 'ทำงาน' : 'ไม่ทำงาน')
              : (stats.serviceWorkerSupported ? 'พร้อมใช้งาน' : 'ไม่รองรับ')
            }
          </Badge>
        </div>

        {/* ปุ่มควบคุม */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7"
            onClick={() => autoRefreshManager.forceRefresh('immediate')}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            รีเฟรชทันที
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7"
            onClick={() => autoRefreshManager.resetStats()}
          >
            รีเซ็ตสถิติ
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AutoRefreshStats;
