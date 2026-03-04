<?php
require BASE_PATH . '/views/layouts/head.php';
?>
  <link rel="stylesheet" href="<?= BASE_URL ?>/public/css/styles.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css">
</head>
<body>
<?php require BASE_PATH . '/views/layouts/sidebar.php'; ?>
<?php require BASE_PATH . '/views/layouts/topbar.php'; ?>

<div class="main-content">
  <div class="content-area">

    <!-- Page Header -->
    <div class="page-header">
      <div class="page-title-block">
        <h1 class="page-title">อัปโหลดเอกสาร PDF</h1>
        <p class="page-sub">ตรวจสอบและเตรียมไฟล์เอกสารทางการแพทย์ก่อนบันทึกเข้าระบบ</p>
      </div>
      <div class="status-pill" id="statusPill">
        <span class="dot-pulse"></span>
        <span id="statusText">พร้อมรับไฟล์</span>
      </div>
    </div>

    <!-- Main Card -->
    <div class="card">

      <!-- Upload Metadata Section -->
      <div class="upload-meta-section">
        <div class="upload-meta-header">
          <i class="bi bi-info-circle" style="color:var(--primary)"></i>
          <span>ข้อมูลเอกสาร</span>
        </div>
        <div class="upload-meta-grid">
          <div class="form-group">
            <label class="form-label">
              <i class="bi bi-person-badge"></i>
              HN (Hospital Number)
            </label>
            <input type="text" id="hnUploadInput" class="form-input" placeholder="กรอก HN เช่น 123456" maxlength="20" autocomplete="off">
          </div>
          <div class="form-group">
            <label class="form-label">
              <i class="bi bi-folder2"></i>
              DocType (หมวดเอกสาร)
            </label>
            <select id="doctypeUploadInput" class="form-input doctype-select2" style="width:100%">
              <option value="">เลือกหมวดเอกสาร...</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Drop Zone -->
      <div class="dropzone-wrapper" id="dropzoneWrapper">
        <div class="drop-zone" id="dropZone">
          <input type="file" id="fileInput" accept=".pdf,application/pdf">
          <div class="dz-icon-wrap"><i class="bi bi-cloud-arrow-up"></i></div>
          <div class="dz-title" id="dzTitle">วางไฟล์ PDF ที่นี่ หรือคลิกเพื่อเลือกไฟล์</div>
          <div class="dz-sub">รองรับไฟล์ PDF สูงสุด <b>100 MB</b> ต่อไฟล์</div>
          <div class="dz-formats"><span class="dz-format-tag">PDF</span></div>
        </div>
      </div>

      <!-- Toast -->
      <div class="toast-bar" id="toastBar"></div>

      <!-- Preview Header -->
      <div class="preview-header" id="previewHeader">
        <div class="ph-left">
          <div class="ph-pdf-icon"><i class="bi bi-filetype-pdf"></i></div>
          <div class="ph-info">
            <div class="ph-name" id="phName">—</div>
            <div class="ph-meta">
              <span id="phSize">—</span>
              <span>·</span>
              <span class="state-badge original">ต้นฉบับ</span>
            </div>
          </div>
        </div>
        <div class="ph-actions" id="phActions"></div>
      </div>

      <!-- PDF Viewer Shell -->
      <div class="viewer-shell" id="viewerShell">
        <div class="viewer-toolbar">
          <div class="vt-group">
            <button class="vt-btn" id="btnPrev"><i class="bi bi-chevron-up"></i></button>
            <button class="vt-btn" id="btnNext"><i class="bi bi-chevron-down"></i></button>
          </div>
          <div class="vt-group">
            <div class="vt-page-info">
              หน้า
              <input class="vt-page-input" id="pageInput" type="number" min="1" value="1">
              จาก <span id="totalPages">—</span>
            </div>
          </div>
          <div class="vt-group">
            <button class="vt-btn" id="btnZoomOut"><i class="bi bi-dash-lg"></i></button>
            <select class="vt-zoom-select" id="zoomSelect">
              <option value="fit">Fit Width</option>
              <option value="0.5">50%</option>
              <option value="0.75">75%</option>
              <option value="1">100%</option>
              <option value="1.25" selected>125%</option>
              <option value="1.5">150%</option>
              <option value="2">200%</option>
            </select>
            <button class="vt-btn" id="btnZoomIn"><i class="bi bi-plus-lg"></i></button>
          </div>
          <div class="vt-spacer"></div>
          <div class="vt-group">
            <button class="vt-btn" id="btnSidebar"><i class="bi bi-layout-sidebar"></i></button>
          </div>
        </div>
        <div class="viewer-body" id="viewerBody"></div>
      </div>

    </div><!-- /card -->
  </div>
</div>

<script>const BASE_URL = '<?= BASE_URL ?>';</script>
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
<script src="<?= BASE_URL ?>/public/js/upload_page.js" type="module"></script>
<?php require BASE_PATH . '/views/layouts/footer.php'; ?>
