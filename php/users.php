<?php
require_once __DIR__ . '/session_boot.php';

/* =================== CONFIG DB =================== */
$host    = '127.0.0.1';
$db      = 'u418740807_ea0OF';
$user    = 'u418740807_QO934';
$pass    = '8Il4@Tnx^';
$charset = 'utf8mb4';

header('Content-Type: application/json; charset=utf-8');


/* =================== DEBUG & ERROR HANDLERS =================== */
$DEBUG = isset($_GET['debug']); // attiva verbosità con ?debug=1
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

/* ==== MOD: NON trasformare WARNING/NOTICE in fatali ==== */
set_error_handler(function($errno, $errstr, $errfile, $errline){
  // Solo errori “seri” diventano JSON
  $fatal = [E_USER_ERROR, E_RECOVERABLE_ERROR];
  if (in_array($errno, $fatal, true)) {
    json_fatal('Errore PHP', 500, "$errstr in $errfile:$errline");
  }
  // lascia gestire a PHP warning/notice (non fatali)
  return false;
});

register_shutdown_function(function(){
  $e = error_get_last();
  if ($e && in_array($e['type'], [E_ERROR,E_PARSE,E_CORE_ERROR,E_COMPILE_ERROR])) {
    json_fatal('Errore fatale', 500, $e['message'].' in '.$e['file'].':'.$e['line']);
  }
});

/* =================== SESSIONE (session_boot opzionale) =================== */
$boot = __DIR__.'/session_boot.php';
if (is_file($boot)) {
  include $boot; // non deve fare echo/exit
}
if (session_status() !== PHP_SESSION_ACTIVE) {
  $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
  if (PHP_VERSION_ID >= 70300) {
    session_set_cookie_params([
      'httponly'=>true, 'secure'=>$secure, 'samesite'=>'Lax'
    ]);
  } else {
    ini_set('session.cookie_httponly','1');
    if ($secure) ini_set('session.cookie_secure','1');
    ini_set('session.cookie_samesite','Lax');
  }
  session_start();
}

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
$APP_BASE_URL = 'https://jujitsugroup.it/gestione_gare/html';
$MAIL_FROM    = 'noreply@jujitsugroup.it';
$MAIL_NAME    = 'Jujitsu Group';
$SMTP = [
  'enabled' => false, 'host'=>'smtp.example.com','user'=>'user','pass'=>'pass','port'=>587,'secure'=>'tls'
];

/* Kill-switch temporaneo: forza SEMPRE il fallback mail() */
$FORCE_MAIL_FALLBACK = true;

/* =================== MAIL HELPERS =================== */
/* Rilevamento PHPMailer SENZA includere se i file non esistono */
function phpmailer_available(): bool {
  static $detected = null;
  if ($detected !== null) return $detected;

  // A) Composer (autoloader + file presenti)
  $autoload   = __DIR__ . '/vendor/autoload.php';
  $vendorBase = __DIR__ . '/vendor/phpmailer/phpmailer/src/';
  if (is_file($autoload)
      && is_file($vendorBase.'PHPMailer.php')
      && is_file($vendorBase.'SMTP.php')
      && is_file($vendorBase.'Exception.php')) {
    require_once $autoload; // useremo l’autoloader Composer
    return $detected = true;
  }

  // B) Copia locale ./phpmailer/src (includi SOLO se esistono TUTTI i file)
  $base = __DIR__ . '/phpmailer/src/';
  if (is_file($base.'PHPMailer.php') && is_file($base.'SMTP.php') && is_file($base.'Exception.php')) {
    require_once $base.'PHPMailer.php';
    require_once $base.'SMTP.php';
    require_once $base.'Exception.php';
    return $detected = true;
  }

  // Niente libreria → fallback a mail()
  return $detected = false;
}

/* Crea un'istanza PHPMailer configurata (SMTP opzionale) */
function make_phpmailer(array $SMTP, string $MAIL_FROM, string $MAIL_NAME) {
  $mail = new PHPMailer\PHPMailer\PHPMailer(true);
  if (!empty($SMTP['enabled'])) {
    $mail->isSMTP();
    $mail->Host       = $SMTP['host'];
    $mail->SMTPAuth   = true;
    $mail->Username   = $SMTP['user'];
    $mail->Password   = $SMTP['pass'];
    $mail->SMTPSecure = $SMTP['secure']; // 'tls' | 'ssl'
    $mail->Port       = (int)$SMTP['port'];
  } else {
    $mail->isMail();
  }
  $mail->CharSet = 'UTF-8';
  $mail->setFrom($MAIL_FROM, $MAIL_NAME);
  $mail->isHTML(true);
  return $mail;
}

