# SodeClick (คู่มือภาษาไทย)

โปรเจกต์นี้เป็น Monorepo:
- `frontend` = React + Vite (แหล่งจริงของ UI)
- `backend` = Express + MongoDB
- Android ใช้ **Capacitor wrapper** ครอบเว็บที่ build แล้ว

## สิ่งที่ปรับปรุงแล้ว
- แก้จุดบล็อกบน Windows: เพิ่ม `backend/env.development` ให้รันทันที
- Backend ทำงานแบบ **degraded mode** ได้เมื่อ MongoDB ล่ม/ไม่พร้อม
- เพิ่ม health status ที่บอกสถานะ Mongo ชัดเจน
- เพิ่มสคริปต์รันเว็บเดโมจาก root
- เพิ่มตั้งค่า Capacitor สำหรับ Android wrapper

## เริ่มใช้งาน (Web demo)
1) ติดตั้งแพ็กเกจ
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

2) รันพร้อมกันทั้งระบบ
```bash
npm run demo:web
```
หรือบน Windows:
```bash
start-web-demo.bat
```

3) URL
- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Health: http://localhost:5000/health

## โหมด MongoDB ไม่พร้อม
Backend จะยังไม่ดับ และตอบ `/health` ได้ โดยค่า `status` จะเป็น `degraded` พร้อมข้อมูล `mongo.*`

## Android (Capacitor)
ใช้ frontend เป็นแหล่งหลัก และ Android เป็น wrapper:
```bash
cd frontend
npm run cap:add:android   # ทำครั้งแรกครั้งเดียว
npm run cap:sync
npm run cap:open:android
```

ดูขั้นตอนเต็มใน `docs/WEB-ANDROID-RUNBOOK-TH.md`
