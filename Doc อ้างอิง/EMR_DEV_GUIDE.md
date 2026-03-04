# EMR Development Guide
**แนวทางการพัฒนาระบบ Electronic Medical Record (EMR) — Technical & Architecture Reference**

---

## 1. ภาพรวมระบบ EMR ที่ดี

ระบบ EMR ที่พร้อมใช้งานจริงในโรงพยาบาลต้องครอบคลุม 3 มิติ:

```
┌─────────────────────────────────────────────────────┐
│  CLINICAL CORE         │  OPERATIONAL              │
│  - Patient Record      │  - Scheduling             │
│  - Visit/Encounter     │  - Billing                │
│  - SOAP Notes          │  - Inventory              │
│  - Orders (Lab/Drug)   │  - Reporting              │
│  - Clinical Decision   │  - Analytics              │
├────────────────────────┴───────────────────────────┤
│  INFRASTRUCTURE                                    │
│  - Security & RBAC │ Audit │ Integration │ Backup  │
└────────────────────────────────────────────────────┘
```

---

## 2. โมดูลที่ระบบ EMR มาตรฐานต้องมี

### 2.1 Core Clinical Modules (บังคับ)

| โมดูล | คำอธิบาย | Priority |
|---|---|---|
| **Patient Registration** | ลงทะเบียน ค้นหา ข้อมูลประชากร | 🔴 Critical |
| **Visit/Encounter** | OPD/IPD/ER, Chief Complaint, สถานะคิว | 🔴 Critical |
| **Vitals & Nursing Notes** | สัญญาณชีพ, การประเมินพยาบาล | 🔴 Critical |
| **SOAP / Progress Notes** | บันทึกทางคลินิกมาตรฐาน | 🔴 Critical |
| **Diagnosis (ICD-10)** | การวินิจฉัย, Problem List | 🔴 Critical |
| **Prescription / e-Prescribing** | สั่งยา, Drug Interaction Check | 🔴 Critical |
| **Lab Order & Results** | สั่งตรวจ, รับผล, แจ้งเตือนวิกฤต | 🔴 Critical |
| **Allergy Management** | ประวัติแพ้ยา/อาหาร/สาร | 🔴 Critical |
| **Drug Allergy Alert** | ตรวจสอบยาซ้ำซ้อน/แพ้ ณ จุดสั่ง | 🔴 Critical |
| **Imaging / Radiology Order** | สั่ง X-Ray, CT, MRI | 🟡 High |
| **Ward/Bed Management** | IPD, เตียง, Transfer | 🟡 High |
| **Discharge Summary** | สรุปการรักษา, Discharge Note | 🟡 High |
| **Referral** | ส่งต่อผู้ป่วย in/out | 🟡 High |
| **Procedure & Surgery** | หัตถการ, ผ่าตัด | 🟡 High |

### 2.2 Support Modules (ควรมี)

| โมดูล | คำอธิบาย |
|---|---|
| **Appointment / Scheduling** | นัดหมาย, ปฏิทินแพทย์ |
| **Billing & Coding** | เรียกเก็บเงิน, สิทธิการรักษา (บัตรทอง/ประกันสังคม) |
| **Pharmacy Management** | สต็อกยา, ตัดยา, ล็อต/expiry |
| **Medical Certificate** | ออกใบรับรองแพทย์ |
| **Telemedicine** | Video call, e-Consent |
| **Patient Portal** | ผู้ป่วยดูผลตรวจ/นัดหมายเอง |
| **Dashboard & Analytics** | KPI, รายงานผู้บริหาร |
| **User & Role Management** | RBAC, สิทธิ์ละเอียด |
| **Audit Log** | บันทึกทุกการกระทำ |
| **Notification** | แจ้งเตือน Lab วิกฤต, นัดหมาย |

---

## 3. สถาปัตยกรรมระบบ (Architecture)

### 3.1 แนะนำสำหรับ Production

