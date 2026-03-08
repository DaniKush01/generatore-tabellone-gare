<?php
require_once __DIR__ . '/session_boot.php';

// logout.php – distrugge la sessione e invalida il cookie
header('Content-Type: application/json; charset=utf-8');

$secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
          (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

session_name('JJSESSID');
if (PHP_VERSION_ID >= 70300) {
  session_set_cookie_params(['httponly'=>true,'secure'=>$secure,'samesite'=>'Lax','path'=>'/gestione_gare']);
} else {
  ini_set('session.cookie_httponly','1');
  if ($secure) ini_set('session.cookie_secure','1');
  ini_set('session.cookie_samesite','Lax');
  ini_set('session.cookie_path','/gestione_gare');
}
session_start();

$_SESSION = [];
if (ini_get('session.use_cookies')) {
  $params = session_get_cookie_params();
  setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
}
session_destroy();

echo json_encode(['ok'=>true]);
