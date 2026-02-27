<?php
// services/doctype_list.php
header('Content-Type: application/json');
require_once '../conn.php';

try {
    $stmt = $pdo->query("
        SELECT doctype_id, DocTypeName, DocType
        FROM tb_opd_doctype
        WHERE doctype_id NOT IN ('0', 'doctype_id')
        ORDER BY CAST(doctype_id AS UNSIGNED)
    ");
    $doctypes = $stmt->fetchAll();
    echo json_encode(['doctypes' => $doctypes]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'DB error', 'doctypes' => []]);
}
?>
