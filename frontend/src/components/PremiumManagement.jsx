import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { useToast } from './ui/toast';
import { 
  Crown, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  User, 
  Eye,
  Ban,
  Unlock,
  Mail,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  BarChart3,
  Key
} from 'lucide-react';

const PremiumManagement = () => {
  const { success, error } = useToast();
  const [premiumUsers, setPremiumUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [stats, setStats] = useState({
    totalPremium: 0,
    platinum: 0,
    diamond: 0,
    vip2: 0,
    vip1: 0,
    vip: 0,
    gold: 0,
    silver: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    revenueByTier: {},
    dateRange: null
  });
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });
  const [showDateFilter, setShowDateFilter] = useState(false);

  const [banForm, setBanForm] = useState({
    isBanned: false,
    banReason: '',
    banDuration: 1,
    banDurationType: 'days'
  });

  const [editForm, setEditForm] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    membership: { tier: 'silver' }
  });

  const [resetPasswordForm, setResetPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'male',
    lookingFor: 'both',
    location: '',
    membership: { tier: 'silver' }
  });

  const membershipTiers = [
    { value: 'platinum', label: 'Platinum Member', price: 1000, duration: 'month' },
    { value: 'diamond', label: 'Diamond Member', price: 500, duration: 'month' },
    { value: 'vip2', label: 'VIP 2', price: 300, duration: 'month' },
    { value: 'vip1', label: 'VIP 1', price: 150, duration: 'month' },
    { value: 'vip', label: 'VIP Member', price: 100, duration: 'month' },
    { value: 'gold', label: 'Gold Member', price: 50, duration: '15 days' },
    { value: 'silver', label: 'Silver Member', price: 20, duration: '7 days' }
  ];

  const getMembershipInfo = (tier) => {
    return membershipTiers.find(t => t.value === tier) || membershipTiers[6];
  };

  useEffect(() => {
    fetchPremiumUsers();
    fetchStats();
  }, [currentPage, searchTerm, dateFilter]);

  const fetchPremiumUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        search: searchTerm,
        sort: '-createdAt',
        premium: 'true'
      });

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setPremiumUsers(data.users);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching premium users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      // Add date filters if provided
      if (dateFilter.startDate) {
        params.append('startDate', dateFilter.startDate);
      }
      if (dateFilter.endDate) {
        params.append('endDate', dateFilter.endDate);
      }
      
      const url = `${import.meta.env.VITE_API_BASE_URL}/api/admin/premium/stats${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleBanUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${userId}/ban-duration`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(banForm)
      });

      if (res.ok) {
        await fetchPremiumUsers();
        await fetchStats();
        setShowBanModal(false);
        setBanForm({
          isBanned: false,
          banReason: '',
          banDuration: 1,
          banDurationType: 'days'
        });
      }
    } catch (error) {
      console.error('Error banning user:', error);
    }
  };

  const handleEditUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        await fetchPremiumUsers();
        await fetchStats();
        setShowEditModal(false);
      }
    } catch (error) {
      console.error('Error editing user:', error);
    }
  };

  const handleCreateUser = async () => {
    try {
      // Validate required fields
      if (!createForm.username || !createForm.email || !createForm.password || 
          !createForm.firstName || !createForm.lastName || !createForm.dateOfBirth || 
          !createForm.gender || !createForm.lookingFor || !createForm.location) {
        console.error('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(createForm.email)) {
        console.error('รูปแบบอีเมลไม่ถูกต้อง');
        return;
      }

      // Validate password length
      if (createForm.password.length < 6) {
        console.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
        return;
      }

      const token = localStorage.getItem('token');
      const userData = {
        ...createForm,
        dateOfBirth: new Date(createForm.dateOfBirth).toISOString(),
        membership: {
          tier: createForm.membership.tier || 'silver'
        },
        // เพิ่ม coordinates เพื่อแก้ปัญหา validation error
        coordinates: {
          type: 'Point',
          coordinates: [100.5018, 13.7563] // Default coordinates (Bangkok, Thailand)
        }
      };

      console.log('Sending user data:', userData);

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (res.ok) {
        const newUser = await res.json();
        console.log('User created successfully:', newUser);
        success(`✅ สร้างผู้ใช้สำเร็จ!\n\n` +
          `Username: ${createForm.username}\n` +
          `อีเมล: ${createForm.email}\n` +
          `ชื่อ: ${createForm.firstName} ${createForm.lastName}\n` +
          `ระดับสมาชิก: ${createForm.membership.tier.toUpperCase()}`, 5000);
        await fetchPremiumUsers();
        await fetchStats();
        setShowCreateModal(false);
        setCreateForm({
          username: '',
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          dateOfBirth: '',
          gender: 'male',
          lookingFor: 'both',
          location: '',
          membership: { tier: 'silver' }
        });
        // ส่ง event แทนการรีเฟรชหน้าเว็บ
        window.dispatchEvent(new CustomEvent('userCreated', { 
          detail: { user: newUser } 
        }));
        success('✅ สร้างผู้ใช้ทดสอบสำเร็จ');
      } else {
        const errorData = await res.json();
        console.error('Server error:', errorData);
        error(`❌ เกิดข้อผิดพลาด: ${errorData.message || 'ไม่สามารถสร้างผู้ใช้ได้'}`, 5000);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      error('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ', 5000);
    }
  };

  const validatePassword = (password) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    return hasUpperCase && hasNumber;
  };

  const handleResetPassword = async () => {
    // Validate password requirements
    if (!validatePassword(resetPasswordForm.newPassword)) {
      error('❌ รหัสผ่านต้องมีตัวอักษรตัวใหญ่ 1 ตัวขึ้นไป และตัวเลข 1 ตัวขึ้นไป', 5000);
      return;
    }

    // Check if passwords match
    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
      error('❌ รหัสผ่านไม่ตรงกัน กรุณากรอกใหม่อีกครั้ง', 5000);
      return;
    }

    // Check password length
    if (resetPasswordForm.newPassword.length < 6) {
      error('❌ รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 5000);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${selectedUser._id}/reset-password`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword: resetPasswordForm.newPassword })
      });

      if (res.ok) {
        setShowResetPasswordModal(false);
        setResetPasswordForm({ newPassword: '', confirmPassword: '' });
        success('✅ รีเซ็ตรหัสผ่านสำเร็จ', 5000);
      } else {
        const errorData = await res.json();
        error(`❌ เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน: ${errorData.message}`, 5000);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      error('❌ เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน', 5000);
    }
  };

  const handleDeleteUser = async (userId) => {
    // Show confirmation toast
    const user = premiumUsers.find(u => u._id === userId);
    const userName = user ? user.username : 'ผู้ใช้นี้';
    
    // For now, we'll use a simple confirmation
    // In a real app, you might want to use a proper confirmation modal
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบผู้ใช้ "${userName}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        success(`✅ ลบผู้ใช้ "${userName}" สำเร็จ`, 3000);
        await fetchPremiumUsers();
        await fetchStats();
      } else {
        const errorData = await res.json();
        error(`❌ เกิดข้อผิดพลาดในการลบผู้ใช้: ${errorData.message}`, 5000);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      error('❌ เกิดข้อผิดพลาดในการลบผู้ใช้', 5000);
    }
  };

  const handleViewProfile = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${userId}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const userData = await res.json();
        setSelectedUser(userData);
        setShowProfileModal(true);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const getStatusBadge = (user) => {
    if (user.isBanned) {
      return <Badge variant="destructive">ถูกแบน</Badge>;
    }
    if (!user.isActive) {
      return <Badge variant="secondary">ไม่ใช้งาน</Badge>;
    }
    return <Badge variant="default">ใช้งาน</Badge>;
  };

  const getMembershipBadge = (tier) => {
    const colors = {
      platinum: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
      diamond: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
      vip2: 'bg-gradient-to-r from-red-500 to-orange-500 text-white',
      vip1: 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white',
      vip: 'bg-gradient-to-r from-purple-400 to-pink-400 text-white',
      gold: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white',
      silver: 'bg-gradient-to-r from-gray-400 to-slate-400 text-white'
    };
    return <Badge className={colors[tier] || 'bg-gray-100 text-gray-800'}>{tier}</Badge>;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <h1 className="text-xl font-bold text-slate-800">กำลังโหลดข้อมูลสมาชิก Premium...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-800 flex items-center gap-3">
              <Crown size={32} />
              จัดการสมาชิก Premium
            </h1>
            <p className="text-slate-600 mt-1">จัดการข้อมูลสมาชิก Premium ทั้งหมดในระบบ</p>
          </div>
          <div className="flex gap-3">
            <Button 
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={16} className="mr-2" />
              เพิ่มสมาชิก Premium
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowDateFilter(!showDateFilter)}
              className={showDateFilter ? 'bg-blue-50 border-blue-300' : ''}
            >
              <Calendar size={16} className="mr-2" />
              {showDateFilter ? 'ปิดตัวกรองวันที่' : 'กรองตามวันที่'}
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowRevenueModal(true)}
            >
              <DollarSign size={16} className="mr-2" />
              ดูรายได้
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/admin'}>
              กลับไป Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Date Filter */}
        {showDateFilter && (
          <Card className="mb-6 border-blue-200 bg-blue-50/50">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate" className="text-sm font-medium text-slate-700">
                      วันที่เริ่มต้น
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={dateFilter.startDate}
                      onChange={(e) => setDateFilter({...dateFilter, startDate: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate" className="text-sm font-medium text-slate-700">
                      วันที่สิ้นสุด
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={dateFilter.endDate}
                      onChange={(e) => setDateFilter({...dateFilter, endDate: e.target.value})}
                      className="mt-1"
                      min={dateFilter.startDate || undefined}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDateFilter({ startDate: '', endDate: '' });
                    }}
                  >
                    ล้าง
                  </Button>
                  <Button
                    onClick={() => {
                      fetchStats();
                    }}
                  >
                    ดูรายได้
                  </Button>
                </div>
              </div>
              {stats.dateRange && (stats.dateRange.startDate || stats.dateRange.endDate) && (
                <div className="mt-4 text-sm text-slate-600">
                  <Calendar size={14} className="inline mr-1" />
                  แสดงรายได้ระหว่าง: {stats.dateRange.startDate ? new Date(stats.dateRange.startDate).toLocaleDateString('th-TH') : 'ทั้งหมด'} - {stats.dateRange.endDate ? new Date(stats.dateRange.endDate).toLocaleDateString('th-TH') : 'ทั้งหมด'}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Crown size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">สมาชิก Premium</p>
                  <p className="text-2xl font-bold text-slate-800">{stats.totalPremium}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <DollarSign size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">รายได้รวม (ชำระเงินจริง)</p>
                  <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalRevenue || 0)}</p>
                  <p className="text-xs text-slate-500 mt-1">เฉพาะการซื้อผ่าน Payment Gateway</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <TrendingUp size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">รายได้เดือนนี้ (ชำระเงินจริง)</p>
                  <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.monthlyRevenue || 0)}</p>
                  <p className="text-xs text-slate-500 mt-1">เฉพาะการซื้อผ่าน Payment Gateway</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Users size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Platinum</p>
                  <p className="text-2xl font-bold text-slate-800">{stats.platinum}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Membership Breakdown */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 size={20} />
              สถิติสมาชิกตามระดับ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {membershipTiers.map((tier) => (
                <div key={tier.value} className="text-center p-4 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-slate-800">
                    {stats[tier.value] || 0}
                  </div>
                  <div className="text-sm text-slate-600">{tier.label}</div>
                  <div className="text-xs text-slate-500">{formatCurrency(tier.price)}/{tier.duration}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="search">ค้นหา</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="search"
                    placeholder="ค้นหาชื่อ, อีเมล, username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={fetchPremiumUsers}>
                  ค้นหา
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Premium Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>รายชื่อสมาชิก Premium ({premiumUsers.length} คน)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left p-4 font-medium text-slate-700">สมาชิก</th>
                    <th className="text-left p-4 font-medium text-slate-700">อีเมล</th>
                    <th className="text-left p-4 font-medium text-slate-700">ระดับ</th>
                    <th className="text-left p-4 font-medium text-slate-700">ราคา</th>
                    <th className="text-left p-4 font-medium text-slate-700">สถานะ</th>
                    <th className="text-left p-4 font-medium text-slate-700">วันที่สมัคร</th>
                    <th className="text-left p-4 font-medium text-slate-700">การจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {premiumUsers.map((user) => {
                    const membershipInfo = getMembershipInfo(user.membership?.tier);
                    return (
                      <tr key={user._id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 ${user.isOnline ? 'bg-gradient-to-br from-green-600 to-green-700' : 'bg-gradient-to-br from-gray-600 to-gray-700'} rounded-full flex items-center justify-center text-white font-semibold`}>
                              {user.firstName?.charAt(0) || user.username?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div className="font-medium text-slate-800">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-slate-500">@{user.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Mail size={14} className="text-slate-400" />
                            <span className="text-sm">{user.email}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          {getMembershipBadge(user.membership?.tier)}
                        </td>
                        <td className="p-4">
                          <div className="text-sm font-medium text-slate-800">
                            {formatCurrency(membershipInfo.price)}
                          </div>
                          <div className="text-xs text-slate-500">/{membershipInfo.duration}</div>
                        </td>
                        <td className="p-4">
                          {getStatusBadge(user)}
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewProfile(user._id)}
                            >
                              <Eye size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user);
                                setEditForm({
                                  username: user.username,
                                  firstName: user.firstName,
                                  lastName: user.lastName,
                                  email: user.email,
                                  membership: user.membership
                                });
                                setShowEditModal(true);
                              }}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user);
                                setBanForm({
                                  isBanned: !user.isBanned,
                                  banReason: user.banReason || '',
                                  banDuration: 1,
                                  banDurationType: 'days'
                                });
                                setShowBanModal(true);
                              }}
                            >
                              {user.isBanned ? <Unlock size={14} /> : <Ban size={14} />}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteUser(user._id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user);
                                setResetPasswordForm({ newPassword: '', confirmPassword: '' });
                                setShowResetPasswordModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Key size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    ก่อนหน้า
                  </Button>
                  <span className="flex items-center px-4 text-slate-600">
                    หน้า {currentPage} จาก {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    ถัดไป
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Modal */}
      <Dialog open={showRevenueModal} onOpenChange={setShowRevenueModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign size={20} />
              รายได้สมาชิก Premium
            </DialogTitle>
            <DialogDescription>
              ดูรายได้รวมและรายได้รายเดือนจากการสมัครสมาชิก Premium
            </DialogDescription>
          </DialogHeader>
            <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">รายได้รวม (ชำระเงินจริง)</h3>
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(stats.totalRevenue || 0)}
                </div>
                <p className="text-sm text-slate-600">รายได้ทั้งหมดจากการซื้อผ่าน Payment Gateway</p>
                <p className="text-xs text-slate-500">ไม่รวมการอัพเกรดโดย Admin</p>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">รายได้เดือนนี้ (ชำระเงินจริง)</h3>
                <div className="text-3xl font-bold text-blue-600">
                  {formatCurrency(stats.monthlyRevenue || 0)}
                </div>
                <p className="text-sm text-slate-600">รายได้ในเดือนปัจจุบันจากการซื้อผ่าน Payment Gateway</p>
                <p className="text-xs text-slate-500">ไม่รวมการอัพเกรดโดย Admin</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">รายได้แยกตามระดับ (ชำระเงินจริง)</h3>
              <div className="space-y-3">
                {membershipTiers.map((tier) => {
                  const tierRevenue = stats.revenueByTier?.[tier.value];
                  const revenue = tierRevenue?.amount || 0;
                  const count = tierRevenue?.count || 0;
                  return (
                    <div key={tier.value} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <div>
                        <div className="font-medium text-slate-800">{tier.label}</div>
                        <div className="text-sm text-slate-600">
                          {count} รายการ × {count > 0 ? formatCurrency(revenue / count) : formatCurrency(tier.price)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-800">{formatCurrency(revenue)}</div>
                        <div className="text-xs text-slate-500">/{tier.duration}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {stats.revenueByTier && Object.keys(stats.revenueByTier).length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <p>ไม่มีรายได้ในช่วงเวลาที่เลือก</p>
                  <p className="text-sm mt-2">รายได้จะแสดงเฉพาะการซื้อผ่าน Payment Gateway</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ban Modal */}
      <Dialog open={showBanModal} onOpenChange={setShowBanModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {banForm.isBanned ? <Ban size={20} /> : <Unlock size={20} />}
              {banForm.isBanned ? 'แบนสมาชิก' : 'ปลดแบนสมาชิก'}
            </DialogTitle>
            <DialogDescription>
              {banForm.isBanned ? 'ระบุเหตุผลและระยะเวลาในการแบนสมาชิก' : 'ปลดแบนสมาชิกเพื่อให้สามารถใช้งานได้อีกครั้ง'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {banForm.isBanned && (
              <>
                <div>
                  <Label htmlFor="banReason">เหตุผล</Label>
                  <Input
                    id="banReason"
                    value={banForm.banReason}
                    onChange={(e) => setBanForm({...banForm, banReason: e.target.value})}
                    placeholder="ระบุเหตุผลในการแบน"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="banDuration">ระยะเวลา</Label>
                    <Input
                      id="banDuration"
                      type="number"
                      value={banForm.banDuration}
                      onChange={(e) => setBanForm({...banForm, banDuration: parseInt(e.target.value)})}
                      min="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="banDurationType">หน่วย</Label>
                    <select
                      id="banDurationType"
                      value={banForm.banDurationType}
                      onChange={(e) => setBanForm({...banForm, banDurationType: e.target.value})}
                      className="w-full p-2 border border-slate-200 rounded-md"
                    >
                      <option value="hours">ชั่วโมง</option>
                      <option value="days">วัน</option>
                      <option value="months">เดือน</option>
                      <option value="permanent">ถาวร</option>
                    </select>
                  </div>
                </div>
              </>
            )}
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={() => handleBanUser(selectedUser._id)}
              >
                {banForm.isBanned ? 'แบน' : 'ปลดแบน'}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowBanModal(false)}
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit size={20} />
              แก้ไขสมาชิก Premium
            </DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลส่วนตัวและระดับสมาชิก Premium
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editFirstName">ชื่อ</Label>
                <Input
                  id="editFirstName"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({...editForm, firstName: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="editLastName">นามสกุล</Label>
                <Input
                  id="editLastName"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({...editForm, lastName: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="editUsername">ชื่อผู้ใช้</Label>
              <Input
                id="editUsername"
                value={editForm.username}
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
            </div>
            <div>
              <Label htmlFor="editEmail">อีเมล</Label>
              <Input
                id="editEmail"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="editMembership">ระดับสมาชิก</Label>
              <select
                id="editMembership"
                value={editForm.membership.tier}
                onChange={(e) => setEditForm({
                  ...editForm, 
                  membership: {...editForm.membership, tier: e.target.value}
                })}
                className="w-full p-2 border border-slate-200 rounded-md"
              >
                {membershipTiers.map((tier) => (
                  <option key={tier.value} value={tier.value}>
                    {tier.label} - {formatCurrency(tier.price)}/{tier.duration}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={() => handleEditUser(selectedUser._id)}
              >
                บันทึก
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowEditModal(false)}
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus size={20} />
              เพิ่มสมาชิก Premium ใหม่
            </DialogTitle>
            <DialogDescription>
              สร้างสมาชิก Premium ใหม่พร้อมกำหนดระดับสมาชิก
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="createUsername">Username</Label>
                <Input
                  id="createUsername"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({...createForm, username: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="createEmail">อีเมล</Label>
                <Input
                  id="createEmail"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="createPassword">รหัสผ่าน</Label>
              <Input
                id="createPassword"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="createFirstName">ชื่อ</Label>
                <Input
                  id="createFirstName"
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm({...createForm, firstName: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="createLastName">นามสกุล</Label>
                <Input
                  id="createLastName"
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm({...createForm, lastName: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="createLocation">ที่อยู่</Label>
              <Input
                id="createLocation"
                value={createForm.location}
                onChange={(e) => setCreateForm({...createForm, location: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="createDateOfBirth">วันเกิด</Label>
              <Input
                id="createDateOfBirth"
                type="date"
                value={createForm.dateOfBirth}
                onChange={(e) => setCreateForm({...createForm, dateOfBirth: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="createMembership">ระดับสมาชิก</Label>
              <select
                id="createMembership"
                value={createForm.membership.tier}
                onChange={(e) => setCreateForm({
                  ...createForm, 
                  membership: {...createForm.membership, tier: e.target.value}
                })}
                className="w-full p-2 border border-slate-200 rounded-md"
              >
                {membershipTiers.map((tier) => (
                  <option key={tier.value} value={tier.value}>
                    {tier.label} - {formatCurrency(tier.price)}/{tier.duration}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={handleCreateUser}
              >
                สร้างสมาชิก Premium
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCreateModal(false)}
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Modal */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User size={20} />
              โปรไฟล์สมาชิก Premium
            </DialogTitle>
            <DialogDescription>
              ดูข้อมูลรายละเอียดของสมาชิก Premium
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 ${selectedUser.isOnline ? 'bg-gradient-to-br from-green-600 to-green-700' : 'bg-gradient-to-br from-gray-600 to-gray-700'} rounded-full flex items-center justify-center text-white font-semibold text-xl`}>
                  {selectedUser.firstName?.charAt(0) || selectedUser.username?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-800">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </h3>
                  <p className="text-slate-600">@{selectedUser.username}</p>
                  <div className="flex gap-2 mt-2">
                    {getStatusBadge(selectedUser)}
                    {getMembershipBadge(selectedUser.membership?.tier)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-600">ข้อมูลส่วนตัว</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-slate-400" />
                        <span className="text-sm">{selectedUser.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" />
                        <span className="text-sm">สมัครเมื่อ: {formatDate(selectedUser.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-600">ข้อมูลสมาชิก Premium</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Crown size={14} className="text-slate-400" />
                        <span className="text-sm">Coins: {selectedUser.coins}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" />
                        <span className="text-sm">เข้าสู่ระบบล่าสุด: {formatDate(selectedUser.lastLogin)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedUser.bio && (
                <div>
                  <Label className="text-sm font-medium text-slate-600">เกี่ยวกับตัว</Label>
                  <p className="mt-2 text-sm text-slate-700 bg-slate-50 p-3 rounded-md">
                    {selectedUser.bio}
                  </p>
                </div>
              )}

              {selectedUser.isBanned && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <Ban size={16} />
                    <span className="font-medium">ถูกแบน</span>
                  </div>
                  {selectedUser.banReason && (
                    <p className="text-sm text-red-700 mt-1">เหตุผล: {selectedUser.banReason}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={showResetPasswordModal} onOpenChange={setShowResetPasswordModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <Key size={20} />
              รีเซ็ตรหัสผ่าน
            </DialogTitle>
            <DialogDescription>
              ตั้งรหัสผ่านใหม่สำหรับผู้ใช้ {selectedUser?.firstName} {selectedUser?.lastName} (@{selectedUser?.username})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPassword">รหัสผ่านใหม่</Label>
              <Input
                id="newPassword"
                type="password"
                value={resetPasswordForm.newPassword}
                onChange={(e) => setResetPasswordForm({...resetPasswordForm, newPassword: e.target.value})}
                placeholder="กรอกรหัสผ่านใหม่"
              />
              <div className="mt-1 text-xs text-slate-500">
                รหัสผ่านต้องมีตัวอักษรตัวใหญ่ 1 ตัวขึ้นไป และตัวเลข 1 ตัวขึ้นไป
              </div>
            </div>
            
            <div>
              <Label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={resetPasswordForm.confirmPassword}
                onChange={(e) => setResetPasswordForm({...resetPasswordForm, confirmPassword: e.target.value})}
                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
              />
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={handleResetPassword}
                disabled={!resetPasswordForm.newPassword || !resetPasswordForm.confirmPassword}
              >
                บันทึก
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setResetPasswordForm({ newPassword: '', confirmPassword: '' });
                }}
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PremiumManagement;