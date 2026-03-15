import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from './ui/toast';
import {
  Users,
  Shield,
  Settings,
  Edit,
  Save,
  X,
  CheckCircle,
  Clock,
  UserCheck,
  Plus,
  UserPlus,
  Trash2,
  AlertTriangle
} from 'lucide-react';

const PermissionManagement = () => {
  const { success, error, warning, info } = useToast();
  const [users, setUsers] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'male',
    lookingFor: 'female',
    location: '',
    role: 'mod'
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [adminUsersCount, setAdminUsersCount] = useState({ adminCreatedUsers: 0, totalAdminUsers: 0 });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showSelectUserModal, setShowSelectUserModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [searchUserTerm, setSearchUserTerm] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState(null);
  const [selectedRoleForUser, setSelectedRoleForUser] = useState('mod');

  // โหลดข้อมูลผู้ใช้ที่มีสิทธิ์พิเศษ (เฉพาะ admin, mod, support)
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');

      // ดึงผู้ใช้ทั้งหมดที่มี role เป็น admin, mod, support ที่ถูกสร้างโดย admin (ไม่รวม user ทั่วไป)
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users?role=admin,mod,support&adminCreated=true&limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        // Backend กรองให้แล้ว (role=admin,mod,support และ adminCreated=true)
        // ไม่ต้องกรองซ้ำ
        setUsers(data.users || []);
      } else {
        throw new Error('ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // โหลดสิทธิ์ที่ใช้ได้ทั้งหมด
  const fetchAvailablePermissions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/permissions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setAvailablePermissions(data.permissions || []);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  // โหลดข้อมูล role permissions
  const fetchRolePermissions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/role-permissions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setRolePermissions(data.roles || {});
      }
    } catch (error) {
      console.error('Error fetching role permissions:', error);
    }
  };

  useEffect(() => {
    // ตรวจสอบสิทธิ์ผู้ใช้ก่อน
    checkUserPermissions();

    fetchUsers();
    fetchAvailablePermissions();
    fetchRolePermissions();
    fetchAdminUsersCount();

    // อัปเดตผู้ใช้ที่มีอยู่แล้วให้มี createdByAdmin ที่ถูกต้อง (สำหรับผู้ใช้เดิมที่ถูกแต่งตั้งก่อนมีระบบนี้)
    if (currentUser && ['admin', 'superadmin'].includes(currentUser.role)) {
      fixExistingUsers();
    }
  }, []);

  // Debounce search for available users
  useEffect(() => {
    if (!showSelectUserModal) return;
    
    const timeoutId = setTimeout(() => {
      if (searchUserTerm.length >= 2 || searchUserTerm.length === 0) {
        fetchAvailableUsers();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchUserTerm, showSelectUserModal]);

  // ตรวจสอบสิทธิ์ของผู้ใช้ที่เข้าถึงหน้า
  const checkUserPermissions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/';
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const response = await res.json();
        const userData = response.data?.user;
        setCurrentUser(userData);

        // ตรวจสอบว่าผู้ใช้มีสิทธิ์เข้าถึงหรือไม่
        if (!['admin', 'superadmin'].includes(userData?.role)) {
          error("ไม่มีสิทธิ์เข้าถึง - คุณไม่มีสิทธิ์เข้าถึงหน้า จัดการสิทธิ์ผู้ดูแลระบบ");
          window.location.href = '/';
          return;
        }
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      window.location.href = '/';
    }
  };

  // ดึงข้อมูลจำนวนผู้ดูแลระบบที่ถูกแต่งตั้ง
  const fetchAdminUsersCount = async () => {
    try {
      const token = localStorage.getItem('token');

      // ดึงข้อมูลผู้ดูแลระบบที่ถูกแต่งตั้งทั้งหมด (เฉพาะ admin, mod, support ที่ createdByAdmin=true)
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users?role=admin,mod,support&adminCreated=true&limit=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        console.log('📊 ข้อมูลผู้ดูแลระบบที่ดึงมา:', data.users?.length || 0, 'คน');
        console.log('📊 รายละเอียด:', data.users?.map(u => ({ username: u.username, role: u.role, createdByAdmin: u.createdByAdmin })));
        
        // กรองเฉพาะ admin, mod, support ที่ createdByAdmin=true
        const adminUsers = (data.users || []).filter(user => {
          const isValid = ['admin', 'mod', 'support'].includes(user.role) && user.createdByAdmin === true;
          if (!isValid) {
            console.log(`⚠️ กรองออก: ${user.username} (role: ${user.role}, createdByAdmin: ${user.createdByAdmin})`);
          }
          return isValid;
        });
        const totalAdminUsers = adminUsers.length;

        console.log(`✅ จำนวนผู้ดูแลระบบที่ถูกแต่งตั้งจริง: ${totalAdminUsers} คน`);

        setAdminUsersCount({
          adminCreatedUsers: totalAdminUsers,
          totalAdminUsers: totalAdminUsers
        });
      }
    } catch (error) {
      console.error('Error fetching admin users count:', error);
    }
  };

  // แก้ไขข้อมูลผู้ใช้ที่มีอยู่แล้วให้มี createdByAdmin ที่ถูกต้อง
  const handleFixAdminCreatedFlag = async () => {
    try {
      setIsFixing(true);
      const token = localStorage.getItem('token');

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/fix-admin-created-flag`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        success(`แก้ไขข้อมูลสำเร็จ - อัปเดตข้อมูลผู้ใช้สำเร็จ ${data.updatedCount} คน`);
        fetchUsers(); // รีโหลดข้อมูล
        fetchAdminUsersCount(); // อัปเดตจำนวน
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'ไม่สามารถแก้ไขข้อมูลได้');
      }
    } catch (error) {
      console.error('Error fixing admin created flag:', error);
      error(`เกิดข้อผิดพลาด - ${error.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล'}`);
    } finally {
      setIsFixing(false);
    }
  };

  // อัปเดตผู้ใช้ที่มีอยู่แล้วให้มี createdByAdmin ที่ถูกต้อง (สำหรับผู้ใช้เดิมที่ถูกแต่งตั้งก่อนมีระบบนี้)
  const fixExistingUsers = async () => {
    try {
      setIsFixing(true);
      const token = localStorage.getItem('token');

      // เรียก API เพื่ออัปเดตผู้ใช้ที่มี role เป็น admin, mod, support แต่ไม่มีฟิลด์ createdByAdmin หรือเป็น false
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/fix-admin-created-flag`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`🔧 อัปเดตผู้ใช้เดิม ${data.updatedCount} คนให้มี createdByAdmin: true`);
        // รีโหลดข้อมูลหลังจากอัปเดต
        fetchUsers();
        fetchAdminUsersCount();
      } else {
        console.error('ไม่สามารถอัปเดตผู้ใช้ได้');
      }
    } catch (error) {
      console.error('Error auto-fixing existing users:', error);
    } finally {
      setIsFixing(false);
    }
  };


  // แสดง modal ยืนยันการลบผู้ดูแลระบบ
  const handleDeleteUser = (userId, username) => {
    setUserToDelete({ id: userId, username });
    setShowDeleteModal(true);
  };

  // ยืนยันการลบผู้ดูแลระบบจริงๆ
  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        success(`ลบผู้ดูแลระบบสำเร็จ - ผู้ใช้ ${userToDelete.username} ถูกลบออกจากระบบแล้ว`);
        fetchUsers(); // รีโหลดข้อมูล
        fetchAdminUsersCount(); // อัปเดตจำนวน
        setShowDeleteModal(false);
        setUserToDelete(null);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'ไม่สามารถลบผู้ใช้ได้');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      error(`เกิดข้อผิดพลาด - ${error.message || 'ไม่สามารถลบผู้ใช้ได้'}`);
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  // แก้ไขสิทธิ์ของผู้ใช้
  const handleEditPermissions = async (userId, permissions) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${userId}/permissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ permissions })
      });

      if (res.ok) {
        setEditingUser(null);
        fetchUsers(); // รีโหลดข้อมูล
        success("บันทึกสิทธิ์สำเร็จ - สิทธิ์ของผู้ใช้ถูกบันทึกเรียบร้อยแล้ว");
      } else {
        throw new Error('ไม่สามารถบันทึกสิทธิ์ได้');
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      error("เกิดข้อผิดพลาด - ไม่สามารถบันทึกสิทธิ์ได้");
    }
  };

  // ดูสิทธิ์ของผู้ใช้
  const handleViewUserPermissions = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${userId}/permissions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        console.log('📊 User permissions data:', data);
        setSelectedUser(data);
      } else {
        const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Error fetching user permissions:', errorData);
        error(`ไม่สามารถโหลดข้อมูลสิทธิ์ได้: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      error(`เกิดข้อผิดพลาดในการโหลดข้อมูลสิทธิ์: ${error.message}`);
    }
  };

  // ดึงรายชื่อสมาชิกที่มีอยู่ (สำหรับเลือกแต่งตั้ง)
  const fetchAvailableUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: 1,
        limit: 50,
        search: searchUserTerm,
        role: 'user' // เฉพาะ user ทั่วไป
      });

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setAvailableUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching available users:', error);
      error('เกิดข้อผิดพลาดในการดึงรายชื่อสมาชิก');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // แต่งตั้งสมาชิกที่มีอยู่แล้วเป็น admin/mod/support
  const handleAssignRole = async () => {
    if (!selectedUserForRole || !selectedRoleForUser) {
      error('กรุณาเลือกสมาชิกและบทบาท');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${selectedUserForRole._id}/role`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: selectedRoleForUser })
      });

      if (res.ok) {
        success(`แต่งตั้ง ${selectedUserForRole.username} เป็น ${formatRoleName(selectedRoleForUser)} สำเร็จ`);
        setShowSelectUserModal(false);
        setSelectedUserForRole(null);
        setSelectedRoleForUser('mod');
        setSearchUserTerm('');
        fetchUsers();
        fetchAdminUsersCount();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'ไม่สามารถแต่งตั้งได้');
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      error(`เกิดข้อผิดพลาด - ${error.message || 'ไม่สามารถแต่งตั้งได้'}`);
    }
  };

  // สร้างผู้ดูแลใหม่
  const handleCreateUser = async () => {
    try {
      // ตรวจสอบสิทธิ์การสร้าง
      if (!currentUser || !['admin', 'superadmin'].includes(currentUser.role)) {
        error("ไม่มีสิทธิ์ในการสร้างผู้ดูแล - คุณไม่มีสิทธิ์ในการสร้างผู้ดูแลระบบ");
        return;
      }

      // ตรวจสอบบทบาทที่สามารถสร้างได้
      if (currentUser.role === 'admin' && newUser.role === 'admin') {
        error("ไม่มีสิทธิ์สร้างผู้ดูแลระบบ - Admin ไม่สามารถสร้างผู้ดูแลระบบ (Admin) ได้");
        return;
      }

      setIsCreating(true);
      const token = localStorage.getItem('token');

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUser)
      });

      if (res.ok) {
        setShowCreateForm(false);
        setNewUser({
          username: '',
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          dateOfBirth: '',
          gender: 'male',
          lookingFor: 'female',
          location: '',
          role: 'mod'
        });
        fetchUsers(); // รีโหลดข้อมูล
        fetchAdminUsersCount(); // อัปเดตจำนวนผู้ดูแลระบบ
        fixExistingUsers(); // อัปเดตผู้ใช้เดิมให้มี createdByAdmin ที่ถูกต้อง
        success("สร้างผู้ดูแลสำเร็จ - ผู้ดูแลระบบใหม่ถูกสร้างเรียบร้อยแล้ว");
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'ไม่สามารถสร้างผู้ดูแลได้');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      try {
        error(`เกิดข้อผิดพลาด - ${error.message || 'เกิดข้อผิดพลาดในการสร้างผู้ดูแล'}`);
      } catch (toastError) {
        console.error('Toast error:', toastError);
        alert(`เกิดข้อผิดพลาด - ${error.message || 'เกิดข้อผิดพลาดในการสร้างผู้ดูแล'}`);
      }
    } finally {
      setIsCreating(false);
    }
  };


  // จัดรูปแบบชื่อสิทธิ์ให้อ่านง่าย
  const formatPermissionName = (permission) => {
    const names = {
      'user_management': 'จัดการผู้ใช้',
      'message_management': 'จัดการข้อความ',
      'chatroom_management': 'จัดการห้องแชท',
      'premium_management': 'จัดการสมาชิก Premium',
      'password_reset': 'รีเซ็ตรหัสผ่าน',
      'unlimited_chat_access': 'เข้าถึงแชทไม่จำกัด',
      'USER_MANAGEMENT': 'จัดการผู้ใช้',
      'MESSAGE_MANAGEMENT': 'จัดการข้อความ',
      'CHATROOM_MANAGEMENT': 'จัดการห้องแชท',
      'PREMIUM_MANAGEMENT': 'จัดการสมาชิกพรีเมียม',
      'PASSWORD_RESET': 'รีเซ็ตรหัสผ่าน',
      'UNLIMITED_CHAT_ACCESS': 'เข้าถึงแชทแบบไม่จำกัด',
      'BAN_USERS': 'แบนผู้ใช้',
      'DELETE_MESSAGES': 'ลบข้อความ',
      'CREATE_CHATROOMS': 'สร้างห้องแชท',
      'VIEW_ANALYTICS': 'ดูสถิติ',
      'MANAGE_PAYMENTS': 'จัดการการชำระเงิน'
    };
    return names[permission] || permission;
  };

  // จัดรูปแบบชื่อ role ให้อ่านง่าย
  const formatRoleName = (role) => {
    const names = {
      'admin': 'ผู้ดูแลระบบ',
      'mod': 'ผู้ดูแลแชท',
      'support': 'ฝ่ายสนับสนุน',
      'superadmin': 'ผู้ดูแลสูงสุด'
    };
    return names[role] || role;
  };

  // ดูสิทธิ์จาก role
  const getRolePermissions = (role) => {
    // rolePermissions อาจเป็น object ที่มี key เป็น role และ value เป็น array ของ permissions
    if (rolePermissions[role] && Array.isArray(rolePermissions[role])) {
      return rolePermissions[role];
    }
    // หรืออาจเป็น object ที่มี structure { role: { permissions: [...] } }
    if (rolePermissions[role]?.permissions) {
      return rolePermissions[role].permissions;
    }
    return [];
  };

  // ดูสิทธิ์เพิ่มเติม (granular permissions)
  const getUserPermissions = (user) => {
    return user.permissions || [];
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500"></div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="space-y-8">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6 text-center">
            <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-700">{errorMessage}</p>
            <Button
              onClick={fetchUsers}
              className="mt-4"
              variant="outline"
            >
              ลองใหม่
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              จัดการสิทธิ์ผู้ดูแลระบบ
            </h2>
            <p className="text-gray-600 mt-2 text-lg">จัดการสิทธิ์และบทบาทของผู้ดูแลระบบที่ได้รับการแต่งตั้ง</p>
            {currentUser && ['admin', 'superadmin'].includes(currentUser.role) && (
              <p className="text-sm text-blue-600 mt-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                แสดงเฉพาะผู้ดูแลระบบที่ได้รับการแต่งตั้ง (admin, mod, support)
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {currentUser && ['admin', 'superadmin'].includes(currentUser.role) && (
            <>
              <Button
                onClick={() => {
                  setShowSelectUserModal(true);
                  fetchAvailableUsers();
                }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <UserCheck className="w-4 h-4" />
                เลือกสมาชิกที่มีอยู่
              </Button>
              <Button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <UserPlus className="w-4 h-4" />
                สร้างผู้ดูแลใหม่
              </Button>
            </>
          )}

          <Button
              onClick={handleFixAdminCreatedFlag}
              disabled={isFixing}
              variant="outline"
              className="flex items-center gap-2"
              title="อัปเดตผู้ดูแลระบบเดิมที่ถูกแต่งตั้งก่อนมีระบบนี้ให้แสดงในหน้านี้ได้ถูกต้อง"
            >
              {isFixing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600"></div>
                  กำลังอัปเดต...
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4" />
                  อัปเดตผู้ดูแลเดิม
                </>
              )}
            </Button>
          <Button
            onClick={fetchUsers}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            รีเฟรชข้อมูล
          </Button>
        </div>
      </div>

      {/* Create User Form */}
      {showCreateForm && currentUser && ['admin', 'superadmin'].includes(currentUser.role) && (
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800 flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              สร้างผู้ดูแลระบบใหม่
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">ชื่อผู้ใช้</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="ชื่อผู้ใช้ (อย่างน้อย 3 ตัวอักษร)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">อีเมล</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="อีเมล"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">รหัสผ่าน</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">บทบาท</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="mod">ผู้ดูแลแชท (Mod)</option>
                  <option value="support">ฝ่ายสนับสนุน (Support)</option>
                  {currentUser.role === 'superadmin' && (
                    <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                  )}
                </select>
                {currentUser.role === 'admin' && (
                  <p className="text-xs text-slate-500 mt-1">
                    * Admin สามารถสร้างได้เฉพาะ Mod และ Support
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">ชื่อจริง</label>
                <input
                  type="text"
                  value={newUser.firstName}
                  onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="ชื่อจริง"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">นามสกุล</label>
                <input
                  type="text"
                  value={newUser.lastName}
                  onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="นามสกุล"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">วันเกิด</label>
                <input
                  type="date"
                  value={newUser.dateOfBirth}
                  onChange={(e) => setNewUser({...newUser, dateOfBirth: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">เพศ</label>
                <select
                  value={newUser.gender}
                  onChange={(e) => setNewUser({...newUser, gender: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="male">ชาย</option>
                  <option value="female">หญิง</option>
                  <option value="other">อื่นๆ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">มองหา</label>
                <select
                  value={newUser.lookingFor}
                  onChange={(e) => setNewUser({...newUser, lookingFor: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="male">ชาย</option>
                  <option value="female">หญิง</option>
                  <option value="both">ทั้งสอง</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">ที่อยู่</label>
                <input
                  type="text"
                  value={newUser.location}
                  onChange={(e) => setNewUser({...newUser, location: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="ที่อยู่"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleCreateUser}
                disabled={isCreating || !newUser.username || !newUser.email || !newUser.password}
                className="bg-green-600 hover:bg-green-700"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    กำลังสร้าง...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    สร้างผู้ดูแล
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
              >
                ยกเลิก
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Card */}
      <Card className="bg-blue-50 border border-blue-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            ข้อมูลการจัดการผู้ดูแลระบบ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-blue-700">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">ผู้ดูแลระบบที่ได้รับการแต่งตั้ง</p>
                <p>แสดงเฉพาะผู้ใช้ที่มีบทบาทเป็นผู้ดูแลระบบ (admin, mod, support) ที่ได้รับการแต่งตั้งจากผู้ดูแลสูงสุด</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Settings className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">อัปเดตผู้ดูแลเดิม</p>
                <p>สำหรับผู้ดูแลระบบเดิมที่ถูกแต่งตั้งก่อนมีระบบนี้ ให้คลิกปุ่ม "อัปเดตผู้ดูแลเดิม" เพื่อให้แสดงในหน้านี้ได้ถูกต้อง</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">การจัดการผู้ใช้ทั่วไป</p>
                <p>สำหรับการจัดการผู้ใช้ทั่วไป กรุณาใช้หน้า "จัดการผู้ใช้" แทนหน้านี้</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* User Permissions List */}
      <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-6">
          <CardTitle className="text-gray-800 flex items-center gap-3 text-xl">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
              <Users className="w-6 h-6 text-white" />
            </div>
            ผู้ดูแลระบบที่ได้รับการแต่งตั้ง
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-blue-600">{adminUsersCount.adminCreatedUsers}</span>
              <span className="text-gray-500">คน</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {users.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">ไม่พบผู้ดูแลระบบที่ได้รับการแต่งตั้ง</p>
                <p className="text-gray-400 text-sm mt-1">ยังไม่มีผู้ดูแลระบบที่ได้รับการแต่งตั้งในระบบ</p>
              </div>
            ) : (
              users.map((user) => (
              <div key={user._id} className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-lg font-semibold text-gray-700">
                          {user.firstName?.charAt(0) || user.username.charAt(0)}{user.lastName?.charAt(0) || user.username.charAt(1) || ''}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">
                          {user.firstName && user.lastName ?
                            `${user.firstName} ${user.lastName}` :
                            user.firstName || user.lastName ?
                              `${user.firstName || ''}${user.lastName || ''}`.trim() :
                              user.username
                          }
                        </h3>
                        <p className="text-gray-500 text-sm">@{user.username} • เข้าร่วม {new Date(user.createdAt).toLocaleDateString('th-TH')}</p>
                      </div>
                      <Badge
                        variant={user.role === 'admin' ? 'default' : user.role === 'superadmin' ? 'destructive' : 'secondary'}
                        className={
                          user.role === 'admin' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          user.role === 'superadmin' ? 'bg-red-100 text-red-800 border-red-200' :
                          user.role === 'mod' ? 'bg-green-100 text-green-800 border-green-200' :
                          'bg-purple-100 text-purple-800 border-purple-200'
                        }
                      >
                        {formatRoleName(user.role)}
                      </Badge>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-slate-600 mb-2">
                        <strong>สิทธิ์จากบทบาท:</strong>
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {getRolePermissions(user.role).map((permission) => (
                          <Badge key={permission} variant="outline" className="text-xs">
                            {formatPermissionName(permission)}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {getUserPermissions(user).length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm text-slate-600 mb-2">
                          <strong>สิทธิ์เพิ่มเติม:</strong>
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {getUserPermissions(user).map((permission) => (
                            <Badge key={permission.name} variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {formatPermissionName(permission.name)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewUserPermissions(user._id)}
                      className="flex items-center gap-2"
                    >
                      <UserCheck className="w-4 h-4" />
                      ดูสิทธิ์
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingUser(user._id)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      แก้ไขสิทธิ์
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteUser(user._id, `${user.firstName} ${user.lastName}`)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      ลบ
                    </Button>
                  </div>
                </div>

                {/* Edit Permissions Form */}
                {editingUser === user._id && (
                  <div className="border-t border-slate-200 pt-4 mt-4">
                    <h4 className="font-medium text-slate-800 mb-3">แก้ไขสิทธิ์เพิ่มเติม</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                      {availablePermissions.map((permission) => {
                        const rolePerms = getRolePermissions(user.role);
                        const userPerms = getUserPermissions(user);
                        const hasRolePermission = rolePerms.includes(permission);
                        const hasUserPermission = userPerms.some(p => p.name === permission);

                        return (
                          <label key={permission} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hasRolePermission || hasUserPermission}
                              disabled={hasRolePermission}
                              onChange={(e) => {
                                const newPerms = e.target.checked
                                  ? [...userPerms, { name: permission, grantedAt: new Date() }]
                                  : userPerms.filter(p => p.name !== permission);

                                handleEditPermissions(user._id, newPerms.map(p => p.name));
                              }}
                              className="rounded border-slate-300"
                            />
                            <span className={`text-sm ${hasRolePermission ? 'text-slate-400' : 'text-slate-700'}`}>
                              {formatPermissionName(permission)}
                              {hasRolePermission && <span className="text-xs text-slate-500 ml-1">(จากบทบาท)</span>}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEditPermissions(user._id, getUserPermissions(user).map(p => p.name))}
                      >
                        <Save className="w-4 h-4 mr-1" />
                        บันทึก
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingUser(null)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        ยกเลิก
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Role Information */}
      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            คำอธิบายบทบาทและสิทธิ์
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(rolePermissions).map(([role, data]) => (
              <div key={role} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-semibold text-slate-800">{formatRoleName(role)}</h3>
                  <Badge
                    className={
                      role === 'admin' ? 'bg-blue-100 text-blue-800' :
                      role === 'superadmin' ? 'bg-red-100 text-red-800' :
                      role === 'mod' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }
                  >
                    {role}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600 mb-3">
                  {role === 'admin' && 'ผู้ดูแลระบบทั่วไป มีสิทธิ์จัดการผู้ใช้และระบบพื้นฐาน'}
                  {role === 'mod' && 'ผู้ดูแลแชท ดูแลการสนทนาและลบข้อความที่ไม่เหมาะสม'}
                  {role === 'support' && 'ฝ่ายสนับสนุนลูกค้า ช่วยเหลือผู้ใช้และจัดการบัญชี'}
                  {role === 'superadmin' && 'ผู้ดูแลสูงสุด มีสิทธิ์เข้าถึงทุกฟังก์ชันของระบบ'}
                </p>
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">สิทธิ์ที่มี:</p>
                  <div className="flex flex-wrap gap-1">
                    {data.permissions?.map((permission) => (
                      <Badge key={permission} variant="outline" className="text-xs">
                        {formatPermissionName(permission)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Permissions Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedUser(null)}>
          <Card className="bg-white border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-slate-800 text-xl">สิทธิ์ของผู้ใช้: {selectedUser.user?.username}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedUser(null)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium text-slate-800 mb-3 text-lg">ข้อมูลผู้ใช้</h4>
                <div className="bg-slate-50 p-4 rounded-lg border">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600">ชื่อผู้ใช้</p>
                      <p className="font-medium">{selectedUser.user?.username}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">ชื่อจริง</p>
                      <p className="font-medium">
                        {selectedUser.user?.firstName && selectedUser.user?.lastName
                          ? `${selectedUser.user.firstName} ${selectedUser.user.lastName}`
                          : selectedUser.user?.firstName || selectedUser.user?.lastName || '-'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">บทบาท</p>
                      <Badge className={
                        selectedUser.user?.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                        selectedUser.user?.role === 'mod' ? 'bg-green-100 text-green-800' :
                        selectedUser.user?.role === 'support' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {formatRoleName(selectedUser.user?.role)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">อีเมล</p>
                      <p className="font-medium">{selectedUser.user?.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-slate-800 mb-3 text-lg">สิทธิ์จากบทบาท</h4>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.rolePermissions?.length > 0 ? (
                      selectedUser.rolePermissions.map((permission) => (
                        <Badge key={permission} className="bg-blue-100 text-blue-800 text-sm">
                          {formatPermissionName(permission)}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-blue-600 text-sm">ไม่มีสิทธิ์จากบทบาท</p>
                    )}
                  </div>
                </div>
              </div>

              {selectedUser.userPermissions?.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-800 mb-3 text-lg">สิทธิ์เพิ่มเติม</h4>
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.userPermissions.map((permission) => (
                        <Badge key={permission.name} className="bg-yellow-100 text-yellow-800 text-sm">
                          {formatPermissionName(permission.name)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-medium text-slate-800 mb-3 text-lg">สิทธิ์ทั้งหมดที่ใช้งานได้</h4>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.allPermissions?.length > 0 ? (
                      selectedUser.allPermissions.map((permission) => (
                        <Badge key={permission} className="bg-green-100 text-green-800 text-sm">
                          {formatPermissionName(permission)}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-green-600 text-sm">ไม่มีสิทธิ์ทั้งหมด</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Select User Modal */}
      <Dialog open={showSelectUserModal} onOpenChange={setShowSelectUserModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              เลือกสมาชิกเพื่อแต่งตั้งเป็นผู้ดูแล
            </DialogTitle>
            <DialogDescription>
              เลือกสมาชิกที่มีอยู่แล้วเพื่อแต่งตั้งเป็นผู้ดูแลระบบ
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Input
                type="text"
                placeholder="ค้นหาสมาชิกด้วยชื่อ, username, หรืออีเมล..."
                value={searchUserTerm}
                onChange={(e) => setSearchUserTerm(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                เลือกบทบาท
              </label>
              <select
                value={selectedRoleForUser}
                onChange={(e) => setSelectedRoleForUser(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="mod">ผู้ดูแลแชท (Mod)</option>
                <option value="support">ฝ่ายสนับสนุน (Support)</option>
                {currentUser?.role === 'superadmin' && (
                  <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                )}
              </select>
              {currentUser?.role === 'admin' && (
                <p className="text-xs text-slate-500 mt-1">
                  * Admin สามารถแต่งตั้งได้เฉพาะ Mod และ Support
                </p>
              )}
            </div>

            {/* User List */}
            <div className="border border-slate-200 rounded-lg max-h-96 overflow-y-auto">
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p>ไม่พบสมาชิก</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {availableUsers.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => setSelectedUserForRole(user)}
                      className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                        selectedUserForRole?._id === user._id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-gray-700">
                            {user.firstName?.charAt(0) || user.username.charAt(0)}
                            {user.lastName?.charAt(0) || user.username.charAt(1) || ''}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-slate-800">
                            {user.firstName && user.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : user.firstName || user.lastName || user.username}
                          </div>
                          <div className="text-sm text-slate-500">
                            @{user.username} • {user.email}
                          </div>
                        </div>
                        {selectedUserForRole?._id === user._id && (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button
                onClick={handleAssignRole}
                disabled={!selectedUserForRole}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                แต่งตั้งเป็น {formatRoleName(selectedRoleForUser)}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowSelectUserModal(false);
                  setSelectedUserForRole(null);
                  setSelectedRoleForUser('mod');
                  setSearchUserTerm('');
                }}
                className="flex-1"
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="bg-white border border-red-200 shadow-lg max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                ยืนยันการลบผู้ดูแลระบบ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-red-800 font-medium">คุณกำลังจะลบผู้ดูแลระบบดังต่อไปนี้:</p>
                <p className="text-red-700 mt-2">
                  <strong>ชื่อ:</strong> {userToDelete.username}
                </p>
                <p className="text-red-600 text-sm mt-2">
                  ⚠️ การลบนี้ไม่สามารถยกเลิกได้ และจะลบผู้ใช้และข้อมูลที่เกี่ยวข้องทั้งหมดออกจากระบบ
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={confirmDeleteUser}
                  className="bg-red-600 hover:bg-red-700 flex-1"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  ยืนยันการลบ
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setUserToDelete(null);
                  }}
                  className="flex-1"
                >
                  ยกเลิก
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PermissionManagement;
