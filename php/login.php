<?php

require_once __DIR__ . '/session_boot.php';

header('Content-Type: application/json; charset=utf-8');

/* ===== CONFIG ===== */
$config = require __DIR__ . '/config/app_config.php';
require_once __DIR__ . '/config/db_connect.php';


/* ─────────────────────────────────────────
   Utility risposta JSON
───────────────────────────────────────── */

function respond($data, int $status = 200): never {

    http_response_code($status);

    echo json_encode($data, JSON_UNESCAPED_UNICODE);

    exit;

}


/* ─────────────────────────────────────────
   Lettura input (JSON o form)
───────────────────────────────────────── */

$raw = file_get_contents('php://input');

$body = json_decode($raw, true);

if (!is_array($body)) {
    $body = $_POST;
}

$email = strtolower(trim($body['email'] ?? ''));
$pwd   = (string)($body['password'] ?? '');

if ($email === '' || $pwd === '') {

    respond([
        'ok' => false,
        'error' => 'Email o password mancanti'
    ], 400);

}


/* ─────────────────────────────────────────
   Lookup utente
───────────────────────────────────────── */

try {

    $stmt = $pdo->prepare("
        SELECT id, email, password, ruolo, palestra
        FROM utenti
        WHERE email = ?
        LIMIT 1
    ");

    $stmt->execute([$email]);

    $user = $stmt->fetch(PDO::FETCH_ASSOC);

} catch (Throwable $e) {

    respond([
        'ok' => false,
        'error' => 'Errore database'
    ], 500);

}


/* ─────────────────────────────────────────
   Verifica password
───────────────────────────────────────── */

if (!$user || !password_verify($pwd, $user['password'])) {

    respond([
        'ok' => false,
        'error' => 'Credenziali non corrette'
    ], 401);

}


/* ─────────────────────────────────────────
   Login OK
───────────────────────────────────────── */

session_regenerate_id(true);

$_SESSION['uid']      = (int)$user['id'];
$_SESSION['ruolo']    = $user['ruolo'] ?: 'user';
$_SESSION['palestra'] = $user['palestra'] ?: '';


/* aggiorna ultimo login */

try {

    $pdo->prepare("
        UPDATE utenti
        SET last_log = NOW()
        WHERE id = ?
    ")->execute([$user['id']]);

} catch (Throwable $e) {
    // non bloccare login
}


/* ─────────────────────────────────────────
   Risposta al frontend
───────────────────────────────────────── */

respond([

    'ok' => true,

    'id'       => (int)$user['id'],
    'uid'      => (int)$user['id'],

    'email'    => $user['email'],
    'palestra' => $user['palestra'],

    'role'     => $user['ruolo'],

    'brand' => [
        'name' => $config['brand']['name'],
        'logo' => $config['brand']['logo']
    ],

    'theme' => [
        'primary'      => $config['theme']['primary'],
        'primary_dark' => $config['theme']['primary_dark']
    ]

]);
