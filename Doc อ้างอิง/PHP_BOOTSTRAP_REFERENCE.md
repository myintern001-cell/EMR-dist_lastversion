# PHP + JS + CSS + HTML + Bootstrap 5 — EMR Reference Guide
**คู่มืออ้างอิงสำหรับนักพัฒนาที่ใช้ PHP Stack ในการสร้างระบบ EMR**

> คู่มือนี้อ้างอิงจากโครงสร้างของระบบ MedRecord EMR (Next.js version)  
> และแปลงแนวคิดให้ใช้กับ PHP + Bootstrap 5 ได้โดยตรง

---

## 1. โครงสร้างโปรเจกต์ที่แนะนำ (PHP MVC)

```
emr-php/
├── public/                  ← document root (เปิดให้ web server)
│   ├── index.php            ← entry point / front controller
│   ├── assets/
│   │   ├── css/
│   │   │   └── app.css      ← custom styles
│   │   ├── js/
│   │   │   ├── app.js       ← main JS
│   │   │   └── modules/     ← JS per module
│   │   └── images/
│   └── uploads/             ← ไฟล์อัพโหลด (ต้อง chmod 755)
│
├── app/
│   ├── Controllers/
│   │   ├── AuthController.php
│   │   ├── PatientController.php
│   │   ├── VisitController.php
│   │   ├── PrescriptionController.php
│   │   ├── LabController.php
│   │   └── UserController.php
│   ├── Models/
│   │   ├── Patient.php
│   │   ├── Visit.php
│   │   ├── Prescription.php
│   │   ├── LabOrder.php
│   │   └── User.php
│   ├── Views/
│   │   ├── layouts/
│   │   │   ├── main.php     ← main layout (sidebar + topbar)
│   │   │   └── auth.php     ← layout สำหรับ login
│   │   ├── patients/
│   │   │   ├── index.php
│   │   │   ├── show.php
│   │   │   └── create.php
│   │   ├── visits/
│   │   └── ...
│   ├── Middleware/
│   │   ├── AuthMiddleware.php   ← ตรวจสอบ session
│   │   └── RBACMiddleware.php   ← ตรวจสอบ role
│   └── Helpers/
│       ├── DateHelper.php
│       ├── SecurityHelper.php
│       └── FormatHelper.php
│
├── config/
│   ├── database.php
│   ├── app.php
│   └── roles.php             ← กำหนด permissions ต่อ role
│
├── routes/
│   └── web.php               ← routing table
│
├── database/
│   ├── migrations/           ← SQL migration files
│   └── seeds/                ← ข้อมูล mock สำหรับ dev
│
└── vendor/                   ← Composer packages
```

---

## 2. อ้างอิง Data Types จาก EMR System นี้

### 2.1 โครงสร้าง Database (อ้างอิงจาก `lib/types.ts`)