```
                        ┌─────────────────┐
                        │   Load Balancer  │
                        │   (Nginx/Caddy)  │
                        └────────┬────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                   ▼
       ┌────────────┐   ┌────────────┐      ┌────────────┐
       │  Frontend  │   │  API Layer │      │  Auth Srv  │
       │  Next.js / │   │  REST /    │      │  JWT /     │
       │  React SPA │   │  GraphQL   │      │  OAuth2    │
       └────────────┘   └─────┬──────┘      └────────────┘
                              │
              ┌───────────────┼──────────────────┐
              ▼               ▼                  ▼
       ┌────────────┐  ┌────────────┐   ┌─────────────┐
       │ Primary DB │  │  Cache     │   │  File Store │
       │ PostgreSQL │  │  Redis     │   │  MinIO/S3   │
       └────────────┘  └────────────┘   └─────────────┘
              │
       ┌──────▼──────┐
       │  Replica DB │  ← Read replicas
       └─────────────┘
```

### 3.2 Database Schema หลักที่ต้องออกแบบ

```sql
-- ตาราง core ที่สำคัญที่สุด

patients           -- ข้อมูลผู้ป่วย (HN, demographics)
  └── allergies    -- ประวัติแพ้ยา (1:many)
  └── insurances   -- สิทธิการรักษา (1:many)

visits             -- การมาตรวจแต่ละครั้ง (VN)
  └── vitals       -- สัญญาณชีพ (1:1)
  └── soap_notes   -- SOAP Note (1:1)
  └── diagnoses    -- ICD-10 (1:many)
  └── prescriptions        -- ใบสั่งยา (1:many)
      └── medication_items -- รายการยา (1:many)
  └── lab_orders           -- คำสั่ง Lab (1:many)
      └── lab_tests        -- รายการ test (1:many)
  └── procedures   -- หัตถการ (1:many)

users              -- บัญชีผู้ใช้
  └── roles        -- บทบาท/สิทธิ์

audit_logs         -- บันทึกทุกการกระทำ (WORM)
```

### 3.3 Indexing Strategy ที่สำคัญ

```sql
-- ค้นหาผู้ป่วยบ่อยมาก
CREATE INDEX idx_patients_hn ON patients(hn);
CREATE INDEX idx_patients_name ON patients(first_name, last_name);
CREATE INDEX idx_patients_id_card ON patients(id_card_number);

-- Query visits บ่อย
CREATE INDEX idx_visits_patient ON visits(patient_id, visit_date DESC);
CREATE INDEX idx_visits_date ON visits(visit_date);
CREATE INDEX idx_visits_status ON visits(status) WHERE status != 'completed';
CREATE INDEX idx_visits_doctor ON visits(attending_doctor_id, visit_date);

-- Lab results
CREATE INDEX idx_lab_orders_visit ON lab_orders(visit_id);
CREATE INDEX idx_lab_orders_status ON lab_orders(status) WHERE status != 'resulted';

-- Audit
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_user ON audit_logs(user_id, timestamp DESC);
```

---

## 4. Security — Critical Points

### 4.1 Authentication & Authorization

```
✅ ต้องมี
- JWT หรือ Session-based auth ที่ expire
- Refresh token rotation
- MFA (Multi-Factor Authentication) สำหรับ admin/doctor
- Password hashing ด้วย bcrypt (cost factor ≥ 12)
- Account lockout หลัง login fail N ครั้ง
- Session timeout อัตโนมัติ (idle timeout ≤ 15 นาที สำหรับ EMR)

❌ ห้ามทำ
- เก็บ password plaintext
- ใช้ MD5/SHA1 สำหรับ password
- JWT secret ใน source code
- ไม่มี HTTPS
```

### 4.2 RBAC (Role-Based Access Control)

