<?php
// controllers/UploadController.php

require_once BASE_PATH . '/core/Controller.php';
require_once BASE_PATH . '/models/Document.php';
require_once BASE_PATH . '/models/DocType.php';

class UploadController extends Controller
{
    /**
     * Render upload page
     */
    public function index(): void
    {
        $pageTitle  = 'อัปโหลดเอกสาร';
        $breadcrumb = 'อัปโหลดเอกสาร';
        $activePage = 'upload';
        $this->view('upload/index', compact('pageTitle', 'breadcrumb', 'activePage'));
    }

    /**
     * API: Upload a document
     */
    public function apiUpload(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->json(['message' => 'Method not allowed'], 405);
            return;
        }
        if (!isset($_FILES['pdf'])) {
            $this->json(['message' => 'No file uploaded']);
            return;
        }

        $hn         = $this->post('hn');
        $doctype_id = $this->post('doctype_id');
        if ($hn === '' || $doctype_id === '') {
            $this->json(['message' => 'HN and DocType are required']);
            return;
        }
        if (mb_strlen($hn) > 20 || mb_strlen($doctype_id) > 10) {
            $this->json(['message' => 'HN or DocType is too long']);
            return;
        }

        $file = $_FILES['pdf'];

        // เช็ค error ก่อนทุกอย่าง
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $errors = [
                UPLOAD_ERR_INI_SIZE   => 'ไฟล์ใหญ่เกิน upload_max_filesize ใน php.ini',
                UPLOAD_ERR_FORM_SIZE  => 'ไฟล์ใหญ่เกิน MAX_FILE_SIZE ใน form',
                UPLOAD_ERR_PARTIAL    => 'อัปโหลดไม่สมบูรณ์',
                UPLOAD_ERR_NO_FILE    => 'ไม่มีไฟล์ถูกส่งมา',
                UPLOAD_ERR_NO_TMP_DIR => 'ไม่มี temp folder',
                UPLOAD_ERR_CANT_WRITE => 'เขียนไฟล์ไม่ได้',
            ];
            $this->json(['message' => $errors[$file['error']] ?? 'Upload error: ' . $file['error']]);
            return;
        }

        // Check MIME
        $finfo    = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        if ($mimeType !== 'application/pdf') {
            $this->json(['message' => 'Only PDF allowed']);
            return;
        }

        // Extension check
        $ext = strtolower(pathinfo(basename($file['name']), PATHINFO_EXTENSION));
        if ($ext !== 'pdf') {
            $this->json(['message' => 'Invalid file extension']);
            return;
        }

        // Size limit 100 MB
        if ($file['size'] > 100 * 1024 * 1024) {
            $this->json(['message' => 'File too large (max 100 MB)']);
            return;
        }

        $uploadDir = BASE_PATH . '/uploads/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

        $originalName = basename($file['name']);
        $storedName   = uniqid('pdf_', true) . '.pdf';
        $targetPath   = $uploadDir . $storedName;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            $this->json(['message' => 'Failed to save file']);
            return;
        }

        require_once BASE_PATH . '/conn.php';
        try {
            $model = new Document($pdo);
            $model->create([
                'hn'            => $hn,
                'doctype_id'    => $doctype_id,
                'original_name' => $originalName,
                'stored_name'   => $storedName,
                'file_path'     => 'uploads/' . $storedName,
                'file_size'     => $file['size'],
                'mime_type'     => $mimeType,
            ]);
            $this->json(['message' => 'Upload success', 'file' => $storedName]);
        } catch (PDOException $e) {
            @unlink($targetPath);
            $this->json(['message' => 'Database error'], 500);
        }
    }

    /**
     * API: Get list of document types
     */
    public function apiDoctypeList(): void
    {
        require_once BASE_PATH . '/conn.php';
        try {
            $model    = new DocType($pdo);
            $doctypes = $model->getAll();
            $this->json(['doctypes' => $doctypes]);
        } catch (PDOException $e) {
            $this->json(['error' => 'DB error', 'doctypes' => []], 500);
        }
    }
}
