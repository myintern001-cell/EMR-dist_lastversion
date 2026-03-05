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

        $matched = $this->matchRoute($routes, $uri);
        if ($matched !== null) {
            $this->dispatch($matched['route'], $matched['params']);
            return;
        }

        // No route matched
        http_response_code(404);
        echo '404 — Page not found';
    }

    /**
     * Match route by exact path first, then dynamic params like /patient/{hn}
     */
    private function matchRoute(array $routes, string $uri): ?array
    {
        if (isset($routes[$uri])) {
            return ['route' => $routes[$uri], 'params' => []];
        }

        foreach ($routes as $path => $route) {
            if (strpos($path, '{') === false) {
                continue;
            }

            $paramNames = [];
            $pattern = $this->compileRoutePattern($path, $paramNames);
            if (!preg_match($pattern, $uri, $matches)) {
                continue;
            }

            array_shift($matches);
            $params = [];
            foreach ($paramNames as $idx => $name) {
                $params[$name] = urldecode($matches[$idx] ?? '');
            }

            return ['route' => $route, 'params' => $params];
        }

        return null;
    }

    /**
     * Compile route templates to regex pattern
     */
    private function compileRoutePattern(string $path, array &$paramNames): string
    {
        $regex = preg_replace_callback(
            '/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/',
            static function (array $m) use (&$paramNames): string {
                $paramNames[] = $m[1];
                return '([^\\/]+)';
            },
            $path
        );

        $regex = str_replace('/', '\\/', $regex);
        return '#^' . $regex . '$#';
    }

    /**
     * Dispatch matched route to controller method
     */
    private function dispatch(array $route, array $params = []): void
    {
        $controller = $route['controller'];
        $method = $route['method'];

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

        $instance->$method(...array_values($params));
    }
}
