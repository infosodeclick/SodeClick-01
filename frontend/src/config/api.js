import axios from 'axios'

// ตั้งค่า Base URL จาก environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const APP_ENV = import.meta.env.VITE_APP_ENV || 'development'

// สร้าง axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // เพิ่มเป็น 30 วินาที
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - สำหรับเพิ่ม token หรือ headers อื่นๆ
api.interceptors.request.use(
  (config) => {
    // เพิ่ม authorization token ถ้ามี
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Log request ใน development mode
    if (APP_ENV === 'development') {
      console.log('🚀 API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        data: config.data,
      })
    }
    
    return config
  },
  (error) => {
    console.error('❌ Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor - สำหรับจัดการ response และ error
api.interceptors.response.use(
  (response) => {
    // Log response ใน development mode
    if (APP_ENV === 'development') {
      console.log('✅ API Response:', {
        status: response.status,
        url: response.config.url,
        data: response.data,
      })
    }
    
    return response
  },
  (error) => {
    // จัดการ error ต่างๆ
    if (error.response) {
      // Server ตอบกลับแต่มี error status
      const { status, data } = error.response
      
      if (status === 401) {
        // Unauthorized - ลบ token และ redirect ไป login
        localStorage.removeItem('token')
        window.location.href = '/login'
      } else if (status === 403) {
        // Forbidden
        console.error('❌ Access Denied')
      } else if (status >= 500) {
        // Server Error
        console.error('❌ Server Error:', data?.message || 'Internal Server Error')
      }
      
      console.error('❌ API Error:', {
        status,
        message: data?.message || error.message,
        url: error.config?.url,
      })
    } else if (error.request) {
      // ไม่ได้รับ response จาก server
      console.error('❌ Network Error:', error.message)
    } else {
      // Error อื่นๆ
      console.error('❌ Error:', error.message)
    }
    
    return Promise.reject(error)
  }
)

// API methods
export const apiService = {
  // GET request
  get: (url, config = {}) => api.get(url, config),
  
  // POST request
  post: (url, data = {}, config = {}) => api.post(url, data, config),
  
  // PUT request
  put: (url, data = {}, config = {}) => api.put(url, data, config),
  
  // DELETE request
  delete: (url, config = {}) => api.delete(url, config),
  
  // PATCH request
  patch: (url, data = {}, config = {}) => api.patch(url, data, config),
}

// Specific API calls
export const healthAPI = {
  // ตรวจสอบสถานะ server
  checkHealth: () => apiService.get('/health'),
  
  // ตรวจสอบสถานะ database
  checkDatabase: () => apiService.get('/health/database'),
}

// Export ค่าต่างๆ สำหรับใช้ในที่อื่น
export { API_BASE_URL, APP_ENV }
export default api
