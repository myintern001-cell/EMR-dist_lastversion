<?php
// components/sidebar.php
// ใช้งาน: กำหนด $activePage = 'documents' | 'upload' | 'patient' ก่อน include
$activePage = $activePage ?? '';
$menus = [
    ['id' => 'patient',   'href' => 'patient.php',   'icon' => 'bi-person-lines-fill', 'label' => 'ค้นหาผู้ป่วย'],
    ['id' => 'documents', 'href' => 'documents.php', 'icon' => 'bi-folder2-open',      'label' => 'เอกสารทั้งหมด'],
    ['id' => 'upload',    'href' => 'upload.php',    'icon' => 'bi-floppy-fill',       'label' => 'อัปโหลดเอกสาร'],
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
</div>
