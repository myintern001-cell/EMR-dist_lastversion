<?php
// services/patient_docs.php
header('Content-Type: application/json');
require_once '../conn.php';

$hn         = isset($_GET['hn'])         ? trim($_GET['hn'])         : '';
$doctype_id = isset($_GET['doctype_id']) ? trim($_GET['doctype_id']) : '';
$dateFrom   = isset($_GET['date_from'])  ? trim($_GET['date_from'])  : '';
$dateTo     = isset($_GET['date_to'])    ? trim($_GET['date_to'])    : '';

if (!$hn || !$doctype_id) {
    echo json_encode(['error' => 'hn and doctype_id are required']);
    exit;
}

try {
    $params = [':hn' => $hn, ':doctype_id' => $doctype_id];
    $dateCondition = '';

    if ($dateFrom && $dateTo) {
        $dateCondition = "AND DATE(uploaded_at) BETWEEN :date_from AND :date_to";
        $params[':date_from'] = $dateFrom;
        $params[':date_to']   = $dateTo;
    } elseif ($dateFrom) {
        $dateCondition = "AND DATE(uploaded_at) = :date_from";
        $params[':date_from'] = $dateFrom;
    }

    $stmt = $pdo->prepare("
        SELECT id, original_name, stored_name, file_path, file_size, mime_type, uploaded_at
        FROM documents
        WHERE hn = :hn AND doctype_id = :doctype_id
        {$dateCondition}
        ORDER BY uploaded_at DESC
    ");

    $stmt->execute($params);
    $docs = $stmt->fetchAll();

    echo json_encode(['docs' => $docs]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'DB error', 'docs' => []]);
}
?>