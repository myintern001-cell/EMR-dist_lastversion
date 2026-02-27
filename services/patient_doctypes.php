<?php
// services/patient_doctypes.php
header('Content-Type: application/json');
require_once '../conn.php';

$hn = isset($_GET['hn']) ? trim($_GET['hn']) : '';

if (!$hn) {
    echo json_encode(['error' => 'HN is required']);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT
            t.doctype_id  AS doctype_id,
            t.DocTypeName AS DocTypeName,
            t.DocType     AS DocType
        FROM tb_opd_doctype t
        INNER JOIN documents d
            ON d.doctype_id = t.doctype_id
            AND d.hn        = :hn
        WHERE t.doctype_id != '0'
        GROUP BY t.doctype_id, t.DocTypeName, t.DocType
        ORDER BY CAST(t.doctype_id AS UNSIGNED)
    ");

    $stmt->execute([':hn' => $hn]);
    $doctypes = $stmt->fetchAll();

    echo json_encode(['doctypes' => $doctypes]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'DB error', 'doctypes' => []]);
}
?>