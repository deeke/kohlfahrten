<?php
/**
 * Kohlfahrten.de – Einstellungen
 *
 * 1. Diese Datei kopieren und als  config.php  speichern.
 * 2. Werte unten ausfüllen.
 * config.php wird bei Updates NIE überschrieben.
 */
return [
    // --- Datenbank (Strato: Kundenlogin → Datenbanken und Webspace → Datenbankverwaltung → ⋮ → Details)
    'db_host' => 'database-5021952022.webspace-host.com',   // NICHT "localhost"
    'db_name' => 'dbs16363488',
    'db_user' => 'dbu5230996',
    'db_pass' => 'DEIN-DATENBANK-PASSWORT',

    // --- Admin-Passwort
    // Am sichersten als Hash: im Adminbereich unter "Einstellungen" einen Hash erzeugen
    // und hier einfügen (beginnt mit $2y$...). Ein normales Passwort geht auch.
    'admin_password' => 'BITTE-AENDERN',

    // --- E-Mail-Benachrichtigung bei neuen Einträgen
    'mail_to'        => 'dc@bossel.de',
    'mail_from'      => 'dc@bossel.de',     // Absender – muss ein Postfach deiner Domain sein
    'mail_from_name' => 'Kohlfahrten.de',

    // SMTP (empfohlen, zuverlässiger als PHP mail()). Bei Strato:
    // smtp.strato.de, Port 465, 'ssl', Benutzer = komplette E-Mail-Adresse, Passwort des Postfachs.
    // Leer lassen ('smtp_host' => '') um PHP mail() zu verwenden.
    'smtp_host'   => 'smtp.strato.de',
    'smtp_port'   => 465,
    'smtp_secure' => 'ssl',                 // 'ssl' (Port 465) oder 'tls' (Port 587)
    'smtp_user'   => 'dc@bossel.de',
    'smtp_pass'   => 'DEIN-MAIL-PASSWORT',

    // --- Sonstiges
    'site_url' => 'https://www.kohlfahrten.de',  // für den Link in der Benachrichtigungs-Mail
    'secret'   => 'beliebiger-langer-zufallstext-hier-eintragen',
    'debug'    => false,                    // true = genauere Fehlermeldungen (nur zum Einrichten!)
];
