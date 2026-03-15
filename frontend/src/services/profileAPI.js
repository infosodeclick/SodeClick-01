import { API_BASE_URL } from '../config/api';
import enhancedAPI from './enhancedAPI';

class ProfileAPI {
  constructor() {
    this.baseURL = `${API_BASE_URL}/api/profile`;
  }

  // Helper method to get auth headers
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found in localStorage');
      throw new Error('Authentication token not found');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // ดึงข้อมูลโปรไฟล์ผู้ใช้ (ใช้ enhanced API)
  async getUserProfile(userId) {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // เพิ่ม token ถ้ามี
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const url = `${this.baseURL}/${userId}`;
      const result = await enhancedAPI.enhancedFetch(url, {
        method: 'GET',
        headers
      });
      
      // ตรวจสอบว่า result มีข้อมูลหรือไม่
      if (!result.success) {
        console.error('❌ Profile API returned unsuccessful response:', result);
        throw new Error(result.error || 'ไม่สามารถดึงข้อมูลโปรไฟล์ได้');
      }
      
      // enhancedAPI ส่งข้อมูลมาในรูปแบบ { success: true, data: { success: true, data: { profile: ... } } }
      // ต้องดึงข้อมูลจาก result.data.data แทน result.data
      const actualData = result.data?.data || result.data;
      
      console.log('📤 Profile data received:', {
        userId,
        success: result.success,
        hasData: !!actualData,
        dataKeys: actualData ? Object.keys(actualData) : [],
        hasProfile: !!(actualData && actualData.profile),
        profileKeys: actualData && actualData.profile ? Object.keys(actualData.profile) : [],
        profileImages: actualData?.profile?.profileImages?.length || 0,
        mainProfileImageIndex: actualData?.profile?.mainProfileImageIndex,
        images: actualData?.profile?.profileImages
      });
      
      // ตรวจสอบว่ามีข้อมูลโปรไฟล์หรือไม่
      if (!actualData || !actualData.profile) {
        console.warn('⚠️ Profile data is missing from response, but API call was successful:', result);
        // ถ้าไม่มีข้อมูลโปรไฟล์ แต่ API สำเร็จ อาจเป็นเพราะข้อมูลยังไม่พร้อม
        // ให้ return null เพื่อให้ useLazyData retry
        return null;
      }
      
      // ตรวจสอบว่าข้อมูลโปรไฟล์มีข้อมูลพื้นฐานหรือไม่
      if (!actualData.profile._id && !actualData.profile.id) {
        console.warn('⚠️ Profile data exists but missing ID:', actualData.profile);
        return null;
      }
      
      // ส่งคืนข้อมูลในรูปแบบที่ component คาดหวัง
      return {
        success: true,
        data: actualData
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  // อัปเดตโปรไฟล์ผู้ใช้
  async updateUserProfile(userId, profileData) {
    try {
      console.log('ProfileAPI: Sending data to backend:', profileData);
      
      // ตรวจสอบ token ก่อน
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }
      
      const result = await enhancedAPI.enhancedFetch(`${this.baseURL}/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      console.log('ProfileAPI: Enhanced fetch result:', result);
      
      // enhancedAPI.enhancedFetch return object ไม่ใช่ Response
      if (!result.success) {
        console.error('ProfileAPI: Backend error response:', result);
        
        // จัดการ error ตาม status code
        if (result.status === 401) {
          // Unauthorized -> ล้าง token และให้ผู้ใช้เข้าสู่ระบบใหม่
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          throw new Error('Session expired. Please login again.');
        }
        
        if (result.status === 403) {
          throw new Error('Access denied. You do not have permission to update this profile.');
        }
        
        if (result.status >= 500) {
          throw new Error('Server error. Please try again later.');
        }
        
        throw new Error(result.error || 'Failed to update profile');
      }
      
      console.log('ProfileAPI: Update successful:', result.data);
      return result.data; // result.data จะมี structure { success: true, message: "...", data: { profile: ... } }
    } catch (error) {
      console.error('ProfileAPI: Update failed:', error);
      throw error;
    }
  }

  // อัปโหลดรูปภาพโปรไฟล์
  async uploadProfileImage(userId, imageFile) {
    try {
      console.log('📤 Starting image upload for user:', userId);
      console.log('📤 File details:', {
        name: imageFile.name,
        size: imageFile.size,
        type: imageFile.type
      });

      const formData = new FormData();
      formData.append('profileImage', imageFile);

      const token = localStorage.getItem('token');
      console.log('📤 Token exists:', !!token);

      const response = await fetch(`${this.baseURL}/${userId}/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      console.log('📤 Response status:', response.status);
      console.log('📤 Response headers:', Object.fromEntries(response.headers.entries()));

      const result = await response.json();
      console.log('📤 Response data:', result);

      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Upload error:', error);
      throw error;
    }
  }

  // ตั้งรูปโปรไฟล์หลัก
  async setMainProfileImage(userId, imageIndex) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${this.baseURL}/${userId}/main-image/${imageIndex}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error setting main profile image:', error);
      throw error;
    }
  }

