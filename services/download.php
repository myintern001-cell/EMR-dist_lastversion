<?php
// services/download.php
require_once '../conn.php';

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if (!$id) { http_response_code(400); exit('Invalid ID'); }

try {
    $stmt = $pdo->prepare("SELECT original_name, file_path FROM documents WHERE id = :id LIMIT 1");
    $stmt->execute([':id' => $id]);
    $doc = $stmt->fetch();
} catch (PDOException $e) {
    http_response_code(500); exit('DB error');
}

if (!$doc) { http_response_code(404); exit('File not found'); }

// Resolve path — file_path เก็บเป็น relative เช่น uploads/pdf_xxx.pdf
$filePath = __DIR__ . '/../' . $doc['file_path'];
$filePath = realpath($filePath);

// ป้องกัน path traversal: ตรวจว่าอยู่ในโฟลเดอร์ uploads เท่านั้น
$uploadBase = realpath(__DIR__ . '/../uploads');
if (!$filePath || strpos($filePath, $uploadBase) !== 0) {
    http_response_code(403); exit('Access denied');
}
if (!file_exists($filePath)) { http_response_code(404); exit('File not found on disk'); }

// Stream file
$originalName = $doc['original_name'];
// sanitize filename สำหรับ header
$safeFilename = preg_replace('/[^\w\-. ]/u', '_', $originalName);

header('Content-Type: application/pdf');
header('Content-Disposition: attachment; filename="' . rawurlencode($safeFilename) . '"');
header('Content-Length: ' . filesize($filePath));
header('Cache-Control: no-store');
readfile($filePath);
exit;