```sql
-- ========================================
-- PATIENTS TABLE
-- อ้างอิงจาก: interface Patient ใน types.ts
-- ========================================
CREATE TABLE patients (
    id          VARCHAR(36) PRIMARY KEY,
    hn          VARCHAR(20) UNIQUE NOT NULL,    -- Hospital Number (auto-gen)
    prefix      VARCHAR(20) NOT NULL,
    first_name  VARCHAR(100) NOT NULL,
    last_name   VARCHAR(100) NOT NULL,
    id_card     VARCHAR(13) UNIQUE,             -- เลขบัตรปชช.
    date_of_birth DATE NOT NULL,
    gender      ENUM('male','female','other') NOT NULL,
    blood_type  ENUM('A','B','AB','O','A+','A-','B+','B-','AB+','AB-','O+','O-'),
    phone       VARCHAR(20) NOT NULL,
    email       VARCHAR(255),
    address     TEXT,
    district    VARCHAR(100),
    province    VARCHAR(100),
    postal_code VARCHAR(10),
    nationality VARCHAR(50) DEFAULT 'Thai',
    religion    VARCHAR(50),
    occupation  VARCHAR(100),
    -- Emergency Contact
    emerg_contact_name      VARCHAR(200),
    emerg_contact_phone     VARCHAR(20),
    emerg_contact_relation  VARCHAR(100),
    -- Meta
    is_active   TINYINT(1) DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME ON UPDATE CURRENT_TIMESTAMP,
    created_by  VARCHAR(36),
    INDEX idx_hn (hn),
    INDEX idx_name (first_name, last_name),
    INDEX idx_idcard (id_card)
);

-- ========================================
-- ALLERGIES TABLE
-- อ้างอิงจาก: interface Allergy ใน types.ts
-- ========================================
CREATE TABLE allergies (
    id          VARCHAR(36) PRIMARY KEY,
    patient_id  VARCHAR(36) NOT NULL,
    substance   VARCHAR(200) NOT NULL,          -- ชื่อยา/สาร
    type        ENUM('drug','food','environmental','other') NOT NULL,
    severity    ENUM('mild','moderate','severe','life-threatening') NOT NULL,
    reaction    VARCHAR(500) NOT NULL,          -- อาการที่เกิด
    notes       TEXT,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    INDEX idx_patient (patient_id)
);

-- ========================================
-- VISITS TABLE
-- อ้างอิงจาก: interface Visit ใน types.ts
-- ========================================
CREATE TABLE visits (
    id              VARCHAR(36) PRIMARY KEY,
    visit_number    VARCHAR(20) UNIQUE NOT NULL,  -- VN (Visit Number)
    patient_id      VARCHAR(36) NOT NULL,
    doctor_id       VARCHAR(36) NOT NULL,
    visit_date      DATETIME NOT NULL,
    visit_type      ENUM('OPD','IPD','Emergency','Telemedicine') NOT NULL,
    department      VARCHAR(100) NOT NULL,
    chief_complaint TEXT NOT NULL,
    status          ENUM('scheduled','waiting','in_progress','completed','cancelled') DEFAULT 'waiting',
    discharge_date  DATETIME,
    discharge_type  ENUM('home','refer','ama','death'),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES users(id),
    INDEX idx_patient_date (patient_id, visit_date DESC),
    INDEX idx_date (visit_date),
    INDEX idx_status (status),
    INDEX idx_doctor (doctor_id, visit_date)
);

-- ========================================
-- VITALS TABLE
-- อ้างอิงจาก: interface Vitals ใน types.ts
-- ========================================
CREATE TABLE vitals (
    id                  VARCHAR(36) PRIMARY KEY,
    visit_id            VARCHAR(36) UNIQUE NOT NULL,
    temperature         DECIMAL(4,1),           -- °C
    pulse               SMALLINT,               -- bpm
    respiratory_rate    SMALLINT,               -- ครั้ง/นาที
    systolic_bp         SMALLINT,               -- mmHg
    diastolic_bp        SMALLINT,               -- mmHg
    oxygen_saturation   DECIMAL(4,1),           -- %
    weight              DECIMAL(5,1),           -- kg
    height              DECIMAL(5,1),           -- cm
    bmi                 DECIMAL(4,1),           -- คำนวณ
    pain_score          TINYINT,                -- 0-10
    blood_glucose       DECIMAL(6,1),
    recorded_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    recorded_by         VARCHAR(36),
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE
);

-- ========================================
-- SOAP NOTES TABLE
-- อ้างอิงจาก: interface SOAPNote ใน types.ts
-- ========================================
CREATE TABLE soap_notes (
    id          VARCHAR(36) PRIMARY KEY,
    visit_id    VARCHAR(36) UNIQUE NOT NULL,
    subjective  TEXT,                           -- S: ประวัติ/อาการ
    objective   TEXT,                           -- O: ตรวจร่างกาย
    assessment  TEXT,                           -- A: วินิจฉัย
    plan        TEXT,                           -- P: แผนการรักษา
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME ON UPDATE CURRENT_TIMESTAMP,
    written_by  VARCHAR(36),
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE
);

-- ========================================
-- DIAGNOSES TABLE (ICD-10)
-- อ้างอิงจาก: interface Diagnosis ใน types.ts
-- ========================================
CREATE TABLE diagnoses (
    id          VARCHAR(36) PRIMARY KEY,
    visit_id    VARCHAR(36) NOT NULL,
    icd10_code  VARCHAR(10) NOT NULL,
    description VARCHAR(500) NOT NULL,
    type        ENUM('primary','secondary','complication','differential') NOT NULL,
    status      ENUM('active','resolved','chronic') DEFAULT 'active',
    diagnosed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE,
    INDEX idx_visit (visit_id),
    INDEX idx_code (icd10_code)
);

-- ========================================
-- PRESCRIPTIONS & MEDICATIONS
-- อ้างอิงจาก: interface Prescription, MedicationItem ใน types.ts
-- ========================================
CREATE TABLE prescriptions (
    id              VARCHAR(36) PRIMARY KEY,
    visit_id        VARCHAR(36) NOT NULL,
    patient_id      VARCHAR(36) NOT NULL,
    prescribed_by   VARCHAR(36) NOT NULL,
    status          ENUM('pending','dispensed','cancelled') DEFAULT 'pending',
    prescribed_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    dispensed_at    DATETIME,
    dispensed_by    VARCHAR(36),
    notes           TEXT,
    FOREIGN KEY (visit_id) REFERENCES visits(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    INDEX idx_visit (visit_id),
    INDEX idx_status (status)
);

CREATE TABLE medication_items (
    id              VARCHAR(36) PRIMARY KEY,
    prescription_id VARCHAR(36) NOT NULL,
    drug_code       VARCHAR(20),
    drug_name       VARCHAR(200) NOT NULL,
    generic_name    VARCHAR(200),
    form            VARCHAR(50),                -- tablet, capsule, syrup
    strength        VARCHAR(50),               -- 500mg
    dose            VARCHAR(100),              -- 1 เม็ด
    frequency       VARCHAR(100),             -- วันละ 2 ครั้ง
    duration        VARCHAR(50),              -- 7 วัน
    quantity        INT,
    route           ENUM('oral','iv','im','topical','sublingual','inhaled') DEFAULT 'oral',
    instructions    TEXT,
    is_narcotic     TINYINT(1) DEFAULT 0,
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
);

-- ========================================
-- LAB ORDERS & RESULTS
-- อ้างอิงจาก: interface LabOrder, LabTest ใน types.ts
-- ========================================
CREATE TABLE lab_orders (
    id              VARCHAR(36) PRIMARY KEY,
    visit_id        VARCHAR(36) NOT NULL,
    patient_id      VARCHAR(36) NOT NULL,
    ordered_by      VARCHAR(36) NOT NULL,
    status          ENUM('ordered','processing','resulted','cancelled') DEFAULT 'ordered',
    priority        ENUM('routine','urgent','stat') DEFAULT 'routine',
    ordered_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    resulted_at     DATETIME,
    notes           TEXT,
    FOREIGN KEY (visit_id) REFERENCES visits(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    INDEX idx_visit (visit_id),
    INDEX idx_status_priority (status, priority)
);

CREATE TABLE lab_tests (
    id              VARCHAR(36) PRIMARY KEY,
    lab_order_id    VARCHAR(36) NOT NULL,
    test_code       VARCHAR(20) NOT NULL,
    test_name       VARCHAR(200) NOT NULL,
    category        VARCHAR(100),
    status          ENUM('pending','resulted') DEFAULT 'pending',
    result          VARCHAR(200),
    unit            VARCHAR(50),
    reference_range VARCHAR(100),
    flag            ENUM('H','L','HH','LL','A'),  -- High/Low/Critical
    resulted_at     DATETIME,
    FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id) ON DELETE CASCADE,
    INDEX idx_order (lab_order_id),
    INDEX idx_flag (flag)
);

-- ========================================
-- USERS TABLE
-- อ้างอิงจาก: interface User ใน types.ts
-- ========================================
CREATE TABLE users (
    id              VARCHAR(36) PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,       -- bcrypt
    role            ENUM('admin','doctor','nurse','receptionist','pharmacist','lab_technician') NOT NULL,
    department      VARCHAR(100),
    license_number  VARCHAR(50),                 -- เลขใบประกอบวิชาชีพ
    phone           VARCHAR(20),
    is_active       TINYINT(1) DEFAULT 1,
    last_login      DATETIME,
    login_attempts  TINYINT DEFAULT 0,
    locked_until    DATETIME,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- ========================================
-- AUDIT LOGS TABLE
-- อ้างอิงจาก: interface AuditLog ใน types.ts
-- ========================================
CREATE TABLE audit_logs (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     VARCHAR(36) NOT NULL,
    user_name   VARCHAR(200) NOT NULL,
    action      ENUM('LOGIN','LOGOUT','CREATE','UPDATE','VIEW','DELETE','PRINT','EXPORT') NOT NULL,
    resource    VARCHAR(100) NOT NULL,
    resource_id VARCHAR(36),
    details     TEXT,
    ip_address  VARCHAR(45),                     -- IPv4/IPv6
    user_agent  TEXT,
    timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- ห้าม DELETE หรือ UPDATE rows นี้ (WORM)
    INDEX idx_timestamp (timestamp DESC),
    INDEX idx_user (user_id, timestamp DESC),
    INDEX idx_action (action, timestamp DESC)
) ENGINE=InnoDB;
```

