<?php
// models/Document.php

class Document
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Get all documents
     */
    public function getAll(): array
    {
        $stmt = $this->pdo->query("
            SELECT id, original_name, stored_name, file_path, file_size, mime_type,
                   uploaded_at,
                   'uploaded' AS status
            FROM documents
            ORDER BY uploaded_at DESC
        ");
        return $stmt->fetchAll();
    }

    /**
     * Find a document by ID
     */
    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM documents WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Delete a document by ID, returns the file_path before deletion
     */
    public function delete(int $id): ?string
    {
        $stmt = $this->pdo->prepare("SELECT file_path FROM documents WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $doc = $stmt->fetch();

        if (!$doc) {
            return null;
        }

        $del = $this->pdo->prepare("DELETE FROM documents WHERE id = :id");
        $del->execute([':id' => $id]);

        return $doc['file_path'];
    }

    /**
     * Insert a new document
     */
    public function create(array $data): string
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO documents (hn, doctype_id, original_name, stored_name, file_path, file_size, mime_type)
            VALUES (:hn, :doctype_id, :original_name, :stored_name, :file_path, :file_size, :mime_type)
        ");
        $stmt->execute([
            ':hn'            => $data['hn'],
            ':doctype_id'    => $data['doctype_id'],
            ':original_name' => $data['original_name'],
            ':stored_name'   => $data['stored_name'],
            ':file_path'     => $data['file_path'],
            ':file_size'     => $data['file_size'],
            ':mime_type'     => $data['mime_type'],
        ]);
        return $this->pdo->lastInsertId();
    }

    /**
     * Get documents by HN and doctype_id with optional date filter
     */
    public function getByHnAndDoctype(string $hn, string $doctypeId, string $dateFrom = '', string $dateTo = ''): array
    {
        $params = [':hn' => $hn, ':doctype_id' => $doctypeId];
        $dateCondition = '';

        if ($dateFrom && $dateTo) {
            $dateCondition = "AND DATE(uploaded_at) BETWEEN :date_from AND :date_to";
            $params[':date_from'] = $dateFrom;
            $params[':date_to']   = $dateTo;
        } elseif ($dateFrom) {
            $dateCondition = "AND DATE(uploaded_at) = :date_from";
            $params[':date_from'] = $dateFrom;
        }

        $stmt = $this->pdo->prepare("
            SELECT id, original_name, stored_name, file_path, file_size, mime_type, uploaded_at
            FROM documents
            WHERE hn = :hn AND doctype_id = :doctype_id
            {$dateCondition}
            ORDER BY uploaded_at DESC
        ");

        $stmt->execute($params);
        return $stmt->fetchAll();
    }
}
