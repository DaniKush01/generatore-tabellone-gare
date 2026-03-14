<?php

return [

/* =================================
   BRAND / WHITELABEL
================================= */

'brand' => [
    'name' => 'Top Fight',
    'logo' => '/gestione_gare/assets/login_logo.jpg',
    'favicon' => '/gestione_gare/assets/favicon.ico'
],


/* =================================
   COLORI TEMA
================================= */

'theme' => [

    'primary' => '#f2c200',   // giallo
    'primary_dark' => '#d4a800',

    'text' => '#000000',
    'background' => '#ffffff',

],


/* =================================
   EMAIL DI SISTEMA
================================= */

'email' => [

    'admin' => 'angeli.daniele01@gmail.com',

    'from' => 'noreply@topfightpistoia.com',

],


/* =================================
   COMPETIZIONI DISPONIBILI
================================= */

'competitions' => [

    'Muay Thai',
    'K1',
    'Kickboxing',
    'MMA',
    'Grappling',
    'Boxe',
    'Demo'

],


/* =================================
   CATEGORIE DI PESO
================================= */

'weight_classes' => [

    [
        'label' => '≤ 40 kg',
        'min' => 0,
        'max' => 40
    ],

    [
        'label' => '41 - 50 kg',
        'min' => 41,
        'max' => 50
    ],

    [
        'label' => '51 - 60 kg',
        'min' => 51,
        'max' => 60
    ],

    [
        'label' => '61 - 70 kg',
        'min' => 61,
        'max' => 70
    ],

    [
        'label' => '71 - 80 kg',
        'min' => 71,
        'max' => 80
    ],

    [
        'label' => '81 - 90 kg',
        'min' => 81,
        'max' => 90
    ],

    [
        'label' => '≥ 90 kg',
        'min' => 91,
        'max' => 999
    ]

],


/* =================================
   ICONS
================================= */

'icons' => [

    'logout' => '/gestione_gare/assets/icons/logout.svg',
    'user' => '/gestione_gare/assets/icons/user.svg'

]

];
