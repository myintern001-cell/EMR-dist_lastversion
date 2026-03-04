<?php
// models/Patient.php

class Patient
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Find patient by HN (checks if documents exist for this HN)
     */
    public function findByHn(string $hn): ?array
    {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) AS cnt FROM documents WHERE hn = :hn LIMIT 1");
        $stmt->execute([':hn' => $hn]);
        $row = $stmt->fetch();

        if ($row['cnt'] > 0) {
            return [
                'hn'    => $hn,
                'name'  => 'ผู้ป่วย HN ' . htmlspecialchars($hn),
                'extra' => '<span><i class="bi bi-calendar3"></i> อายุ: —</span>
                            <span><i class="bi bi-gender-ambiguous"></i> เพศ: —</span>',
            ];
        }

        return null;
    }
}