```
Role Hierarchy:
  admin           → เข้าถึงทุกอย่าง
  doctor          → ข้อมูลผู้ป่วย (full) + สั่งยา/Lab + SOAP
  nurse           → ข้อมูลผู้ป่วย (read) + Vitals + คิว
  pharmacist      → ใบสั่งยา + drug database
  lab_technician  → lab orders + บันทึกผล
  receptionist    → ลงทะเบียน + นัดหมาย (ไม่เห็นผล Lab/ยา)

หลักการ Least Privilege:
  - แต่ละ role เห็นเฉพาะที่จำเป็น
  - ตรวจสอบ permission ทั้ง Frontend และ Backend
  - API endpoint ต้องมี authorization middleware ทุกตัว
```

### 4.3 Data Protection

```
1. Encryption at Rest
   - ข้อมูลใน DB: encrypt sensitive fields (เลขบัตรปชช., ผลเลือด HIV)
   - Disk encryption (LUKS/BitLocker)
   - Backup encryption

2. Encryption in Transit
   - HTTPS/TLS 1.2+ บังคับ
   - Internal service communication: mTLS

3. Data Masking
   - หน้าจอ: แสดงเลขบัตรปชช. เฉพาะ 4 ตัวท้าย (e.g., ***-***-1234)
   - Log: ห้าม log ข้อมูลส่วนบุคคลดิบ

4. Personal Data (PDPA - พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล)
   - บันทึก consent ก่อนรวบรวมข้อมูล
   - สิทธิ์ขอลบข้อมูล (Right to Erasure) — ต้อง implement
   - Data retention policy (เก็บนานแค่ไหน)
```

### 4.4 Audit Log — ต้องเป็น WORM

```
✅ บันทึกทุก:
- Login / Logout / Login failure
- เปิดดูข้อมูลผู้ป่วย (แม้แต่ VIEW)
- สร้าง/แก้ไข/ลบข้อมูล
- สั่งยา / สั่ง Lab
- Print / Export ข้อมูล
- Password change
- Permission change

✅ ต้องเก็บ:
- Timestamp (UTC)
- User ID + IP Address
- Action type
- Resource + Resource ID
- Before/After values (สำหรับ UPDATE)
- Result (success/failure)

❌ ห้าม:
- แก้ไข/ลบ audit log ได้ (WORM = Write Once Read Many)
- เก็บ audit log ในตารางเดียวกับข้อมูลหลัก
```

### 4.5 Input Validation & Security

```
Backend:
- Validate ทุก input (type, length, format, range)
- Parameterized queries ทุกที่ (ป้องกัน SQL Injection)
- Rate limiting บน API endpoints
- File upload: ตรวจ MIME type จริง ไม่ใช่แค่ extension
- DDoS protection

Frontend:
- Sanitize ก่อน render (ป้องกัน XSS)
- CSP (Content Security Policy) header
- CORS ตั้งค่าให้เฉพาะ origin ที่อนุญาต
- ไม่เก็บข้อมูลสำคัญใน localStorage
```

---

## 5. Clinical Decision Support (CDS) — สิ่งที่ช่วยชีวิต

```
ระดับความสำคัญ:

🔴 CRITICAL (ต้องมีก่อน go-live)
  - Drug Allergy Alert: แจ้งเตือนเมื่อสั่งยาที่แพ้
  - Duplicate Order Check: ยาซ้ำซ้อนใน active order
  - Critical Lab Value Alert: HH/LL ต้องแจ้งแพทย์ทันที

🟡 HIGH (ควรมีในปีแรก)
  - Drug-Drug Interaction: ปฏิกิริยาระหว่างยา
  - Dosage Range Check: ขนาดยาเกิน/ต่ำกว่า therapeutic range
  - Contraindication Check: ยาต้องห้ามในโรคบางชนิด
  - Renal/Hepatic Dose Adjustment Alert

🟢 NICE TO HAVE
  - Sepsis Screening (NEWS2/qSOFA score)
  - Antimicrobial Stewardship
  - Preventive Care Reminder (vaccine, screening)
  - Clinical Pathway / Care Plan
```

