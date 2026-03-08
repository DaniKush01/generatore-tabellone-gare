<?php
// atleti_match.php
require_once __DIR__ . '/session_boot.php';

require_once __DIR__ . '/config/db_connect.php';
    /* Lettura filtri dal form */
    $competizione = $_POST['competizione'] ?? null; // Kick-Jitsu | Lotta a Terra | Submission | Dimostrazione
    $sesso        = $_POST['sesso']        ?? null; // M | F
    $pesoMin      = isset($_POST['peso_min']) ? (float)$_POST['peso_min'] : null;
    $pesoMax      = isset($_POST['peso_max']) ? (float)$_POST['peso_max'] : null;

    // eta_range "0-17" | "18-99"
    $etaRange = $_POST['eta_range'] ?? null;
    $etaMin = 0; $etaMax = 200;
    if ($etaRange && strpos($etaRange, '-') !== false) {
        [$etaMin, $etaMax] = array_map('intval', explode('-', $etaRange, 2));
    }

    if (!$competizione || !$sesso || $pesoMin === null || $pesoMax === null) {
        http_response_code(400);
        echo json_encode(['error' => 'Parametri mancanti']);
        exit;
    }

    /* Query atleti filtrati (ordina per peso, poi età) */
    $sql = "SELECT id, nome, cognome, sesso, eta, peso, cintura, palestra, competizione
            FROM atleti
            WHERE competizione = :competizione
              AND sesso        = :sesso
              AND peso BETWEEN :peso_min AND :peso_max
              AND eta  BETWEEN :eta_min  AND :eta_max
            ORDER BY peso ASC, eta ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':competizione', $competizione);
    $stmt->bindValue(':sesso',        $sesso);
    $stmt->bindValue(':peso_min',     $pesoMin);
    $stmt->bindValue(':peso_max',     $pesoMax);
    $stmt->bindValue(':eta_min',      $etaMin, PDO::PARAM_INT);
    $stmt->bindValue(':eta_max',      $etaMax, PDO::PARAM_INT);
    $stmt->execute();

    $rows = $stmt->fetchAll();

    /* Logica speciale per Dimostrazione: gruppi 2–4 (evita ultimo da 1) */
    if ($competizione === 'Dimostrazione') {
        $groups = [];
        $chunk  = [];

        foreach ($rows as $ath) {
            $chunk[] = $ath;
            if (count($chunk) === 4) {
                $groups[] = $chunk;
                $chunk = [];
            }
        }
        if ($chunk) $groups[] = $chunk;

        // Se ultimo gruppo è 1 e il precedente ha >=3, sposta 1 → 3+2
        $gCount = count($groups);
        if ($gCount >= 2 && count($groups[$gCount - 1]) === 1 && count($groups[$gCount - 2]) >= 3) {
            $last = array_pop($groups);
            $prev = array_pop($groups);
            $last[] = array_pop($prev);
            $groups[] = $prev;
            $groups[] = $last;
        }

        // Scarta gruppi <2 o >4
        $groups = array_values(array_filter($groups, fn($g) => count($g) >= 2 && count($g) <= 4));

        echo json_encode(['mode' => 'demo', 'groups' => $groups], JSON_UNESCAPED_UNICODE);
        exit;
    }

    /* Altre competizioni: array piatto */
    echo json_encode($rows, JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Errore server'], JSON_UNESCAPED_UNICODE);
}

