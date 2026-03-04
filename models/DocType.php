<?php
// models/DocType.php

class DocType
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Get all document types (for upload dropdown)
     */
    public function getAll(): array
    {
        $stmt = $this->pdo->query("
            SELECT doctype_id, DocTypeName, DocType
            FROM tb_opd_doctype
            WHERE doctype_id NOT IN ('0', 'doctype_id')
            ORDER BY CAST(doctype_id AS UNSIGNED)
        ");
        return $stmt->fetchAll();
    }

    /**
     * Get document types that have documents for a given HN, with optional date filter
     */
    public function getByHn(string $hn, string $dateFrom = '', string $dateTo = ''): array
    {
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

        $stmt = $this->pdo->prepare("
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
        return $stmt->fetchAll();
    }
}
