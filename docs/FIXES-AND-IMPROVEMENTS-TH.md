# FIXES & IMPROVEMENTS (TH)

## 1) Critical blockers ที่แก้แล้ว

### 1.1 backend ไม่มี `env.development`
- ปัญหา: `npm run dev` ของ backend เรียก copy `env.development` แต่ไฟล์ไม่มี -> รันไม่ได้
- แก้: เพิ่ม `backend/env.development` พร้อมค่า local-safe defaults

### 1.2 Backend พึ่ง MongoDB มากเกินไปช่วง startup
- ปัญหา: ตอน reconnect fail มี `process.exit(1)` ทำให้ server ตาย
- แก้: ตัดการ exit ออก และให้ทำงานต่อใน degraded mode

### 1.3 เสี่ยง start server ซ้ำ
- ปัญหา: มีหลายเงื่อนไขเรียก `startServer()`
- แก้: เพิ่ม guard `serverStarted` ป้องกัน start ซ้ำ

## 2) MongoDB graceful fallback
- เพิ่ม `runtimeStatus` เพื่อติดตามสถานะจริงของ Mongo
- อัปเดต event handlers (`connected/disconnected/error/reconnected`)
- `/health` คืนข้อมูลสถานะชัดเจน:
  - `status: healthy | degraded`
  - `fallback_mode`
  - `mongo.required/connected/readyState/lastError/...`
- ให้ `/health` ตอบ 200 เพื่อไม่ทำให้ local runner/orchestrator kill service

## 3) Frontend local defaults
- ยืนยัน fallback `VITE_API_BASE_URL || http://localhost:5000`
- เพิ่ม `frontend/.env.local.example`

## 4) Web demo scripts ที่ root
- เพิ่ม scripts ใน `package.json`
  - `demo:web`
  - `demo:backend`
  - `demo:frontend`
  - `android:sync`
  - `android:open`
- เพิ่มไฟล์
  - `start-web-demo.bat`
  - `start-web-demo.ps1`

## 5) Android wrapper readiness
- เพิ่ม Capacitor config: `frontend/capacitor.config.ts`
- เพิ่ม scripts ใน frontend:
  - `cap:build`
  - `cap:sync`
  - `cap:open:android`
- เพิ่ม dependencies:
  - `@capacitor/core`
  - `@capacitor/android`
  - `@capacitor/cli`

## หมายเหตุ
- ไม่ได้ redesign ระบบหลัก
- พฤติกรรมเดิมยังคงไว้ให้มากที่สุด
- ค่า secret ทั้งหมดใช้ placeholder เท่าที่จำเป็น