---

## 3. PHP Code Patterns — อ้างอิงจากระบบนี้

### 3.1 Authentication (อ้างอิงจาก `lib/store.ts` → `login()`)

```php
<?php
// app/Controllers/AuthController.php

class AuthController {
    
    public function login(): void {
        $email    = filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL);
        $password = $_POST['password'] ?? '';

        // Rate limiting check
        if ($this->isRateLimited($email)) {
            $this->jsonError('Too many login attempts. Try again later.', 429);
            return;
        }

        // ดึง user จาก DB โดยใช้ Prepared Statement เสมอ
        $stmt = $this->db->prepare(
            "SELECT id, name, email, password_hash, role, is_active, login_attempts, locked_until
             FROM users WHERE email = ? LIMIT 1"
        );
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        // ตรวจสอบบัญชีถูก lock
        if ($user && $user['locked_until'] && strtotime($user['locked_until']) > time()) {
            $this->jsonError('Account locked. Please contact admin.', 423);
            return;
        }

        // Verify password ด้วย bcrypt
        if (!$user || !password_verify($password, $user['password_hash'])) {
            $this->incrementLoginAttempts($email);
            $this->auditLog(null, 'LOGIN', 'auth', $email, 'FAILED: ' . $_SERVER['REMOTE_ADDR']);
            $this->jsonError('Invalid credentials', 401);
            return;
        }

        if (!$user['is_active']) {
            $this->jsonError('Account is disabled', 403);
            return;
        }

        // Reset login attempts
        $this->db->prepare("UPDATE users SET login_attempts = 0, last_login = NOW() WHERE id = ?")
                 ->execute([$user['id']]);

        // สร้าง Session
        session_regenerate_id(true); // ป้องกัน session fixation
        $_SESSION['user_id']   = $user['id'];
        $_SESSION['user_name'] = $user['name'];
        $_SESSION['user_role'] = $user['role'];
        $_SESSION['login_at']  = time();

        $this->auditLog($user['id'], 'LOGIN', 'auth', $user['id'], 'SUCCESS');

        $this->jsonSuccess(['redirect' => '/dashboard']);
    }

    private function incrementLoginAttempts(string $email): void {
        $this->db->prepare(
            "UPDATE users SET login_attempts = login_attempts + 1,
             locked_until = IF(login_attempts >= 4, DATE_ADD(NOW(), INTERVAL 15 MINUTE), locked_until)
             WHERE email = ?"
        )->execute([$email]);
    }
}
```

