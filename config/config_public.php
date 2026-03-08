<?php

header('Content-Type: application/json; charset=utf-8');

$config = require __DIR__.'/config/app_config.php';

echo json_encode([
    'brand' => $config['brand'],
    'theme' => $config['theme'],
    'competitions' => $config['competitions'],
    'weight_classes' => $config['weight_classes']
], JSON_UNESCAPED_UNICODE);
