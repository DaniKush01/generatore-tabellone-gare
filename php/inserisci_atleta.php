<?php
/* inserisci_atleta.php – inserimento atleti (singolo, dimostrazione, legacy) */
require_once __DIR__ . '/session_boot.php';

header('Content-Type: application/json; charset=utf-8');

/* ============ DIAGNOSTICA ============ */
/* ?probe=1  → info su file e OPcache (no DB necessario)
   ?flush=1  → reset OPcache
*/
if (isset($_GET['probe'])) {
  $info = [
    'FILE'        => __FILE__,
    'REAL'        => realpath(__FILE__),
    'MTIME'       => @date('c', @filemtime(__FILE__)),
    'MD5'         => @md5_file(__FILE__),
    'METHOD'      => $_SERVER['REQUEST_METHOD'] ?? '',
    'GET_KEYS'    => array_keys($_GET),
    'POST_KEYS'   => array_keys($_POST),
    'OPCACHE_ON'  => function_exists('opcache_get_status') && is_array(@opcache_get_status(false)),
  ];
  echo json_encode($info);
  exit;
}
if (isset($_GET['flush'])) {
  $ok = function_exists('opcache_reset') ? @opcache_reset() : false;
  echo json_encode(['opcache_reset' => (bool)$ok]);
  exit;
}

require_once __DIR__ . '/config/db_connect.php';
/* ============ COSTANTI/REGOLE ============ */
$NON_PESATE = [
  'dimostrazione' => 1,
  'kata'          => 1,
  'kata kobudo'   => 1,
];

/* ============ LETTURA DATI (accetta tutti i formati) ============ */
$competition = $_POST['competizione']    ?? $_POST['competitionAth'] ?? null;
$gym         = trim($_POST['palestra']   ?? '');
$compNorm    = $competition !== null ? mb_strtolower($competition, 'UTF-8') : null;

$athletes = [];

/* 1) Team nuovo formato: athletes[n][campo] */
if (!empty($_POST['athletes']) && is_array($_POST['athletes'])) {
  foreach (array_values($_POST['athletes']) as $a) {
    $athletes[] = [
      'nome'    => trim($a['nome']    ?? ''),
      'cognome' => trim($a['cognome'] ?? ''),
      'sesso'   => trim($a['sesso']   ?? ''),
      'eta'     => trim($a['eta']     ?? ''),
      'peso'    => trim($a['peso']    ?? ''),
      'cintura' => trim($a['cintura'] ?? ''),
    ];
  }
}

/* 2) Singolo: nome, cognome, ... (non else-if: può coesistere) */
if (array_key_exists('nome', $_POST)) {
  $athletes[] = [
    'nome'    => trim($_POST['nome']     ?? ''),
    'cognome' => trim($_POST['cognome']  ?? ''),
    'sesso'   => trim($_POST['sesso']    ?? ''),
    'eta'     => trim($_POST['eta']      ?? ''),
    'peso'    => trim($_POST['peso']     ?? ''),
    'cintura' => trim($_POST['cintura']  ?? ''),
  ];
}

/* 3) Legacy: nameAth[] / surnameAth[] / ... */
if (!empty($_POST['nameAth']) || !empty($_POST['surnameAth']) ||
    !empty($_POST['ageAth'])  || !empty($_POST['weightAth'])  ||
    !empty($_POST['colorAth'])|| !empty($_POST['sesso'])) {
  $names    = $_POST['nameAth']    ?? [];
  $surnames = $_POST['surnameAth'] ?? [];
  $ages     = $_POST['ageAth']     ?? [];
  $weights  = $_POST['weightAth']  ?? [];
  $belts    = $_POST['colorAth']   ?? [];
  $genders  = $_POST['sesso']      ?? [];
  $count = max(count($names), count($surnames), count($ages), count($weights), count($belts), count($genders));
  for ($i=0; $i<$count; $i++) {
    $athletes[] = [
      'nome'    => trim($names[$i]    ?? ''),
      'cognome' => trim($surnames[$i] ?? ''),
      'sesso'   => trim($genders[$i]  ?? ''),
      'eta'     => trim($ages[$i]     ?? ''),
      'peso'    => trim($weights[$i]  ?? ''),
      'cintura' => trim($belts[$i]    ?? ''),
    ];
  }
}