---

## 6. Integration Standards — มาตรฐานที่ต้องรู้

```
HL7 FHIR R4 (Fast Healthcare Interoperability Resources)
  - มาตรฐานสากลสำหรับ data exchange ระหว่างระบบ
  - ทุกโรงพยาบาลรัฐไทยกำลัง mandate ให้ใช้
  - Resources หลัก: Patient, Encounter, Observation, MedicationRequest,
                    DiagnosticReport, Condition, Procedure

HL7 v2 (legacy)
  - ยังใช้งานใน Lab interface, ADT messages
  - ADT^A01 (Admit), ADT^A03 (Discharge), ORU^R01 (Lab Result)

DICOM
  - มาตรฐานสำหรับ imaging (X-Ray, CT, MRI)
  - ต้องใช้ PACS (Picture Archiving and Communication System)

IHE Profiles ที่สำคัญสำหรับไทย
  - PIX/PDQ: Patient Identity Cross-referencing
  - XDS.b: Cross-Enterprise Document Sharing
  - ATNA: Audit Trail and Node Authentication

Thai Specific
  - มาตรฐาน 43 แฟ้ม (กรมบัญชีกลาง): ส่งข้อมูลสิทธิการรักษา
  - ICD-10-TM: ICD-10 ฉบับภาษาไทย
  - NHSO API: สำหรับตรวจสอบสิทธิบัตรทอง
  - Social Security API: ตรวจสอบสิทธิประกันสังคม
```

---

## 7. Performance — จุดที่ต้องระวัง

### 7.1 Database Performance

```
N+1 Query Problem (พบบ่อยมากใน EMR):
  ❌ ผิด: ดึง visits แล้ว loop ดึง patient ทีละตัว
  ✅ ถูก: JOIN หรือ eager load ใน query เดียว

Pagination:
  - ทุก list ต้องมี pagination (ไม่ดึงทุก record)
  - ใช้ cursor-based pagination สำหรับ audit log
  - Limit default 20-50 rows

Caching Strategy:
  - Cache: ข้อมูล static (drug database, ICD-10 list, users)
  - ไม่ cache: ข้อมูล patient ที่อาจเปลี่ยนแปลง real-time
  - Cache invalidation: เมื่อ update ต้อง clear cache ทันที
```

### 7.2 Frontend Performance

```
- Lazy load โมดูลที่ไม่ได้ใช้บ่อย
- Virtual scrolling สำหรับรายการยาว (visit history, audit log)
- Debounce การค้นหา (≥ 300ms)
- Optimistic UI update สำหรับสถานะ visit
- ไม่ download ข้อมูลทั้งหมดมา filter ที่ frontend
```

---

## 8. Availability & Reliability

```
Target SLA สำหรับ EMR โรงพยาบาล:
  - Uptime: ≥ 99.9% (downtime ≤ 8.7 ชม./ปี)
  - RTO (Recovery Time Objective): ≤ 4 ชั่วโมง
  - RPO (Recovery Point Objective): ≤ 1 ชั่วโมง (ข้อมูลสูงสุด 1 ชม.)

Strategies:
  1. Database: Primary + Read Replica + Automated failover
  2. Backup: Full daily + Incremental hourly + Offsite copy
  3. Health Check: ตรวจสุขภาพทุก endpoint ทุก 30 วินาที
  4. Graceful degradation: ถ้า external service ล่ม ระบบหลักยังทำงานได้
  5. Offline mode: บันทึก vitals/SOAP ได้แม้ internet ขาด (sync เมื่อกลับมา)
```

---

## 9. Testing Strategy

