<?php
// controllers/DocumentController.php

require_once BASE_PATH . '/core/Controller.php';
require_once BASE_PATH . '/models/Document.php';

class DocumentController extends Controller
{
    /**
     * Render documents page
     */
    public function index(): void
    {
        $pageTitle  = 'เอกสารทั้งหมด';
        $breadcrumb = 'เอกสารทั้งหมด';
        $activePage = 'documents';
        $this->view('document/index', compact('pageTitle', 'breadcrumb', 'activePage'));
    }

    /**
     * API: List all documents
     */
    public function apiList(): void
    {
        require_once BASE_PATH . '/conn.php';
        try {
            $model = new Document($pdo);
            $rows  = $model->getAll();
            $this->json(['data' => $rows]);
        } catch (PDOException $e) {
            $this->json(['error' => 'Query failed', 'data' => []], 500);
        }
    }

    /**
     * API: Delete a document
     */
    public function apiDelete(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->json(['success' => false, 'message' => 'Method not allowed'], 405);
            return;
        }

        $body = $this->jsonBody();
        $id   = isset($body['id']) ? (int)$body['id'] : 0;
        if (!$id) {
            $this->json(['success' => false, 'message' => 'Invalid ID']);
            return;
        }

        require_once BASE_PATH . '/conn.php';
        try {
            $model    = new Document($pdo);
            $filePath = $model->delete($id);

            if ($filePath === null) {
                $this->json(['success' => false, 'message' => 'Document not found']);
                return;
            }

            // ลบไฟล์จริง (path traversal check)
            $realPath   = realpath(BASE_PATH . '/' . $filePath);
            $uploadBase = realpath(BASE_PATH . '/uploads');
            if ($realPath && strpos($realPath, $uploadBase) === 0 && file_exists($realPath)) {
                @unlink($realPath);
            }

            $this->json(['success' => true]);
        } catch (PDOException $e) {
            $this->json(['success' => false, 'message' => 'Database error'], 500);
        }
    }

    /**
     * API: Download a document
     */
    public function apiDownload(): void
    {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if (!$id) {
            http_response_code(400);
            exit('Invalid ID');
        }

        require_once BASE_PATH . '/conn.php';
        try {
            $model = new Document($pdo);
            $doc   = $model->findById($id);
        } catch (PDOException $e) {
            http_response_code(500);
            exit('DB error');
        }

        if (!$doc) {
            http_response_code(404);
            exit('File not found');
        }

        // Resolve path
        $filePath = BASE_PATH . '/' . $doc['file_path'];
        $filePath = realpath($filePath);

        // ป้องกัน path traversal
        $uploadBase = realpath(BASE_PATH . '/uploads');
        if (!$filePath || strpos($filePath, $uploadBase) !== 0) {
            http_response_code(403);
            exit('Access denied');
        }
        if (!file_exists($filePath)) {
            http_response_code(404);
            exit('File not found on disk');
        }

        // Stream file
        $originalName = $doc['original_name'];
        $safeFilename = preg_replace('/[^\w\-. ]/u', '_', $originalName);

        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="' . rawurlencode($safeFilename) . '"');
        header('Content-Length: ' . filesize($filePath));
        header('Cache-Control: no-store');
        readfile($filePath);
        exit;
    }
}
