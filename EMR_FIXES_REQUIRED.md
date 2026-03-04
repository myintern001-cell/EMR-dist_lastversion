# EMR Project - สิ่งที่ต้องแก้ไขให้สมบูรณ์

**วันที่สร้าง:** 4 มีนาคม 2026  
**สถานะปัจจุบัน:** Document Management System (ไม่ใช่ EMR สมบูรณ์)  
**อ้างอิง:** EMR_DEV_GUIDE.md, PHP_BOOTSTRAP_REFERENCE.md

---

## 🔴 ปัญหาหลักที่ต้องแก้ไขทันที

### 1. โครงสร้างฐานข้อมูลไม่สมบูรณ์

**ปัจจุบันมีเพียง:**
```sql
CREATE TABLE documents (
    id, original_name, stored_name, file_path, 
    file_size, mime_type, uploaded_at, hn, doctype_id
);
```

**ต้องเพิ่มตารางหลัก:**

#### 1.1 Patients Table (ตารางผู้ป่วย)
```sql
CREATE TABLE patients (
    id VARCHAR(36) PRIMARY KEY,
    hn VARCHAR(20) UNIQUE NOT NULL,
    prefix VARCHAR(20) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    id_card VARCHAR(13) UNIQUE,
    date_of_birth DATE NOT NULL,
    gender ENUM('male','female','other') NOT NULL,
    blood_type ENUM('A','B','AB','O','A+','A-','B+','B-','AB+','AB-','O+','O-'),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    district VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(10),
    nationality VARCHAR(50) DEFAULT 'Thai',
    -- Emergency Contact
    emerg_contact_name VARCHAR(200),
    emerg_contact_phone VARCHAR(20),
    emerg_contact_relation VARCHAR(100),
    -- Meta
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    INDEX idx_hn (hn),
    INDEX idx_name (first_name, last_name),
    INDEX idx_idcard (id_card)
);
```

#### 1.2 Users Table (ตารางผู้ใช้)
```sql
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- bcrypt
    role ENUM('admin','doctor','nurse','receptionist','pharmacist','lab_technician') NOT NULL,
    department VARCHAR(100),
    license_number VARCHAR(50),
    phone VARCHAR(20),
    is_active TINYINT(1) DEFAULT 1,
    last_login DATETIME,
    login_attempts TINYINT DEFAULT 0,
    locked_until DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
);
```

#### 1.3 Visits Table (ตารางการตรวจ)
```sql
CREATE TABLE visits (
    id VARCHAR(36) PRIMARY KEY,
    visit_number VARCHAR(20) UNIQUE NOT NULL, -- VN
    patient_id VARCHAR(36) NOT NULL,
    doctor_id VARCHAR(36) NOT NULL,
    visit_date DATETIME NOT NULL,
    visit_type ENUM('OPD','IPD','Emergency','Telemedicine') NOT NULL,
    department VARCHAR(100) NOT NULL,
    chief_complaint TEXT NOT NULL,
    status ENUM('scheduled','waiting','in_progress','completed','cancelled') DEFAULT 'waiting',
    discharge_date DATETIME,
    discharge_type ENUM('home','refer','ama','death'),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES users(id),
    INDEX idx_patient_date (patient_id, visit_date DESC),
    INDEX idx_date (visit_date),
    INDEX idx_status (status),
    INDEX idx_doctor (doctor_id, visit_date)
);
```

#### 1.4 Vitals Table (ตารางสัญญาณชีพ)
```sql
CREATE TABLE vitals (
    id VARCHAR(36) PRIMARY KEY,
    visit_id VARCHAR(36) UNIQUE NOT NULL,
    temperature DECIMAL(4,1), -- °C
    pulse SMALLINT, -- bpm
    respiratory_rate SMALLINT, -- ครั้ง/นาที
    systolic_bp SMALLINT, -- mmHg
    diastolic_bp SMALLINT, -- mmHg
    oxygen_saturation DECIMAL(4,1), -- %
    weight DECIMAL(5,1), -- kg
    height DECIMAL(5,1), -- cm
    bmi DECIMAL(4,1), -- คำนวณ
    pain_score TINYINT, -- 0-10
    blood_glucose DECIMAL(6,1),
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    recorded_by VARCHAR(36),
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE
);
```

