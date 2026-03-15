import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { useToast } from './ui/toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from './ui/dialog';
import {
  Trash2,
  Filter,
  Search,
  MessageCircle,
  User,
  Clock,
  AlertTriangle,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const PublicMessageManagement = () => {
  const { success, error, warning } = useToast();
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deletingMessages, setDeletingMessages] = useState(new Set());
  const [messageIdToDelete, setMessageIdToDelete] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const filterOptions = [
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'inappropriate', label: 'ข้อความล่อแหลม คุกคาม' },
    { value: 'obscene', label: 'ข้อความลามก' },
    { value: 'discriminatory', label: 'ข้อความเหยียด เสียดสี และ บูลลี่' }
  ];

  useEffect(() => {
    fetchMessages();
  }, [page, selectedFilter]);

  useEffect(() => {
    filterMessages();
  }, [messages, searchTerm, selectedFilter]);

  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      let url = `${API_BASE_URL}/api/admin/messages/public?page=${page}&limit=50`;
      
      if (selectedFilter !== 'all') {
        url += `&filter=${selectedFilter}`;
      }

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setTotalPages(data.pagination?.pages || 1);
      } else {
        error('ไม่สามารถดึงข้อมูลข้อความได้');
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      error('เกิดข้อผิดพลาดในการดึงข้อมูลข้อความ');
    } finally {
      setIsLoading(false);
    }
  };

  const filterMessages = () => {
    let filtered = [...messages];

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(msg =>
        msg.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.sender?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.sender?.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredMessages(filtered);
  };

  const handleDeleteClick = (messageId) => {
    setMessageIdToDelete(messageId);
    setShowConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!messageIdToDelete) return;

    try {
      setDeletingMessages(prev => new Set(prev).add(messageIdToDelete));
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_BASE_URL}/api/admin/messages/${messageIdToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        success('ลบข้อความสำเร็จ');
        // Remove from local state
        setMessages(prev => prev.filter(msg => msg._id !== messageIdToDelete));
        fetchMessages(); // Refresh list
      } else {
        const data = await res.json();
        error(data.message || 'ไม่สามารถลบข้อความได้');
      }
    } catch (err) {
      console.error('Error deleting message:', err);
      error('เกิดข้อผิดพลาดในการลบข้อความ');
    } finally {
      setDeletingMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageIdToDelete);
        return newSet;
      });
      setShowConfirmDialog(false);
      setMessageIdToDelete(null);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">จัดการข้อความสาธารณะ</h2>
          <p className="text-slate-600 mt-1">จัดการและลบข้อความต่างๆ ที่ส่งมาในแชทสาธารณะ</p>
        </div>
      </div>

      {/* Search and Filter Section */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex-1 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="ค้นหาข้อความหรือชื่อผู้ใช้..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filter
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              onClick={fetchMessages}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </Button>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={selectedFilter === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedFilter(option.value);
                    setPage(1);
                  }}
                  className={
                    selectedFilter === option.value
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : ''
                  }
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Messages List */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-800 flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            ข้อความ ({filteredMessages.length} รายการ)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">ไม่พบข้อความ</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMessages.map((message) => (
                <div
                  key={message._id}
                  className={`p-4 border rounded-lg transition-all ${
                    message.isDeleted
                      ? 'bg-gray-50 border-gray-200 opacity-60'
                      : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          {message.sender?.profileImages?.[0] ? (
                            <img
                              src={message.sender.profileImages[0]}
                              alt={message.sender.username}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-500" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-800">
                              {message.sender?.displayName || message.sender?.username || 'ไม่ทราบชื่อ'}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {message.isDeleted ? (
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                          <p className="text-red-600 font-medium flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            ถูกลบโดยผู้ดูแลระบบ
                          </p>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <p className="text-slate-700 whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                          {message.messageType === 'image' && message.fileInfo?.fileUrl && (
                            <img
                              src={message.fileInfo.fileUrl}
                              alt="Message attachment"
                              className="mt-2 max-w-md rounded-lg"
                            />
                          )}
                        </div>
                      )}
                    </div>
                    
                    {!message.isDeleted && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(message._id)}
                        disabled={deletingMessages.has(message._id)}
                        className="flex-shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      >
                        {deletingMessages.has(message._id) ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
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
              ))}
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <CardContent className="pt-0">
            <div className="flex justify-center items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
              >
                ก่อนหน้า
              </Button>
              <span className="text-sm text-gray-600">
                หน้า {page} จาก {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
              >
                ถัดไป
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              ยืนยันการลบข้อความ
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              คุณต้องการลบข้อความนี้หรือไม่? ข้อความจะแสดงเป็น "ถูกลบโดยผู้ดูแลระบบ" ในห้องแชทสาธารณะ
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setMessageIdToDelete(null);
              }}
              className="w-full sm:w-auto"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deletingMessages.has(messageIdToDelete)}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
            >
              {deletingMessages.has(messageIdToDelete) ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  กำลังลบ...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  ลบข้อความ
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicMessageManagement;