  // เบลอรูปโปรไฟล์
    async blurProfileImages(userId, imageIndices) {
      try {
        console.log('🔒 ProfileAPI: Blurring profile images:', { userId, imageIndices });
        
        const token = localStorage.getItem('token');
        console.log('🔒 ProfileAPI: Token exists:', !!token);
        console.log('🔒 ProfileAPI: Token value:', token ? token.substring(0, 20) + '...' : 'null');
        
        const url = `${this.baseURL}/${userId}/blur-images`;
        console.log('🔒 ProfileAPI: Request URL:', url);
        console.log('🔒 ProfileAPI: Base URL:', this.baseURL);
        
        const requestBody = { imageIndices };
        console.log('🔒 ProfileAPI: Request body:', requestBody);
        
        console.log('🔒 ProfileAPI: About to send fetch request...');
        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(requestBody)
        });

        console.log('🔒 ProfileAPI: Response status:', response.status);
        console.log('🔒 ProfileAPI: Response ok:', response.ok);
        console.log('🔒 ProfileAPI: Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ ProfileAPI: Error response:', errorData);
        throw new Error(errorData.message || 'ไม่สามารถเบลอรูปภาพได้');
      }

      const result = await response.json();
      console.log('✅ ProfileAPI: Profile images blurred successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ ProfileAPI: Error blurring profile images:', error);
      throw error;
    }
  }

  // ยกเลิกการเบลอรูปโปรไฟล์
  async unblurProfileImages(userId, imageIndices) {
    try {
      console.log('🔓 ProfileAPI: Unblurring profile images:', { userId, imageIndices });
      
      const token = localStorage.getItem('token');
      console.log('🔓 ProfileAPI: Token exists:', !!token);
      
      const url = `${this.baseURL}/${userId}/unblur-images`;
      console.log('🔓 ProfileAPI: Request URL:', url);
      
      const requestBody = { imageIndices };
      console.log('🔓 ProfileAPI: Request body:', requestBody);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('🔓 ProfileAPI: Response status:', response.status);
      console.log('🔓 ProfileAPI: Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ ProfileAPI: Error response:', errorData);
        throw new Error(errorData.message || 'ไม่สามารถยกเลิกการเบลอรูปภาพได้');
      }

      const result = await response.json();
      console.log('✅ ProfileAPI: Profile images unblurred successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ ProfileAPI: Error unblurring profile images:', error);
      throw error;
    }
  }

  // ลบรูปภาพโปรไฟล์
  async deleteProfileImage(userId, imageIndex) {
    try {
      console.log('🗑️ ProfileAPI: Deleting image', { userId, imageIndex });
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await fetch(`${this.baseURL}/${userId}/image/${imageIndex}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🗑️ ProfileAPI: Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('🗑️ ProfileAPI: Error response:', errorData);
        
        // จัดการ error ตาม status code
        if (response.status === 404) {
          throw new Error('ไม่พบรูปภาพที่ต้องการลบ (404)');
        } else if (response.status === 400) {
          throw new Error(errorData.message || 'ข้อมูลไม่ถูกต้อง (400)');
        } else if (response.status === 403) {
          throw new Error('ไม่มีสิทธิ์ลบรูปภาพนี้ (403)');
        } else {
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || 'Unknown error'}`);
        }
      }

      const result = await response.json();
      console.log('🗑️ ProfileAPI: Success response:', result);
      return result;
    } catch (error) {
      console.error('❌ ProfileAPI: Error deleting profile image:', error);
      throw error;
    }
  }

  // ตรวจสอบความเข้ากันได้
  async getCompatibility(userId, targetUserId) {
    try {
      const response = await fetch(`${this.baseURL}/${userId}/compatibility/${targetUserId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting compatibility:', error);
      throw error;
    }
  }

  // ค้นหาโปรไฟล์
  async searchProfiles(searchParams = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      Object.keys(searchParams).forEach(key => {
        if (searchParams[key] !== undefined && searchParams[key] !== null && searchParams[key] !== '') {
          if (typeof searchParams[key] === 'object') {
            queryParams.append(key, JSON.stringify(searchParams[key]));
          } else {
            queryParams.append(key, searchParams[key]);
          }
        }
      });

      const response = await fetch(`${this.baseURL}/search?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error searching profiles:', error);
      throw error;
    }
  }
}