#### 1.5 SOAP Notes Table
```sql
CREATE TABLE soap_notes (
    id VARCHAR(36) PRIMARY KEY,
    visit_id VARCHAR(36) UNIQUE NOT NULL,
    subjective TEXT, -- S: ประวัติ/อาการ
    objective TEXT, -- O: ตรวจร่างกาย
    assessment TEXT, -- A: วินิจฉัย
    plan TEXT, -- P: แผนการรักษา
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    written_by VARCHAR(36),
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE
);
```

#### 1.6 Allergies Table (ตารางประวัติแพ้)
```sql
CREATE TABLE allergies (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL,
    substance VARCHAR(200) NOT NULL, -- ชื่อยา/สาร
    type ENUM('drug','food','environmental','other') NOT NULL,
    severity ENUM('mild','moderate','severe','life-threatening') NOT NULL,
    reaction VARCHAR(500) NOT NULL, -- อาการที่เกิด
    notes TEXT,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    INDEX idx_patient (patient_id)
);
```

#### 1.7 Audit Logs Table (ตารางบันทึกการใช้งาน)
```sql
CREATE TABLE audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    user_name VARCHAR(200) NOT NULL,
    action ENUM('LOGIN','LOGOUT','CREATE','UPDATE','VIEW','DELETE','PRINT','EXPORT') NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id VARCHAR(36),
    details TEXT,
    ip_address VARCHAR(45), -- IPv4/IPv6
    user_agent TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- ห้าม DELETE หรือ UPDATE rows นี้ (WORM)
    INDEX idx_timestamp (timestamp DESC),
    INDEX idx_user (user_id, timestamp DESC),
    INDEX idx_action (action, timestamp DESC)
) ENGINE=InnoDB;
```

---

### 2. ระบบความปลอดภัย (Security) - ไม่มีเลย

**ปัญหาปัจจุบัน:**
- ไม่มีระบบ login/logout
- ไม่มี session management
- ไม่มี RBAC (Role-Based Access Control)
- ไม่มี audit logging
- Hardcoded user info ใน sidebar

**ต้องสร้าง:**

#### 2.1 Authentication System
```php
// app/Controllers/AuthController.php
class AuthController {
    public function login() {
        // Rate limiting check
        // Prepared statement สำหรับ login
        // Password verification ด้วย bcrypt
        // Session management
        // Audit logging
    }
    
    public function logout() {
        // Session destroy
        // Audit logging
    }
}
```

#### 2.2 RBAC Middleware
```php
// app/Middleware/RBACMiddleware.php
$PERMISSIONS = [
    '/dashboard'      => ['admin','doctor','nurse','receptionist','pharmacist','lab_technician'],
    '/patients'       => ['admin','doctor','nurse','receptionist'],
    '/visits'         => ['admin','doctor','nurse'],
    '/clinical'       => ['admin','doctor','nurse'],
    '/prescriptions'  => ['admin','doctor','pharmacist'],
    '/lab'            => ['admin','doctor','lab_technician'],
];
```

#### 2.3 Session Management
```php
// Session timeout 15 นาที (ตามมาตรฐาน EMR)
$idleTimeout = 15 * 60;
if (isset($_SESSION['last_activity']) && 
    (time() - $_SESSION['last_activity']) > $idleTimeout) {
    session_destroy();
    header('Location: /login?reason=timeout');
    exit;
}
```

---

### 3. โมดูลคลินิกที่ขาดหายไป

