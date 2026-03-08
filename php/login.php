<?php
require_once __DIR__ . '/session_boot.php';

header('Content-Type: application/json; charset=utf-8');
/* ─────────────────────────────────────────────────────────────
   Sessione sicura (cookie HttpOnly, SameSite=Lax, Secure se HTTPS)
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
   1) Input credenziali (JSON o x-www-form-urlencoded)
   ───────────────────────────────────────────────────────────── */
$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!is_array($body)) $body = $_POST;

$email = trim($body['email']    ?? '');
$pwd   = (string)($body['password'] ?? '');

if ($email === '' || $pwd === '') {
    respond(['ok' => false, 'error' => 'Email o password mancanti'], 400);
}

/* ─────────────────────────────────────────────────────────────
   2) Connessione PDO
   ───────────────────────────────────────────────────────────── */
try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$db;charset=$charset",
        $user,
        $pass,
        [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]
    );
} catch (Throwable $e) {
    respond(['ok' => false, 'error' => 'Connessione DB fallita'], 500);
}

/* ─────────────────────────────────────────────────────────────
   3) Lookup utente per email + verifica password hash
   ───────────────────────────────────────────────────────────── */
$stmt = $pdo->prepare("SELECT id, email, password, ruolo, palestra FROM utenti WHERE email = ? LIMIT 1");
$stmt->execute([$email]);
$u = $stmt->fetch();

if (!$u || !password_verify($pwd, $u['password'])) {
    // (opzionale) anti-enumeration: password_verify($pwd, '$2y$10$usesomesillystringfore7hnbRJHxXVLeTf6aM5E4b9KD2.tE4MZCw7q');
    respond(['ok' => false, 'error' => 'Credenziali non corrette'], 401);
}

/* ─────────────────────────────────────────────────────────────
   4) Login OK → rigenera sessione + bootstrap + last_log
   ───────────────────────────────────────────────────────────── */
@session_regenerate_id(true);

$_SESSION['uid']      = (int)$u['id'];
$_SESSION['ruolo']    = $u['ruolo'] ?: 'user';
$_SESSION['palestra'] = $u['palestra'] ?: '';

try {
    $pdo->prepare("UPDATE utenti SET last_log = NOW() WHERE id = ?")->execute([$u['id']]);
} catch (Throwable $e) {
    // non bloccare il login in caso di errore di logging
}

/* ─────────────────────────────────────────────────────────────
   5) Risposta al client (compat: invio sia uid che id)
   ───────────────────────────────────────────────────────────── */
respond([
    'ok'       => true,
    'uid'      => (int)$u['id'],     // usato dal front-end per azioni utente
    'id'       => (int)$u['id'],     // compatibilità eventuale
    'email'    => $u['email'],
    'palestra' => $u['palestra'],
    'role'     => $u['ruolo'],       // 'admin' | 'coach' | 'user'
]);