function sendInviteEmail($to, $palestra, $loginUrl, $plainPassword, $email) {
  global $MAIL_FROM, $MAIL_NAME, $SMTP, $FORCE_MAIL_FALLBACK;
$subject = 'Il tuo account è pronto';
$html = '<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111">
  <h2 style="color:#bf191b;margin:0 0 12px">Benvenuto!</h2>
  <p>È stato creato un account per la palestra <strong>'.htmlspecialchars($palestra).'</strong>.</p>
  <p>Le tue credenziali di accesso sono:</p>
  <ul>
    <li><strong>Email:</strong> '.htmlspecialchars($email).'</li>
    <li><strong>Password:</strong> '.htmlspecialchars($plainPassword).'</li>
  </ul>
  <p>Puoi accedere da qui:</p>
  <p><a href="'.htmlspecialchars($loginUrl).'" style="background:#bf191b;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Vai al login</a></p>
  <p style="font-size:12px;color:#666">Se non ti aspettavi questa email, ignora questo messaggio.</p>
</div>';

  $alt = strip_tags(str_replace(['<br>','</p>'], ["\n","\n"], $html));

  if (!$FORCE_MAIL_FALLBACK && phpmailer_available()) {
    try {
      $mail = make_phpmailer($SMTP, $MAIL_FROM, $MAIL_NAME);
      $mail->addAddress($to);
      $mail->Subject = $subject;
      $mail->Body    = $html;
      $mail->AltBody = $alt;
      $mail->send();
      return true;
    } catch (Throwable $e) { /* fallback sotto */ }
  }

  // Fallback nativo
  $headers  = "MIME-Version: 1.0\r\n";
  $headers .= "Content-type:text/html; charset=UTF-8\r\n";
  $headers .= "From: $MAIL_NAME <$MAIL_FROM>\r\n";
  return @mail($to, $subject, $html, $headers);
}

function sendMailGeneric($to, $subject, $html) {
  global $MAIL_FROM, $MAIL_NAME, $SMTP, $FORCE_MAIL_FALLBACK;
  $alt = strip_tags(str_replace(['<br>','</p>'], ["\n","\n"], $html));

  if (!$FORCE_MAIL_FALLBACK && phpmailer_available()) {
    try {
      $mail = make_phpmailer($SMTP, $MAIL_FROM, $MAIL_NAME);
      $mail->addAddress($to);
      $mail->Subject = $subject;
      $mail->Body    = $html;
      $mail->AltBody = $alt;
      $mail->send();
      return true;
    } catch (Throwable $e) { /* fallback sotto */ }
  }

  // Fallback nativo
  $hdr  = "MIME-Version: 1.0\r\nContent-type:text/html; charset=UTF-8\r\n";
  $hdr .= "From: $MAIL_NAME <$MAIL_FROM>\r\n";
  return @mail($to, $subject, $html, $hdr);
}

/* =================== UTILS =================== */
function b64u_enc($s){ return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function b64u_dec($s){ return base64_decode(strtr($s, '-_', '+/')); }
$EMAIL_CHANGE_SECRET = 'CHANGE_ME_TO_A_LONG_RANDOM_SECRET_STRING_64_CHARS_MIN';

/* =================== PDO =================== */
$pdo = null;
$attempts = [];

// Tentativo 1: host così com'è
$dsn1 = "mysql:host=$host;dbname=$db;charset=$charset";
try {
  $pdo = new PDO($dsn1, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
  ]);
} catch (PDOException $e) {
  $attempts[] = ['dsn' => $dsn1, 'code' => (int)$e->getCode(), 'msg' => $e->getMessage()];
}

