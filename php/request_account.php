<?php
require_once __DIR__ . '/session_boot.php';

header('Content-Type: application/json; charset=utf-8');

/* ===== WHITELABEL CONFIG ===== */
$config = require __DIR__ . '/config/app_config.php';

/* Config email */
$ADMIN_EMAIL = $config['email']['admin'];
$MAIL_FROM   = $config['email']['from'];
$MAIL_NAME   = $config['brand']['name'];

$SMTP = [
  'enabled' => false,
  'host'    => 'smtp.example.com',
  'user'    => '',
  'pass'    => '',
  'port'    => 587,
  'secure'  => 'tls'
];

function respond($data, $code=200){
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}


/* PHPMailer (se presente) o fallback mail() */
function sendMailGeneric($to, $subject, $html){

  global $MAIL_FROM, $MAIL_NAME, $SMTP;

  $alt = strip_tags(str_replace(['<br>','</p>'], ["\n","\n"], $html));

  $hasPHPMailer = @include_once __DIR__.'/phpmailer/src/PHPMailer.php';

  if ($hasPHPMailer) {

    require_once __DIR__.'/phpmailer/src/Exception.php';
    require_once __DIR__.'/phpmailer/src/SMTP.php';

    $mail = new PHPMailer\PHPMailer\PHPMailer(true);

    try {

      if (!empty($SMTP['enabled'])) {

        $mail->isSMTP();
        $mail->Host = $SMTP['host'];
        $mail->SMTPAuth = true;

        $mail->Username = $SMTP['user'];
        $mail->Password = $SMTP['pass'];

        $mail->SMTPSecure = $SMTP['secure'];
        $mail->Port = (int)$SMTP['port'];

      } else {

        $mail->isMail();

      }

      $mail->CharSet = 'UTF-8';

      $mail->setFrom($MAIL_FROM, $MAIL_NAME);

      $mail->addAddress($to);

      $mail->isHTML(true);

      $mail->Subject = $subject;
      $mail->Body    = $html;
      $mail->AltBody = $alt;

      $mail->send();

      return true;

    } catch (Throwable $e) {

      /* fallback sotto */

    }
  }

  $hdr  = "MIME-Version: 1.0\r\n";
  $hdr .= "Content-type:text/html; charset=UTF-8\r\n";
  $hdr .= "From: $MAIL_NAME <$MAIL_FROM>\r\n";

  return @mail($to, $subject, $html, $hdr);
}


/* ===== Validazione minima + honeypot ===== */

$palestra  = trim($_POST['palestra']  ?? '');
$referente = trim($_POST['referente'] ?? '');
$email     = trim($_POST['email']     ?? '');
$tel       = trim($_POST['telefono']  ?? '');
$msg       = trim($_POST['messaggio'] ?? '');

$hp = trim($_POST['website'] ?? ''); // honeypot anti bot

if ($hp !== '') respond(['ok'=>true]); // ignora bot ma risponde ok

if (!$palestra || !$referente || !$email)
  respond(['error'=>'Campi obbligatori mancanti'],400);

if (!filter_var($email, FILTER_VALIDATE_EMAIL))
  respond(['error'=>'Email non valida'],400);


/* ===== Email HTML ===== */

$html = '
<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111">

  <h2 style="color:'.$config['theme']['primary'].';margin:0 0 8px">
    Richiesta credenziali
  </h2>

  <p><b>Palestra:</b> '.htmlspecialchars($palestra).'</p>
  <p><b>Referente:</b> '.htmlspecialchars($referente).'</p>
  <p><b>Email:</b> '.htmlspecialchars($email).'</p>
  <p><b>Telefono:</b> '.htmlspecialchars($tel).'</p>

  <p><b>Messaggio:</b><br/>'.nl2br(htmlspecialchars($msg)).'</p>

</div>';


$ok = sendMailGeneric(
  $ADMIN_EMAIL,
  'Richiesta credenziali - '.$palestra,
  $html
);

if (!$ok)
  respond(['error'=>'Invio email fallito'], 500);

respond(['ok'=>true]);
