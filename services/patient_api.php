<?php
// services/patient_api.php
header('Content-Type: application/json');
require_once '../conn.php';

$hn = isset($_GET['hn']) ? trim($_GET['hn']) : '';

if (!$hn) {
    echo json_encode(['error' => 'HN is required']);
    exit;
}

try {
    // ตรวจสอบว่ามีเอกสารของ HN นี้ในระบบหรือไม่
    $stmt = $pdo->prepare("SELECT COUNT(*) AS cnt FROM documents WHERE hn = :hn LIMIT 1");
    $stmt->execute([':hn' => $hn]);
    $row = $stmt->fetch();

    if ($row['cnt'] > 0) {
        echo json_encode([
            'patient' => [
                'hn'    => $hn,
                'name'  => 'ผู้ป่วย HN ' . htmlspecialchars($hn), 
                'extra' => '<span><i class="bi bi-calendar3"></i> อายุ: —</span>
                            <span><i class="bi bi-gender-ambiguous"></i> เพศ: —</span>',
            ]
        ]);
    } else {
        echo json_encode(['patient' => null]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'DB error']);
}
?>