### 3.2 RBAC Middleware (อ้างอิงจาก role system ใน `sidebar.tsx` และ `main-layout.tsx`)

```php
<?php
// app/Middleware/RBACMiddleware.php

// กำหนดสิทธิ์ต่อ route (อ้างอิงจาก sidebar nav ใน emr-system)
$PERMISSIONS = [
    '/dashboard'      => ['admin','doctor','nurse','receptionist','pharmacist','lab_technician'],
    '/patients'       => ['admin','doctor','nurse','receptionist'],
    '/visits'         => ['admin','doctor','nurse'],
    '/clinical'       => ['admin','doctor','nurse'],
    '/prescriptions'  => ['admin','doctor','pharmacist'],
    '/lab'            => ['admin','doctor','lab_technician'],
    '/ward'           => ['admin','doctor','nurse'],
    '/reports'        => ['admin'],
    '/users'          => ['admin'],
    '/audit'          => ['admin'],
];

class RBACMiddleware {
    
    public static function check(string $route): void {
        global $PERMISSIONS;
        
        // ตรวจสอบว่า login แล้วหรือยัง
        if (empty($_SESSION['user_id'])) {
            header('Location: /login');
            exit;
        }
        
        // Session timeout 15 นาที (ตามมาตรฐาน EMR)
        $idleTimeout = 15 * 60;
        if (isset($_SESSION['last_activity']) && 
            (time() - $_SESSION['last_activity']) > $idleTimeout) {
            session_destroy();
            header('Location: /login?reason=timeout');
            exit;
        }
        $_SESSION['last_activity'] = time();
        
        // ตรวจสอบสิทธิ์
        $userRole   = $_SESSION['user_role'];
        $allowed    = $PERMISSIONS[$route] ?? [];
        
        if (!empty($allowed) && !in_array($userRole, $allowed)) {
            http_response_code(403);
            include 'app/Views/errors/403.php';
            exit;
        }
    }
}
```

### 3.3 Drug Allergy Check (อ้างอิงจาก prescriptions page logic)

```php
<?php
// app/Helpers/ClinicalHelper.php

class ClinicalHelper {
    
    /**
     * ตรวจสอบว่ายาที่สั่งตรงกับประวัติแพ้ของผู้ป่วยหรือไม่
     * อ้างอิงจาก handleAddToCart() ใน visits/[id]/page.tsx
     */
    public static function checkDrugAllergy(
        string $patientId,
        string $genericName,
        PDO $db
    ): array {
        $stmt = $db->prepare(
            "SELECT id, substance, severity, reaction 
             FROM allergies 
             WHERE patient_id = ? 
             AND type = 'drug'
             AND (
                 LOWER(substance) LIKE LOWER(CONCAT('%', ?, '%'))
                 OR LOWER(?) LIKE LOWER(CONCAT('%', substance, '%'))
             )"
        );
        $stmt->execute([$patientId, $genericName, $genericName]);
        $match = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($match) {
            return [
                'hasAllergy' => true,
                'severity'   => $match['severity'],
                'substance'  => $match['substance'],
                'reaction'   => $match['reaction'],
                'isLifeThreatening' => $match['severity'] === 'life-threatening',
            ];
        }
        
        return ['hasAllergy' => false];
    }
    
    /**
     * คำนวณ BMI
     * อ้างอิงจาก calculateBMI() ใน lib/utils.ts
     */
    public static function calculateBMI(float $weight, float $height): float {
        if ($height <= 0) return 0;
        $heightM = $height / 100;
        return round($weight / ($heightM * $heightM), 1);
    }
    
    /**
     * ประเมิน Blood Pressure
     * อ้างอิงจาก getBloodPressureStatus() ใน lib/utils.ts
     */
    public static function getBPStatus(int $systolic, int $diastolic): array {
        if ($systolic >= 180 || $diastolic >= 120) {
            return ['label' => 'Hypertensive Crisis', 'class' => 'text-danger fw-bold'];
        }
        if ($systolic >= 140 || $diastolic >= 90) {
            return ['label' => 'Hypertension Stage 2', 'class' => 'text-danger'];
        }
        if ($systolic >= 130 || $diastolic >= 80) {
            return ['label' => 'Hypertension Stage 1', 'class' => 'text-warning'];
        }
        if ($systolic >= 120 && $diastolic < 80) {
            return ['label' => 'Elevated', 'class' => 'text-warning'];
        }
        return ['label' => 'Normal', 'class' => 'text-success'];
    }
    
    /**
     * Generate HN (Hospital Number)
     * อ้างอิงจาก generateHN() ใน lib/utils.ts
     */
    public static function generateHN(): string {
        $year = date('y');
        $rand = str_pad(mt_rand(0, 99999), 5, '0', STR_PAD_LEFT);
        return "HN{$year}{$rand}";
    }
    
    /**
     * Generate Visit Number
     * อ้างอิงจาก generateVisitNumber() ใน lib/utils.ts
     */
    public static function generateVN(): string {
        $date = date('Ymd');
        $rand = str_pad(mt_rand(0, 9999), 4, '0', STR_PAD_LEFT);
        return "VN{$date}{$rand}";
    }
}
```

