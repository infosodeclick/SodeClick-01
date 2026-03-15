import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import {
  Shield,
  Crown,
  User,
  Settings,
  Database,
  Users,
  MessageCircle,
  TrendingUp,
  Activity,
  Key,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

const RoleDetails = () => {
  const roles = [
    {
      id: 'user',
      name: 'ผู้ใช้ทั่วไป',
      nameEn: 'User',
      icon: <User className="w-6 h-6" />,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      description: 'ผู้ใช้ทั่วไปที่สามารถใช้งานฟีเจอร์พื้นฐานของแพลตฟอร์ม SodeClick',
      details: 'ผู้ใช้ทั่วไปสามารถเข้าถึงแพลตฟอร์ม ส่งข้อความ อัปโหลดรูปภาพ และดูโปรไฟล์ผู้อื่นได้ แต่ไม่มีสิทธิ์ในการจัดการระบบ',
      permissions: [
        { name: 'เข้าถึงแพลตฟอร์ม', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'พื้นฐาน' },
        { name: 'ส่งข้อความ', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'การสื่อสาร' },
        { name: 'ดูโปรไฟล์ผู้อื่น', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'การสื่อสาร' },
        { name: 'อัปโหลดรูปภาพ', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'เนื้อหา' },
        { name: 'เข้าถึง Admin Dashboard', status: 'denied', icon: <XCircle className="w-4 h-4 text-red-500" />, category: 'ผู้ดูแลระบบ' },
        { name: 'จัดการผู้ใช้', status: 'denied', icon: <XCircle className="w-4 h-4 text-red-500" />, category: 'ผู้ดูแลระบบ' }
      ]
    },
    {
      id: 'premium',
      name: 'สมาชิก Premium',
      nameEn: 'Premium User',
      icon: <Crown className="w-6 h-6" />,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-800',
      description: 'ผู้ใช้ที่สมัครสมาชิกพรีเมียมเพื่อรับสิทธิพิเศษและฟีเจอร์เพิ่มเติม',
      details: 'สมาชิกพรีเมียมได้รับสิทธิพิเศษทุกอย่างที่ผู้ใช้ทั่วไปมี รวมถึงฟีเจอร์พิเศษและไม่มีโฆษณา แต่ยังไม่มีสิทธิ์ในการจัดการระบบ',
      permissions: [
        { name: 'เข้าถึงแพลตฟอร์ม', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'พื้นฐาน' },
        { name: 'ส่งข้อความ', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'การสื่อสาร' },
        { name: 'ดูโปรไฟล์ผู้อื่น', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'การสื่อสาร' },
        { name: 'อัปโหลดรูปภาพ', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'เนื้อหา' },
        { name: 'เข้าถึงฟีเจอร์พิเศษ', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'พรีเมียม' },
        { name: 'ไม่มีโฆษณา', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'พรีเมียม' },
        { name: 'เข้าถึง Admin Dashboard', status: 'denied', icon: <XCircle className="w-4 h-4 text-red-500" />, category: 'ผู้ดูแลระบบ' },
        { name: 'จัดการผู้ใช้', status: 'denied', icon: <XCircle className="w-4 h-4 text-red-500" />, category: 'ผู้ดูแลระบบ' }
      ]
    },
    {
      id: 'mod',
      name: 'ผู้ดูแลแชท',
      nameEn: 'Chat Moderator',
      icon: <MessageCircle className="w-6 h-6" />,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      description: 'ผู้ดูแลแชทที่มีหน้าที่ดูแลการสนทนาและรักษาคุณภาพของเนื้อหา',
      details: 'ผู้ดูแลแชทมีหน้าที่หลักในการดูแลการสนทนา ลบข้อความที่ไม่เหมาะสม แบนผู้ใช้ที่สร้างปัญหา และช่วยเหลือผู้ใช้ทั่วไป',
      permissions: [
        { name: 'เข้าถึงแพลตฟอร์ม', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'พื้นฐาน' },
        { name: 'ส่งข้อความ', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'การสื่อสาร' },
        { name: 'ดูโปรไฟล์ผู้อื่น', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'การสื่อสาร' },
        { name: 'จัดการข้อความ', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'ผู้ดูแลแชท' },
        { name: 'แบนผู้ใช้', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'ผู้ดูแลแชท' },
        { name: 'ลบข้อความ', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'ผู้ดูแลแชท' },
        { name: 'จัดการผู้ใช้', status: 'denied', icon: <XCircle className="w-4 h-4 text-red-500" />, category: 'ผู้ดูแลระบบ' },
        { name: 'ดูสถิติการใช้งาน', status: 'denied', icon: <XCircle className="w-4 h-4 text-red-500" />, category: 'ผู้ดูแลระบบ' }
      ]
    },
    {
      id: 'support',
      name: 'ฝ่ายสนับสนุน',
      nameEn: 'Support Staff',
      icon: <Settings className="w-6 h-6" />,
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      textColor: 'text-indigo-800',
      description: 'ฝ่ายสนับสนุนลูกค้าที่ช่วยเหลือผู้ใช้และจัดการบัญชีผู้ใช้',
      details: 'ฝ่ายสนับสนุนมีหน้าที่ช่วยเหลือผู้ใช้ทั่วไป จัดการปัญหาเกี่ยวกับบัญชี รีเซ็ตรหัสผ่าน และดูแลความพึงพอใจของผู้ใช้',
      permissions: [
        { name: 'เข้าถึงแพลตฟอร์ม', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'พื้นฐาน' },
        { name: 'ส่งข้อความ', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'การสื่อสาร' },
        { name: 'ดูโปรไฟล์ผู้อื่น', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'การสื่อสาร' },
        { name: 'จัดการผู้ใช้', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'ฝ่ายสนับสนุน' },
        { name: 'รีเซ็ตรหัสผ่าน', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'ฝ่ายสนับสนุน' },
        { name: 'ดูสถิติการใช้งาน', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'ฝ่ายสนับสนุน' },
        { name: 'จัดการห้องแชท', status: 'denied', icon: <XCircle className="w-4 h-4 text-red-500" />, category: 'ผู้ดูแลระบบ' },
        { name: 'จัดการสมาชิก Premium', status: 'denied', icon: <XCircle className="w-4 h-4 text-red-500" />, category: 'ผู้ดูแลระบบ' }
      ]
    },
    {
      id: 'admin',
      name: 'ผู้ดูแลระบบ',
      nameEn: 'Administrator',
      icon: <Shield className="w-6 h-6" />,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-800',
      description: 'ผู้ดูแลระบบที่มีสิทธิ์ในการจัดการผู้ใช้และเนื้อหาในแพลตฟอร์ม',
      details: 'ผู้ดูแลระบบมีหน้าที่จัดการผู้ใช้ทั้งหมด จัดการเนื้อหา จัดการห้องแชท ดูแลสมาชิกพรีเมียม และดูแลระบบโดยรวม',
      permissions: [
        { name: 'เข้าถึงแพลตฟอร์ม', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'พื้นฐาน' },
        { name: 'ส่งข้อความ', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'การสื่อสาร' },
        { name: 'ดูโปรไฟล์ผู้อื่น', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'การสื่อสาร' },
        { name: 'จัดการผู้ใช้', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'ผู้ดูแลระบบ' },
        { name: 'จัดการห้องแชท', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'ผู้ดูแลระบบ' },
        { name: 'จัดการสมาชิก Premium', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'ผู้ดูแลระบบ' },
        { name: 'ดูสถิติการใช้งาน', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'ผู้ดูแลระบบ' },
        { name: 'เข้าถึง SuperAdmin Panel', status: 'denied', icon: <XCircle className="w-4 h-4 text-red-500" />, category: 'ผู้ดูแลสูงสุด' }
      ]
    },
    {
      id: 'superadmin',
      name: 'ผู้ดูแลสูงสุด',
      nameEn: 'Super Administrator',
      icon: <Crown className="w-6 h-6" />,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      description: 'ผู้ดูแลระบบสูงสุดที่มีสิทธิ์เข้าถึงทุกฟีเจอร์และการตั้งค่าระบบทั้งหมด',
      details: 'ผู้ดูแลสูงสุดมีสิทธิ์เข้าถึงทุกฟีเจอร์ของระบบ รวมถึงการจัดการสิทธิ์ผู้ดูแล การตั้งค่าระบบ และการจัดการฐานข้อมูล',
      permissions: [
        { name: 'เข้าถึงแพลตฟอร์ม', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'พื้นฐาน' },
        { name: 'ส่งข้อความ', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'การสื่อสาร' },
        { name: 'ดูโปรไฟล์ผู้อื่น', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'การสื่อสาร' },
        { name: 'จัดการผู้ใช้', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'ผู้ดูแลระบบ' },
        { name: 'จัดการห้องแชท', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'ผู้ดูแลระบบ' },
        { name: 'จัดการสมาชิก Premium', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'ผู้ดูแลระบบ' },
        { name: 'ดูสถิติการใช้งาน', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'ผู้ดูแลระบบ' },
        { name: 'เข้าถึง SuperAdmin Panel', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'ผู้ดูแลสูงสุด' },
        { name: 'จัดการสิทธิ์ผู้ดูแล', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'ผู้ดูแลสูงสุด' },
        { name: 'ตั้งค่าระบบ', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'ผู้ดูแลสูงสุด' },
        { name: 'จัดการฐานข้อมูล', status: 'granted', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'ผู้ดูแลสูงสุด' }
      ]
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
          <BookOpen className="w-10 h-10 text-white" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">คู่มือบทบาทและสิทธิ์</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            เอกสารอธิบายบทบาทและสิทธิ์การเข้าถึงของผู้ใช้แต่ละประเภทในระบบ SodeClick
          </p>
        </div>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {roles.map((role) => (
          <Card key={role.id} className={`${role.bgColor} ${role.borderColor} shadow-lg hover:shadow-xl transition-all duration-300`}>
            <CardHeader className="pb-4">
              <CardTitle className={`flex items-center gap-4 text-xl ${role.textColor}`}>
                <div className={`w-12 h-12 ${role.color} rounded-lg flex items-center justify-center shadow-md`}>
                  <span className="text-white">{role.icon}</span>
                </div>
                <div className="flex-1">
                  <div className="font-bold">{role.name}</div>
                  <div className="text-sm font-normal opacity-75">({role.nameEn})</div>
                </div>
              </CardTitle>
              <p className={`text-sm ${role.textColor} opacity-80 mt-2`}>
                {role.description}
              </p>
              <p className={`text-sm ${role.textColor} opacity-70 mt-2`}>
                {role.details}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h4 className={`font-semibold ${role.textColor} flex items-center gap-2`}>
                  <Key className="w-4 h-4" />
                  สิทธิ์การเข้าถึง
                </h4>

                {/* จัดกลุ่มสิทธิ์ตามหมวดหมู่ */}
                {Object.entries(
                  role.permissions.reduce((acc, perm) => {
                    const category = perm.category;
                    if (!acc[category]) acc[category] = [];
                    acc[category].push(perm);
                    return acc;
                  }, {})
                ).map(([category, permissions]) => (
                  <div key={category} className="space-y-2">
                    <h5 className={`text-sm font-medium ${role.textColor} opacity-70 flex items-center gap-2`}>
                      <div className={`w-2 h-2 ${role.color} rounded-full`}></div>
                      {category}
                    </h5>
                    <div className="grid grid-cols-1 gap-2 ml-4">
                      {permissions.map((permission, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-white/20">
                          <div className="flex items-center gap-3">
                            {permission.icon}
                            <span className="text-sm font-medium text-slate-700">{permission.name}</span>
                          </div>
                          <Badge
                            variant={permission.status === 'granted' ? 'default' : 'secondary'}
                            className={permission.status === 'granted' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                          >
                            {permission.status === 'granted' ? 'อนุญาต' : 'ไม่อนุญาต'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Permission Matrix */}
      <Card className="bg-white border border-slate-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            ตารางสิทธิ์การเข้าถึงแบบเปรียบเทียบ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-4 font-semibold text-slate-800">สิทธิ์การเข้าถึง</th>
                  <th className="text-center p-4 font-semibold text-slate-800">ผู้ใช้ทั่วไป</th>
                  <th className="text-center p-4 font-semibold text-slate-800">สมาชิก Premium</th>
                  <th className="text-center p-4 font-semibold text-slate-800">ผู้ดูแลแชท</th>
                  <th className="text-center p-4 font-semibold text-slate-800">ฝ่ายสนับสนุน</th>
                  <th className="text-center p-4 font-semibold text-slate-800">ผู้ดูแลระบบ</th>
                  <th className="text-center p-4 font-semibold text-slate-800">ผู้ดูแลสูงสุด</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="p-4 font-medium text-slate-700">เข้าถึงแพลตฟอร์ม</td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-4 font-medium text-slate-700">ส่งข้อความ</td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-4 font-medium text-slate-700">ดูโปรไฟล์ผู้อื่น</td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-4 font-medium text-slate-700">อัปโหลดรูปภาพ</td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-4 font-medium text-slate-700">ฟีเจอร์พิเศษ</td>
                  <td className="p-4 text-center"><XCircle className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><XCircle className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="p-4 text-center"><XCircle className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-4 font-medium text-slate-700">ไม่มีโฆษณา</td>
                  <td className="p-4 text-center"><XCircle className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><XCircle className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="p-4 text-center"><XCircle className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-4 font-medium text-slate-700">Admin Dashboard</td>
                  <td className="p-4 text-center"><XCircle className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="p-4 text-center"><XCircle className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="p-4 text-center"><XCircle className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="p-4 text-center"><XCircle className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-4 font-medium text-slate-700">จัดการผู้ใช้</td>
                  <td className="p-4 text-center"><XCircle className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="p-4 text-center"><XCircle className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="p-4 text-center"><XCircle className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-slate-700">SuperAdmin Panel</td>
                  <td className="p-4 text-center"><XCircle className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="p-4 text-center"><XCircle className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="p-4 text-center"><XCircle className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="p-4 text-center"><XCircle className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="p-4 text-center"><XCircle className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Card className="bg-amber-50 border border-amber-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            หมายเหตุสำคัญ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-amber-800">
              <strong>การจัดการสิทธิ์:</strong> การเปลี่ยนแปลงบทบาทและสิทธิ์ควรได้รับการอนุมัติจากผู้ดูแลสูงสุดเท่านั้น
            </p>
          </div>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-amber-800">
              <strong>ความปลอดภัย:</strong> ผู้ใช้ที่มีบทบาทสูงควรเก็บรักษาข้อมูลการเข้าสู่ระบบอย่างปลอดภัย
            </p>
          </div>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-amber-800">
              <strong>การตรวจสอบ:</strong> การดำเนินการทั้งหมดของผู้ดูแลระบบจะถูกบันทึกในระบบเพื่อการตรวจสอบ
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleDetails;
