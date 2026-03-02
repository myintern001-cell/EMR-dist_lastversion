<?php
// services/patient_doctypes.php
header('Content-Type: application/json');
require_once '../conn.php';

$hn        = isset($_GET['hn'])        ? trim($_GET['hn'])        : '';
$dateFrom  = isset($_GET['date_from']) ? trim($_GET['date_from']) : '';
$dateTo    = isset($_GET['date_to'])   ? trim($_GET['date_to'])   : '';

if (!$hn) {
    echo json_encode(['error' => 'HN is required']);
    exit;
}

try {
    $params = [':hn' => $hn];
    $dateCondition = '';

    if ($dateFrom && $dateTo) {
        $dateCondition = "AND DATE(d.uploaded_at) BETWEEN :date_from AND :date_to";
        $params[':date_from'] = $dateFrom;
        $params[':date_to']   = $dateTo;
    } elseif ($dateFrom) {
        $dateCondition = "AND DATE(d.uploaded_at) = :date_from";
        $params[':date_from'] = $dateFrom;
    }

    $stmt = $pdo->prepare("
        SELECT
            t.doctype_id        AS doctype_id,
            t.DocTypeName       AS DocTypeName,
            t.DocType           AS DocType,
            COUNT(d.id)         AS doc_count
        FROM tb_opd_doctype t
        INNER JOIN documents d
            ON d.doctype_id = t.doctype_id
            AND d.hn        = :hn
            {$dateCondition}
        WHERE t.doctype_id != '0'
        GROUP BY t.doctype_id, t.DocTypeName, t.DocType
        HAVING COUNT(d.id) > 0
        ORDER BY CAST(t.doctype_id AS UNSIGNED)
    ");

    $stmt->execute($params);
    $doctypes = $stmt->fetchAll();

    echo json_encode(['doctypes' => $doctypes]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'DB error', 'doctypes' => []]);
}
?>