### 3.4 Audit Log Helper (อ้างอิงจาก `addAuditLog()` ใน `lib/store.ts`)

```php
<?php
// app/Helpers/AuditHelper.php

class AuditHelper {
    
    /**
     * บันทึก Audit Log — เรียกทุกครั้งที่ทำ action
     * อ้างอิงจาก AuditLog interface ใน lib/types.ts
     */
    public static function log(
        PDO $db,
        ?string $userId,
        string $action,       // LOGIN, CREATE, UPDATE, VIEW, DELETE
        string $resource,     // 'patient', 'visit', 'prescription'
        string $resourceId,
        string $details = ''
    ): void {
        $stmt = $db->prepare(
            "INSERT INTO audit_logs 
             (user_id, user_name, action, resource, resource_id, details, ip_address, user_agent)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $userId ?? 'system',
            $_SESSION['user_name'] ?? 'system',
            $action,
            $resource,
            $resourceId,
            $details,
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? '',
        ]);
    }
}

// ตัวอย่างการใช้งาน:
// AuditHelper::log($db, $_SESSION['user_id'], 'VIEW', 'patient', $patientId, "Viewed by {$_SESSION['user_name']}");
// AuditHelper::log($db, $_SESSION['user_id'], 'CREATE', 'visit', $visitId, "New visit VN: {$visitNumber}");
```

---

## 4. HTML + Bootstrap 5 Templates

### 4.1 Main Layout (อ้างอิงจาก `components/layout/main-layout.tsx`)

```html
<!-- app/Views/layouts/main.php -->
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle ?? 'EMR System') ?></title>
    <!-- Bootstrap 5 -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Bootstrap Icons -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
    <!-- Noto Sans Thai (อ้างอิงจาก Sarabun font ใน layout.tsx) -->
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link href="/assets/css/app.css" rel="stylesheet">
</head>
<body>
    <div class="d-flex" style="min-height: 100vh;">
        <!-- Sidebar (อ้างอิงจาก components/layout/sidebar.tsx) -->
        <nav class="sidebar bg-white border-end shadow-sm" style="width: 240px; min-height: 100vh;">
            <!-- Logo -->
            <div class="p-3 border-bottom">
                <div class="d-flex align-items-center gap-2">
                    <div class="bg-primary rounded-2 p-2">
                        <i class="bi bi-heart-pulse-fill text-white"></i>
                    </div>
                    <div>
                        <div class="fw-bold text-dark small">MedRecord</div>
                        <div class="text-muted" style="font-size:10px;">EMR System</div>
                    </div>
                </div>
            </div>
            
            <!-- Nav Links -->
            <div class="p-2">
                <?php
                // อ้างอิงจาก navItems ใน sidebar.tsx
                $navItems = [
                    ['href' => '/dashboard',     'icon' => 'bi-grid',           'label' => 'Dashboard',
                     'roles' => ['admin','doctor','nurse','receptionist','pharmacist','lab_technician']],
                    ['href' => '/patients',      'icon' => 'bi-people',         'label' => 'ผู้ป่วย',
                     'roles' => ['admin','doctor','nurse','receptionist']],
                    ['href' => '/visits',        'icon' => 'bi-calendar3',      'label' => 'การตรวจ',
                     'roles' => ['admin','doctor','nurse']],
                    ['href' => '/clinical',      'icon' => 'bi-stethoscope',    'label' => 'คลินิก',
                     'roles' => ['admin','doctor','nurse']],
                    ['href' => '/prescriptions', 'icon' => 'bi-capsule',        'label' => 'ใบสั่งยา',
                     'roles' => ['admin','doctor','pharmacist']],
                    ['href' => '/lab',           'icon' => 'bi-eyedropper',     'label' => 'Lab',
                     'roles' => ['admin','doctor','lab_technician']],
                    ['href' => '/ward',          'icon' => 'bi-building',       'label' => 'Ward/IPD',
                     'roles' => ['admin','doctor','nurse']],
                    ['href' => '/reports',       'icon' => 'bi-bar-chart',      'label' => 'รายงาน',
                     'roles' => ['admin']],
                    ['href' => '/users',         'icon' => 'bi-people-fill',    'label' => 'ผู้ใช้',
                     'roles' => ['admin']],
                    ['href' => '/audit',         'icon' => 'bi-shield-check',   'label' => 'Audit Log',
                     'roles' => ['admin']],
                ];
                $currentPath = strtok($_SERVER['REQUEST_URI'], '?');
                foreach ($navItems as $item):
                    if (!in_array($_SESSION['user_role'] ?? '', $item['roles'])) continue;
                    $active = str_starts_with($currentPath, $item['href']) ? 'active' : '';
                ?>
                <a href="<?= $item['href'] ?>" 
                   class="nav-link d-flex align-items-center gap-2 px-3 py-2 rounded-2 mb-1 <?= $active ? 'bg-primary text-white' : 'text-secondary' ?>">
                    <i class="bi <?= $item['icon'] ?>"></i>
                    <span class="small fw-medium"><?= $item['label'] ?></span>
                </a>
                <?php endforeach; ?>
            </div>
            
            <!-- User info + logout (อ้างอิงจาก sidebar.tsx ส่วน bottom) -->
            <div class="p-3 border-top mt-auto position-absolute bottom-0 w-100">
                <div class="d-flex align-items-center gap-2 mb-2">
                    <div class="bg-secondary rounded-circle d-flex align-items-center justify-content-center text-white" 
                         style="width:32px;height:32px;font-size:12px;font-weight:bold;">
                        <?= strtoupper(substr($_SESSION['user_name'] ?? 'U', 0, 1)) ?>
                    </div>
                    <div>
                        <div class="small fw-medium text-dark"><?= htmlspecialchars($_SESSION['user_name'] ?? '') ?></div>
                        <div class="text-muted" style="font-size:10px;"><?= htmlspecialchars($_SESSION['user_role'] ?? '') ?></div>
                    </div>
                </div>
                <a href="/logout" class="btn btn-sm btn-outline-secondary w-100">
                    <i class="bi bi-box-arrow-right me-1"></i>ออกจากระบบ
                </a>
            </div>
        </nav>
        
        <!-- Main content -->
        <div class="flex-fill d-flex flex-column bg-light">
            <!-- Top bar (อ้างอิงจาก components/layout/topbar.tsx) -->
            <header class="bg-white border-bottom px-4 py-3 d-flex align-items-center justify-content-between">
                <h5 class="mb-0 fw-semibold text-dark"><?= htmlspecialchars($pageTitle ?? '') ?></h5>
                <div class="d-flex align-items-center gap-3 text-muted small">
                    <span><i class="bi bi-clock me-1"></i><span id="currentTime"></span></span>
                    <span class="fw-medium text-dark"><?= htmlspecialchars($_SESSION['user_name'] ?? '') ?></span>
                </div>
            </header>
            
            <!-- Page content -->
            <main class="flex-fill p-4">
                <?= $content ?? '' ?>
            </main>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="/assets/js/app.js"></script>
    <script>
        // Live clock (อ้างอิงจาก topbar.tsx)
        function updateTime() {
            document.getElementById('currentTime').textContent = 
                new Date().toLocaleTimeString('th-TH');
        }
        updateTime();
        setInterval(updateTime, 1000);
    </script>
</body>
</html>
```

