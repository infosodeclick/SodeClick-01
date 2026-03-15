import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { 
  Ban, 
  Unlock, 
  Search, 
  User, 
  Calendar,
  AlertTriangle,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  Eye,
  ArrowLeft
} from 'lucide-react';


const BannedUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showUnbanModal, setShowUnbanModal] = useState(false);
  const [unbanLoading, setUnbanLoading] = useState(false);

  const fetchBannedUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        search: searchTerm,
        sort: '-createdAt'
      });

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/banned-users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotalPages(data.pagination.pages);
        setTotalUsers(data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching banned users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBannedUsers();
  }, [currentPage, searchTerm]);

  const handleUnban = async (userId) => {
    try {
      setUnbanLoading(true);
      const token = localStorage.getItem('token');
      
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${userId}/ban`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isBanned: false,
          banReason: null
        })
      });

      if (res.ok) {
        // Refresh the list
        fetchBannedUsers();
        setShowUnbanModal(false);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Error unbanning user:', error);
    } finally {
      setUnbanLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'ถาวร';
    const date = new Date(dateString);
    return date.toLocaleString('th-TH');
  };

  const getBanStatus = (user) => {
    if (!user.banExpiresAt) return 'ถาวร';
    const now = new Date();
    const banExpires = new Date(user.banExpiresAt);
    if (banExpires > now) {
      return 'ชั่วคราว';
    } else {
      return 'หมดอายุ';
    }
  };

  const getMembershipBadgeColor = (tier) => {
    const colors = {
      platinum: 'bg-purple-100 text-purple-800',
      diamond: 'bg-blue-100 text-blue-800',
      vip2: 'bg-indigo-100 text-indigo-800',
      vip1: 'bg-violet-100 text-violet-800',
      vip: 'bg-pink-100 text-pink-800',
      gold: 'bg-yellow-100 text-yellow-800',
      silver: 'bg-gray-100 text-gray-800',
      member: 'bg-green-100 text-green-800'
    };
    return colors[tier] || 'bg-gray-100 text-gray-800';
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      user: 'bg-blue-100 text-blue-800',
      admin: 'bg-orange-100 text-orange-800',
      // superadmin: 'bg-red-100 text-red-800' // ซ่อน SuperAdmin
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Ban className="text-red-500" size={28} />
            ผู้ใช้ที่ถูกแบน
          </h1>
          <p className="text-gray-600 mt-1">
            จัดการผู้ใช้ที่ถูกแบนทั้งหมด ({totalUsers} คน)
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => window.location.href = '/admin'}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          กลับไป Dashboard
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="ค้นหาผู้ใช้..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={20} />
            รายชื่อผู้ใช้ที่ถูกแบน
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">กำลังโหลด...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Ban size={48} className="mx-auto mb-2 opacity-50" />
              <p>ไม่พบผู้ใช้ที่ถูกแบน</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">ผู้ใช้</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">เหตุผลการแบน</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">ประเภทการแบน</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">หมดอายุ</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">วันที่แบน</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <User size={20} className="text-gray-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">@{user.username}</div>
                            <div className="flex gap-1 mt-1">
                              <Badge className={getRoleBadgeColor(user.role)}>
                                {user.role}
                              </Badge>
                              <Badge className={getMembershipBadgeColor(user.membership?.tier)}>
                                {user.membership?.tier || 'member'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="max-w-xs">
                          <p className="text-sm text-gray-900">
                            {user.banReason || 'ไม่ระบุเหตุผล'}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge 
                          variant={getBanStatus(user) === 'ถาวร' ? 'destructive' : 'secondary'}
                          className="flex items-center gap-1"
                        >
                          {getBanStatus(user) === 'ถาวร' ? (
                            <AlertTriangle size={14} />
                          ) : (
                            <Clock size={14} />
                          )}
                          {getBanStatus(user)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar size={14} />
                          {formatDate(user.banExpiresAt)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-600">
                          {formatDate(user.updatedAt)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowProfileModal(true);
                            }}
                          >
                            <Eye size={16} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowUnbanModal(true);
                            }}
                            className="text-green-600 border-green-600 hover:bg-green-50"
                          >
                            <Unlock size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            แสดง {((currentPage - 1) * 10) + 1} ถึง {Math.min(currentPage * 10, totalUsers)} จาก {totalUsers} คน
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="px-3 py-2 text-sm">
              หน้า {currentPage} จาก {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User size={20} />
              โปรไฟล์ผู้ใช้ที่ถูกแบน
            </DialogTitle>
            <DialogDescription>
              ดูข้อมูลรายละเอียดของผู้ใช้ที่ถูกแบน
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-gray-700">ชื่อผู้ใช้</Label>
                  <p className="text-gray-900">@{selectedUser.username}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">อีเมล</Label>
                  <p className="text-gray-900">{selectedUser.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">ชื่อ</Label>
                  <p className="text-gray-900">{selectedUser.firstName} {selectedUser.lastName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">เพศ</Label>
                  <p className="text-gray-900">{selectedUser.gender || 'ไม่ระบุ'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">ระดับ</Label>
                  <Badge className={getRoleBadgeColor(selectedUser.role)}>
                    {selectedUser.role}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">สมาชิก</Label>
                  <Badge className={getMembershipBadgeColor(selectedUser.membership?.tier)}>
                    {selectedUser.membership?.tier || 'member'}
                  </Badge>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">ข้อมูลการแบน</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">เหตุผลการแบน</Label>
                    <p className="text-gray-900">{selectedUser.banReason || 'ไม่ระบุเหตุผล'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">ประเภทการแบน</Label>
                    <Badge 
                      variant={getBanStatus(selectedUser) === 'ถาวร' ? 'destructive' : 'secondary'}
                    >
                      {getBanStatus(selectedUser)}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">วันที่แบน</Label>
                    <p className="text-gray-900">{formatDate(selectedUser.updatedAt)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">หมดอายุ</Label>
                    <p className="text-gray-900">{formatDate(selectedUser.banExpiresAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Unban Modal */}
      <Dialog open={showUnbanModal} onOpenChange={setShowUnbanModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock size={20} />
              ปลดแบนผู้ใช้
            </DialogTitle>
            <DialogDescription>
              ปลดแบนผู้ใช้เพื่อให้สามารถใช้งานได้อีกครั้ง
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle size={20} />
                  <span className="font-medium">ยืนยันการปลดแบน</span>
                </div>
                <p className="text-yellow-700 mt-2">
                  คุณกำลังจะปลดแบนผู้ใช้ <strong>{selectedUser.firstName} {selectedUser.lastName}</strong> 
                  (@{selectedUser.username})
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowUnbanModal(false)}
                  disabled={unbanLoading}
                >
                  ยกเลิก
                </Button>
                <Button
                  onClick={() => handleUnban(selectedUser._id)}
                  disabled={unbanLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {unbanLoading ? 'กำลังปลดแบน...' : 'ปลดแบน'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BannedUsers;
