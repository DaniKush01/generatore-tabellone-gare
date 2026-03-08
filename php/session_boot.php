<?php
// /gestione_gare/session_boot.php
$secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
       || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

$host = $_SERVER['HTTP_HOST'] ?? 'jujitsugroup.it';
$host = preg_replace('/:\d+$/', '', $host);
$cookieDomain = (filter_var($host, FILTER_VALIDATE_IP) || $host === 'localhost') ? '' : '.'.$host;

$cookiePath = '/gestione_gare'; // valido per pagine e API sotto /gestione_gare

if (PHP_VERSION_ID >= 70300) {
  session_set_cookie_params([
    'lifetime' => 0,
    'path'     => $cookiePath,
    'domain'   => $cookieDomain ?: null,
    'secure'   => $secure,
    'httponly' => true,
    'samesite' => 'Lax',
  ]);
} else {
  ini_set('session.cookie_lifetime', '0');
  ini_set('session.cookie_path',     $cookiePath);
  if ($cookieDomain) ini_set('session.cookie_domain', $cookieDomain);
  ini_set('session.cookie_httponly', '1');
  ini_set('session.cookie_samesite', 'Lax');
  if ($secure) ini_set('session.cookie_secure', '1');
}

if (session_status() !== PHP_SESSION_ACTIVE) session_start();