// Helper functions สำหรับจัดการข้อมูลโปรไฟล์
export const profileHelpers = {
  // แปลงข้อมูลอายุ
  calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  },

  // แปลงข้อมูลการศึกษา
  getEducationLabel(level) {
    const labels = {
      'high_school': 'มัธยมศึกษา',
      'diploma': 'ปวส./อนุปริญญา',
      'bachelor': 'ปริญญาตรี',
      'master': 'ปริญญาโท',
      'doctorate': 'ปริญญาเอก',
      'other': 'อื่นๆ'
    };
    return labels[level] || level;
  },

  // แปลงข้อมูลศาสนา
  getReligionLabel(religion) {
    const labels = {
      'buddhist': 'พุทธ',
      'christian': 'คริสต์',
      'muslim': 'อิสลาม',
      'hindu': 'ฮินดู',
      'other': 'อื่นๆ',
      'none': 'ไม่นับถือ'
    };
    return labels[religion] || religion;
  },

  // แปลงข้อมูลภาษา
  getLanguageLabel(lang) {
    const labels = {
      'thai': 'ไทย',
      'english': 'อังกฤษ',
      'chinese': 'จีน',
      'japanese': 'ญี่ปุ่น',
      'korean': 'เกาหลี',
      'french': 'ฝรั่งเศส',
      'german': 'เยอรมัน',
      'spanish': 'สเปน',
      'other': 'อื่นๆ'
    };
    return labels[lang] || lang;
  },

  // แปลงข้อมูลไลฟ์สไตล์
  getLifestyleLabel(category, value) {
    const labels = {
      smoking: {
        'never': 'ไม่สูบ',
        'occasionally': 'บางครั้ง',
        'regularly': 'สูบเป็นประจำ',
        'trying_to_quit': 'กำลังเลิก'
      },
      drinking: {
        'never': 'ไม่ดื่ม',
        'occasionally': 'บางครั้ง',
        'socially': 'ดื่มสังคม',
        'regularly': 'ดื่มเป็นประจำ'
      },
      exercise: {
        'never': 'ไม่เล่น',
        'rarely': 'นานๆ ครั้ง',
        'sometimes': 'บางครั้ง',
        'regularly': 'เป็นประจำ',
        'daily': 'ทุกวัน'
      },
      diet: {
        'omnivore': 'กินทุกอย่าง',
        'vegetarian': 'มังสวิรัติ',
        'vegan': 'วีแกน',
        'pescatarian': 'กินปลา',
        'keto': 'คีโต',
        'other': 'อื่นๆ'
      },
      sleepSchedule: {
        'early_bird': 'นอนเช้า ตื่นเช้า',
        'night_owl': 'นอนดึก ตื่นสาย',
        'flexible': 'ยืดหยุ่น'
      },
      travel: {
        'love_travel': 'รักการเดินทาง',
        'occasional_travel': 'เดินทางบางครั้ง',
        'prefer_home': 'ชอบอยู่บ้าน',
        'business_travel': 'เดินทางธุรกิจ'
      },
      children: {
        'have_children': 'มีลูกแล้ว',
        'want_children': 'อยากมีลูก',
        'dont_want_children': 'ไม่อยากมีลูก',
        'open_to_children': 'เปิดใจ'
      }
    };
    return labels[category]?.[value] || value;
  },

  // แปลงข้อมูลความสนใจ
  getInterestLabel(category) {
    const labels = {
      'sports': 'กีฬา',
      'music': 'ดนตรี',
      'movies': 'หนัง/ซีรีส์',
      'books': 'หนังสือ',
      'cooking': 'ทำอาหาร',
      'travel': 'ท่องเที่ยว',
      'technology': 'เทคโนโลยี',
      'art': 'ศิลปะ',
      'gaming': 'เกม',
      'fitness': 'ฟิตเนส',
      'nature': 'ธรรมชาติ',
      'photography': 'ถ่ายภาพ',
      'dancing': 'เต้นรำ',
      'other': 'อื่นๆ'
    };
    return labels[category] || category;
  },

  // แปลงข้อมูลคำถามพิเศษ
  getPromptQuestionLabel(question) {
    const labels = {
      'my_special_talent': 'ความสามารถพิเศษของฉันคือ...',
      'way_to_win_my_heart': 'วิธีชนะใจฉันคือ...',
      'dream_destination': 'สถานที่ในฝันที่อยากไปคือ...',
      'last_laugh_until_tears': 'ครั้งล่าสุดที่หัวเราะจนน้ำตาไหลคือ...',
      'perfect_first_date': 'เดทแรกในฝันของฉันคือ...',
      'life_motto': 'คติประจำใจของฉันคือ...',
      'favorite_memory': 'ความทรงจำที่ชื่นชอบที่สุดคือ...',
      'biggest_fear': 'สิ่งที่กลัวที่สุดคือ...',
      'dream_job': 'งานในฝันของฉันคือ...',
      'guilty_pleasure': 'ความผิดที่ชอบทำคือ...'
    };
    return labels[question] || question;
  },

  // ตรวจสอบความสมบูรณ์ของโปรไฟล์
  getProfileCompleteness(profile) {
    const fields = [
      'bio',
      'occupation.job',
      'education.level',
      'physicalAttributes.height',
      'religion',
      'languages',
      'lifestyle.smoking',
      'lifestyle.drinking',
      'lifestyle.exercise',
      'interests',
      'promptAnswers'
    ];

    let completedFields = 0;
    const totalFields = fields.length;

    fields.forEach(field => {
      const fieldParts = field.split('.');
      let value = profile;
      
      for (const part of fieldParts) {
        value = value?.[part];
      }

      if (value !== undefined && value !== null && value !== '' && 
          (Array.isArray(value) ? value.length > 0 : true)) {
        completedFields++;
      }
    });

    return Math.round((completedFields / totalFields) * 100);
  },

  // สร้าง URL รูปภาพโปรไฟล์
  getProfileImageUrl(imagePath) {
    if (!imagePath) return null;
    return `${API_BASE_URL.replace('/api', '')}/uploads/profiles/${imagePath}`;
  },

  // ตรวจสอบความเข้ากันได้
  getCompatibilityLevel(score) {
    if (score >= 80) return { level: 'excellent', label: 'เข้ากันได้มาก', color: 'text-green-600' };
    if (score >= 60) return { level: 'good', label: 'เข้ากันได้ดี', color: 'text-blue-600' };
    if (score >= 40) return { level: 'fair', label: 'เข้ากันได้พอใช้', color: 'text-yellow-600' };
    return { level: 'low', label: 'เข้ากันได้น้อย', color: 'text-red-600' };
  }
};

// สร้าง instance และ export
const profileAPI = new ProfileAPI();
export default profileAPI;
export { profileAPI };