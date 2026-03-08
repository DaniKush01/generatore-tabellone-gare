<?php
require_once __DIR__ . '/session_boot.php';
require_once __DIR__ . '/config/db_connect.php';

/* ===== WHITELABEL CONFIG ===== */
$config = require __DIR__ . '/config/app_config.php';

header('Content-Type: application/json; charset=utf-8');


/* =================== DEBUG & ERROR HANDLERS =================== */

$DEBUG = isset($_GET['debug']);

ini_set('display_errors', $DEBUG ? '1' : '0');
error_reporting($DEBUG ? E_ALL : (E_ALL & ~E_NOTICE & ~E_WARNING));

function json_fatal($msg, $code = 500, $extra = null) {

  if (!headers_sent()) header('Content-Type: application/json; charset=utf-8');

  http_response_code($code);

  $out = ['error' => $msg];

  if ($extra !== null) $out['detail'] = $extra;

  echo json_encode($out, JSON_UNESCAPED_UNICODE);

  exit;

}

set_exception_handler(function($ex){

  json_fatal('Eccezione non gestita', 500, $ex->getMessage());

});

set_error_handler(function($errno, $errstr, $errfile, $errline){

  $fatal = [E_USER_ERROR, E_RECOVERABLE_ERROR];

  if (in_array($errno, $fatal, true)) {

    json_fatal('Errore PHP', 500, "$errstr in $errfile:$errline");

  }

  return false;

});

register_shutdown_function(function(){

  $e = error_get_last();

  if ($e && in_array($e['type'], [E_ERROR,E_PARSE,E_CORE_ERROR,E_COMPILE_ERROR])) {

    json_fatal('Errore fatale', 500, $e['message'].' in '.$e['file'].':'.$e['line']);

  }

});


/* =================== ACL HELPERS =================== */

function respond($data, $status = 200) {

  http_response_code($status);

  echo json_encode($data, JSON_UNESCAPED_UNICODE);

  exit;

}

function session_require_login() {

  if (empty($_SESSION['uid'])) respond(['error'=>'Non autenticato'], 401);

}

function session_require_admin() {

  session_require_login();

  if (($_SESSION['ruolo'] ?? 'user') !== 'admin') respond(['error'=>'Solo admin'], 403);

}

function is_admin() { return (($_SESSION['ruolo'] ?? 'user') === 'admin'); }

function session_uid() { return isset($_SESSION['uid']) ? (int)$_SESSION['uid'] : null; }


/* =================== MAIL CONFIG =================== */

$APP_BASE_URL = $config['app']['base_url'];
$MAIL_FROM    = $config['email']['from'];
$MAIL_NAME    = $config['brand']['name'];

$SMTP = [
  'enabled' => false,
  'host' => 'smtp.example.com',
  'user' => 'user',
  'pass' => 'pass',
  'port' => 587,
  'secure' => 'tls'
];

$FORCE_MAIL_FALLBACK = true;


/* =================== MAIL HELPERS =================== */

function sendInviteEmail($to, $palestra, $loginUrl, $plainPassword, $email) {

  global $MAIL_FROM, $MAIL_NAME, $config;

  $subject = 'Il tuo account è pronto';

$html = '<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111">
  <h2 style="color:'.$config['theme']['primary'].';margin:0 0 12px">Benvenuto!</h2>
  <p>È stato creato un account per la palestra <strong>'.htmlspecialchars($palestra).'</strong>.</p>
  <p>Le tue credenziali di accesso sono:</p>
  <ul>
    <li><strong>Email:</strong> '.htmlspecialchars($email).'</li>
    <li><strong>Password:</strong> '.htmlspecialchars($plainPassword).'</li>
  </ul>
  <p>Puoi accedere da qui:</p>
  <p><a href="'.htmlspecialchars($loginUrl).'" style="background:'.$config['theme']['primary'].';color:#000;padding:10px 16px;border-radius:6px;text-decoration:none">Vai al login</a></p>
  <p style="font-size:12px;color:#666">Se non ti aspettavi questa email, ignora questo messaggio.</p>
</div>';

  $headers  = "MIME-Version: 1.0\r\n";
  $headers .= "Content-type:text/html; charset=UTF-8\r\n";
  $headers .= "From: $MAIL_NAME <$MAIL_FROM>\r\n";

  return @mail($to, $subject, $html, $headers);

}


/* =================== UTILS =================== */

function b64u_enc($s){ return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }

function b64u_dec($s){ return base64_decode(strtr($s, '-_', '+/')); }

$EMAIL_CHANGE_SECRET = 'CHANGE_ME_TO_A_LONG_RANDOM_SECRET_STRING_64_CHARS_MIN';


/* =================== ACTIONS =================== */

/* POST action=resend (ADMIN) */

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_GET['action'] ?? '') === 'resend') {

  session_require_admin();

  $id = (int)($_GET['id'] ?? $_POST['id'] ?? 0);

  if (!$id) respond(['error'=>'ID mancante'],400);

  $stmt = $pdo->prepare("SELECT email, palestra FROM utenti WHERE id = ?");

  $stmt->execute([$id]);

  $u = $stmt->fetch();

  if (!$u) respond(['error'=>'Utente non trovato'],404);

  $loginUrl = rtrim($APP_BASE_URL,'/').'/index.html';

  $newPwd = bin2hex(random_bytes(4));

  $hash = password_hash($newPwd, PASSWORD_BCRYPT);

  $upd = $pdo->prepare("UPDATE utenti SET password = :p WHERE id = :id");

  $upd->execute([':p'=>$hash, ':id'=>$id]);

  $ok = sendInviteEmail($u['email'], $u['palestra'], $loginUrl, $newPwd, $u['email']);

  if (!$ok) respond(['error'=>'Invio email fallito'],500);

  respond(['ok'=>true]);

}


/* =================== GET utenti =================== */

if ($_SERVER['REQUEST_METHOD'] === 'GET') {

  if (isset($_GET['id'])) {

    session_require_login();

    $id = (int)$_GET['id'];

    $me = session_uid();

    if (!is_admin() && $id !== $me) respond(['error'=>'Operazione non consentita'],403);

    $stmt = $pdo->prepare("SELECT id, email, palestra, ruolo, last_log FROM utenti WHERE id = ?");

    $stmt->execute([$id]);

    $user = $stmt->fetch();

    $user ? respond($user) : respond(['error'=>'Utente non trovato'],404);

  } else {

    session_require_admin();

    $rows = $pdo->query("SELECT id, email, palestra, ruolo, last_log FROM utenti ORDER BY id DESC")->fetchAll();

    respond($rows);

  }

}
