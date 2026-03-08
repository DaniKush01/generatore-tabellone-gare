<?php

require_once __DIR__ . '/session_boot.php';
require_once __DIR__ . '/config/db_connect.php';

$config = require __DIR__ . '/config/app_config.php';
$competitions = $config['competitions'];

header('Content-Type: application/json; charset=utf-8');

try {

/* ===== LETTURA DATI ===== */

$competition = $_POST['competizione'] ?? null;
$gym         = trim($_POST['palestra'] ?? '');

$nome        = trim($_POST['nome'] ?? '');
$cognome     = trim($_POST['cognome'] ?? '');
$sesso       = trim($_POST['sesso'] ?? '');
$eta         = trim($_POST['eta'] ?? '');
$peso        = trim($_POST['peso'] ?? '');
$cintura     = trim($_POST['cintura'] ?? '');


/* ===== VALIDAZIONE BASE ===== */

if (!$competition) {
    http_response_code(400);
    echo json_encode(['error'=>'Competizione mancante']);
    exit;
}

if (!in_array($competition, $competitions)) {
    http_response_code(400);
    echo json_encode(['error'=>'Competizione non valida']);
    exit;
}

if ($gym === '') {
    http_response_code(400);
    echo json_encode(['error'=>'Palestra mancante']);
    exit;
}

if ($nome === '' || $cognome === '' || $sesso === '' || $eta === '' || $cintura === '') {
    http_response_code(400);
    echo json_encode(['error'=>'Campi obbligatori mancanti']);
    exit;
}

if ($peso === '') {
    http_response_code(400);
    echo json_encode(['error'=>'Peso obbligatorio']);
    exit;
}


/* ===== NORMALIZZAZIONE ===== */

$eta  = (int)$eta;
$peso = (float)str_replace(',', '.', $peso);


/* ===== INSERT ===== */

$sql = "
INSERT INTO atleti
(nome, cognome, eta, peso, cintura, sesso, competizione, palestra)
VALUES
(:nome, :cognome, :eta, :peso, :cintura, :sesso, :competizione, :palestra)
";

$stmt = $pdo->prepare($sql);

$stmt->execute([

    ':nome' => $nome,
    ':cognome' => $cognome,
    ':eta' => $eta,
    ':peso' => $peso,
    ':cintura' => $cintura,
    ':sesso' => $sesso,
    ':competizione' => $competition,
    ':palestra' => $gym

]);


/* ===== RISPOSTA ===== */

echo json_encode([
    'success' => true,
    'id' => $pdo->lastInsertId()
]);

} catch (Throwable $e) {

http_response_code(500);

echo json_encode([
    'error' => 'Errore server'
]);

}
