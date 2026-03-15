import { useState, useEffect, useCallback } from 'react'

export const useMaintenanceMode = () => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false)
  const [maintenanceChecked, setMaintenanceChecked] = useState(false)
  const [hasDevAccess, setHasDevAccess] = useState(() => localStorage.getItem('devAccess') === 'true')
  const [bypassMaintenance, setBypassMaintenance] = useState(() => localStorage.getItem('bypassMaintenance') === 'true')

  const checkMaintenanceMode = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/maintenance/status`);
      
      if (response.ok) {
        const data = await response.json();
        const isMaintenance = data.maintenanceMode || false;
        
        console.log('🔧 Maintenance mode status:', isMaintenance);
        
        // ถ้าเป็น maintenance mode และ user ไม่ได้ bypass
        if (isMaintenance && !bypassMaintenance) {
          setIsMaintenanceMode(true);
          console.log('⚠️ App is in maintenance mode');
        } else {
          setIsMaintenanceMode(false);
          console.log('✅ App is running normally');
        }
      } else {
        console.log('✅ Maintenance check failed, assuming normal operation');
        setIsMaintenanceMode(false);
      }
    } catch (error) {
      console.log('✅ Maintenance check error, assuming normal operation:', error);
      setIsMaintenanceMode(false);
    } finally {
      setMaintenanceChecked(true);
    }
  }, [bypassMaintenance]);

  const toggleDevAccess = useCallback(() => {
    const newDevAccess = !hasDevAccess;
    setHasDevAccess(newDevAccess);
    localStorage.setItem('devAccess', newDevAccess.toString());
    console.log('🔧 Dev access toggled:', newDevAccess);
  }, [hasDevAccess]);

  const toggleBypassMaintenance = useCallback(() => {
    const newBypass = !bypassMaintenance;
    setBypassMaintenance(newBypass);
    localStorage.setItem('bypassMaintenance', newBypass.toString());
    console.log('🔧 Bypass maintenance toggled:', newBypass);
    
    // Recheck maintenance mode after toggling bypass
    if (newBypass) {
      checkMaintenanceMode();
    }
  }, [bypassMaintenance, checkMaintenanceMode]);

  useEffect(() => {
    checkMaintenanceMode();
  }, [checkMaintenanceMode]);

  return {
    isMaintenanceMode,
    maintenanceChecked,
    hasDevAccess,
    bypassMaintenance,
    setIsMaintenanceMode,
    setMaintenanceChecked,
    setHasDevAccess,
    setBypassMaintenance,
    checkMaintenanceMode,
    toggleDevAccess,
    toggleBypassMaintenance
  }
}
