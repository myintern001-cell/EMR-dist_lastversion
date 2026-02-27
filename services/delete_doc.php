<?php
// services/delete_doc.php
header('Content-Type: application/json');
require_once '../conn.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
$id   = isset($body['id']) ? (int)$body['id'] : 0;
if (!$id) {
    echo json_encode(['success' => false, 'message' => 'Invalid ID']);
    exit;
}

try {
    // ดึง path ก่อนลบ
    $stmt = $pdo->prepare("SELECT file_path FROM documents WHERE id = :id LIMIT 1");
    $stmt->execute([':id' => $id]);
    $doc = $stmt->fetch();

    if (!$doc) {
        echo json_encode(['success' => false, 'message' => 'Document not found']);
        exit;
    }

    // ลบ record
    $del = $pdo->prepare("DELETE FROM documents WHERE id = :id");
    $del->execute([':id' => $id]);

    // ลบไฟล์จริง (path traversal check)
    $filePath   = realpath(__DIR__ . '/../' . $doc['file_path']);
    $uploadBase = realpath(__DIR__ . '/../uploads');
    if ($filePath && strpos($filePath, $uploadBase) === 0 && file_exists($filePath)) {
        @unlink($filePath);
    }

    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error']);
}