### 4.2 Patient List Page (อ้างอิงจาก `app/patients/page.tsx`)

```html
<!-- app/Views/patients/index.php -->
<!-- ใส่ใน layout main.php -->

<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h5 class="fw-semibold mb-0">ทะเบียนผู้ป่วย</h5>
        <small class="text-muted">ทั้งหมด <?= $totalPatients ?> ราย</small>
    </div>
    <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#addPatientModal">
        <i class="bi bi-plus-lg me-1"></i>ลงทะเบียนผู้ป่วย
    </button>
</div>

<!-- Search bar (อ้างอิงจาก search state ใน patients/page.tsx) -->
<div class="card shadow-sm mb-4">
    <div class="card-body p-3">
        <div class="row g-2">
            <div class="col-md-6">
                <div class="input-group">
                    <span class="input-group-text"><i class="bi bi-search"></i></span>
                    <input type="text" class="form-control" id="searchInput" 
                           placeholder="ค้นหาชื่อ, นามสกุล, HN, เลขบัตรปชช...">
                </div>
            </div>
            <div class="col-md-3">
                <select class="form-select" id="genderFilter">
                    <option value="">ทุกเพศ</option>
                    <option value="male">ชาย</option>
                    <option value="female">หญิง</option>
                </select>
            </div>
        </div>
    </div>
</div>

<!-- Patient Table -->
<div class="card shadow-sm">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0" id="patientsTable">
                <thead class="table-light">
                    <tr>
                        <th class="px-4 py-3">ผู้ป่วย / HN</th>
                        <th>อายุ / เพศ</th>
                        <th>เบอร์โทร</th>
                        <th>หมู่เลือด</th>
                        <th>แพ้ยา</th>
                        <th>สถานะ</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ($patients as $patient): ?>
                    <tr data-name="<?= htmlspecialchars($patient['first_name'] . ' ' . $patient['last_name']) ?>"
                        data-gender="<?= $patient['gender'] ?>">
                        <td class="px-4">
                            <div class="d-flex align-items-center gap-3">
                                <div class="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                                     style="width:38px;height:38px;background:<?= $patient['gender']==='male' ? '#3b82f6' : '#ec4899' ?>;">
                                    <?= mb_substr($patient['first_name'], 0, 1) ?>
                                </div>
                                <div>
                                    <div class="fw-medium text-dark">
                                        <?= htmlspecialchars($patient['prefix'] . $patient['first_name'] . ' ' . $patient['last_name']) ?>
                                    </div>
                                    <small class="text-muted font-monospace"><?= htmlspecialchars($patient['hn']) ?></small>
                                </div>
                            </div>
                        </td>
                        <td>
                            <?= ClinicalHelper::calculateAge($patient['date_of_birth']) ?> ปี /
                            <?= $patient['gender'] === 'male' ? 'ชาย' : 'หญิง' ?>
                        </td>
                        <td><?= htmlspecialchars($patient['phone']) ?></td>
                        <td>
                            <?php if ($patient['blood_type']): ?>
                            <span class="badge bg-danger-subtle text-danger border border-danger-subtle">
                                <?= $patient['blood_type'] ?>
                            </span>
                            <?php else: ?>
                            <span class="text-muted">—</span>
                            <?php endif; ?>
                        </td>
                        <td>
                            <?php if ($patient['allergy_count'] > 0): ?>
                            <span class="badge bg-warning text-dark">
                                <i class="bi bi-exclamation-triangle me-1"></i>
                                <?= $patient['allergy_count'] ?> รายการ
                            </span>
                            <?php else: ?>
                            <span class="text-muted small">ไม่มี</span>
                            <?php endif; ?>
                        </td>
                        <td>
                            <span class="badge <?= $patient['is_active'] ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary' ?>">
                                <?= $patient['is_active'] ? 'Active' : 'Inactive' ?>
                            </span>
                        </td>
                        <td>
                            <a href="/patients/<?= $patient['id'] ?>" class="btn btn-sm btn-outline-primary">
                                <i class="bi bi-eye me-1"></i>ดูข้อมูล
                            </a>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Drug Allergy Warning Modal (อ้างอิงจาก alert ใน PrescriptionTab) -->
<div class="modal fade" id="allergyWarningModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-danger">
            <div class="modal-header bg-danger text-white">
                <h5 class="modal-title"><i class="bi bi-exclamation-triangle-fill me-2"></i>⚠️ คำเตือน: ผู้ป่วยแพ้ยานี้</h5>
            </div>
            <div class="modal-body" id="allergyWarningBody"></div>
            <div class="modal-footer">
                <button class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิกการสั่งยา</button>
                <button class="btn btn-danger" id="confirmAllergyBtn">รับทราบและดำเนินต่อ</button>
            </div>
        </div>
    </div>
</div>
```

