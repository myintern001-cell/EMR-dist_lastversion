<?php
require BASE_PATH . '/views/layouts/head.php';
?>
  <link rel="stylesheet" href="<?= BASE_URL ?>/public/css/styles.css">
</head>
<body>
<?php require BASE_PATH . '/views/layouts/sidebar.php'; ?>
<?php require BASE_PATH . '/views/layouts/topbar.php'; ?>

<div class="main-content">
  <div class="content-area">

    <!-- Page Header -->
    <div class="page-header">
      <div class="page-title-block">
        <h1 class="page-title">เอกสารทั้งหมด</h1>
        <p class="page-sub">รายการเอกสาร PDF ทั้งหมดในระบบ</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-ghost" onclick="loadDocs()"><i class="bi bi-arrow-clockwise"></i> รีเฟรช</button>
        <a href="<?= BASE_URL ?>/upload" class="btn btn-primary"><i class="bi bi-plus-lg"></i> อัปโหลดเอกสาร</a>
      </div>
    </div>

    <!-- Stat Cards -->
    <div class="stat-row">
      <div class="stat-card">
        <div class="stat-icon teal"><i class="bi bi-files"></i></div>
        <div class="stat-info">
          <div class="stat-val" id="statTotal">—</div>
          <div class="stat-label">เอกสารทั้งหมด</div>
          <div class="stat-delta neutral">รายการ</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green"><i class="bi bi-check-circle"></i></div>
        <div class="stat-info">
          <div class="stat-val" id="statUploaded">—</div>
          <div class="stat-label">อัปโหลดสำเร็จ</div>
          <div class="stat-delta up"><i class="bi bi-arrow-up"></i> ล่าสุด</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange"><i class="bi bi-hourglass-split"></i></div>
        <div class="stat-info">
          <div class="stat-val" id="statPending">—</div>
          <div class="stat-label">รอดำเนินการ</div>
          <div class="stat-delta neutral">รายการ</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue"><i class="bi bi-hdd"></i></div>
        <div class="stat-info">
          <div class="stat-val" id="statSize">—</div>
          <div class="stat-label">พื้นที่ใช้งาน (MB)</div>
          <div class="stat-delta neutral">รวม</div>
        </div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar-row">
      <div class="filter-tabs">
        <button class="filter-tab active" data-filter="all">ทั้งหมด <span class="tab-count" id="countAll">0</span></button>
        <button class="filter-tab" data-filter="uploaded"><i class="bi bi-check-circle"></i> สำเร็จ <span class="tab-count" id="countUploaded">0</span></button>
        <button class="filter-tab" data-filter="pending"><i class="bi bi-clock"></i> รอดำเนินการ <span class="tab-count" id="countPending">0</span></button>
        <button class="filter-tab" data-filter="error"><i class="bi bi-exclamation-circle"></i> ข้อผิดพลาด <span class="tab-count" id="countError">0</span></button>
      </div>
      <div class="toolbar-right">
        <div class="search-box">
          <input type="text" id="searchInput" placeholder="ค้นหาชื่อไฟล์...">
          <i class="bi bi-search si"></i>
        </div>
        <select class="sort-select" id="sortSelect">
          <option value="date_desc">วันที่ล่าสุด</option>
          <option value="date_asc">วันที่เก่าสุด</option>
          <option value="name_asc">ชื่อ A→Z</option>
          <option value="size_desc">ขนาด มาก→น้อย</option>
        </select>
      </div>
    </div>

    <!-- Table Card -->
    <div class="card">
      <table class="doc-table">
        <thead>
          <tr>
            <th>ชื่อไฟล์</th>
            <th>ขนาด</th>
            <th>สถานะ</th>
            <th>วันที่อัปโหลด</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="tableBody"></tbody>
      </table>
      <div class="empty-state" id="emptyState">
        <i class="bi bi-folder2-open"></i>
        <p>ยังไม่มีเอกสาร</p>
        <small>อัปโหลดเอกสาร PDF เพื่อเริ่มต้นใช้งาน</small>
      </div>
      <div class="pagination-row" id="paginationRow" style="display:none">
        <div class="page-info" id="pageInfo"></div>
        <div class="page-controls" id="pageControls"></div>
      </div>
    </div>

  </div>
</div>

<!-- Detail Panel -->
<div class="detail-panel" id="detailPanel">
  <div class="dp-header">
    <div class="dp-title">รายละเอียดไฟล์</div>
    <button class="dp-close" id="dpCloseBtn"><i class="bi bi-x-lg"></i></button>
  </div>
  <div class="dp-body" id="dpBody"></div>
</div>

<script>const BASE_URL = '<?= BASE_URL ?>';</script>
<script src="<?= BASE_URL ?>/public/js/document_page.js"></script>
<?php require BASE_PATH . '/views/layouts/footer.php'; ?>
