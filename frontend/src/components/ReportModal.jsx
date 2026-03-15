import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from './ui/toast';
import { AlertCircle, Send, X, Image as ImageIcon, XCircle } from 'lucide-react';

const ReportModal = ({ isOpen, onClose, defaultCategory = null, relatedUserId = null }) => {
  const { success, error } = useToast();
  const [formData, setFormData] = useState({
    category: defaultCategory || '',
    title: '',
    description: '',
    relatedUserId: relatedUserId || null,
    attachments: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const fileInputRef = useRef(null);

  const categories = [
    { value: 'membership_upgrade', label: 'อัพเกรดแล้ว tier ไม่ขึ้น' },
    { value: 'user_harassment', label: 'บล็อก user ที่มากวน' },
    { value: 'payment_issue', label: 'ปัญหาการชำระเงิน' },
    { value: 'technical_issue', label: 'ปัญหาทางเทคนิค' },
    { value: 'bug_report', label: 'รายงาน bug' },
    { value: 'feature_request', label: 'ขอฟีเจอร์ใหม่' },
    { value: 'account_issue', label: 'ปัญหาบัญชี' },
    { value: 'other', label: 'อื่นๆ' }
  ];

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;

    // ตรวจสอบจำนวนรูปภาพ (สูงสุด 5 รูป)
    if (uploadedImages.length + files.length > 5) {
      error('สามารถแนบรูปภาพได้สูงสุด 5 รูป');
      return;
    }

    setUploadingImages(true);
    const token = localStorage.getItem('token');

    try {
      const uploadPromises = files.map(async (file) => {
        // ตรวจสอบขนาดไฟล์ (10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`ไฟล์ ${file.name} มีขนาดใหญ่เกินไป (สูงสุด 10MB)`);
        }

        const formData = new FormData();
        formData.append('image', file);

        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/reports/upload-image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || 'อัปโหลดรูปภาพไม่สำเร็จ');
        }

        return data.data.imageUrl;
      });

      const imageUrls = await Promise.all(uploadPromises);
      setUploadedImages([...uploadedImages, ...imageUrls]);
      success(`อัปโหลดรูปภาพสำเร็จ ${imageUrls.length} รูป`);
    } catch (err) {
      console.error('Error uploading images:', err);
      error(err.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
    } finally {
      setUploadingImages(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.category || !formData.title || !formData.description) {
      error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (formData.description.length < 10) {
      error('กรุณาระบุรายละเอียดปัญหาอย่างน้อย 10 ตัวอักษร');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/reports`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          attachments: uploadedImages
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        success('ส่งรายงานสำเร็จ เราจะดำเนินการตรวจสอบและติดต่อกลับโดยเร็วที่สุด');
        setFormData({
          category: defaultCategory || '',
          title: '',
          description: '',
          relatedUserId: relatedUserId || null,
          attachments: []
        });
        setUploadedImages([]);
        onClose();
      } else {
        throw new Error(data.message || 'เกิดข้อผิดพลาดในการส่งรายงาน');
      }
    } catch (err) {
      console.error('Error submitting report:', err);
      error(err.message || 'เกิดข้อผิดพลาดในการส่งรายงาน');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            แจ้งปัญหา / รายงาน
          </DialogTitle>
          <DialogDescription>
            กรุณาระบุรายละเอียดปัญหาที่พบ เราจะดำเนินการตรวจสอบและติดต่อกลับโดยเร็วที่สุด
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="category" className="text-sm font-medium text-slate-700">
              ประเภทปัญหา <span className="text-red-500">*</span>
            </Label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">เลือกประเภทปัญหา</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="title" className="text-sm font-medium text-slate-700">
              หัวข้อ <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="ระบุหัวข้อปัญหาสั้นๆ"
              className="mt-1"
              maxLength={200}
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              {formData.title.length}/200 ตัวอักษร
            </p>
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium text-slate-700">
              รายละเอียดปัญหา <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="กรุณาระบุรายละเอียดปัญหาอย่างชัดเจน เช่น เกิดเมื่อไหร่, ทำอะไรอยู่, มีข้อความ error อะไรบ้าง"
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[120px] resize-y"
              maxLength={5000}
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              {formData.description.length}/5000 ตัวอักษร (อย่างน้อย 10 ตัวอักษร)
            </p>
          </div>

          {formData.category === 'user_harassment' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <strong>หมายเหตุ:</strong> หากต้องการรายงานผู้ใช้ที่มากวน กรุณาระบุ username หรือ ID ของผู้ใช้ที่ต้องการรายงานในรายละเอียดปัญหา
              </p>
            </div>
          )}

          {formData.category === 'membership_upgrade' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>หมายเหตุ:</strong> กรุณาระบุวันที่อัพเกรด, แพ็คเกจที่ซื้อ, และจำนวนเงินที่ชำระในรายละเอียดปัญหา
              </p>
            </div>
          )}

          {/* Image Upload Section */}
          <div>
            <Label htmlFor="images" className="text-sm font-medium text-slate-700">
              แนบรูปภาพ (ไม่บังคับ)
            </Label>
            <div className="mt-2 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  id="images"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  multiple
                  onChange={handleImageUpload}
                  disabled={uploadingImages || uploadedImages.length >= 5}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImages || uploadedImages.length >= 5}
                  className="flex items-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  {uploadingImages ? 'กำลังอัปโหลด...' : 'เลือกรูปภาพ'}
                </Button>
                <span className="text-xs text-slate-500">
                  {uploadedImages.length}/5 รูป (สูงสุด 10MB ต่อรูป)
                </span>
              </div>

              {/* Preview uploaded images */}
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {uploadedImages.map((imageUrl, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={imageUrl}
                        alt={`Uploaded ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="ลบรูปภาพ"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              ยกเลิก
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.category || !formData.title || !formData.description}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  กำลังส่ง...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  ส่งรายงาน
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReportModal;