---

## 5. JavaScript อ้างอิง — Client-side Logic

### 5.1 Live Search (อ้างอิงจาก search state ใน patients/page.tsx)

```javascript
// assets/js/app.js

// Debounce function (อ้างอิงจาก pattern ใน React useState)
function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

// Live search สำหรับตาราง (ไม่ต้อง reload page)
const searchInput = document.getElementById('searchInput');
const genderFilter = document.getElementById('genderFilter');

function filterTable() {
    const searchTerm  = searchInput?.value.toLowerCase() ?? '';
    const gender      = genderFilter?.value ?? '';
    const rows        = document.querySelectorAll('#patientsTable tbody tr');

    rows.forEach(row => {
        const name       = row.dataset.name?.toLowerCase() ?? '';
        const rowGender  = row.dataset.gender ?? '';
        const matchName  = !searchTerm || name.includes(searchTerm);
        const matchGender = !gender || rowGender === gender;
        row.style.display = matchName && matchGender ? '' : 'none';
    });
}

if (searchInput) {
    searchInput.addEventListener('input', debounce(filterTable, 300));
}
if (genderFilter) {
    genderFilter.addEventListener('change', filterTable);
}

// Drug allergy check via AJAX (อ้างอิงจาก handleAddToCart ใน visits/[id]/page.tsx)
async function checkDrugAllergy(patientId, genericName) {
    const res = await fetch(`/api/allergy-check?patient=${patientId}&drug=${encodeURIComponent(genericName)}`);
    const data = await res.json();
    return data; // { hasAllergy, severity, substance, reaction }
}

async function addDrugToCart(patientId, drug) {
    const allergy = await checkDrugAllergy(patientId, drug.generic);
    
    if (allergy.hasAllergy) {
        // แสดง Bootstrap modal คำเตือน
        document.getElementById('allergyWarningBody').innerHTML = `
            <div class="alert alert-danger mb-0">
                <p><strong>ยา:</strong> ${drug.name}</p>
                <p><strong>แพ้สาร:</strong> ${allergy.substance}</p>
                <p><strong>ระดับความรุนแรง:</strong> ${allergy.severity}</p>
                <p class="mb-0"><strong>อาการ:</strong> ${allergy.reaction}</p>
            </div>
        `;
        const modal = new bootstrap.Modal(document.getElementById('allergyWarningModal'));
        modal.show();
        
        // รอการยืนยัน
        return new Promise(resolve => {
            document.getElementById('confirmAllergyBtn').onclick = () => {
                modal.hide();
                resolve(true);
            };
        });
    }
    return true;
}

// Live clock (อ้างอิงจาก topbar.tsx)
function updateClock() {
    const el = document.getElementById('currentTime');
    if (el) el.textContent = new Date().toLocaleTimeString('th-TH');
}
setInterval(updateClock, 1000);
updateClock();

// BMI Calculator (อ้างอิงจาก calculateBMI ใน lib/utils.ts)
function calculateBMI(weight, height) {
    if (!weight || !height || height <= 0) return null;
    return Math.round((weight / Math.pow(height / 100, 2)) * 10) / 10;
}

// Blood Pressure Status (อ้างอิงจาก getBloodPressureStatus ใน lib/utils.ts)
function getBPStatus(systolic, diastolic) {
    if (systolic >= 180 || diastolic >= 120) return { label: 'Hypertensive Crisis', cls: 'text-danger fw-bold' };
    if (systolic >= 140 || diastolic >= 90)  return { label: 'Stage 2 Hypertension', cls: 'text-danger' };
    if (systolic >= 130 || diastolic >= 80)  return { label: 'Stage 1 Hypertension', cls: 'text-warning' };
    if (systolic >= 120)                     return { label: 'Elevated', cls: 'text-warning' };
    return { label: 'Normal', cls: 'text-success' };
}

// Auto-calculate vitals feedback
document.querySelectorAll('#systolicBP, #diastolicBP').forEach(el => {
    el.addEventListener('input', () => {
        const sys = parseInt(document.getElementById('systolicBP')?.value);
        const dia = parseInt(document.getElementById('diastolicBP')?.value);
        const indicator = document.getElementById('bpIndicator');
        if (sys && dia && indicator) {
            const status = getBPStatus(sys, dia);
            indicator.textContent = status.label;
            indicator.className = status.cls;
        }
    });
});
```

