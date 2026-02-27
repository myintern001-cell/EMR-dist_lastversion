<?php
// services/documents_api.php
header('Content-Type: application/json');
require_once '../conn.php';

try {
    $stmt = $pdo->query("
        SELECT id, original_name, stored_name, file_path, file_size, mime_type,
               uploaded_at,
               'uploaded' AS status
        FROM documents
        ORDER BY uploaded_at DESC
    ");
    $rows = $stmt->fetchAll();
    echo json_encode(['data' => $rows]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Query failed', 'data' => []]);
}
