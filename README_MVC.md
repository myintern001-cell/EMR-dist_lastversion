# EMR System — MVC Architecture Guide

## โครงสร้างโปรเจกต์

```
dist/
├── index.php                 ← Front Controller (จุดเข้าหลักเดียว)
├── .htaccess                 ← URL Rewrite สำหรับ Apache/XAMPP
├── conn.php                  ← Database connection
│
├── core/                     ← Core Framework
│   ├── Router.php            ← จัดการ routing
│   └── Controller.php        ← Base controller class
│
├── controllers/              ← Controllers (จัดการ logic)
│   ├── PatientController.php
│   ├── DocumentController.php
│   └── UploadController.php
│
├── models/                   ← Models (จัดการ database)
│   ├── Document.php
│   ├── Patient.php
│   └── DocType.php
│
├── views/                    ← Views (HTML templates)
│   ├── layouts/              ← Shared layout components
│   │   ├── head.php
│   │   ├── sidebar.php
│   │   ├── topbar.php
│   │   └── footer.php
│   ├── patient/
│   │   └── index.php
│   ├── document/
│   │   └── index.php
│   └── upload/
│       └── index.php
│
├── public/                   ← Static files (CSS, JS)
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── document_page.js
│       ├── patient_page.js
│       ├── upload_page.js
│       └── pdf_viewer.js
│
└── uploads/                  ← Uploaded PDF files
```

---

## วิธีใช้งาน (Setup)

### 1. เปิด XAMPP
- Start **Apache** และ **MySQL**
- ตรวจสอบว่า `mod_rewrite` เปิดอยู่ (XAMPP เปิดให้โดย default)

### 2. เปิดเบราว์เซอร์
```
http://localhost/TryXampp/EMR--1.0/dist/
```
จะเข้าหน้า **ค้นหาผู้ป่วย** เหมือนเดิม

### 3. URL ที่ใช้งานได้

| URL | หน้า |
|-----|------|
| `/dist/` | ค้นหาผู้ป่วย (default) |
| `/dist/patient` | ค้นหาผู้ป่วย |
| `/dist/documents` | เอกสารทั้งหมด |
| `/dist/upload` | อัปโหลดเอกสาร |

---

## MVC Flow (การทำงาน)

```
Browser Request
      │
      ▼
  index.php  (Front Controller)
      │
      ▼
  Router.php  (จับคู่ URL → Controller)
      │
      ▼
  Controller  (จัดการ logic)
      │
   ┌──┴──┐
   ▼     ▼
 Model  View
 (DB)   (HTML)
```

1. **ทุก request** เข้ามาที่ `index.php` (ผ่าน `.htaccess`)
2. **Router** อ่าน URL แล้วเรียก Controller + Method ที่ตรงกัน
3. **Controller** เรียก Model เพื่อดึงข้อมูล แล้วส่งไป View
4. **Model** จัดการ database query ทั้งหมด
5. **View** แสดงผล HTML

---

## วิธีเพิ่ม Module ใหม่ (ตัวอย่าง: Appointment)

### ขั้นตอน 1: สร้าง Model

```php
// models/Appointment.php
<?php
class Appointment
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function getAll(): array
    {
        $stmt = $this->pdo->query("SELECT * FROM appointments ORDER BY date DESC");
        return $stmt->fetchAll();
    }

    public function create(array $data): string
    {
        $stmt = $this->pdo->prepare("INSERT INTO appointments (...) VALUES (...)");
        $stmt->execute($data);
        return $this->pdo->lastInsertId();
    }
}
```

### ขั้นตอน 2: สร้าง Controller

```php
// controllers/AppointmentController.php
<?php
require_once BASE_PATH . '/core/Controller.php';
require_once BASE_PATH . '/models/Appointment.php';

class AppointmentController extends Controller
{
    public function index(): void
    {
        $pageTitle  = 'นัดหมาย';
        $breadcrumb = 'นัดหมาย';
        $activePage = 'appointment';
        $this->view('appointment/index', compact('pageTitle', 'breadcrumb', 'activePage'));
    }

    public function apiList(): void
    {
        require_once BASE_PATH . '/conn.php';
        $model = new Appointment($pdo);
        $this->json(['data' => $model->getAll()]);
    }
}
```

### ขั้นตอน 3: สร้าง View

```php
<!-- views/appointment/index.php -->
<?php require BASE_PATH . '/views/layouts/head.php'; ?>
  <link rel="stylesheet" href="<?= BASE_URL ?>/public/css/styles.css">
</head>
<body>
<?php require BASE_PATH . '/views/layouts/sidebar.php'; ?>
<?php require BASE_PATH . '/views/layouts/topbar.php'; ?>

<div class="main-content">
  <div class="content-area">
    <h1>นัดหมาย</h1>
    <!-- เนื้อหา -->
  </div>
</div>

<script>const BASE_URL = '<?= BASE_URL ?>';</script>
<?php require BASE_PATH . '/views/layouts/footer.php'; ?>
```

### ขั้นตอน 4: เพิ่ม Route ใน `index.php`

```php
$router->get('/appointment', 'AppointmentController', 'index');
$router->get('/api/appointments', 'AppointmentController', 'apiList');
```

### ขั้นตอน 5: เพิ่มเมนูใน Sidebar

แก้ไฟล์ `views/layouts/sidebar.php` — เพิ่มรายการใน `$menus`:

```php
$menus = [
    ['id' => 'patient',     'href' => BASE_URL . '/patient',     'icon' => 'bi-person-lines-fill', 'label' => 'ค้นหาผู้ป่วย'],
    ['id' => 'documents',   'href' => BASE_URL . '/documents',   'icon' => 'bi-folder2-open',      'label' => 'เอกสารทั้งหมด'],
    ['id' => 'upload',      'href' => BASE_URL . '/upload',      'icon' => 'bi-floppy-fill',       'label' => 'อัปโหลดเอกสาร'],
    ['id' => 'appointment', 'href' => BASE_URL . '/appointment', 'icon' => 'bi-calendar-check',    'label' => 'นัดหมาย'],  // ← เพิ่มบรรทัดนี้
];
```

---

## API Routes

| Method | URL | คำอธิบาย |
|--------|-----|----------|
| GET | `/api/documents` | ดึงเอกสารทั้งหมด |
| POST | `/api/documents/delete` | ลบเอกสาร (body: `{id}`) |
| GET | `/api/download?id=X` | ดาวน์โหลดไฟล์ |
| GET | `/api/patient?hn=X` | ค้นหาผู้ป่วยด้วย HN |
| GET | `/api/patient/doctypes?hn=X` | ดึง doctype ของ HN |
| GET | `/api/patient/docs?hn=X&doctype_id=Y` | ดึงเอกสารตาม HN + doctype |
| POST | `/api/upload` | อัปโหลดไฟล์ (FormData) |
| GET | `/api/doctypes` | ดึงรายการ doctype ทั้งหมด |

---

## Troubleshooting

### 404 ทุกหน้า
- ตรวจสอบว่า Apache `mod_rewrite` เปิดอยู่
- ใน XAMPP: แก้ `httpd.conf` → หา `LoadModule rewrite_module` → เอา `#` ออก
- ตรวจสอบว่า `AllowOverride All` ตั้งค่าไว้ใน `<Directory>` ของ htdocs

### ไฟล์ CSS/JS ไม่โหลด
- ตรวจสอบว่าไฟล์อยู่ใน `public/css/` และ `public/js/`
- ตรวจสอบ Console ของเบราว์เซอร์ว่ามี 404 ไหม
