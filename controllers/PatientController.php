<?php
// controllers/PatientController.php

require_once BASE_PATH . '/core/Controller.php';
require_once BASE_PATH . '/models/Patient.php';
require_once BASE_PATH . '/models/Document.php';
require_once BASE_PATH . '/models/DocType.php';

class PatientController extends Controller
{
    /**
     * Render patient search page
     */
    public function index(): void
    {
        $pageTitle  = 'ค้นหาผู้ป่วย';
        $breadcrumb = 'ค้นหาผู้ป่วย';
        $activePage = 'patient';
        $this->view('patient/index', compact('pageTitle', 'breadcrumb', 'activePage'));
    }

    /**
     * API: Search patient by HN
     */
    public function apiSearch(): void
    {
        $hn = $this->query('hn');
        if (!$hn) {
            $this->json(['error' => 'HN is required']);
            return;
        }

        require_once BASE_PATH . '/conn.php';
        try {
            $model   = new Patient($pdo);
            $patient = $model->findByHn($hn);
            $this->json(['patient' => $patient]);
        } catch (PDOException $e) {
            $this->json(['error' => 'DB error'], 500);
        }
    }

    /**
     * API: Get document types for a patient HN
     */
    public function apiDoctypes(): void
    {
        $hn       = $this->query('hn');
        $dateFrom = $this->query('date_from');
        $dateTo   = $this->query('date_to');

        if (!$hn) {
            $this->json(['error' => 'HN is required']);
            return;
        }

        require_once BASE_PATH . '/conn.php';
        try {
            $model    = new DocType($pdo);
            $doctypes = $model->getByHn($hn, $dateFrom, $dateTo);
            $this->json(['doctypes' => $doctypes]);
        } catch (PDOException $e) {
            $this->json(['error' => 'DB error', 'doctypes' => []], 500);
        }
    }

    /**
     * API: Get documents by HN + doctype_id
     */
    public function apiDocs(): void
    {
        $hn        = $this->query('hn');
        $doctypeId = $this->query('doctype_id');
        $dateFrom  = $this->query('date_from');
        $dateTo    = $this->query('date_to');

        if (!$hn || !$doctypeId) {
            $this->json(['error' => 'hn and doctype_id are required']);
            return;
        }

        require_once BASE_PATH . '/conn.php';
        try {
            $model = new Document($pdo);
            $docs  = $model->getByHnAndDoctype($hn, $doctypeId, $dateFrom, $dateTo);
            $this->json(['docs' => $docs]);
        } catch (PDOException $e) {
            $this->json(['error' => 'DB error', 'docs' => []], 500);
        }
    }
}
