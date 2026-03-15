const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Cloudinary
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret
});

// ตรวจสอบว่า Cloudinary พร้อมใช้งานหรือไม่
const isCloudinaryConfigured = () => {
  const configured = !!(cloudName && cloudName !== 'your-cloud-name' && 
                        apiSecret && apiSecret !== 'your-api-secret');
  
  if (!configured) {
    console.warn('⚠️ Cloudinary not configured - using local storage fallback');
    console.warn('📝 Set CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_SECRET in environment variables');
  } else {
    console.log('☁️ Cloudinary configured successfully');
  }
  
  return configured;
};

// เปิดใช้งาน Cloudinary
const CLOUDINARY_ENABLED = isCloudinaryConfigured();

// Local disk storage สำหรับ fallback
const localDiskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = req.params.userId || req.params.id;
    const userUploadPath = path.join(__dirname, '..', 'uploads', 'users', userId);
    
    // สร้างโฟลเดอร์ถ้ายังไม่มี
    if (!fs.existsSync(userUploadPath)) {
      fs.mkdirSync(userUploadPath, { recursive: true });
      console.log('📁 Created user upload directory:', userUploadPath);
    }
    
    cb(null, userUploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Create Cloudinary storage for profile images
const cloudinaryProfileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'love-app/profiles', // โฟลเดอร์ใน Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      {
        width: 1200,
        height: 1200,
        crop: 'limit', // จำกัดขนาดสูงสุด ไม่ crop
        quality: 'auto:good', // ปรับ quality อัตโนมัติ
        fetch_format: 'auto' // แปลงเป็น WebP ถ้าเบราว์เซอร์รองรับ
      }
    ],
    // สร้างชื่อไฟล์แบบ unique
    public_id: (req, file) => {
      const userId = req.params.userId || req.params.id;
      const timestamp = Date.now();
      const randomStr = Math.round(Math.random() * 1E9);
      return `${userId}/profile-${timestamp}-${randomStr}`;
    }
  }
});

// ใช้ Cloudinary ถ้า configured, ไม่งั้นใช้ local storage
const profileImageStorage = CLOUDINARY_ENABLED ? cloudinaryProfileStorage : localDiskStorage;

// Create Cloudinary storage for chat files
const chatFileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'love-app/chat-files',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      {
        width: 800,
        height: 800,
        crop: 'limit',
        quality: 'auto:good',
        fetch_format: 'auto'
      }
    ],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const randomStr = Math.round(Math.random() * 1E9);
      return `chat-${timestamp}-${randomStr}`;
    }
  }
});

// Local disk storage for report images (fallback)
const localReportImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const reportUploadsPath = path.join(__dirname, '..', 'uploads', 'reports');
    
    // สร้างโฟลเดอร์ถ้ายังไม่มี
    if (!fs.existsSync(reportUploadsPath)) {
      fs.mkdirSync(reportUploadsPath, { recursive: true });
      console.log('📁 Created report uploads directory:', reportUploadsPath);
    }
    
    cb(null, reportUploadsPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'report-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Create Cloudinary storage for report images
const cloudinaryReportImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'love-app/reports',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      {
        width: 1200,
        height: 1200,
        crop: 'limit',
        quality: 'auto:good',
        fetch_format: 'auto'
      }
    ],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const randomStr = Math.round(Math.random() * 1E9);
      return `report-${timestamp}-${randomStr}`;
    }
  }
});

// ใช้ Cloudinary ถ้า configured, ไม่งั้นใช้ local storage
const reportImageStorage = CLOUDINARY_ENABLED ? cloudinaryReportImageStorage : localReportImageStorage;

/**
 * Delete image from Cloudinary
 * @param {string} publicId - The public ID of the image (e.g., "love-app/profiles/userId/profile-123")
 * @returns {Promise<Object>} - Result of deletion
 */
const deleteImage = async (publicId) => {
  try {
    console.log('🗑️ Deleting image from Cloudinary:', publicId);
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('✅ Cloudinary deletion result:', result);
    return result;
  } catch (error) {
    console.error('❌ Error deleting from Cloudinary:', error);
    throw error;
  }
};

/**
 * Extract public_id from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string} - Public ID
 */
const getPublicIdFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  
  // Example URL: https://res.cloudinary.com/cloud-name/image/upload/v1234567890/love-app/profiles/userId/profile-123.jpg
  try {
    // Extract path after /upload/
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
    if (match && match[1]) {
      const publicId = match[1];
      console.log('📋 Extracted public_id:', publicId);
      return publicId;
    }
    
    // If URL doesn't match pattern, try to extract from path
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/upload/');
    if (pathParts.length > 1) {
      // Remove version prefix (v1234567890) and file extension
      const publicId = pathParts[1]
        .replace(/^v\d+\//, '')
        .replace(/\.\w+$/, '');
      console.log('📋 Extracted public_id (fallback):', publicId);
      return publicId;
    }
  } catch (error) {
    console.error('❌ Error extracting public_id:', error);
  }
  
  return null;
};

/**
 * Get optimized image URL with transformations
 * @param {string} publicId - Public ID of the image
 * @param {Object} options - Transformation options
 * @returns {string} - Optimized image URL
 */
const getOptimizedImageUrl = (publicId, options = {}) => {
  const defaultOptions = {
    width: 400,
    height: 400,
    crop: 'fill',
    quality: 'auto:good',
    fetch_format: 'auto'
  };
  
  const transformOptions = { ...defaultOptions, ...options };
  
  return cloudinary.url(publicId, transformOptions);
};

module.exports = {
  cloudinary,
  profileImageStorage,
  chatFileStorage,
  reportImageStorage,
  deleteImage,
  getPublicIdFromUrl,
  getOptimizedImageUrl,
  CLOUDINARY_ENABLED,
  isCloudinaryConfigured
};