// Tentativo 2: host=localhost (alcuni provider usano socket)
if (!$pdo) {
  $dsn2 = "mysql:host=localhost;dbname=$db;charset=$charset";
  try {
    $pdo = new PDO($dsn2, $user, $pass, [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
  } catch (PDOException $e) {
    $attempts[] = ['dsn' => $dsn2, 'code' => (int)$e->getCode(), 'msg' => $e->getMessage()];
  }
}

// Tentativo 3: socket UNIX
if (!$pdo) {
  foreach (['/var/run/mysqld/mysqld.sock', '/var/lib/mysql/mysql.sock'] as $sock) {
    $dsnSock = "mysql:unix_socket=$sock;dbname=$db;charset=$charset";
    try {
      $pdo = new PDO($dsnSock, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
      ]);
      $attempts[] = ['dsn' => $dsnSock, 'code' => 0, 'msg' => 'OK'];
      break;
    } catch (PDOException $e) {
      $attempts[] = ['dsn' => $dsnSock, 'code' => (int)$e->getCode(), 'msg' => $e->getMessage()];
    }
  }
}

if (!$pdo) {
  respond([
    'error'  => 'Connessione DB fallita',
    'detail' => $DEBUG ? $attempts : null
  ], 500);
}

/* =================== METODO & PAYLOAD =================== */
/*────────────────────────────────────────────────────────────
   Supporto JSON/urlencoded per PUT/DELETE + override _method
   ───────────────────────────────────────────────────────────── */
$method = $_SERVER['REQUEST_METHOD'];
$_PUTDELETE = [];

/* Override del metodo: consente POST + _method=PUT/DELETE (compatibile con FormData) */
if ($method === 'POST' && isset($_POST['_method'])) {
  $m = strtoupper(trim((string)$_POST['_method']));
  if (in_array($m, ['PUT','DELETE'], true)) {
    $method = $m;
    $_PUTDELETE = $_POST; // i dati arrivano già “parsati”
  }
}

if (($method === 'PUT' || $method === 'DELETE') && empty($_PUTDELETE)) {
  $raw = file_get_contents('php://input') ?: '';
  $ct  = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';

  if (stripos($ct, 'application/json') !== false) {
    $_PUTDELETE = json_decode($raw, true) ?: [];
  } elseif (stripos($ct, 'application/x-www-form-urlencoded') !== false) {
    parse_str($raw, $_PUTDELETE);
  } else {
    // multipart/form-data su PUT non è parsato: preferire override o JSON
    if (stripos($ct, 'multipart/form-data') !== false) {
      $_PUTDELETE = []; // lascio vuoto: causerà "Nessun dato da aggiornare"
    } else {
      parse_str($raw, $_PUTDELETE);
    }
  }
}
if (isset($_PUTDELETE['_method'])) unset($_PUTDELETE['_method']);

$action = $_GET['action'] ?? $_POST['action'] ?? null;

/* =================== HEALTH CHECK =================== */
if (isset($_GET['health'])) {
  $okDb = false;
  try { $okDb = (bool)$pdo->query('SELECT 1')->fetchColumn(); } catch(Throwable $e){}
  respond([
    'ok' => true,
    'php_version' => PHP_VERSION,
    'session_active' => (session_status() === PHP_SESSION_ACTIVE),
    'uid' => $_SESSION['uid'] ?? null,
    'is_admin' => is_admin(),
    'db_ok' => $okDb
  ]);
}

/* =================== ACTIONS =================== */
/* POST action=resend (ADMIN) */
if ($method === 'POST' && $action === 'resend') {
  session_require_admin();
  $id = (int)($_GET['id'] ?? $_POST['id'] ?? 0);
  if (!$id) respond(['error'=>'ID mancante'],400);

  $stmt = $pdo->prepare("SELECT email, palestra FROM utenti WHERE id = ?");
  $stmt->execute([$id]);
  $u = $stmt->fetch();
  if (!$u) respond(['error'=>'Utente non trovato'],404);

  $loginUrl = rtrim($APP_BASE_URL,'/').'/index.html';
$newPwd = bin2hex(random_bytes(4)); // 8 caratteri random
$hash = password_hash($newPwd, PASSWORD_BCRYPT);
$upd = $pdo->prepare("UPDATE utenti SET password = :p WHERE id = :id");
$upd->execute([':p'=>$hash, ':id'=>$id]);

$ok = sendInviteEmail($u['email'], $u['palestra'], $loginUrl, $newPwd, $u['email']);

  if (!$ok) respond(['error'=>'Invio email fallito'],500);
  respond(['ok'=>true]);
}

/* POST action=change_password (SELF) */
if ($method === 'POST' && $action === 'change_password') {
  session_require_login();
  $id  = (int)($_POST['id'] ?? 0);
  $old = $_POST['old_password'] ?? '';
  $new = $_POST['new_password'] ?? '';
  $me  = session_uid();
  if (!$id) $id = $me;
  if (!$id || $id !== $me) respond(['error'=>'Operazione non consentita'],403);
  if (!$old || !$new) respond(['error'=>'Dati mancanti'],400);
  if (strlen($new) < 8) respond(['error'=>'Password minima 8 caratteri'],400);

  $stmt = $pdo->prepare("SELECT password FROM utenti WHERE id = ?");
  $stmt->execute([$id]);
  $row = $stmt->fetch();
  if (!$row) respond(['error'=>'Utente non trovato'],404);
  if (!password_verify($old, $row['password'])) respond(['error'=>'Password attuale errata'],400);

  $hash = password_hash($new, PASSWORD_BCRYPT);
  $pdo->prepare("UPDATE utenti SET password = :p WHERE id = :id")->execute([':p'=>$hash, ':id'=>$id]);
  respond(['ok'=>true]);
}

/* POST action=request_email_change (SELF) */
if ($method === 'POST' && $action === 'request_email_change') {
  session_require_login();
  $id  = (int)($_POST['id'] ?? 0);
  $new = trim($_POST['new_email'] ?? '');
  $me  = session_uid();
  if (!$id) $id = $me;
  if (!$id || $id !== $me) respond(['error'=>'Operazione non consentita'],403);
  if (!$new) respond(['error'=>'Dati mancanti'],400);
  if (!filter_var($new, FILTER_VALIDATE_EMAIL)) respond(['error'=>'Email non valida'],400);

  // esistenza
  $chk = $pdo->prepare("SELECT 1 FROM utenti WHERE email = ?");
  $chk->execute([$new]);
  if ($chk->fetch()) respond(['error'=>'Email già registrata'],409);

  $payload = json_encode(['uid'=>$id,'email'=>$new,'exp'=>time()+86400], JSON_UNESCAPED_UNICODE);
  $pl  = b64u_enc($payload);
  $sig = b64u_enc(hash_hmac('sha256', $pl, $EMAIL_CHANGE_SECRET, true));
  $token = $pl.'.'.$sig;

  $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
  $host   = $_SERVER['HTTP_HOST'] ?? 'jujitsugroup.it';
  $base   = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
  $verifyUrl = $scheme.'://'.$host.$base.'/users.php?action=verify_email&token='.rawurlencode($token);

  $html = '<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111">
    <h2 style="margin:0 0 8px">Conferma nuovo indirizzo email</h2>
    <p>Per completare il cambio email, clicca il pulsante qui sotto (valido 24 ore).</p>
    <p><a href="'.htmlspecialchars($verifyUrl).'" style="background:#bf191b;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Conferma email</a></p>
    <p style="font-size:12px;color:#666">Se non hai richiesto questo cambio, ignora questa email.</p></div>';

  $ok = sendMailGeneric($new, 'Conferma nuovo indirizzo email', $html);
  if (!$ok) respond(['error'=>'Invio email fallito'],500);
  respond(['ok'=>true]);
}

/* GET action=verify_email → output HTML “umano” */
if ($method === 'GET' && $action === 'verify_email') {
  header('Content-Type: text/html; charset=utf-8');
  $token = $_GET['token'] ?? '';
  if (!$token) { echo 'Token mancante'; exit; }
  list($pl, $sig) = array_pad(explode('.', $token, 2), 2, null);
  $calc = b64u_enc(hash_hmac('sha256', (string)$pl, $EMAIL_CHANGE_SECRET, true));
  if (!$pl || !$sig || !hash_equals($calc, $sig)) { echo 'Token non valido'; exit; }
  $data = json_decode(b64u_dec($pl), true);
  if (!$data || time() > (int)$data['exp']) { echo 'Token scaduto'; exit; }
  $uid = (int)$data['uid']; $new = $data['email'];

  $chk = $pdo->prepare("SELECT 1 FROM utenti WHERE email = ?");
  $chk->execute([$new]);
  if ($chk->fetch()) { echo 'Email già in uso'; exit; }

  $pdo->prepare("UPDATE utenti SET email = :e WHERE id = :id")->execute([':e'=>$new, ':id'=>$uid]);
  echo '<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111">
          <h2 style="color:#0a8a0a;margin:0 0 8px">Email aggiornata con successo</h2>
          <p>Ora puoi chiudere questa pagina e accedere con il nuovo indirizzo.</p>
        </div>';
  exit;
}

/* GET lista/singolo */
if ($method === 'GET') {
  if (isset($_GET['id'])) {
    session_require_login();
    $id = (int)$_GET['id']; $me = session_uid();
    if (!is_admin() && $id !== $me) respond(['error'=>'Operazione non consentita'],403);
    $stmt = $pdo->prepare("SELECT id, email, palestra, ruolo, last_log FROM utenti WHERE id = ?");
    $stmt->execute([$id]); $user = $stmt->fetch();
    $user ? respond($user) : respond(['error'=>'Utente non trovato'],404);
  } else {
    session_require_admin();
    $rows = $pdo->query("SELECT id, email, palestra, ruolo, last_log FROM utenti ORDER BY id DESC")->fetchAll();
    respond($rows);
  }
}

/* POST create (ADMIN) */
if ($method === 'POST' && !$action) {
  session_require_admin();
  $email = $_POST['email'] ?? ''; $pwd = $_POST['password'] ?? '';
  $palestra = $_POST['palestra'] ?? ''; $ruolo = $_POST['ruolo'] ?? 'user';
  if (!$email || !$pwd || !$palestra) respond(['error'=>'Campi obbligatori mancanti'],400);

  $exists = $pdo->prepare("SELECT 1 FROM utenti WHERE email = ?");
  $exists->execute([$email]); if ($exists->fetch()) respond(['error'=>'Email già registrata'],409);

  $hash = password_hash($pwd, PASSWORD_BCRYPT);
  $ins = $pdo->prepare("INSERT INTO utenti (email, password, palestra, ruolo) VALUES (:e,:p,:pa,:r)");
  $ins->execute([':e'=>$email, ':p'=>$hash, ':pa'=>$palestra, ':r'=>$ruolo]);

  $loginUrl = rtrim($APP_BASE_URL,'/').'/index.html';
  $mailOk = sendInviteEmail($email, $palestra, $loginUrl, $pwd, $email);
  respond(['ok'=>true, 'id'=>$pdo->lastInsertId(), 'mail_sent'=>(bool)$mailOk], 201);
}

/* PUT update */
if ($method === 'PUT') {
  session_require_login();

  $id = (int)($_GET['id'] ?? ($_PUTDELETE['id'] ?? 0));
  if (!$id) respond(['error' => 'ID mancante'], 400);

  // prendi i campi da $_PUTDELETE *se presenti*
  $emailRaw    = array_key_exists('email',    $_PUTDELETE) ? trim((string)$_PUTDELETE['email'])    : null;
  $pwdRaw      = array_key_exists('password', $_PUTDELETE) ? (string)$_PUTDELETE['password']       : null;
  $palestraRaw = array_key_exists('palestra', $_PUTDELETE) ? trim((string)$_PUTDELETE['palestra']) : null;
  $ruoloRaw    = array_key_exists('ruolo',    $_PUTDELETE) ? trim((string)$_PUTDELETE['ruolo'])    : null;

  $me = session_uid();
  $adm = is_admin();
  if (!$adm && $id !== $me) respond(['error'=>'Operazione non consentita'],403);

  $fields = [];
  $params = [':id' => $id];

  if ($emailRaw !== null && $emailRaw !== '') {
    $fields[]       = 'email = :e';
    $params[':e']   = $emailRaw;
  }
  if ($palestraRaw !== null && $palestraRaw !== '') {
    $fields[]       = 'palestra = :pa';
    $params[':pa']  = $palestraRaw;
  }
  if ($pwdRaw !== null && $pwdRaw !== '') {
    $fields[]       = 'password = :p';
    $params[':p']   = password_hash($pwdRaw, PASSWORD_BCRYPT);
  }
  if ($ruoloRaw !== null && $ruoloRaw !== '' && $adm) {
    $fields[]       = 'ruolo = :r';
    $params[':r']   = $ruoloRaw;
  }

  if (!$fields) respond(['error'=>'Nessun dato da aggiornare'],400);

  $sql = "UPDATE utenti SET ".implode(', ', $fields)." WHERE id = :id";
  $pdo->prepare($sql)->execute($params);

  respond(['ok'=>true]);
}

/* DELETE (ADMIN) */
if ($method === 'DELETE') {
  session_require_admin();
  $id = (int)($_GET['id'] ?? ($_PUTDELETE['id'] ?? 0));
  if (!$id) respond(['error'=>'ID mancante'],400);
  $pdo->prepare("DELETE FROM utenti WHERE id = ?")->execute([$id]);
  respond(['ok'=>true]);
}

/* Metodo non consentito */
respond(['error'=>'Metodo non consentito'],405);