#### 3.1 Patient Registration Module
**ต้องสร้าง:**
- `pages/patient_register.php` - ฟอร์มลงทะเบียนผู้ป่วย
- `services/patient_api.php` - API สำหรับจัดการข้อมูลผู้ป่วย
- Validation สำหรับเลขบัตรปชช., อายุ, ข้อมูลที่อยู่

#### 3.2 Visit Management Module
**ต้องสร้าง:**
- `pages/visit_create.php` - สร้างการตรวจใหม่
- `pages/visit_detail.php` - รายละเอียดการตรวจ
- `services/visit_api.php` - API จัดการ visit

#### 3.3 Vitals Recording Module
**ต้องสร้าง:**
- ฟอร์มบันทึกสัญญาณชีพ (BP, Temp, Pulse, etc.)
- Auto-calculate BMI
- BP status classification
- Vitals history chart

#### 3.4 SOAP Notes Module
**ต้องสร้าง:**
- Text editor สำหรับ Subjective, Objective, Assessment, Plan
- Auto-save functionality
- Template system
- Digital signature (optional)

#### 3.5 Allergy Management Module
**ต้องสร้าง:**
- ฟอร์มบันทึกประวัติแพ้
- **Drug Allergy Alert System** (สำคัญมาก!)
- Allergy summary display

---

### 4. Clinical Decision Support (CDS) - สำคัญต่อชีวิต

#### 4.1 Drug Allergy Check (CRITICAL)
```php
// app/Helpers/ClinicalHelper.php
public static function checkDrugAllergy(string $patientId, string $drugName, PDO $db): array {
    // ตรวจสอบยาที่สั่งกับประวัติแพ้
    // Return: hasAllergy, severity, substance, reaction
    // ต้องทำงาน 100% ถูกต้อง (ถ้าพลาด = คนตาย)
}
```

#### 4.2 Critical Values Alert
```php
// แจ้งเตือนค่าวิกฤต (Lab results, Vitals)
public static function checkCriticalValues(array $vitals): array {
    // BP crisis, Oxygen desaturation, etc.
}
```

---

### 5. โครงสร้างโค้ดที่ต้องปรับปรุง

#### 5.1 MVC Structure
**ปัจจุบัน:** ทุกอย่างอยู่ที่ root level  
**ต้องเปลี่ยนเป็น:**
```
emr/
├── public/
│   ├── index.php          ← Front controller
│   └── assets/
├── app/
│   ├── Controllers/
│   ├── Models/
│   ├── Views/
│   ├── Middleware/
│   └── Helpers/
├── config/
└── routes/
```

#### 5.2 Security Issues
**ปัญหา:**
- ไม่มี prepared statements ในหลายจุด
- ไม่มี input validation
- ไม่มี XSS protection
- ไม่มี CSRF protection

**ต้องแก้:**
```php
// ใช้ prepared statements ทุกที่
$stmt = $pdo->prepare("SELECT * FROM patients WHERE hn = ? LIMIT 1");
$stmt->execute([$hn]);

// Input validation
$hn = filter_input(INPUT_POST, 'hn', FILTER_SANITIZE_STRING);

// XSS protection
echo htmlspecialchars($patient['name'], ENT_QUOTES, 'UTF-8');
```

---

### 6. UI/UX Issues

#### 6.1 Navigation Problems
**ปัจจุบัน:** มีแค่ 3 เมนู (ค้นหาผู้ป่วย, เอกสาร, อัปโหลด)  
**ต้องเพิ่ม:**
- Dashboard
- Patient Registration
- Visit Management
- Clinical Notes
- Prescriptions
- Lab Orders
- User Management
- Audit Logs

#### 6.2 Responsive Design
- รองรับ tablet (iPad) สำหรับแพทย์
- Touch-friendly interface
- Mobile support for nurses

#### 6.3 Clinical Forms
- Smart forms with auto-complete
- Validation แบบ real-time
- Error handling ที่ชัดเจน
- Loading states

---

## 📋 Action Plan (ลำดับการแก้ไข)

