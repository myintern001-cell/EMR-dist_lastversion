<?php
// core/Controller.php — Base Controller

class Controller
{
    /**
     * Render a view file with optional data
     */
    protected function view(string $viewPath, array $data = []): void
    {
        extract($data);
        $viewFile = BASE_PATH . '/views/' . $viewPath . '.php';
        if (!file_exists($viewFile)) {
            http_response_code(500);
            echo "View not found: {$viewPath}";
            return;
        }
        require $viewFile;
    }

    /**
     * Send JSON response
     */
    protected function json(array $data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
    }

    /**
     * Get JSON body from POST request
     */
    protected function jsonBody(): ?array
    {
        return json_decode(file_get_contents('php://input'), true);
    }

    /**
     * Get query parameter
     */
    protected function query(string $key, string $default = ''): string
    {
        return isset($_GET[$key]) ? trim($_GET[$key]) : $default;
    }

    /**
     * Get POST parameter
     */
    protected function post(string $key, string $default = ''): string
    {
        return isset($_POST[$key]) ? trim($_POST[$key]) : $default;
    }
}