---

## 6. CSS อ้างอิง (app.css)

```css
/* assets/css/app.css */
/* อ้างอิงจาก globals.css และ inline styles ใน components */

:root {
    --font-thai: 'Sarabun', 'Noto Sans Thai', sans-serif;
    --bg-app: #f8fafc;
    --sidebar-width: 240px;
}

body {
    font-family: var(--font-thai);
    background: var(--bg-app);
    font-size: 14px;
}

/* Sidebar active state (อ้างอิงจาก sidebar.tsx active link) */
.sidebar .nav-link.active {
    background-color: var(--bs-primary) !important;
    color: white !important;
}
.sidebar .nav-link:hover:not(.active) {
    background-color: #f1f5f9;
}

/* Allergy badge (อ้างอิงจาก patient detail แสดง allergy) */
.allergy-badge {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 9999px;
}

/* Critical lab value (อ้างอิงจาก lab page flag HH/LL) */
.lab-critical {
    background: #fef2f2 !important;
}
.lab-critical td {
    color: #dc2626;
    font-weight: bold;
}

/* Visit status colors (อ้างอิงจาก getVisitStatusColor ใน lib/utils.ts) */
.status-waiting     { background: #fef9c3; color: #854d0e; }
.status-in_progress { background: #dbeafe; color: #1e40af; }
.status-completed   { background: #dcfce7; color: #166534; }
.status-cancelled   { background: #f3f4f6; color: #6b7280; }

/* SOAP note sections (อ้างอิงจาก SOAP tab ใน visits/[id]) */
.soap-s { border-left: 4px solid #3b82f6; padding-left: 12px; }
.soap-o { border-left: 4px solid #22c55e; padding-left: 12px; }
.soap-a { border-left: 4px solid #eab308; padding-left: 12px; }
.soap-p { border-left: 4px solid #a855f7; padding-left: 12px; }

/* Custom scrollbar (อ้างอิงจาก globals.css) */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #f1f5f9; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

/* Print styles (อ้างอิงจาก globals.css print section) */
@media print {
    .sidebar, header, .no-print { display: none !important; }
    main { padding: 0 !important; }
}
```

---

## 7. สรุป: อะไรที่นำจาก EMR นี้ไปใช้ใน PHP ได้เลย

| สิ่งที่อ้างอิงได้ | ไฟล์ต้นทาง | นำไปใช้ใน PHP |
|---|---|---|
| **Database Schema ทั้งหมด** | `lib/types.ts` | SQL CREATE TABLE (section 2.1) |
| **RBAC roles + permissions** | `sidebar.tsx`, `main-layout.tsx` | `$PERMISSIONS` array (section 3.2) |
| **Drug allergy check logic** | `visits/[id]/page.tsx` | `ClinicalHelper::checkDrugAllergy()` |
| **BMI + BP calculation** | `lib/utils.ts` | `ClinicalHelper::calculateBMI/getBPStatus()` |
| **HN + VN generation** | `lib/utils.ts` | `ClinicalHelper::generateHN/VN()` |
| **Audit log structure** | `lib/store.ts`, `lib/types.ts` | `AuditHelper::log()` |
| **Sidebar nav items + roles** | `sidebar.tsx` | `$navItems` PHP array |
| **Visit status colors** | `lib/utils.ts` | CSS `.status-*` classes |
| **SOAP note layout** | `visits/[id]/page.tsx` | `.soap-s/o/a/p` CSS + HTML structure |
| **Lab flag color coding** | `lab/page.tsx` | `.lab-critical` CSS |
| **Session timeout (15 min)** | `main-layout.tsx` | `RBACMiddleware::check()` |
| **Patient search + filter** | `patients/page.tsx` | Live search JS + debounce |
| **Critical lab alert** | `dashboard/page.tsx`, `lab/page.tsx` | Bootstrap alert component |
| **Mock data / test accounts** | `lib/mock-data.ts` | SQL seed files |