/* ============ VALIDAZIONI INIZIALI ============ */
$received_keys = array_keys($_POST);

if (empty($competition)) {
  http_response_code(400);
  echo json_encode(['error'=>'Competizione mancante','received'=>$received_keys]); exit;
}
if ($gym === '') {
  http_response_code(400);
  echo json_encode(['error'=>'Palestra mancante','received'=>$received_keys]); exit;
}

/* rimuovi righe totalmente vuote (nome & cognome vuoti) */
$athletes = array_values(array_filter($athletes, function($a){
  return ($a['nome'] !== '' || $a['cognome'] !== '');
}));

if (empty($athletes)) {
  http_response_code(400);
  echo json_encode(['error'=>'Dati mancanti (nessun atleta)','received'=>$received_keys]); exit;
}

if ($compNorm === 'dimostrazione') {
  $n = count($athletes);
  if ($n < 2 || $n > 4) {
    http_response_code(400);
    echo json_encode(['error'=>'Per "Dimostrazione" devi inserire da 2 a 4 atleti.','received'=>$received_keys]); exit;
  }
}

/* campi obbligatori per ciascun atleta */
foreach ($athletes as $idx=>$a) {
  if ($a['nome']==='' || $a['cognome']==='' || $a['sesso']==='' || $a['eta']==='' || $a['cintura']==='') {
    http_response_code(400);
    echo json_encode(['error'=>"Campi obbligatori mancanti per l'atleta #".($idx+1),
                      'received'=>$received_keys,'athlete'=>$a]); exit;
  }
  /* peso obbligatorio solo per competizioni PESATE */
  if (!isset($NON_PESATE[$compNorm]) && $a['peso']==='') {
    http_response_code(400);
    echo json_encode(['error'=>"Peso obbligatorio per l'atleta #".($idx+1)." nella competizione selezionata",
                      'received'=>$received_keys,'athlete'=>$a]); exit;
  }
}

/* ============ DRY-RUN DEBUG (non scrive su DB) ============ */
if (isset($_GET['debug'])) {
  echo json_encode([
    'will_insert' => $athletes,
    'count'       => count($athletes),
    'competition' => $competition,
    'palestra'    => $gym,
    'received'    => $received_keys
  ]);
  exit;
}

/* ============ INSERT ============ */
$sql = "INSERT INTO atleti
        (nome, cognome, eta, peso, cintura, sesso, competizione, palestra)
        VALUES (:nome, :cognome, :eta, :peso, :cintura, :sesso, :competizione, :palestra)";
$stmt = $pdo->prepare($sql);

$inserted   = 0;
$insert_ids = [];

$pdo->beginTransaction();
try {
  foreach ($athletes as $a) {
    $eta  = (int)$a['eta'];
    /* Se competizione NON pesata e peso è vuoto, usa 0.0 (compatibile con colonne NOT NULL) */
    $peso = ($a['peso'] === '' ? (isset($NON_PESATE[$compNorm]) ? 0.0 : null)
                               : (float)str_replace(',', '.', $a['peso']));
    $stmt->execute([
      ':nome'         => $a['nome'],
      ':cognome'      => $a['cognome'],
      ':eta'          => $eta,
      ':peso'         => $peso,
      ':cintura'      => $a['cintura'],
      ':sesso'        => $a['sesso'],
      ':competizione' => $competition,
      ':palestra'     => $gym
    ]);
    /* Conta l'esecuzione (NON usare rowCount() con MySQL) */
    $inserted++;
    $insert_ids[] = $pdo->lastInsertId();
  }
  $pdo->commit();
} catch (Throwable $e) {
  $pdo->rollBack();
  http_response_code(500);
  echo json_encode(['error' => 'Errore inserimento', 'detail' => $e->getMessage()]);
  exit;
}

/* ============ RISPOSTA ============ */
if ($inserted < 1) {
  http_response_code(400);
  echo json_encode([
    'error' => 'Nessun atleta inserito (campi non validi o non corrispondenti).',
    'note'  => 'Usa ?debug=1 per vedere i dati normalizzati.',
  ]);
  exit;
}

$out = ['success' => true, 'inseriti' => $inserted];
if (isset($_GET['ids'])) $out['ids'] = $insert_ids;
echo json_encode($out);

