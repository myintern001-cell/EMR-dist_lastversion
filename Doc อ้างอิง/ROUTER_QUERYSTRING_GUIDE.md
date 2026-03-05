# Router และ Query String ในระบบ Patient Multi-PDF Viewer

> **วัตถุประสงค์:** อธิบายการเปลี่ยนแปลงระบบ Router และการจัดการ Query String เพื่อรองรับ URL แบบ `/patient/{hn}` พร้อม date filters และ multi-file PDF viewer

---

## 1️⃣ สรุปสิ่งที่แก้ไข (What changed)

### A) Router รองรับ Dynamic Route
- เพิ่ม route ใหม่ `/patient/{hn}` เพื่อให้เปิดหน้าผู้ป่วยตรงจาก URL ได้  
  อ้างอิง: `index.php#18-21`
- ปรับ Router ให้รองรับทั้ง:
  1) exact route  
  2) dynamic route ที่มี `{param}`  
  อ้างอิง: `core/Router.php#50-77`, `core/Router.php#82-95`
- แยกส่วน dispatch ออกชัดเจน และส่ง route params เข้า controller method โดยตรง  
  อ้างอิง: `core/Router.php#100-129`

### B) Controller + View รองรับ Bootstrap จาก URL
- `PatientController::index()` รับ `$routeHn` จาก path และอ่าน query (`hn`, `date_from`, `date_to`) เพื่อส่งต่อเข้า view  
  อ้างอิง: `controllers/PatientController.php#14-37`
- view ส่งค่าเริ่มต้นเข้า JS ผ่าน `window.PATIENT_BOOTSTRAP`  
  อ้างอิง: `views/patient/index.php#163-170`

### C) Frontend: Canonical URL + Query String + Multi PDF
- อ่าน bootstrap และ auto-search เมื่อเปิดผ่าน URL  
  อ้างอิง: `public/js/patient_page.js#13-17`, `public/js/patient_page.js#149-167`
- ทำ canonical URL ด้วย `history.replaceState`:
  - path หลักเป็น `/patient/{hn}`
  - date filter คงไว้ใน query string  
  อ้างอิง: `public/js/patient_page.js#100-106`
- จัดการ query string วันที่ด้วย `buildDateQuery()` / `getDateParams()`  
  อ้างอิง: `public/js/patient_page.js#69-83`
- date filter เปลี่ยนแล้วอัปเดต URL + reload ข้อมูลตาม filter  
  อ้างอิง: `public/js/patient_page.js#170-202`
- เปิดเอกสารแบบ multi-file sequence ใน viewer เดียว  
  อ้างอิง: `public/js/patient_page.js#391-443`, `public/js/pdf_viewer.js#137-196`

---

## 2️⃣ แนวทางการแก้ไข (Approach)

1. **แยกความรับผิดชอบชัดเจน**
   - Router ทำหน้าที่ map URL -> controller/method
   - Controller ดึง params/query และส่ง initial state ให้ view
   - Frontend จัดการ UX (canonical URL, date filter, multi-file viewer)

2. **Backward-compatible**
   - รองรับทั้ง `/patient?hn=123456` และ `/patient/123456`
   - หน้า frontend จะ normalize URL ให้เป็น canonical path โดยยังเก็บ query ที่จำเป็น (date filters)

3. **Query String ไม่ใช้จับ route**
   - Router strip query ออกก่อน match route ลดปัญหา route miss  
   อ้างอิง: `core/Router.php#29-33`

4. **ประสิทธิภาพ viewer**
   - lazy render + cache + file/page mapping ทำให้เปิดหลายไฟล์ต่อเนื่องได้โดยไม่ค้างง่าย  
   อ้างอิง: `public/js/pdf_viewer.js#291-395`, `public/js/pdf_viewer.js#475-556`

---

## 3️⃣ Router ทำงานอย่างไร (ระบบนี้)

### Flow หลัก
1. `index.php` ลงทะเบียน routes และส่ง request เข้า router  
   อ้างอิง: `index.php#15-35`, `index.php#48`
2. ตัด `BASE_URL` ออกจาก URI ก่อน resolve  
   อ้างอิง: `index.php#40-46`
