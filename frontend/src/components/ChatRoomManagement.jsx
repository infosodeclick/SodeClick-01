import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { useToast } from './ui/toast';
import {
  Trash2,
  Plus,
  Search,
  MessageSquare,
  Users,
  Clock,
  Edit,
  X,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

const ChatRoomManagement = () => {
  const { success, error, warning } = useToast();
  const [chatRooms, setChatRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingRooms, setDeletingRooms] = useState(new Set());
  const [newRoom, setNewRoom] = useState({
    name: '',
    description: '',
    type: 'group'
  });

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    fetchChatRooms();
  }, [page]);

  const fetchChatRooms = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      let url = `${API_BASE_URL}/api/admin/chatrooms?page=${page}&limit=20`;
      
      if (searchTerm.trim()) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setChatRooms(data.chatRooms || []);
        setTotalPages(data.pagination?.pages || 1);
      } else {
        const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Failed to fetch chat rooms:', errorData);
        error(errorData.message || 'ไม่สามารถดึงข้อมูลห้องแชทได้');
      }
    } catch (err) {
      console.error('Error fetching chat rooms:', err);
      error('เกิดข้อผิดพลาดในการดึงข้อมูลห้องแชท');
    } finally {
      setIsLoading(false);
    }
  };

  const createChatRoom = async () => {
    if (!newRoom.name.trim()) {
      error('กรุณากรอกชื่อห้องแชท');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_BASE_URL}/api/admin/chatrooms/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newRoom)
      });

      if (res.ok) {
        success('สร้างห้องแชทสำเร็จ');
        setShowCreateModal(false);
        setNewRoom({ name: '', description: '', type: 'group' });
        fetchChatRooms();
      } else {
        const data = await res.json();
        error(data.message || 'ไม่สามารถสร้างห้องแชทได้');
      }
    } catch (err) {
      console.error('Error creating chat room:', err);
      error('เกิดข้อผิดพลาดในการสร้างห้องแชท');
    }
  };

  const deleteChatRoom = async (roomId) => {
    if (!window.confirm('คุณต้องการลบห้องแชทนี้หรือไม่? ข้อความทั้งหมดในห้องจะถูกลบด้วย')) {
      return;
    }

    try {
      setDeletingRooms(prev => new Set(prev).add(roomId));
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_BASE_URL}/api/admin/chatrooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        success('ลบห้องแชทสำเร็จ');
        setChatRooms(prev => prev.filter(room => room._id !== roomId));
        fetchChatRooms();
      } else {
        const data = await res.json();
        error(data.message || 'ไม่สามารถลบห้องแชทได้');
      }
    } catch (err) {
      console.error('Error deleting chat room:', err);
      error('เกิดข้อผิดพลาดในการลบห้องแชท');
    } finally {
      setDeletingRooms(prev => {
        const newSet = new Set(prev);
        newSet.delete(roomId);
        return newSet;
      });
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'ไม่ระบุ';
    const date = new Date(timestamp);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredRooms = chatRooms.filter(room =>
    room.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">จัดการห้องแชทและข้อความ</h2>
          <p className="text-slate-600 mt-1">จัดการห้องแชท ลบห้องแชท และสร้างห้องแชทสำหรับ admin</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          สร้างห้องแชทใหม่
        </Button>
      </div>

      {/* Search Section */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex-1 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="ค้นหาห้องแชท..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={fetchChatRooms}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Chat Rooms List */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            ห้องแชท ({filteredRooms.length} รายการ)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">ไม่พบห้องแชท</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRooms.map((room) => (
                <div
                  key={room._id}
                  className="p-4 border border-gray-200 rounded-lg bg-white hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <MessageSquare className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-semibold text-slate-800 text-lg">
                          {room.name || 'ไม่มีชื่อ'}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          room.type === 'public' 
                            ? 'bg-blue-100 text-blue-700'
                            : room.type === 'group'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {room.type === 'public' ? 'สาธารณะ' : room.type === 'group' ? 'กลุ่ม' : 'ส่วนตัว'}
                        </span>
                        {room.isPaidRoom && (
                          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">
                            Paid Room ({room.entryFee} coins)
                          </span>
                        )}
                      </div>
                      
                      {room.description && (
                        <p className="text-slate-600 mb-2">{room.description}</p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        {room.participants && (
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {room.participants.length} สมาชิก
                          </div>
                        )}
                        {(room.createdBy || room.owner) && (
                          <div className="flex items-center gap-1">
                            <span>สร้างโดย:</span>
                            <span className="font-medium">
                              {room.createdBy?.displayName || room.createdBy?.username || 
                               room.owner?.displayName || room.owner?.username || 'ไม่ทราบ'}
                            </span>
                          </div>
                        )}
                        {room.createdAt && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatTime(room.createdAt)}
                          </div>
                        )}
                        {room.lastMessageAt && (
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            ข้อความล่าสุด: {formatTime(room.lastMessageAt)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteChatRoom(room._id)}
                      disabled={deletingRooms.has(room._id)}
                      className="flex-shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      {deletingRooms.has(room._id) ? (
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

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>สร้างห้องแชทใหม่</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อห้องแชท <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  placeholder="กรุณากรอกชื่อห้องแชท"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  คำอธิบาย
                </label>
                <textarea
                  value={newRoom.description}
                  onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                  placeholder="กรุณากรอกคำอธิบาย (ไม่บังคับ)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ประเภทห้อง
                </label>
                <select
                  value={newRoom.type}
                  onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="group">กลุ่ม</option>
                  <option value="public">สาธารณะ</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewRoom({ name: '', description: '', type: 'group' });
                  }}
                >
                  ยกเลิก
                </Button>
                <Button
                  onClick={createChatRoom}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  สร้างห้อง
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ChatRoomManagement;

