<?php
$pageTitle  = 'ค้นหาผู้ป่วย';
$breadcrumb = 'ค้นหาผู้ป่วย';
$activePage = 'patient';
include '../components/head.php';
?>
  <link rel="stylesheet" href="../components/styles.css">
</head>
<body>
<?php include '../components/sidebar.php'; ?>
<?php include '../components/topbar.php'; ?>
<div class="main-content">
  <div class="content-area">

    <!-- Page Header -->
    <div class="page-header">
      <div class="page-title-block">
        <h1 class="page-title">ค้นหาผู้ป่วย</h1>
        <p class="page-sub">ค้นหาด้วย HN เพื่อดูเอกสารทางการแพทย์</p>
      </div>
    </div>

    <!-- HN Search Card -->
    <div class="hn-search-card">
      <div class="hn-search-title"><i class="bi bi-search" style="color:var(--primary)"></i> ค้นหาผู้ป่วยด้วย HN</div>
      <div class="hn-search-sub">กรอกหมายเลข HN แล้วกด Enter หรือคลิกปุ่มค้นหา</div>
      <div class="hn-input-row">
        <input type="text" id="hnInput" class="hn-input" placeholder="กรอก HN เช่น 123456" maxlength="20" autocomplete="off">
        <button class="btn btn-primary" id="btnSearch">
          <i class="bi bi-search"></i> ค้นหา
        </button>
        <button class="btn btn-ghost" id="btnClear" style="display:none">
          <i class="bi bi-x-circle"></i> ล้าง
        </button>
      </div>

      <!-- Patient Info Bar -->
      <div class="patient-info-bar" id="patientInfoBar">
        <div class="patient-avatar" id="patientInitial">?</div>
        <div class="patient-details">
          <div class="patient-name" id="patientName">—</div>
          <div class="patient-meta">
            <span><i class="bi bi-credit-card-2-front"></i> HN: <b id="patientHN">—</b></span>
            <span id="patientExtra"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Document Type Section (hidden until patient found) -->
    <div id="doctypeSection" style="display:none">
      <div class="doctype-section">
        <div class="doctype-section-title">
          <i class="bi bi-grid-3x3-gap-fill" style="color:var(--primary)"></i>
          เลือกหมวดเอกสาร
          <span style="font-size:13px;font-weight:500;color:var(--text-muted)" id="doctypeSubtitle"></span>
        </div>
        <div class="doctype-grid" id="doctypeGrid">
          <!-- Skeleton loading -->
          <div style="height:76px" class="skeleton"></div>
          <div style="height:76px" class="skeleton"></div>
          <div style="height:76px" class="skeleton"></div>
          <div style="height:76px" class="skeleton"></div>
        </div>
      </div>

      <!-- Inline PDF Viewer (hidden until doctype selected) -->
      <div id="pdfViewerWrap" style="display:none">
        <div class="doc-list-section">

          <!-- Viewer Header -->
          <div class="doc-list-header">
            <div>
              <div class="doc-list-title" id="pdfViewerTitle">เอกสาร</div>
              <div class="doc-list-sub" id="pdfViewerMeta"></div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <button class="btn btn-primary" id="btnDownloadPdf" style="display:none;font-size:13px;padding:8px 14px">
                <i class="bi bi-download"></i> ดาวน์โหลด
              </button>
              <button class="btn btn-ghost" id="btnBackDoctype" style="font-size:13px;padding:8px 14px">
                <i class="bi bi-arrow-left"></i> เปลี่ยนหมวด
              </button>
            </div>
          </div>

          <!-- PDF Viewer Toolbar -->
          <div class="viewer-toolbar" id="pdfToolbar">
            <div class="vt-group">
              <button class="vt-btn" id="btnPrev" title="หน้าก่อน"><i class="bi bi-chevron-up"></i></button>
              <button class="vt-btn" id="btnNext" title="หน้าถัดไป"><i class="bi bi-chevron-down"></i></button>
            </div>
            <div class="vt-group">
              <div class="vt-page-info">
                หน้า
                <input class="vt-page-input" id="pageInput" type="number" min="1" value="1">
                จาก <span id="totalPages">—</span>
              </div>
            </div>
            <div class="vt-group">
              <button class="vt-btn" id="btnZoomOut" title="ย่อ"><i class="bi bi-dash-lg"></i></button>
              <select class="vt-zoom-select" id="zoomSelect">
                <option value="fit">Fit Width</option>
                <option value="0.5">50%</option>
                <option value="0.75">75%</option>
                <option value="1">100%</option>
                <option value="1.25" selected>125%</option>
                <option value="1.5">150%</option>
                <option value="2">200%</option>
              </select>
              <button class="vt-btn" id="btnZoomIn" title="ขยาย"><i class="bi bi-plus-lg"></i></button>
            </div>
            <div class="vt-spacer"></div>
            <div class="vt-group">
              <button class="vt-btn" id="btnSidebarToggle" title="แถบตัวอย่างหน้า"><i class="bi bi-layout-sidebar"></i></button>
            </div>
          </div>

          <!-- Viewer Body -->
          <div class="viewer-body patient-viewer-body" id="viewerBody"></div>

        </div>
      </div>

    </div>

  </div>
</div>

<script src="../js/patient_page.js" type="module"></script>
<?php include '../components/footer.php'; ?>