3. `Router::resolve()` ตัด query string ออก (`strtok($uri,'?')`) แล้วค่อย match  
   อ้างอิง: `core/Router.php#27-45`
4. `matchRoute()`:
   - เช็ค exact ก่อน
   - ถ้าไม่เจอค่อยลอง dynamic pattern (`{hn}`)  
   อ้างอิง: `core/Router.php#50-77`
5. `dispatch()` เรียก controller method พร้อม params ที่ extract มา  
   อ้างอิง: `core/Router.php#100-129`

---

## 4️⃣ การจัดการ Query String

### 4.1 ฝั่ง Backend
- helper `query()` อ่าน `$_GET` แบบ trim + default  
  อ้างอิง: `core/Controller.php#42-45`
- `PatientController::index()` อ่าน:
  - `hn`
  - `date_from`
  - `date_to`  
  อ้างอิง: `controllers/PatientController.php#21-24`

### 4.2 ฝั่ง Frontend
- `buildDateQuery()` สร้าง query เฉพาะเมื่อเปิด date filter และมีค่า from  
  อ้างอิง: `public/js/patient_page.js#75-83`
- `updateCanonicalUrl(hn)`:
  - path = `/patient/{hn}` (ถ้ามี hn)
  - query = date filters
  - apply ด้วย `history.replaceState`  
  อ้างอิง: `public/js/patient_page.js#100-106`
- ทุกครั้งที่เปลี่ยน date filter จะ sync URL + reload data  
  อ้างอิง: `public/js/patient_page.js#170-202`
- ตอนเรียก API จะ append date query เข้าทุก endpoint ที่เกี่ยวข้อง  
  อ้างอิง: `public/js/patient_page.js#249-250`, `public/js/patient_page.js#310-312`

---

## 5️⃣ ตัวอย่างพฤติกรรม URL

1. เข้า `.../patient?hn=123456&date_from=2026-03-01&date_to=2026-03-05`  
2. หน้าอ่าน bootstrap -> search patient อัตโนมัติ  
3. URL ถูก normalize เป็น  
   `.../patient/123456?date_from=2026-03-01&date_to=2026-03-05`  
4. Router match ที่ `/patient/{hn}` โดยไม่สน query string

---

## 6️⃣ จุดเด่นของงานแก้รอบนี้
- โครงสร้าง route ชัดเจนขึ้น
- URL อ่านง่าย แชร์ง่าย (canonical)
- Query string ถูกใช้เฉพาะ filter/state ไม่ชนกับ route matching
- Multi-file viewer ใช้งานจริงได้ดีขึ้น (progress + pages/files sidebar + per-file download)

---

## 7️⃣ ไฟล์ที่เกี่ยวข้อง (Reference)

| ไฟล์ | บทบาท | ส่วนที่เกี่ยวข้อง |
|------|-------|----------------|
| `index.php` | Front Controller | ลงทะเบียน `/patient/{hn}` |
| `core/Router.php` | Router | dynamic route matching, dispatch |
| `core/Controller.php` | Base Controller | `query()` helper |
| `controllers/PatientController.php` | Controller | อ่าน route+query ส่งให้ view |
| `views/patient/index.php` | View | ส่ง `PATIENT_BOOTSTRAP` ให้ JS |
| `public/js/patient_page.js` | Frontend | canonical URL, date filter, multi-file viewer |
| `public/js/pdf_viewer.js` | PDF Viewer | multi-file sequence, lazy render |
| `public/css/styles.css` | Styles | progress UI, pages/files sidebar |

---

## 8️⃣ สรุปคำสั่งที่ใช้ (Commands)

```bash
# ตรวจ syntax หลัก
php -l core/Router.php
php -l index.php
php -l controllers/PatientController.php

# ตรวจ JS syntax
node --check public/js/pdf_viewer.js
node --check public/js/patient_page.js
```

---

> **หมายเหตุ:** การเปลี่ยนแปลงนี้รักษาความเข้ากันได้กับ URL แบบเดิม (`?hn=`) และใช้ query string เฉพาะสำหรับ filter/state ไม่ใช้สำหรับ routing ทำให้ระบบมีความยืดหยุ่นและบำรุงรักษาง่ายขึ้น
