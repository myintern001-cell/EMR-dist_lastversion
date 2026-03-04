<?php
// index.php — Front Controller (MVC Entry Point)

// ── BASE PATH & URL ───────────────────────────────────
define('BASE_PATH', __DIR__);

// Auto-detect BASE_URL from the request (works on XAMPP and any server)
$scriptName = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME']));
$baseUrl    = rtrim($scriptName, '/');
define('BASE_URL', $baseUrl);

// ── ROUTER ────────────────────────────────────────────
require_once BASE_PATH . '/core/Router.php';

$router = new Router();

// --- Page Routes ---
$router->get('/',          'PatientController',  'index');
$router->get('/patient',   'PatientController',  'index');
$router->get('/documents', 'DocumentController', 'index');
$router->get('/upload',    'UploadController',   'index');

// --- API Routes ---
$router->get('/api/documents',        'DocumentController', 'apiList');
$router->post('/api/documents/delete','DocumentController', 'apiDelete');
$router->get('/api/download',         'DocumentController', 'apiDownload');

$router->get('/api/patient',          'PatientController',  'apiSearch');
$router->get('/api/patient/doctypes', 'PatientController',  'apiDoctypes');
$router->get('/api/patient/docs',     'PatientController',  'apiDocs');

$router->post('/api/upload',          'UploadController',   'apiUpload');
$router->get('/api/doctypes',         'UploadController',   'apiDoctypeList');

// ── RESOLVE REQUEST ───────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
$uri    = $_SERVER['REQUEST_URI'];

// Strip the base path from URI so routes match correctly
if ($baseUrl !== '' && strpos($uri, $baseUrl) === 0) {
    $uri = substr($uri, strlen($baseUrl));
}
if ($uri === '' || $uri === false) {
    $uri = '/';
}

$router->resolve($method, $uri);
