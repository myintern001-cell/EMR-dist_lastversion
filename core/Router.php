<?php
// core/Router.php — Simple MVC Router

class Router
{
    private array $routes = [];

    /**
     * Register a GET route
     */
    public function get(string $path, string $controller, string $method): void
    {
        $this->routes['GET'][$path] = ['controller' => $controller, 'method' => $method];
    }

    /**
     * Register a POST route
     */
    public function post(string $path, string $controller, string $method): void
    {
        $this->routes['POST'][$path] = ['controller' => $controller, 'method' => $method];
    }

    /**
     * Resolve the current request to a controller+method
     */
    public function resolve(string $requestMethod, string $uri): void
    {
        // Strip query string
        $uri = strtok($uri, '?');
        // Remove trailing slash (but keep root "/")
        $uri = $uri !== '/' ? rtrim($uri, '/') : $uri;

        $routes = $this->routes[$requestMethod] ?? [];

        if (isset($routes[$uri])) {
            $route      = $routes[$uri];
            $controller = $route['controller'];
            $method     = $route['method'];

            $controllerFile = BASE_PATH . '/controllers/' . $controller . '.php';
            if (!file_exists($controllerFile)) {
                http_response_code(500);
                echo "Controller file not found: {$controller}";
                return;
            }

            require_once $controllerFile;

            if (!class_exists($controller)) {
                http_response_code(500);
                echo "Controller class not found: {$controller}";
                return;
            }

            $instance = new $controller();

            if (!method_exists($instance, $method)) {
                http_response_code(500);
                echo "Method not found: {$controller}::{$method}";
                return;
            }

            $instance->$method();
            return;
        }

        // No route matched
        http_response_code(404);
        echo '404 — Page not found';
    }
}
