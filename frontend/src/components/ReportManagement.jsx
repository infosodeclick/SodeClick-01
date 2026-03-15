import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from './ui/toast';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  MessageSquare,
  Filter,
  Search,
  RefreshCw,
  Eye,
  User,
  Calendar,
  Tag,
  Send,
  UserCheck,
  AlertTriangle,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';

const ReportManagement = () => {
  const { success, error, warning } = useToast();
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    rejected: 0,
    closed: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
    search: ''
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [adminResponse, setAdminResponse] = useState('');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [deletingReportId, setDeletingReportId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);

  const categories = {
    'membership_upgrade': 'อัพเกรดแล้ว tier ไม่ขึ้น',
    'user_harassment': 'บล็อก user ที่มากวน',
    'payment_issue': 'ปัญหาการชำระเงิน',
    'technical_issue': 'ปัญหาทางเทคนิค',
    'bug_report': 'รายงาน bug',
    'feature_request': 'ขอฟีเจอร์ใหม่',
    'account_issue': 'ปัญหาบัญชี',
    'other': 'อื่นๆ'
  };

  const statusColors = {
    'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'in_progress': 'bg-blue-100 text-blue-800 border-blue-200',
    'resolved': 'bg-green-100 text-green-800 border-green-200',
    'rejected': 'bg-red-100 text-red-800 border-red-200',
    'closed': 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const priorityColors = {
    'low': 'bg-gray-100 text-gray-800',
    'medium': 'bg-blue-100 text-blue-800',
    'high': 'bg-orange-100 text-orange-800',
    'urgent': 'bg-red-100 text-red-800'
  };

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });

      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.search) params.append('search', filters.search);

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/reports?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        const fetchedReports = data.data || [];
        setReports(fetchedReports);
        setTotalPages(data.pagination?.pages || 1);
        if (data.stats) {
          setStats(data.stats);
        }
        
        // ตรวจสอบ sessionStorage เพื่อเปิด report detail อัตโนมัติ
        const openReportId = sessionStorage.getItem('openReportId');
        if (openReportId) {
          sessionStorage.removeItem('openReportId'); // ลบหลังจากใช้แล้ว
          const report = fetchedReports.find(r => r._id === openReportId || r._id?.toString() === openReportId);
          if (report) {
            setTimeout(() => {
              setSelectedReport(report);
              setShowDetailModal(true);
            }, 300);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
      error('เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/reports/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          setStats({
            total: data.data.total || 0,
            pending: data.data.pending || 0,
            inProgress: data.data.inProgress || 0,
            resolved: data.data.resolved || 0,
            rejected: data.data.rejected || 0,
            closed: data.data.closed || 0
          });
        }
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    // ตรวจสอบว่า user เป็น superadmin หรือไม่
    const checkSuperAdmin = () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          setIsSuperAdmin(user.role === 'superadmin');
        } catch (err) {
          console.error('Error parsing user data:', err);
        }
      }
    };
    
    checkSuperAdmin();
    fetchReports();
    fetchStats();
  }, [page, filters]);

  const handleViewReport = async (report) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/reports/${report._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedReport(data.data);
        setShowDetailModal(true);
        setAdminResponse(data.data.adminResponse || '');
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      error('เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน');
    }
  };

  const handleUpdateStatus = async (reportId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/reports/${reportId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          adminResponse: adminResponse || undefined
        })
      });

      if (res.ok) {
        success('อัพเดทสถานะรายงานสำเร็จ');
        setShowDetailModal(false);
        setSelectedReport(null);
        setAdminResponse('');
        fetchReports();
        fetchStats();
      } else {
        const data = await res.json();
        throw new Error(data.message || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      error(err.message || 'เกิดข้อผิดพลาดในการอัพเดทสถานะ');
    }
  };

  const handleSubmitResponse = async () => {
    if (!selectedReport || !adminResponse.trim()) {
      error('กรุณากรอกคำตอบ');
      return;
    }

    setIsSubmittingResponse(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/reports/${selectedReport._id}/response`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ adminResponse: adminResponse.trim() })
      });

      if (res.ok) {
        success('เพิ่มคำตอบสำเร็จ');
        setShowDetailModal(false);
        setSelectedReport(null);
        setAdminResponse('');
        fetchReports();
        fetchStats();
      } else {
        const data = await res.json();
        throw new Error(data.message || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      console.error('Error submitting response:', err);
      error(err.message || 'เกิดข้อผิดพลาดในการเพิ่มคำตอบ');
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDeleteClick = (report, e) => {
    e.stopPropagation();
    setReportToDelete(report);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!reportToDelete) return;
    
    const reportId = reportToDelete._id;
    setDeletingReportId(reportId);
    setShowDeleteConfirm(false);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/reports/${reportId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        success('ลบรายงานสำเร็จ');
        fetchReports();
        fetchStats();
        if (selectedReport && selectedReport._id === reportId) {
          setShowDetailModal(false);
          setSelectedReport(null);
        }
      } else {
        const data = await res.json();
        throw new Error(data.message || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      console.error('Error deleting report:', err);
      error(err.message || 'เกิดข้อผิดพลาดในการลบรายงาน');
    } finally {
      setDeletingReportId(null);
      setReportToDelete(null);
    }
  };

  if (isLoading && reports.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">ทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-800">รอดำเนินการ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-900">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">กำลังดำเนินการ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800">แก้ไขแล้ว</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{stats.resolved}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-800">ปฏิเสธ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">{stats.rejected}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-800">ปิดแล้ว</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.closed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            กรองข้อมูล
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>สถานะ</Label>
              <select
                value={filters.status}
                onChange={(e) => {
                  setFilters({ ...filters, status: e.target.value });
                  setPage(1);
                }}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">ทั้งหมด</option>
                <option value="pending">รอดำเนินการ</option>
                <option value="in_progress">กำลังดำเนินการ</option>
                <option value="resolved">แก้ไขแล้ว</option>
                <option value="rejected">ปฏิเสธ</option>
                <option value="closed">ปิดแล้ว</option>
              </select>
            </div>
            <div>
              <Label>ประเภท</Label>
              <select
                value={filters.category}
                onChange={(e) => {
                  setFilters({ ...filters, category: e.target.value });
                  setPage(1);
                }}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">ทั้งหมด</option>
                {Object.entries(categories).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>ความสำคัญ</Label>
              <select
                value={filters.priority}
                onChange={(e) => {
                  setFilters({ ...filters, priority: e.target.value });
                  setPage(1);
                }}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">ทั้งหมด</option>
                <option value="low">ต่ำ</option>
                <option value="medium">ปานกลาง</option>
                <option value="high">สูง</option>
                <option value="urgent">ด่วน</option>
              </select>
            </div>
            <div>
              <Label>ค้นหา</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="ค้นหาหัวข้อหรือรายละเอียด..."
                  value={filters.search}
                  onChange={(e) => {
                    setFilters({ ...filters, search: e.target.value });
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>รายงานปัญหา</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchReports();
                fetchStats();
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              รีเฟรช
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">ไม่พบรายงาน</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report._id}
                  className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewReport(report)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-800">{report.title}</h3>
                        <Badge className={statusColors[report.status]}>
                          {report.status === 'pending' && 'รอดำเนินการ'}
                          {report.status === 'in_progress' && 'กำลังดำเนินการ'}
                          {report.status === 'resolved' && 'แก้ไขแล้ว'}
                          {report.status === 'rejected' && 'ปฏิเสธ'}
                          {report.status === 'closed' && 'ปิดแล้ว'}
                        </Badge>
                        <Badge className={priorityColors[report.priority]}>
                          {report.priority === 'low' && 'ต่ำ'}
                          {report.priority === 'medium' && 'ปานกลาง'}
                          {report.priority === 'high' && 'สูง'}
                          {report.priority === 'urgent' && 'ด่วน'}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2 line-clamp-2">{report.description}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {categories[report.category] || report.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {report.reportedBy?.username || 'ไม่ทราบ'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(report.createdAt)}
                        </span>
                        {report.attachments && report.attachments.length > 0 && (
                          <span className="flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" />
                            {report.attachments.length} รูป
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewReport(report);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        ดูรายละเอียด
                      </Button>
                      {isSuperAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                          onClick={(e) => handleDeleteClick(report, e)}
                          disabled={deletingReportId === report._id}
                        >
                          {deletingReportId === report._id ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              กำลังลบ...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-2" />
                              ลบ
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                ก่อนหน้า
              </Button>
              <span className="flex items-center px-4">
                หน้า {page} จาก {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                ถัดไป
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Detail Modal */}
      {selectedReport && (
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                รายละเอียดรายงาน
              </DialogTitle>
              <DialogDescription>
                ดูและจัดการรายละเอียดรายงานปัญหา
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>สถานะ</Label>
                  <Badge className={statusColors[selectedReport.status]}>
                    {selectedReport.status === 'pending' && 'รอดำเนินการ'}
                    {selectedReport.status === 'in_progress' && 'กำลังดำเนินการ'}
                    {selectedReport.status === 'resolved' && 'แก้ไขแล้ว'}
                    {selectedReport.status === 'rejected' && 'ปฏิเสธ'}
                    {selectedReport.status === 'closed' && 'ปิดแล้ว'}
                  </Badge>
                </div>
                <div>
                  <Label>ความสำคัญ</Label>
                  <Badge className={priorityColors[selectedReport.priority]}>
                    {selectedReport.priority === 'low' && 'ต่ำ'}
                    {selectedReport.priority === 'medium' && 'ปานกลาง'}
                    {selectedReport.priority === 'high' && 'สูง'}
                    {selectedReport.priority === 'urgent' && 'ด่วน'}
                  </Badge>
                </div>
              </div>

              <div>
                <Label>ประเภทปัญหา</Label>
                <p className="text-slate-700">{categories[selectedReport.category] || selectedReport.category}</p>
              </div>

              <div>
                <Label>หัวข้อ</Label>
                <p className="text-slate-700 font-semibold">{selectedReport.title}</p>
              </div>

              <div>
                <Label>รายละเอียด</Label>
                <p className="text-slate-700 whitespace-pre-wrap">{selectedReport.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ผู้รายงาน</Label>
                  <p className="text-slate-700">{selectedReport.reportedBy?.username || 'ไม่ทราบ'}</p>
                </div>
                <div>
                  <Label>วันที่รายงาน</Label>
                  <p className="text-slate-700">{formatDate(selectedReport.createdAt)}</p>
                </div>
              </div>

              {selectedReport.attachments && selectedReport.attachments.length > 0 && (
                <div>
                  <Label>รูปภาพที่แนบมา</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                    {selectedReport.attachments.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={imageUrl}
                          alt={`Attachment ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(imageUrl, '_blank')}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded-lg flex items-center justify-center">
                          <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedReport.adminResponse && (
                <div>
                  <Label>คำตอบจาก Admin</Label>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-1">
                    <p className="text-slate-700 whitespace-pre-wrap">{selectedReport.adminResponse}</p>
                    {selectedReport.respondedAt && (
                      <p className="text-xs text-slate-500 mt-2">
                        ตอบเมื่อ: {formatDate(selectedReport.respondedAt)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <Label>คำตอบจาก Admin</Label>
                <textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="กรอกคำตอบหรือวิธีแก้ไข..."
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg min-h-[100px]"
                  maxLength={2000}
                />
                <p className="text-xs text-slate-500 mt-1">{adminResponse.length}/2000 ตัวอักษร</p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSubmitResponse}
                  disabled={isSubmittingResponse || !adminResponse.trim()}
                  className="flex-1"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmittingResponse ? 'กำลังส่ง...' : 'ส่งคำตอบ'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleUpdateStatus(selectedReport._id, 'in_progress')}
                  disabled={selectedReport.status === 'in_progress'}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  กำลังดำเนินการ
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleUpdateStatus(selectedReport._id, 'resolved')}
                  disabled={selectedReport.status === 'resolved'}
                  className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  แก้ไขแล้ว
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleUpdateStatus(selectedReport._id, 'closed')}
                  disabled={selectedReport.status === 'closed'}
                  className="bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  ปิด
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              ยืนยันการลบรายงาน
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              คุณแน่ใจหรือไม่ว่าต้องการลบรายงานนี้?
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            {reportToDelete && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-semibold text-red-800 text-sm mb-1">รายงานที่จะถูกลบ:</p>
                <p className="text-red-700 text-sm">{reportToDelete.title}</p>
              </div>
            )}
            <p className="text-red-600 font-medium">⚠️ การกระทำนี้ไม่สามารถยกเลิกได้</p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setReportToDelete(null);
              }}
              className="w-full sm:w-auto"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deletingReportId !== null}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
            >
              {deletingReportId ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  กำลังลบ...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  ลบรายงาน
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportManagement;

