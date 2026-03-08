<?php
// atleti_match.php

require_once __DIR__ . '/session_boot.php';
require_once __DIR__ . '/config/db_connect.php';

/* ───────── CONFIG WHITELABEL ───────── */

$config = require __DIR__ . '/config/app_config.php';
$competitions = $config['competitions'];

header('Content-Type: application/json; charset=utf-8');

try {

    /* Lettura filtri */

    $competizione = $_POST['competizione'] ?? null;
    $sesso        = $_POST['sesso'] ?? null;

    $pesoMin = isset($_POST['peso_min']) ? (float)$_POST['peso_min'] : null;
    $pesoMax = isset($_POST['peso_max']) ? (float)$_POST['peso_max'] : null;

    /* Validazione parametri */

    if (!$competizione || !$sesso || $pesoMin === null || $pesoMax === null) {

        http_response_code(400);
        echo json_encode(['error' => 'Parametri mancanti']);
        exit;

    }

    /* Verifica competizione valida */

    if (!in_array($competizione, $competitions)) {

        http_response_code(400);
        echo json_encode(['error' => 'Competizione non valida']);
        exit;

    }

    /* Gestione fascia età */

    $etaRange = $_POST['eta_range'] ?? null;

    $etaMin = 0;
    $etaMax = 200;

    if ($etaRange && strpos($etaRange, '-') !== false) {

        [$etaMin, $etaMax] = array_map('intval', explode('-', $etaRange, 2));

    }

    /* Query atleti */

    $sql = "
        SELECT 
            id,
            nome,
            cognome,
            sesso,
            eta,
            peso,
            cintura,
            palestra,
            competizione
        FROM atleti
        WHERE competizione = :competizione
          AND sesso        = :sesso
          AND peso BETWEEN :peso_min AND :peso_max
          AND eta  BETWEEN :eta_min  AND :eta_max
        ORDER BY peso ASC, eta ASC
    ";

    $stmt = $pdo->prepare($sql);

    $stmt->bindValue(':competizione', $competizione);
    $stmt->bindValue(':sesso', $sesso);
    $stmt->bindValue(':peso_min', $pesoMin);
    $stmt->bindValue(':peso_max', $pesoMax);
    $stmt->bindValue(':eta_min', $etaMin, PDO::PARAM_INT);
    $stmt->bindValue(':eta_max', $etaMax, PDO::PARAM_INT);

    $stmt->execute();

    $rows = $stmt->fetchAll();

    /* Restituisce lista atleti */

    echo json_encode($rows, JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {

    http_response_code(500);

    echo json_encode([
        'error' => 'Errore server'
    ], JSON_UNESCAPED_UNICODE);

}
