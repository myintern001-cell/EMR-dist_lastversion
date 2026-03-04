<?php
// services/upload.php
header('Content-Type: application/json');
require_once '../conn.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['message' => 'Method not allowed']);
    exit;
}
if (!isset($_FILES['pdf'])) {
    echo json_encode(['message' => 'No file uploaded']);
    exit;
}

$hn         = isset($_POST['hn'])         ? trim($_POST['hn'])         : '';
$doctype_id = isset($_POST['doctype_id']) ? trim($_POST['doctype_id']) : '';
if ($hn === '' || $doctype_id === '') {
    echo json_encode(['message' => 'HN and DocType are required']);
    exit;
}
if (mb_strlen($hn) > 20 || mb_strlen($doctype_id) > 10) {
    echo json_encode(['message' => 'HN or DocType is too long']);
    exit;
}

// แก้ตรงนี้ — กำหนด $file ให้ชัดเจน
$file = $_FILES['pdf'];

// เช็ค error ก่อนทุกอย่าง
if ($file['error'] !== UPLOAD_ERR_OK) {
    $errors = [
        UPLOAD_ERR_INI_SIZE   => 'ไฟล์ใหญ่เกิน upload_max_filesize ใน php.ini',
        UPLOAD_ERR_FORM_SIZE  => 'ไฟล์ใหญ่เกิน MAX_FILE_SIZE ใน form',
        UPLOAD_ERR_PARTIAL    => 'อัปโหลดไม่สมบูรณ์',
        UPLOAD_ERR_NO_FILE    => 'ไม่มีไฟล์ถูกส่งมา',
        UPLOAD_ERR_NO_TMP_DIR => 'ไม่มี temp folder',
        UPLOAD_ERR_CANT_WRITE => 'เขียนไฟล์ไม่ได้',
    ];
    echo json_encode([
        'message' => $errors[$file['error']] ?? 'Upload error: ' . $file['error']
    ]);
    exit;
}

// Check MIME
$finfo    = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);
if ($mimeType !== 'application/pdf') {
    echo json_encode(['message' => 'Only PDF allowed']);
    exit;
}

// Extension check
$ext = strtolower(pathinfo(basename($file['name']), PATHINFO_EXTENSION));
if ($ext !== 'pdf') {
    echo json_encode(['message' => 'Invalid file extension']);
    exit;
}

// Size limit 100 MB
if ($file['size'] > 100 * 1024 * 1024) {
    echo json_encode(['message' => 'File too large (max 100 MB)']);
    exit;
}

$uploadDir = __DIR__ . '/../uploads/';
if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

$originalName = basename($file['name']);
$storedName   = uniqid('pdf_', true) . '.pdf';
$targetPath   = $uploadDir . $storedName;

if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    echo json_encode(['message' => 'Failed to save file']);
    exit;
}

try {
    $stmt = $pdo->prepare("
        INSERT INTO documents (hn, doctype_id, original_name, stored_name, file_path, file_size, mime_type)
        VALUES (:hn, :doctype_id, :original_name, :stored_name, :file_path, :file_size, :mime_type)
    ");
    $stmt->execute([
        ':hn'            => $hn,
        ':doctype_id'    => $doctype_id,
        ':original_name' => $originalName,
        ':stored_name'   => $storedName,
        ':file_path'     => 'uploads/' . $storedName,
        ':file_size'     => $file['size'],
        ':mime_type'     => $mimeType,
    ]);
    echo json_encode(['message' => 'Upload success', 'file' => $storedName]);
} catch (PDOException $e) {
    @unlink($targetPath);
    http_response_code(500);
    echo json_encode(['message' => 'Database error']);
}