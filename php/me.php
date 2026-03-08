<?php
require_once __DIR__ . '/session_boot.php';

// me.php — stato sessione utente (robusto con fallback + debug opzionale)
header('Content-Type: application/json; charset=utf-8');

/* ===== WHITELABEL CONFIG ===== */
$config = require __DIR__ . '/config/app_config.php';

// DEBUG: /gestione_gare/me.php?debug=1 per messaggi d'errore
$DEBUG = isset($_GET['debug']);

if ($DEBUG) {
    ini_set('display_errors', '1');
    error_reporting(E_ALL);
}

/* ─────────────────────────────────────────────────────────────
   Bootstrap sessione (preferisce session_boot.php, altrimenti fallback)
   ───────────────────────────────────────────────────────────── */

$bootFile = __DIR__ . '/session_boot.php';

if (is_file($bootFile)) {

    include_once $bootFile;

} else {

    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
           || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

    $host = $_SERVER['HTTP_HOST'] ?? 'jujitsugroup.it';

    if (strpos($host, 'www.') === 0) {
        $host = substr($host, 4);
    }

    $cookieDomain = '.' . $host;
    $cookiePath   = '/gestione_gare';

    session_name('JJSESSID');

    if (PHP_VERSION_ID >= 70300) {

        session_set_cookie_params([
            'lifetime' => 0,
            'path'     => $cookiePath,
            'domain'   => $cookieDomain,
            'secure'   => $secure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);

    } else {

        ini_set('session.cookie_lifetime', '0');
        ini_set('session.cookie_path',     $cookiePath);
        ini_set('session.cookie_domain',   $cookieDomain);
        ini_set('session.cookie_httponly', '1');

        if ($secure) {
            ini_set('session.cookie_secure', '1');
        }

        ini_set('session.cookie_samesite', 'Lax');
    }

    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }

}

/* ─────────────────────────────────────────────────────────────
   Stato sessione
   ───────────────────────────────────────────────────────────── */

if (session_status() !== PHP_SESSION_ACTIVE) {

    http_response_code(500);

    echo json_encode([
        'ok'=>false,
        'error'=>'Sessione non attiva'
    ], JSON_UNESCAPED_UNICODE);

    exit;

}

if (empty($_SESSION['uid'])) {

    http_response_code(401);

    echo json_encode([
        'ok'=>false,
        'error'=>'Non autenticato'
    ], JSON_UNESCAPED_UNICODE);

    exit;

}

/* ─────────────────────────────────────────────────────────────
   Risposta sessione + config frontend
   ───────────────────────────────────────────────────────────── */

echo json_encode([

    'ok'       => true,

    'uid'      => (int)$_SESSION['uid'],

    'role'     => $_SESSION['ruolo'] ?? 'user',

    'palestra' => $_SESSION['palestra'] ?? '',

    /* dati utili al frontend */

    'brand' => [
        'name' => $config['brand']['name'],
        'logo' => $config['brand']['logo']
    ],

    'theme' => [
        'primary' => $config['theme']['primary'],
        'primary_dark' => $config['theme']['primary_dark']
    ]

], JSON_UNESCAPED_UNICODE);
