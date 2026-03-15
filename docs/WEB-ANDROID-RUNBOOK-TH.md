# WEB + ANDROID RUNBOOK (TH)

## A) เตรียมเครื่อง (Windows)
- Node.js 20+ (แนะนำ LTS)
- npm
- Android Studio + Android SDK
- JDK 17 (ตามที่ Android Studio แนะนำ)

## B) ติดตั้ง dependency
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

## C) รัน Web Demo
```bash
npm run demo:web
```
ตรวจสอบ:
- Frontend: http://localhost:5173
- Backend health: http://localhost:5000/health

ถ้า MongoDB ไม่พร้อม:
- backend ยังรันได้
- `/health` จะขึ้น `status: degraded`
- API ที่ต้องใช้ DB อาจตอบ 503 (เป็นพฤติกรรมตั้งใจ)

## D) สร้าง Android Wrapper ด้วย Capacitor

### 1) Build frontend
```bash
cd frontend
npm run build
```

### 2) เพิ่ม Android platform (ครั้งแรกครั้งเดียว)
```bash
npm run cap:add:android
```

### 3) Sync ไป Android project
```bash
npm run cap:sync
```

### 4) เปิด Android Studio
```bash
npm run cap:open:android
```

### 4) ใน Android Studio
1. รอ Gradle Sync ให้เสร็จ
2. เลือก emulator/device
3. กด Run

## E) วงจรพัฒนาแนะนำ
ทุกครั้งที่แก้ frontend:
```bash
cd frontend
npm run build
npm run cap:sync
npm run cap:open:android
```

## F) Troubleshooting สั้นๆ
- `env.development not found` (backend): ตรวจว่ามี `backend/env.development`
- Frontend เรียก API ไม่ได้: ตรวจ `VITE_API_BASE_URL` ให้เป็น `http://localhost:5000`
- Android build fail: อัปเดต SDK/JDK แล้ว Sync Gradle ใหม่
