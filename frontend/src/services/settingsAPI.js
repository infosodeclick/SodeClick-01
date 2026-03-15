import enhancedAPI from './enhancedAPI.js';

/**
 * Settings API Service
 * จัดการการตั้งค่าระบบส่วนกลาง (Global Settings)
 */
class SettingsAPI {
  constructor() {
    this.baseURL = '/api/settings';
  }

  /**
   * ดึงข้อมูลการตั้งค่า Payment Bypass
   */
  async getPaymentBypassSettings() {
    try {
      const response = await enhancedAPI.get(`${this.baseURL}/payment-bypass`);
      return response.data;
    } catch (error) {
      console.error('Error fetching payment bypass settings:', error);
      throw error;
    }
  }

  /**
   * อัปเดตการตั้งค่า Payment Bypass
   * @param {boolean} enabled - สถานะการเปิดใช้งาน
   * @param {string} reason - เหตุผลในการเปิดใช้งาน
   */
  async updatePaymentBypassSettings(enabled, reason = '') {
    try {
      const response = await enhancedAPI.post(`${this.baseURL}/payment-bypass`, {
        enabled,
        reason
      });
      return response.data;
    } catch (error) {
      console.error('Error updating payment bypass settings:', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลการตั้งค่า Maintenance Mode
   */
  async getMaintenanceSettings() {
    try {
      const response = await enhancedAPI.get(`${this.baseURL}/maintenance`);
      return response.data;
    } catch (error) {
      console.error('Error fetching maintenance settings:', error);
      throw error;
    }
  }

  /**
   * อัปเดตการตั้งค่า Maintenance Mode
   * @param {boolean} enabled - สถานะการเปิดใช้งาน
   * @param {string} message - ข้อความแจ้งเตือน
   * @param {string} estimatedTime - เวลาที่คาดว่าจะแล้วเสร็จ
   */
  async updateMaintenanceSettings(enabled, message = '', estimatedTime = '') {
    try {
      const response = await enhancedAPI.post(`${this.baseURL}/maintenance`, {
        enabled,
        message,
        estimatedTime
      });
      return response.data;
    } catch (error) {
      console.error('Error updating maintenance settings:', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลการตั้งค่า Rabbit Gateway
   */
  async getRabbitGatewaySettings() {
    try {
      const response = await enhancedAPI.get(`${this.baseURL}/rabbit-gateway`);
      return response.data;
    } catch (error) {
      console.error('Error fetching Rabbit Gateway settings:', error);
      throw error;
    }
  }

  /**
   * อัปเดตการตั้งค่า Rabbit Gateway
   * @param {boolean} enabled - สถานะการเปิดใช้งาน
   * @param {string} apiKey - API Key
   * @param {string} secretKey - Secret Key
   */
  async updateRabbitGatewaySettings(enabled, apiKey = '', secretKey = '') {
    try {
      const response = await enhancedAPI.post(`${this.baseURL}/rabbit-gateway`, {
        enabled,
        apiKey,
        secretKey
      });
      return response.data;
    } catch (error) {
      console.error('Error updating Rabbit Gateway settings:', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลการตั้งค่าระบบทั้งหมด
   */
  async getAllSettings() {
    try {
      const response = await enhancedAPI.get(`${this.baseURL}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching all settings:', error);
      throw error;
    }
  }

  /**
   * จัดการการ sync ระหว่าง localStorage และ API
   * @param {string} settingType - ประเภทการตั้งค่า ('payment-bypass', 'maintenance')
   */
  async syncSettingWithLocalStorage(settingType) {
    try {
      let apiData, localData;

      switch (settingType) {
        case 'payment-bypass':
          apiData = await this.getPaymentBypassSettings();
          localData = localStorage.getItem('payment_bypass_enabled') === 'true';

          // ถ้าข้อมูล API และ localStorage ไม่ตรงกัน ให้ใช้ข้อมูลจาก API เป็นหลัก
          if (apiData.data.enabled !== localData) {
            localStorage.setItem('payment_bypass_enabled', apiData.data.enabled.toString());
            console.log(`🔄 Synced payment bypass setting from API: ${apiData.data.enabled}`);
          }
          break;

        case 'maintenance':
          apiData = await this.getMaintenanceSettings();
          localData = localStorage.getItem('bypassMaintenance') === 'true';

          // ถ้าข้อมูล API และ localStorage ไม่ตรงกัน ให้ใช้ข้อมูลจาก API เป็นหลัก
          if (apiData.data.enabled !== localData) {
            if (apiData.data.enabled) {
              localStorage.setItem('bypassMaintenance', 'true');
            } else {
              localStorage.removeItem('bypassMaintenance');
            }
            console.log(`🔄 Synced maintenance setting from API: ${apiData.data.enabled}`);
          }
          break;

        default:
          console.warn(`Unknown setting type: ${settingType}`);
      }

      return apiData;
    } catch (error) {
      console.error(`Error syncing ${settingType} setting:`, error);
      throw error;
    }
  }

  /**
   * ตรวจสอบสถานะ Payment Bypass จากทั้ง API และ localStorage
   */
  async checkPaymentBypassStatus() {
    try {
      // ลองดึงข้อมูลจาก API ก่อน
      const apiResult = await this.getPaymentBypassSettings();

      if (apiResult.success) {
        // ถ้าดึงจาก API สำเร็จ ให้ใช้ข้อมูลจาก API และ sync กับ localStorage
        const enabled = apiResult.data.enabled;
        localStorage.setItem('payment_bypass_enabled', enabled.toString());

        return {
          enabled,
          source: 'api',
          data: apiResult.data
        };
      }
    } catch (error) {
      console.warn('Failed to fetch from API, falling back to localStorage:', error);
    }

    // ถ้า API ไม่พร้อมใช้งาน ให้ใช้ localStorage เป็น fallback
    const localEnabled = localStorage.getItem('payment_bypass_enabled') === 'true';
    return {
      enabled: localEnabled,
      source: 'localStorage'
    };
  }

  /**
   * ตรวจสอบสถานะ Maintenance จากทั้ง API และ localStorage
   */
  async checkMaintenanceStatus() {
    try {
      // ลองดึงข้อมูลจาก API ก่อน
      const apiResult = await this.getMaintenanceSettings();

      if (apiResult.success) {
        // ถ้าดึงจาก API สำเร็จ ให้ใช้ข้อมูลจาก API และ sync กับ localStorage
        const enabled = apiResult.data.enabled;
        if (enabled) {
          localStorage.setItem('bypassMaintenance', 'true');
        } else {
          localStorage.removeItem('bypassMaintenance');
        }

        return {
          enabled,
          source: 'api',
          data: apiResult.data
        };
      }
    } catch (error) {
      console.warn('Failed to fetch maintenance from API, falling back to localStorage:', error);
    }

    // ถ้า API ไม่พร้อมใช้งาน ให้ใช้ localStorage เป็น fallback
    const localEnabled = localStorage.getItem('bypassMaintenance') === 'true';
    return {
      enabled: localEnabled,
      source: 'localStorage'
    };
  }
}

// สร้าง instance เดียวและ export
const settingsAPI = new SettingsAPI();
export default settingsAPI;