### Phase 1: Foundation (1-2 weeks)
1. ✅ **Database Schema Creation**
   - สร้างตารางทั้งหมดที่จำเป็น
   - Migrate existing documents data
   - Add proper indexes

2. ✅ **Authentication System**
   - Login/logout functionality
   - Session management
   - Password hashing

3. ✅ **Basic MVC Structure**
   - Reorganize file structure
   - Create controllers, models, views
   - Setup routing

### Phase 2: Core Clinical (2-3 weeks)
4. ✅ **Patient Registration**
   - Registration form
   - Patient search enhancement
   - Patient profile page

5. ✅ **Visit Management**
   - Create visit workflow
   - Visit list and details
   - Status tracking

6. ✅ **Vitals Recording**
   - Vitals form
   - Auto-calculations
   - History view

### Phase 3: Clinical Safety (2-3 weeks)
7. ✅ **SOAP Notes**
   - Note editor
   - Templates
   - Version control

8. ✅ **Allergy Management**
   - Allergy recording
   - **Drug Allergy Alerts** (CRITICAL)
   - Allergy summary

9. ✅ **Audit Logging**
   - Log all actions
   - WORM implementation
   - Audit reports

### Phase 4: Advanced Features (3-4 weeks)
10. ✅ **Prescriptions**
    - Drug database
    - e-prescribing
    - Interaction checks

11. ✅ **Lab Integration**
    - Lab orders
    - Results entry
    - Critical value alerts

12. ✅ **Reporting & Analytics**
    - Clinical reports
    - KPI dashboard
    - Export functionality

---

## ⚠️ Critical Safety Requirements

### ก่อน Go-Live ต้องมี:
1. **Drug Allergy Alert** ทำงาน 100% ถูกต้อง
2. **Audit Log** สมบูรณ์และแก้ไขไม่ได้ (WORM)
3. **Session Timeout** บังคับ 15 นาที
4. **HTTPS** บังคับทุก request
5. **Input Validation** ทุกจุด
6. **Prepared Statements** ทุก database query

### ห้ามพลาด:
- การตรวจสอบสิทธิ์ทุกหน้า
- การบันทึก audit log ทุก action
- การแจ้งเตือน drug allergy
- การ validate ข้อมูลก่อนบันทึก
- การ encrypt ข้อมูลสำคัญ

---

## 📊 Current vs Target State

| Component | Current State | Target State |
|-----------|---------------|--------------|
| Database | 1 table (documents) | 7+ core tables |
| Authentication | ❌ None | ✅ JWT/Session + RBAC |
| Patient Mgmt | 🔍 Search only | ✅ Full CRUD |
| Clinical Workflows | ❌ None | ✅ Visits, SOAP, Vitals |
| Safety Features | ❌ None | ✅ Allergy alerts, Audit |
| UI/UX | 📄 Basic document viewer | 🏥 Full EMR interface |
| Security | 🔓 No security | 🔒 Enterprise security |
| Compliance | ❌ Not compliant | ✅ PDPA, Medical standards |

---

## 🎯 Success Metrics

### Technical Metrics:
- [ ] All core EMR modules functional
- [ ] Security audit passed
- [ ] Performance: < 2s page load
- [ ] 99.9% uptime target
- [ ] Zero SQL injection vulnerabilities

### Clinical Metrics:
- [ ] Drug allergy accuracy: 100%
- [ ] Audit log completeness: 100%
- [ ] User satisfaction: > 4.5/5
- [ ] Error rate: < 0.1%
- [ ] Training completion: 100%

---

**สรุป:** โปรเจกต์นี้ต้องการการปรับโครงสร้างครั้งใหญ่เพื่อให้กลายเป็น EMR ที่ใช้งานได้จริง ไม่ใช่แค่ระบบจัดการเอกสาร โดยเฉพาะด้านความปลอดภัยทางการแพทย์และโมดูลคลินิกที่จำเป็นต่อการดูแลผู้ป่วย
