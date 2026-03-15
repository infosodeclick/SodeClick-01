import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { useToast } from './ui/toast';
import UserManagement from './UserManagement';
import PremiumManagement from './PremiumManagement';
import BannedUsers from './BannedUsers';
import HealthCheck from './HealthCheck';
import SystemMonitor from './SystemMonitor';
import SuperAdminPanel from './SuperAdminPanel';
import PermissionManagement from './PermissionManagement';
import RoleDetails from './RoleDetails';
import PublicMessageManagement from './PublicMessageManagement';
import ChatRoomManagement from './ChatRoomManagement';
import ReportManagement from './ReportManagement';
import {
  Users,
  Crown,
  Activity,
  Settings,
  UserCheck,
  AlertCircle,
  TrendingUp,
  Database,
  Shield,
  Zap,
  Trash2,
  ArrowLeft,
  Home,
  RefreshCw,
  Wrench,
  Power,
  Key,
  BookOpen,
  Clock,
  ChevronRight,
  FlaskConical,
  MessageSquare,
  MessageCircle,
  AlertTriangle
} from 'lucide-react';

const AdminDashboard = () => {
  const { success, error, warning, info } = useToast();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalMessages: 0,
    onlineUsers: 0,
    premiumUsers: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard'); // เพิ่ม state สำหรับจัดการ view
  const [recentActivities, setRecentActivities] = useState([]); // เพิ่ม state สำหรับกิจกรรมล่าสุด
  const [lastActivityCount, setLastActivityCount] = useState(0); // เก็บจำนวนกิจกรรมครั้งล่าสุด
  const [maintenanceMode, setMaintenanceMode] = useState(false); // เพิ่ม state สำหรับ Maintenance Mode
  const [isClearingGhosts, setIsClearingGhosts] = useState(false); // เพิ่ม state สำหรับเคลียร์ ghost users

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          // No token found, redirecting to home
          window.location.href = '/';
          return;
        }

        // Verify token and get user info
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) {
          // Token invalid, redirecting to home
          window.location.href = '/';
          return;
        }

        const response = await res.json();
        const userData = response.data?.user;
        setUser(userData);

        if (userData?.role !== 'admin' && userData?.role !== 'superadmin') {
          // ไม่แสดง console log
          window.location.href = '/';
          return;
        }

        // Admin access granted
        setIsLoading(false);
        fetchDashboardData();
        fetchMaintenanceStatus();
      } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/';
      }
    };

    checkAuth();
  }, []);

  // ตรวจสอบ URL parameter เพื่อเปิด view ที่ต้องการ
  useEffect(() => {
    if (!isLoading) {
      const urlParams = new URLSearchParams(window.location.search);
      const viewParam = urlParams.get('view');
      if (viewParam === 'reports') {
        setCurrentView('reports');
      }
    }
  }, [isLoading]);

  // โหลดกิจกรรมล่าสุดครั้งเดียวเมื่อ component mount
  useEffect(() => {
    if (!isLoading) {
      fetchRecentActivities();
    }
  }, [isLoading]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch dashboard statistics
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setStats({
          totalUsers: data.totalUsers || 0,
          totalMessages: data.totalMessages || 0,
          onlineUsers: data.onlineUsers || 0,
          premiumUsers: data.premiumUsers || 0
        });
      }
      
      // โหลดกิจกรรมล่าสุด
      await fetchRecentActivities();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  // ฟังก์ชันดึงข้อมูลกิจกรรมล่าสุด
  const fetchRecentActivities = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/activities`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        const newActivities = data.activities || [];
        
        setLastActivityCount(newActivities.length);
        
        setRecentActivities(newActivities);
      } else {
        // ไม่มีข้อมูลกิจกรรม
        setRecentActivities([]);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      // ตั้งค่าเป็น array ว่างเมื่อเกิด error
      setRecentActivities([]);
    }
  };

  // ฟังก์ชันดึงสถานะ Maintenance Mode
  const fetchMaintenanceStatus = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/maintenance/status`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setMaintenanceMode(data.data.isMaintenanceMode || false);
      }
    } catch (error) {
      console.error('Error fetching maintenance status:', error);
    }
  };

  // ฟังก์ชันเปิด/ปิด Maintenance Mode
  const toggleMaintenanceMode = async () => {
    try {
      const token = localStorage.getItem('token');
      const estimatedHours = maintenanceMode ? null : 2; // 2 hours if enabling
      const message = maintenanceMode ? 'ระบบกลับมาใช้งานได้แล้ว' : 'ระบบกำลังบำรุงรักษา กรุณารอสักครู่';
      
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/maintenance/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          isMaintenanceMode: !maintenanceMode,
          message: message,
          estimatedHours: estimatedHours
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMaintenanceMode(data.data.isMaintenanceMode);
        // Note: Admin functions should use proper notification system
        console.log(data.data.isMaintenanceMode ? 'เปิด Maintenance Mode แล้ว' : 'ปิด Maintenance Mode แล้ว');
      } else {
        console.error('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ Maintenance Mode');
      }
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      console.error('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ Maintenance Mode');
    }
  };

  // เคลียร์ ghost users (ผู้ใช้ออนไลน์ที่ไม่ได้ active จริงๆ)
  const clearGhostUsers = async () => {
    try {
      setIsClearingGhosts(true);
      const token = localStorage.getItem('token');

      if (!token) {
        error('ไม่มี token สำหรับ authentication - กรุณาเข้าสู่ระบบใหม่');
        return;
      }

      console.log('🧹 Clearing ghost users with token:', token.substring(0, 20) + '...');

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/clear-ghost-users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🧹 Response status:', res.status);

      if (res.ok) {
        const data = await res.json();
        console.log('🧹 Ghost users cleanup result:', data);

        if (data.clearedCount > 0) {
          success(`เคลียร์ ghost users สำเร็จ - ${data.clearedCount} คน (ออนไลน์จริงๆ: ${data.realOnlineUsers} คน)`);
        } else {
          success(`ไม่มี ghost users ที่ต้องเคลียร์ (ออนไลน์จริงๆ: ${data.realOnlineUsers} คน)`);
        }

        // รีโหลดข้อมูลสถิติหลังจากเคลียร์
        fetchDashboardData();
      } else {
        const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
        console.error('ไม่สามารถเคลียร์ ghost users ได้:', errorData);

        if (res.status === 401) {
          error('ไม่มีสิทธิ์เข้าถึง - โปรดเข้าสู่ระบบใหม่ในฐานะผู้ดูแลระบบ');
        } else if (res.status === 403) {
          error('ไม่มีสิทธิ์เข้าถึง API นี้ - ต้องเป็นผู้ดูแลระบบเท่านั้น');
        } else if (res.status === 404) {
          error('ไม่พบ API endpoint - กรุณาติดต่อผู้พัฒนาระบบ');
        } else {
          error(`ไม่สามารถเคลียร์ ghost users ได้: ${errorData.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error clearing ghost users:', error);
      error('เกิดข้อผิดพลาดในการเคลียร์ ghost users');
    } finally {
      setIsClearingGhosts(false);
    }
  };

  // ฟังก์ชันแปลงเวลาเป็นรูปแบบที่อ่านง่าย
  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - new Date(timestamp);
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes} นาทีที่แล้ว`;
    } else if (hours < 24) {
      return `${hours} ชั่วโมงที่แล้ว`;
    } else {
      return `${days} วันที่แล้ว`;
    }
  };

  // ฟังก์ชันกำหนดสีตามสถานะ
  const getActivityColor = (status) => {
    const colors = {
      success: 'bg-green-400',
      premium: 'bg-amber-400',
      warning: 'bg-red-400',
      info: 'bg-blue-400'
    };
    return colors[status] || 'bg-gray-400';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <h1 className="text-xl font-bold text-slate-800">กำลังโหลด Admin Dashboard...</h1>
        </div>
      </div>
    );
  }

  // Authorization check
  if (!user || (user?.role !== 'admin' && user?.role !== 'superadmin')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={64} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">ไม่มีสิทธิ์เข้าถึง</h1>
          <p className="text-slate-600 mb-4">คุณไม่มีสิทธิ์เข้าถึงหน้า Admin Dashboard</p>
          <Button 
            className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white"
            onClick={() => window.location.href = '/'}
          >
            กลับหน้าหลัก
          </Button>
        </div>
      </div>
    );
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'users':
        return <UserManagement />;
      case 'premium':
        return <PremiumManagement />;
      case 'banned':
        return <BannedUsers />;
      case 'health':
        return <HealthCheck />;
      case 'monitor':
        return <SystemMonitor />;
      case 'analytics':
        return <Analytics />;
      case 'permissions':
        return <PermissionManagement />;
      case 'role-details':
        return <RoleDetails />;
      case 'superadmin':
        return <SuperAdminPanel />;
      case 'public-messages':
        return <PublicMessageManagement />;
      case 'chat-rooms':
        return <ChatRoomManagement />;
      case 'reports':
        return <ReportManagement />;
      default:
        return renderDashboard();
    }
  };

  // Get current view title for header
  const getCurrentViewTitle = () => {
    switch (currentView) {
      case 'users':
        return 'จัดการผู้ใช้';
      case 'premium':
        return 'จัดการสมาชิก Premium';
      case 'banned':
        return 'ผู้ใช้ที่ถูกแบน';
      case 'health':
        return 'API Status Monitor';
      case 'monitor':
        return 'System Monitor';
      case 'analytics':
        return 'สถิติการใช้งาน';
      case 'permissions':
        return 'จัดการสิทธิ์ผู้ดูแล';
      case 'role-details':
        return 'คู่มือบทบาทและสิทธิ์';
      case 'superadmin':
        return 'SuperAdmin Panel';
      case 'public-messages':
        return 'จัดการข้อความสาธารณะ';
      case 'chat-rooms':
        return 'จัดการห้องแชทและข้อความ';
      case 'reports':
        return 'จัดการรายงานปัญหา';
      default:
        return 'Admin Dashboard';
    }
  };

  // Analytics Component
  const Analytics = () => {
    const [selectedPeriod, setSelectedPeriod] = useState('6months');
    const [selectedMetric, setSelectedMetric] = useState('users');
    const [analyticsData, setAnalyticsData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch analytics data
    const fetchAnalyticsData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/analytics?period=${selectedPeriod}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (res.ok) {
          const data = await res.json();
          setAnalyticsData(data);
        } else {
          console.error('Failed to fetch analytics data');
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
      fetchAnalyticsData();
    }, []); // Only fetch once when component mounts

    if (isLoading) {
      return (
        <div className="space-y-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500"></div>
          </div>
        </div>
      );
    }

    if (!analyticsData) {
      return (
        <div className="space-y-8">
          <div className="text-center py-8">
            <p className="text-slate-500">ไม่สามารถโหลดข้อมูลได้</p>
          </div>
        </div>
      );
    }

    const currentData = analyticsData.monthlyData[selectedMetric];
    const maxValue = Math.max(...currentData.map(d => d.value));

    return (
      <div className="space-y-8">
        {/* Header with Period Selector */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">สถิติการใช้งาน</h2>
            <p className="text-slate-600">ดูข้อมูลสถิติการใช้งานและประสิทธิภาพของระบบ</p>
          </div>
          <div className="flex gap-3">
            <select 
              value={selectedPeriod} 
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                fetchAnalyticsData();
              }}
              className="px-4 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="3months">3 เดือนล่าสุด</option>
              <option value="6months">6 เดือนล่าสุด</option>
              <option value="12months">12 เดือนล่าสุด</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAnalyticsData}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </Button>
          </div>
        </div>

        {/* Metric Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setSelectedMetric('users')}
            className={`p-4 rounded-xl border-2 transition-all ${
              selectedMetric === 'users' 
                ? 'border-pink-500 bg-pink-50' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">ผู้ใช้งาน</p>
                <p className="text-2xl font-bold text-slate-800">{analyticsData.summary.totalUsers.toLocaleString()}</p>
                <p className="text-sm text-green-600">+{currentData[currentData.length - 1]?.growth || 0}% จากเดือนที่แล้ว</p>
              </div>
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-pink-600" />
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedMetric('revenue')}
            className={`p-4 rounded-xl border-2 transition-all ${
              selectedMetric === 'revenue' 
                ? 'border-green-500 bg-green-50' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">รายได้</p>
                <p className="text-2xl font-bold text-slate-800">฿{analyticsData.summary.totalRevenue.toLocaleString()}</p>
                <p className="text-sm text-green-600">+{currentData[currentData.length - 1]?.growth || 0}% จากเดือนที่แล้ว</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedMetric('performance')}
            className={`p-4 rounded-xl border-2 transition-all ${
              selectedMetric === 'performance' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">ประสิทธิภาพ</p>
                <p className="text-2xl font-bold text-slate-800">{analyticsData.summary.avgPerformance}%</p>
                <p className="text-sm text-green-600">+{currentData[currentData.length - 1]?.growth || 0}% จากเดือนที่แล้ว</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </button>
        </div>

        {/* Chart */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800 flex items-center gap-2">
              <Activity size={20} />
              กราฟแสดงแนวโน้ม
              <span className="text-sm text-slate-500 ml-2">
                {selectedMetric === 'users' && 'จำนวนผู้ใช้งานต่อเดือน'}
                {selectedMetric === 'revenue' && 'รายได้ต่อเดือน (บาท)'}
                {selectedMetric === 'performance' && 'ประสิทธิภาพของเว็บไซต์ (%)'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-end justify-between gap-2 p-4">
              {currentData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center group">
                  <div className="relative w-full">
                    <div 
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        selectedMetric === 'users' ? 'bg-gradient-to-t from-pink-500 to-pink-300' :
                        selectedMetric === 'revenue' ? 'bg-gradient-to-t from-green-500 to-green-300' :
                        'bg-gradient-to-t from-blue-500 to-blue-300'
                      }`}
                      style={{ 
                        height: `${(data.value / maxValue) * 280}px`,
                        minHeight: '20px'
                      }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {selectedMetric === 'revenue' ? `฿${data.value.toLocaleString()}` : 
                         selectedMetric === 'performance' ? `${data.value}%` : 
                         data.value.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-sm font-medium text-slate-800">{data.month}</p>
                    <p className="text-xs text-green-600">+{data.growth}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-pink-700">ผู้ใช้งานทั้งหมด</p>
                  <p className="text-2xl font-bold text-pink-800">{analyticsData.summary.totalUsers.toLocaleString()}</p>
                </div>
                <Users className="w-8 h-8 text-pink-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700">รายได้รวม</p>
                  <p className="text-2xl font-bold text-green-800">฿{analyticsData.summary.totalRevenue.toLocaleString()}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700">ประสิทธิภาพเฉลี่ย</p>
                  <p className="text-2xl font-bold text-blue-800">{analyticsData.summary.avgPerformance}%</p>
                </div>
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700">ผู้ใช้งานใหม่</p>
                  <p className="text-2xl font-bold text-purple-800">{analyticsData.summary.newUsersThisMonth.toLocaleString()}</p>
                </div>
                <UserCheck className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800 flex items-center gap-2">
              <Activity size={20} />
              กิจกรรมล่าสุด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">ผู้ใช้งานใหม่เพิ่มขึ้น {currentData[currentData.length - 1]?.growth || 0}% ในเดือนนี้</p>
                  <p className="text-xs text-slate-500">2 ชั่วโมงที่แล้ว</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">ประสิทธิภาพระบบเพิ่มขึ้นเป็น {analyticsData.summary.avgPerformance}%</p>
                  <p className="text-xs text-slate-500">1 วันที่แล้ว</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 bg-purple-50 rounded-lg">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">รายได้รวม {analyticsData.summary.totalRevenue.toLocaleString()} บาท</p>
                  <p className="text-xs text-slate-500">3 วันที่แล้ว</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderDashboard = () => (
    <>
             {/* Stats Cards */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
           <CardHeader className="flex flex-row items-center justify-between pb-3">
             <CardTitle className="text-sm font-semibold text-blue-800">ผู้ใช้ทั้งหมด</CardTitle>
             <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shadow-md">
               <Users className="h-5 w-5 text-white" />
             </div>
           </CardHeader>
           <CardContent>
             <div className="text-3xl font-bold text-blue-900 mb-2">{stats.totalUsers.toLocaleString()}</div>
             <div className="flex items-center text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full w-fit">
               <TrendingUp className="h-3 w-3 mr-1" />
               +12% จากเดือนที่แล้ว
             </div>
           </CardContent>
         </Card>

         <Card className="bg-gradient-to-br from-amber-50 to-orange-100 border border-amber-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
           <CardHeader className="flex flex-row items-center justify-between pb-3">
             <CardTitle className="text-sm font-semibold text-amber-800">ผู้ใช้ออนไลน์</CardTitle>
             <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center shadow-md">
               <Activity className="h-5 w-5 text-white" />
             </div>
           </CardHeader>
           <CardContent>
             <div className="text-3xl font-bold text-amber-900 mb-2">{stats.onlineUsers || 0}</div>
             <div className="flex items-center text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full w-fit">
               ออนไลน์ขณะนี้
             </div>
           </CardContent>
         </Card>

         <Card className="bg-gradient-to-br from-purple-50 to-pink-100 border border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
           <CardHeader className="flex flex-row items-center justify-between pb-3">
             <CardTitle className="text-sm font-semibold text-purple-800">สมาชิก Premium</CardTitle>
             <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center shadow-md">
               <Crown className="h-5 w-5 text-white" />
             </div>
           </CardHeader>
           <CardContent>
             <div className="text-3xl font-bold text-purple-900 mb-2">{stats.premiumUsers}</div>
             <div className="flex items-center text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full w-fit">
               <TrendingUp className="h-3 w-3 mr-1" />
               +25% จากเดือนที่แล้ว
             </div>
           </CardContent>
         </Card>
       </div>

             {/* Quick Actions */}
       <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8">
         {/* User Management */}
         <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
           <CardHeader className="pb-4">
             <CardTitle className="text-gray-800 flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
               <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                 <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
               </div>
               จัดการผู้ใช้
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-3">
             <Button
               variant="outline"
               className="w-full justify-start border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
               onClick={() => setCurrentView('users')}
             >
               <UserCheck size={16} className="mr-3 text-blue-600" />
               ดูรายชื่อผู้ใช้ทั้งหมด
             </Button>
             <Button
               variant="outline"
               className="w-full justify-start border-gray-200 hover:bg-purple-50 hover:border-purple-300 transition-all duration-200"
               onClick={() => setCurrentView('premium')}
             >
               <Crown size={16} className="mr-3 text-purple-600" />
               จัดการสมาชิก Premium
             </Button>
             <Button
               variant="outline"
               className="w-full justify-start border-gray-200 hover:bg-red-50 hover:border-red-300 transition-all duration-200"
               onClick={() => setCurrentView('banned')}
             >
               <Shield size={16} className="mr-3 text-red-600" />
               ผู้ใช้ที่ถูกแบน
             </Button>

             <Button
               variant="outline"
               disabled={isClearingGhosts}
               className="w-full justify-start border-orange-200 hover:bg-orange-50 hover:border-orange-300 transition-all duration-200"
               onClick={clearGhostUsers}
             >
               {isClearingGhosts ? (
                 <>
                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-3"></div>
                   กำลังเคลียร์...
                 </>
               ) : (
                 <>
                   <Zap size={16} className="mr-3 text-orange-600" />
                   เคลียร์ Ghost Users
                 </>
               )}
             </Button>

             {user?.role === 'superadmin' && (
               <Button
                 variant="outline"
                 className="w-full justify-start border-yellow-200 bg-yellow-50 hover:bg-yellow-100 text-yellow-800 transition-all duration-200"
                 onClick={() => setCurrentView('superadmin')}
               >
                 <Crown size={16} className="mr-3" />
                 SuperAdmin Panel
               </Button>
             )}
           </CardContent>
         </Card>

         {/* System Management */}
         <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
           <CardHeader className="pb-4">
             <CardTitle className="text-gray-800 flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
               <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                 <Database className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
               </div>
               จัดการระบบ
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-3">
             <Button
               variant="outline"
               className="w-full justify-start border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
               onClick={() => setCurrentView('health')}
             >
               <Zap size={16} className="mr-3 text-blue-600" />
               API Status Monitor
             </Button>
             <Button
               variant="outline"
               className="w-full justify-start border-gray-200 hover:bg-green-50 hover:border-green-300 transition-all duration-200"
               onClick={() => setCurrentView('monitor')}
             >
               <Activity size={16} className="mr-3 text-green-600" />
               System Monitor
             </Button>
             <Button
               variant="outline"
               className="w-full justify-start border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-200"
               onClick={() => setCurrentView('analytics')}
             >
               <Activity size={16} className="mr-3 text-indigo-600" />
               สถิติการใช้งาน
             </Button>
             <Button
               variant="outline"
               className={`w-full justify-start transition-all duration-200 ${
                 maintenanceMode
                   ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                   : 'border-gray-200 hover:bg-gray-50'
               }`}
               onClick={toggleMaintenanceMode}
             >
               <Wrench size={16} className="mr-3" />
               {maintenanceMode ? 'ปิด Maintenance Mode' : 'เปิด Maintenance Mode'}
             </Button>
           </CardContent>
         </Card>

         {/* Permission Management */}
         <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
           <CardHeader className="pb-4">
             <CardTitle className="text-gray-800 flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
               <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                 <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
               </div>
               จัดการสิทธิ์และบทบาท
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-3">
             <Button
               variant="outline"
               className="w-full justify-start border-gray-200 hover:bg-purple-50 hover:border-purple-300 transition-all duration-200"
               onClick={() => setCurrentView('permissions')}
             >
               <Key size={16} className="mr-3 text-purple-600" />
               จัดการสิทธิ์ผู้ดูแล
             </Button>
             <Button
               variant="outline"
               className="w-full justify-start border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
               onClick={() => setCurrentView('role-details')}
             >
               <BookOpen size={16} className="mr-3 text-blue-600" />
               คู่มือบทบาทและสิทธิ์
             </Button>
           </CardContent>
         </Card>

         {/* Chat and Message Management */}
         <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
           <CardHeader className="pb-4">
             <CardTitle className="text-gray-800 flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
               <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                 <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
               </div>
               จัดการแชทและข้อความ
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-3">
             <Button
               variant="outline"
               className="w-full justify-start border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-200"
               onClick={() => setCurrentView('public-messages')}
             >
               <MessageCircle size={16} className="mr-3 text-indigo-600" />
               จัดการข้อความสาธารณะ
             </Button>
             <Button
               variant="outline"
               className="w-full justify-start border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
               onClick={() => setCurrentView('chat-rooms')}
             >
               <MessageSquare size={16} className="mr-3 text-blue-600" />
               จัดการห้องแชทและข้อความ
             </Button>
           </CardContent>
         </Card>

         {/* Report Management */}
         <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
           <CardHeader className="pb-4">
             <CardTitle className="text-gray-800 flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
               <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                 <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
               </div>
               จัดการรายงานปัญหา
             </CardTitle>
           </CardHeader>
           <CardContent>
             <Button
               variant="outline"
               className="w-full justify-start border-gray-200 hover:bg-amber-50 hover:border-amber-300 transition-all duration-200"
               onClick={() => setCurrentView('reports')}
             >
               <AlertCircle size={16} className="mr-3 text-amber-600" />
               ดูและจัดการรายงาน
             </Button>
           </CardContent>
         </Card>
       </div>

             {/* Recent Activity */}
       <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
         <CardHeader className="pb-4">
           <CardTitle className="text-gray-800 flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
             <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
               <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
             </div>
             <span className="flex-1 truncate">กิจกรรมล่าสุด</span>
             <span className="text-xs sm:text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full flex-shrink-0">
               {recentActivities.length} รายการ
             </span>
           </CardTitle>
         </CardHeader>
         <CardContent>
           <div className="space-y-4 max-h-[400px] overflow-y-auto">
             {recentActivities.length > 0 ? (
               recentActivities.map((activity, index) => (
                 <div
                   key={activity.id}
                   data-activity-id={activity.id}
                   className={`flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 transition-all duration-300 hover:shadow-md hover:border-gray-200 ${
                     index >= 5 ? 'opacity-90' : ''
                   }`}
                 >
                   <div className={`w-3 h-3 ${getActivityColor(activity.status)} rounded-full flex-shrink-0 shadow-sm`}></div>
                   <div className="flex-1 min-w-0">
                     <p className="text-gray-800 text-sm leading-relaxed font-medium">{activity.message}</p>
                     <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                       <Clock className="w-3 h-3" />
                       {formatTimeAgo(activity.timestamp)}
                     </p>
                   </div>
                   <div className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                     activity.status === 'success' ? 'bg-green-100 text-green-700 border border-green-200' :
                     activity.status === 'premium' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                     activity.status === 'warning' ? 'bg-red-100 text-red-700 border border-red-200' :
                     'bg-blue-100 text-blue-700 border border-blue-200'
                   }`}>
                     {activity.type.replace('_', ' ')}
                   </div>
                 </div>
               ))
             ) : (
               <div className="text-center py-12">
                 <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Activity className="w-8 h-8 text-gray-400" />
                 </div>
                 <p className="text-gray-500 font-medium">ไม่มีกิจกรรมล่าสุด</p>
                 <p className="text-gray-400 text-sm mt-1">กิจกรรมจะแสดงที่นี่เมื่อมีผู้ใช้ดำเนินการ</p>
               </div>
             )}
           </div>
           {recentActivities.length > 5 && (
             <div className="mt-4 text-center">
               <div className="inline-flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-full">
                 <Activity className="w-3 h-3" />
                 เลื่อนลงเพื่อดูกิจกรรมเพิ่มเติม
               </div>
             </div>
           )}
         </CardContent>
       </Card>

       {/* Welcome Message */}
       <Card className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
         <CardContent className="p-6 sm:p-8 lg:p-12 text-center">
           <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
             <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
           </div>
           <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-800 to-purple-800 bg-clip-text text-transparent mb-3 sm:mb-4">
             ยินดีต้อนรับสู่ Admin Dashboard
           </h2>
           <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-md mx-auto leading-relaxed">
             คุณสามารถจัดการระบบ ดูสถิติการใช้งาน และควบคุมการทำงานทั้งหมดได้ที่นี่
           </p>
         </CardContent>
       </Card>
    </>
  );

     return (
     <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
       {/* Admin Header */}
       <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 p-4 sm:p-6 shadow-lg">
         <div className="max-w-7xl mx-auto">
           {/* Mobile-first responsive header */}
           <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
             <div className="flex items-center gap-3 sm:gap-4">
               <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                 <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
               </div>
               <div className="min-w-0 flex-1">
                 <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent truncate">
                   {getCurrentViewTitle()}
                 </h1>
                 <p className="text-sm sm:text-base text-gray-600 mt-1 flex items-center gap-2">
                   <span className="hidden sm:inline">ยินดีต้อนรับ</span>
                   <span className="font-semibold text-blue-600 truncate">{user?.username}</span>
                 </p>
               </div>
             </div>

             {/* Navigation buttons - responsive */}
             <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
               {(currentView === 'health' || currentView === 'monitor' || currentView === 'analytics' || currentView === 'permissions' || currentView === 'role-details' || currentView === 'public-messages' || currentView === 'chat-rooms' || currentView === 'reports') && (
                 <Button
                   variant="outline"
                   size="sm"
                   className="border-gray-200 hover:bg-gray-50 hover:border-gray-300 flex items-center justify-center gap-2 px-3 sm:px-6 py-2 sm:py-3 font-medium shadow-sm transition-all duration-200 hover:shadow-md text-sm sm:text-base"
                   onClick={() => setCurrentView('dashboard')}
                 >
                   <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                   <span className="hidden sm:inline">กลับไปหน้า Dashboard</span>
                   <span className="sm:hidden">กลับ</span>
                 </Button>
               )}
               <Button
                 variant="outline"
                 size="sm"
                 className="border-gray-200 hover:bg-gray-50 hover:border-gray-300 flex items-center justify-center gap-2 px-3 sm:px-6 py-2 sm:py-3 font-medium shadow-sm transition-all duration-200 hover:shadow-md text-sm sm:text-base"
                 onClick={() => window.location.href = '/'}
               >
                 <Home className="w-4 h-4 sm:w-5 sm:h-5" />
                 <span className="hidden sm:inline">กลับหน้าหลัก</span>
                 <span className="sm:hidden">หน้าแรก</span>
               </Button>
             </div>
           </div>

           {/* Breadcrumb navigation for sub-pages */}
           {(currentView === 'health' || currentView === 'monitor' || currentView === 'analytics' || currentView === 'permissions' || currentView === 'role-details' || currentView === 'public-messages' || currentView === 'chat-rooms') && (
             <div className="mt-3 sm:mt-4">
               <nav className="flex items-center space-x-2 text-sm text-gray-500">
                 <button
                   onClick={() => setCurrentView('dashboard')}
                   className="hover:text-blue-600 transition-colors duration-200 flex items-center gap-1"
                 >
                   <Home className="w-3 h-3" />
                   <span>Dashboard</span>
                 </button>
                 <ChevronRight className="w-3 h-3" />
                 <span className="text-gray-700 font-medium">{getCurrentViewTitle()}</span>
               </nav>
             </div>
           )}
         </div>
       </div>

       {/* Dashboard Content */}
       <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
         {renderCurrentView()}
       </div>
     </div>
   );
};

export default AdminDashboard;
