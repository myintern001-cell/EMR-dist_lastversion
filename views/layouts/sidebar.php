<?php
// views/layouts/sidebar.php
// ใช้งาน: กำหนด $activePage = 'documents' | 'upload' | 'patient' ก่อน include
$activePage = $activePage ?? '';
$menus = [
    ['id' => 'patient',   'href' => BASE_URL . '/patient',   'icon' => 'bi-person-lines-fill', 'label' => 'ค้นหาผู้ป่วย'],
    ['id' => 'documents', 'href' => BASE_URL . '/documents', 'icon' => 'bi-folder2-open',      'label' => 'เอกสารทั้งหมด'],
    ['id' => 'upload',    'href' => BASE_URL . '/upload',    'icon' => 'bi-floppy-fill',       'label' => 'อัปโหลดเอกสาร'],
];
?>
<div class="sidebar">
  <div class="sidebar-logo">
    <div class="logo-text">EMR</div>
    <div class="logo-sub">Electronic Medical Record</div>
    <div class="logo-user">
      <div>
        <div class="user-name">นพ.สมชาย ใจดี</div>
        <div class="user-role">แพทย์ผู้เชี่ยวชาญ</div>
      </div>
    </div>
  </div>
  <div class="sidebar-section">Main Menu</div>
  <ul class="sidebar-menu">
    <?php foreach ($menus as $m): ?>
    <li>
      <a href="<?= $m['href'] ?>" class="<?= $activePage === $m['id'] ? 'active' : '' ?>">
        <i class="bi <?= $m['icon'] ?>"></i> <?= $m['label'] ?>
      </a>
    </li>
    <?php endforeach; ?>
  </ul>
<?php if ($activePage === 'patient'): ?>
  <div class="sidebar-categories-wrapper">
    <div class="sidebar-section sidebar-cat-section" id="sidebarCatSection" style="display:none">
      หมวดเอกสาร
    </div>
    <ul class="sidebar-menu" id="sidebarCatMenu">
    </ul>
  </div>
<?php endif; ?>
</div>
