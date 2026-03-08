<?php
require_once __DIR__ . '/session_boot.php';
header('Content-Type: application/json; charset=utf-8');

/* ───────── CONFIG WHITELABEL ───────── */
$config = require __DIR__ . '/config/app_config.php';
$competitions = $config['competitions'];

/* ───────── Helpers ACL ───────── */
function respond($d, $s=200){ http_response_code($s); echo json_encode($d, JSON_UNESCAPED_UNICODE); exit; }
function session_require_login(){ if (empty($_SESSION['uid'])) respond(['error'=>'Non autenticato'], 401); }
function is_admin(){ return (($_SESSION['ruolo'] ?? 'user') === 'admin'); }
function user_gym(){ return ($_SESSION['palestra'] ?? ''); }

require_once __DIR__ . '/config/db_connect.php';

try {

  /* ── scopri colonne esistenti ── */
  $cols = $pdo->query("
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'atleti'
  ")->fetchAll(PDO::FETCH_COLUMN);

  $hasCol = array_fill_keys($cols ?: [], true);
  $hasPrezzo = isset($hasCol['prezzo']);
  $hasPagato = isset($hasCol['pagato']);

  $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

  /* ╔════════════════════════════════════╗
     ║                 GET                ║
     ╚════════════════════════════════════╝ */

  if ($method === 'GET') {

    session_require_login();

    $select = "id, nome, cognome, sesso, eta, peso, cintura, competizione, palestra";
    $select .= $hasPrezzo ? ", prezzo" : ", 0 AS prezzo";
    $select .= $hasPagato ? ", pagato" : ", 0 AS pagato";

    $sql = "SELECT $select FROM atleti WHERE 1=1";
    $binds = [];

    if (isset($_GET['palestra']) && $_GET['palestra'] !== '' && !isset($_GET['gym'])) {
      $_GET['gym'] = $_GET['palestra'];
    }

    if (!is_admin()) {
      $_GET['gym'] = user_gym();
    }

    if (!empty($_GET['q'])) {
      $sql .= " AND (nome LIKE :q OR cognome LIKE :q OR palestra LIKE :q OR competizione LIKE :q OR cintura LIKE :q)";
      $binds[':q'] = ['%'.$_GET['q'].'%', PDO::PARAM_STR];
    }

    $map = [
      'gym'          => ['clause' => ' AND palestra = :gym',             'type'=>PDO::PARAM_STR],
      'nome'         => ['clause' => ' AND nome LIKE :nome',             'type'=>PDO::PARAM_STR, 'like'=>true],
      'cognome'      => ['clause' => ' AND cognome LIKE :cognome',       'type'=>PDO::PARAM_STR, 'like'=>true],
      'sesso'        => ['clause' => ' AND sesso = :sesso',              'type'=>PDO::PARAM_STR],
      'eta_min'      => ['clause' => ' AND eta >= :eta_min',             'type'=>PDO::PARAM_INT],
      'eta_max'      => ['clause' => ' AND eta <= :eta_max',             'type'=>PDO::PARAM_INT],
      'peso_min'     => ['clause' => ' AND peso >= :peso_min',           'type'=>PDO::PARAM_STR],
      'peso_max'     => ['clause' => ' AND peso <= :peso_max',           'type'=>PDO::PARAM_STR],
      'cintura'      => ['clause' => ' AND cintura = :cintura',          'type'=>PDO::PARAM_STR],
      'competizione' => ['clause' => ' AND competizione = :competizione','type'=>PDO::PARAM_STR],
      'pagato'       => ['clause' => $hasPagato ? ' AND pagato = :pagato' : null, 'type'=>PDO::PARAM_STR],
    ];

    foreach ($map as $qk => $cfg) {
      if (!isset($_GET[$qk]) || $_GET[$qk] === '' || empty($cfg['clause'])) continue;
      $val = $_GET[$qk];
      if (!empty($cfg['like'])) $val = "%$val%";
      $sql .= $cfg['clause'];
      $binds[":$qk"] = [$val, $cfg['type']];
    }

    $sql .= " ORDER BY cognome ASC, nome ASC";

    $stmt = $pdo->prepare($sql);

    foreach ($binds as $k => [$v,$t]) {
      $stmt->bindValue($k, $v, $t);
    }

    $stmt->execute();
    $rows = $stmt->fetchAll();

    respond($rows);
  }

  /* ── helper JSON body ── */

  function read_json_body() {

    $raw = file_get_contents('php://input');
    if (!$raw) return [];

    $d = json_decode($raw, true);
    return is_array($d) ? $d : [];

  }

  function bind_val(PDOStatement $st, string $name, $val): void {

    if ($val === null) {
      $st->bindValue($name, null, PDO::PARAM_NULL);
      return;
    }

    if (is_int($val)) {
      $st->bindValue($name, $val, PDO::PARAM_INT);
      return;
    }

    $st->bindValue($name, (string)$val, PDO::PARAM_STR);

  }

  /* ╔════════════════════════════════════╗
     ║               PATCH                ║
     ╚════════════════════════════════════╝ */

  if ($method === 'PATCH') {

    session_require_login();

    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if ($id < 1) respond(['error'=>'ID mancante'],400);

    if (!is_admin()) {

      $chk = $pdo->prepare("SELECT palestra FROM atleti WHERE id = ?");
      $chk->execute([$id]);

      $row = $chk->fetch();

      if (!$row) respond(['error'=>'Atleta non trovato'],404);

      if ($row['palestra'] !== user_gym()) respond(['error'=>'Forbidden'],403);

    }

    $in = read_json_body();

    $allowed = [

      'nome'         => fn($v) => trim((string)$v),
      'cognome'      => fn($v) => trim((string)$v),

      'sesso'        => function($v){
          $v = strtoupper(trim((string)$v));
          return ($v==='M'||$v==='F') ? $v : '';
      },

      'eta'          => function($v){
          return ($v === '' || $v === null) ? null : max(0, (int)$v);
      },

      'peso'         => function($v){
          if ($v === '' || $v === null) return null;
          $f = (float)str_replace(',', '.', (string)$v);
          return $f < 0 ? 0 : $f;
      },

      'cintura'      => fn($v) => trim((string)$v),

      'competizione' => function($v) use ($competitions){

          $v = trim((string)$v);

          if (!in_array($v, $competitions)) return '';

          return $v;

      }

    ];

    if ($hasPrezzo) {

      $allowed['prezzo'] = function($v){

        if ($v === '' || $v === null) return 0;

        $f = (float)str_replace(',', '.', (string)$v);

        return $f < 0 ? 0 : round($f, 2);

      };

    }

    if ($hasPagato) {

      $allowed['pagato'] = function($v){

        if ($v === '' || $v === null) return 0;

        $f = (float)str_replace(',', '.', (string)$v);

        return $f < 0 ? 0 : round($f, 2);

      };

    }

    if (is_admin()) {

      $allowed['palestra'] = fn($v) => trim((string)$v);

    }

    $set = [];
    $params = [':id'=>$id];

    foreach ($allowed as $k => $filter) {

      if (!array_key_exists($k, $in)) continue;

      $val = $filter($in[$k]);

      $set[] = "`$k` = :$k";

      $params[":$k"] = $val;

    }

    if (!$set) respond(['ok'=>true]);

    $sql = "UPDATE atleti SET ".implode(', ', $set)." WHERE id = :id";

    $stmt = $pdo->prepare($sql);

    foreach ($params as $name => $val) {
      bind_val($stmt, $name, $val);
    }

    $stmt->execute();

    respond(['ok'=>true]);
  }

  /* ╔════════════════════════════════════╗
     ║               DELETE               ║
     ╚════════════════════════════════════╝ */

  if ($method === 'DELETE') {

    session_require_login();

    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if ($id < 1) respond(['error'=>'ID mancante'],400);

    if (!is_admin()) {

      $chk = $pdo->prepare("SELECT palestra FROM atleti WHERE id = ?");
      $chk->execute([$id]);

      $row = $chk->fetch();

      if (!$row) respond(['error'=>'Atleta non trovato'],404);

      if ($row['palestra'] !== user_gym()) respond(['error'=>'Forbidden'],403);

    }

    $del = $pdo->prepare("DELETE FROM atleti WHERE id = :id");

    $del->bindValue(':id', $id, PDO::PARAM_INT);

    $del->execute();

    respond(['ok'=>true]);

  }

  respond(['error'=>'Metodo non supportato'],405);

} catch (Throwable $e) {

  respond(['error' => $e->getMessage()], 500);

}
