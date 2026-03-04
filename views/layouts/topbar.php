<?php
// views/layouts/topbar.php
$breadcrumb = $breadcrumb ?? 'หน้าหลัก';
?>
<div class="topbar">
  <div class="topbar-left">
    <div class="breadcrumb-trail">
      <span>ระบบ EMR</span>
      <i class="bi bi-chevron-right"></i>
      <span class="current"><?= htmlspecialchars($breadcrumb) ?></span>
    </div>
  </div>
  <div class="topbar-right">
    <div class="topbar-time" id="topbarTime"></div>
    <button class="topbar-btn"><i class="bi bi-bell"></i><span class="dot"></span></button>
    <button class="topbar-btn"><i class="bi bi-envelope"></i></button>
    <img src="https://i.pravatar.cc/150?img=47" class="topbar-avatar" alt="">
  </div>
</div>
