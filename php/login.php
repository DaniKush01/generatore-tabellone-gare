<?php
require_once __DIR__ . '/session_boot.php';

header('Content-Type: application/json; charset=utf-8');

/* ===== WHITELABEL CONFIG ===== */
$config = require __DIR__ . '/config/app_config.php';

/* ─────────────────────────────────────────────────────────────
   Sessione sicura
   ───────────────────────────────────────────────────────────── */
$secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');

if (PHP_VERSION_ID >= 70300) {
    session_set_cookie_params([
        'httponly' => true,
        'secure'   => $secure,
        'samesite' => 'Lax',
    ]);
} else {
    ini_set('session.cookie_httponly', '1');
    if ($secure) ini_set('session.cookie_secure', '1');
    ini_set('session.cookie_samesite', 'Lax');
}

session_start();

require_once __DIR__ . '/config/db_connect.php';


/* ─────────────────────────────────────────────────────────────
   Utilities
   ───────────────────────────────────────────────────────────── */

function respond($data, int $status = 200): never {

    http_response_code($status);

    echo json_encode($data, JSON_UNESCAPED_UNICODE);

    exit;

}


/* ─────────────────────────────────────────────────────────────
   1) Input credenziali (JSON o form)
   ───────────────────────────────────────────────────────────── */

$raw  = file_get_contents('php://input');

$body = json_decode($raw, true);

if (!is_array($body)) {
    $body = $_POST;
}

$email = trim($body['email'] ?? '');
$pwd   = (string)($body['password'] ?? '');

if ($email === '' || $pwd === '') {

    respond([
        'ok' => false,
        'error' => 'Email o password mancanti'
    ], 400);

}


/* ─────────────────────────────────────────────────────────────
   2) Lookup utente
   ───────────────────────────────────────────────────────────── */

$stmt = $pdo->prepare("
    SELECT id, email, password, ruolo, palestra
    FROM utenti
    WHERE email = ?
    LIMIT 1
");

$stmt->execute([$email]);

$u = $stmt->fetch();


if (!$u || !password_verify($pwd, $u['password'])) {

    respond([
        'ok' => false,
        'error' => 'Credenziali non corrette'
    ], 401);

}


/* ─────────────────────────────────────────────────────────────
   3) Login OK
   ───────────────────────────────────────────────────────────── */

@session_regenerate_id(true);

$_SESSION['uid']      = (int)$u['id'];
$_SESSION['ruolo']    = $u['ruolo'] ?: 'user';
$_SESSION['palestra'] = $u['palestra'] ?: '';


try {

    $pdo->prepare("
        UPDATE utenti
        SET last_log = NOW()
        WHERE id = ?
    ")->execute([$u['id']]);

} catch (Throwable $e) {

    // non bloccare il login

}


/* ─────────────────────────────────────────────────────────────
   4) Risposta al client
   ───────────────────────────────────────────────────────────── */

respond([

    'ok'       => true,

    'uid'      => (int)$u['id'],
    'id'       => (int)$u['id'],

    'email'    => $u['email'],
    'palestra' => $u['palestra'],

    'role'     => $u['ruolo'],

    /* dati utili al frontend */

    'brand' => [
        'name' => $config['brand']['name'],
        'logo' => $config['brand']['logo']
    ],

    'theme' => [
        'primary' => $config['theme']['primary'],
        'primary_dark' => $config['theme']['primary_dark']
    ]

]);