```
Unit Tests (ทุก business logic):
  - Drug allergy check algorithm
  - Dosage calculation
  - BMI, Blood pressure classification
  - ICD-10 validation
  - Permission/RBAC rules

Integration Tests:
  - API endpoints ทุกตัว
  - Lab order → result workflow
  - Prescription → dispense workflow

E2E Tests (Playwright/Cypress):
  - Login flow
  - Create patient → visit → SOAP → order Lab → prescribe → discharge
  - Drug allergy warning appears correctly

Clinical Safety Tests (บังคับ):
  - Allergy alert triggers ถูกต้อง 100%
  - Critical lab alert ส่งถึงผู้รับ
  - Duplicate order detection
```

---

## 10. Deployment Checklist ก่อน Go-Live

```
Security:
  ☐ HTTPS enabled, HTTP redirect to HTTPS
  ☐ All passwords changed from defaults
  ☐ API keys/secrets ใน environment variables ไม่ใน code
  ☐ Firewall rules: เปิดเฉพาะ port 443, 80
  ☐ Penetration test ผ่านแล้ว
  ☐ Vulnerability scan ผ่านแล้ว

Data:
  ☐ Backup ทดสอบ restore แล้ว
  ☐ Encryption at rest เปิดใช้งาน
  ☐ PDPA consent flow พร้อม

Clinical:
  ☐ Drug allergy alert ทดสอบแล้ว
  ☐ Critical lab alert ทดสอบแล้ว
  ☐ User acceptance test (UAT) กับแพทย์/พยาบาลจริง ผ่านแล้ว

Operations:
  ☐ Monitoring / Alerting ตั้งค่าแล้ว
  ☐ Log retention policy กำหนดแล้ว
  ☐ Incident response plan เขียนแล้ว
  ☐ Training ผู้ใช้งานทุกบทบาทเสร็จแล้ว
  ☐ Help desk / support channel พร้อม
```

---

## 11. Critical Points สรุป — อย่าพลาด

```
🔴 ห้ามพลาดเด็ดขาด:
1. Drug Allergy Alert ต้องทำงาน 100% ถูกต้อง (ถ้าพลาด = คนตาย)
2. Audit Log ต้องสมบูรณ์และแก้ไขไม่ได้ (กฎหมาย + malpractice)
3. Backup ต้องทำและทดสอบ restore จริง ทุกสัปดาห์
4. HTTPS บังคับ ไม่มีข้อยกเว้น
5. Session timeout บังคับ (ทิ้งหน้าจอไม่ได้นาน)

🟡 สิ่งที่ทำให้ระบบ fail ใน production บ่อย:
1. ไม่ได้ทำ UAT กับผู้ใช้จริง → UX แย่ → ไม่ใช้งาน
2. ระบบช้า → แพทย์ไม่ใช้ → กลับไปใช้กระดาษ
3. ไม่มี offline capability → ระบบ internet ขาด = หยุดงาน
4. Interface กับ external system ซับซ้อนเกิน → integration ล้มเหลว
5. ไม่ได้ train ผู้ใช้ → ใช้ผิดวิธี → ข้อมูลไม่ถูกต้อง
```

---

## 12. Tech Stack Recommendations

### สำหรับ Full Production EMR ใหม่

| Layer | แนะนำ | เหตุผล |
|---|---|---|
| Frontend | Next.js + TypeScript + TailwindCSS | SSR, type safety, ecosystem |
| Backend API | Node.js (Fastify) หรือ Go | Performance, type safety |
| Database | PostgreSQL | ACID, JSON support, mature |
| Cache | Redis | Session, queue, pub/sub |
| Search | Elasticsearch | Full-text search ชื่อยา/โรค |
| Auth | Keycloak | OIDC, MFA, enterprise ready |
| Message Queue | RabbitMQ / Kafka | Async lab results, notifications |
| File Storage | MinIO (on-premise) | DICOM, documents |
| Monitoring | Prometheus + Grafana | Metrics, alerts |
| Logging | ELK Stack | Centralized logs |
| Container | Docker + Kubernetes | Scalability, deployment |
