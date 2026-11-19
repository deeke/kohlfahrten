<?php
/**
 * Kohlfahrten.de – Server-Schnittstelle (PHP 8 + MySQL 8 / MariaDB)
 *
 * Diese Datei wird bei Updates ersetzt. Eigene Einstellungen gehören
 * ausschließlich in config.php (wird bei Updates NICHT überschrieben).
 * Datenbank-Tabellen werden beim ersten Aufruf automatisch angelegt und
 * bei Updates automatisch erweitert (siehe migrations()).
 */
declare(strict_types=1);

const APP_VERSION = '1.0.1';
const MAX_PHOTOS  = 2;
const RAFFLE_END  = '2000-01-01 00:00:00';   // Kein Gewinnspiel auf Kohlfahrten.de (Funktion deaktiviert)
const MAX_PHOTO_BYTES = 6 * 1024 * 1024;

date_default_timezone_set('Europe/Berlin');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

/* ------------------------------------------------------------------ */
/* Grundfunktionen                                                     */
/* ------------------------------------------------------------------ */
function out(array $d, int $code = 200): never {
    http_response_code($code);
    echo json_encode($d, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function fail(string $msg, int $code = 400, array $extra = []): never { out(['error' => $msg] + $extra, $code); }

if (!is_file(__DIR__ . '/config.php')) {
    fail('Die Datei config.php fehlt. Bitte config.sample.php kopieren, in config.php umbenennen und ausfüllen.', 500);
}
$CFG = require __DIR__ . '/config.php';
$CFG += [
    'db_port' => 3306, 'mail_to' => 'dc@bossel.de', 'mail_from' => '', 'mail_from_name' => 'Kohlfahrten.de',
    'smtp_host' => '', 'smtp_port' => 465, 'smtp_secure' => 'ssl', 'smtp_user' => '', 'smtp_pass' => '',
    'site_url' => '', 'debug' => false, 'secret' => '',
];

set_exception_handler(function (Throwable $e) use ($CFG) {
    error_log('[Kohlfahrten.de] ' . $e);
    fail($CFG['debug'] ? 'Serverfehler: ' . $e->getMessage() : 'Serverfehler – bitte später erneut versuchen.', 500);
});

$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
session_name('bosselsid');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax', 'secure' => $https]);
session_start();
if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    global $CFG;
    $dsn = "mysql:host={$CFG['db_host']};port={$CFG['db_port']};dbname={$CFG['db_name']};charset=utf8mb4";
    try {
        $pdo = new PDO($dsn, $CFG['db_user'], $CFG['db_pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (PDOException $e) {
        error_log('[Kohlfahrten.de] DB: ' . $e->getMessage());
        fail('Keine Verbindung zur Datenbank. Bitte Zugangsdaten in config.php prüfen.' . ($CFG['debug'] ? ' (' . $e->getMessage() . ')' : ''), 500);
    }
    migrate($pdo);
    return $pdo;
}

/* ------------------------------------------------------------------ */
/* Datenbank-Migrationen: neue Einträge NUR unten anhängen             */
/* ------------------------------------------------------------------ */
function migrations(): array {
    return [
        1 => [
            "CREATE TABLE IF NOT EXISTS bs_entries (
                id       VARCHAR(24)  NOT NULL PRIMARY KEY,
                type     VARCHAR(20)  NOT NULL,
                status   VARCHAR(12)  NOT NULL DEFAULT 'pending',
                title    VARCHAR(200) NOT NULL DEFAULT '',
                plz      VARCHAR(10)  NOT NULL DEFAULT '',
                ort      VARCHAR(120) NOT NULL DEFAULT '',
                data     LONGTEXT     NOT NULL,
                author   VARCHAR(100) NOT NULL DEFAULT '',
                author_mail VARCHAR(150) NOT NULL DEFAULT '',
                created  DATETIME     NOT NULL,
                updated  DATETIME     NOT NULL,
                KEY idx_type_status (type, status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS bs_ratings (
                id       INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                entry_id VARCHAR(24)  NOT NULL,
                stars    TINYINT      NOT NULL,
                voter    CHAR(64)     NOT NULL,
                created  DATETIME     NOT NULL,
                UNIQUE KEY uq_vote (entry_id, voter),
                KEY idx_entry (entry_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS bs_mails (
                id       INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                to_addr  VARCHAR(150) NOT NULL,
                subject  VARCHAR(255) NOT NULL,
                body     TEXT         NOT NULL,
                ref_type VARCHAR(20)  NULL,
                ref_id   VARCHAR(24)  NULL,
                sent     TINYINT      NOT NULL DEFAULT 0,
                error    VARCHAR(255) NULL,
                created  DATETIME     NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS bs_submissions (
                id       INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                ip_hash  CHAR(64)     NOT NULL,
                created  DATETIME     NOT NULL,
                KEY idx_ip (ip_hash, created)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        ],
        2 => [
            // Gewinnspiel: es werden NUR E-Mail und Handynummer gespeichert
            "CREATE TABLE IF NOT EXISTS bs_raffle (
                id       INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                entry_id VARCHAR(24)  NOT NULL,
                email    VARCHAR(150) NOT NULL DEFAULT '',
                phone    VARCHAR(40)  NOT NULL DEFAULT '',
                month    CHAR(7)      NOT NULL,
                created  DATETIME     NOT NULL,
                KEY idx_month (month),
                KEY idx_entry (entry_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS bs_raffle_draws (
                id        INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                month     CHAR(7)      NOT NULL,
                raffle_id INT UNSIGNED NOT NULL,
                pool      INT UNSIGNED NOT NULL DEFAULT 0,
                note      VARCHAR(255) NOT NULL DEFAULT '',
                created   DATETIME     NOT NULL,
                KEY idx_month (month)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        ],
        3 => [
            "ALTER TABLE bs_raffle ADD COLUMN name VARCHAR(100) NOT NULL DEFAULT '' AFTER entry_id",
        ],
        // 4 => [ "ALTER TABLE ..." ],   <- künftige Updates hier anhängen
    ];
}
function migrate(PDO $db): void {
    $db->exec("CREATE TABLE IF NOT EXISTS bs_meta (k VARCHAR(50) NOT NULL PRIMARY KEY, v VARCHAR(255) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $cur = (int)($db->query("SELECT v FROM bs_meta WHERE k='schema'")->fetchColumn() ?: 0);
    foreach (migrations() as $n => $sqls) {
        if ($n <= $cur) continue;
        foreach ($sqls as $sql) $db->exec($sql);
        $db->prepare("REPLACE INTO bs_meta (k, v) VALUES ('schema', ?)")->execute([(string)$n]);
    }
}

/* ------------------------------------------------------------------ */
/* Helfer                                                              */
/* ------------------------------------------------------------------ */
function body(): array {
    static $b = null;
    if ($b !== null) return $b;
    $raw = file_get_contents('php://input') ?: '';
    $b = $raw === '' ? [] : json_decode($raw, true);
    // Inhalte kommen base64-verpackt, damit Webserver-Filter (WAF) harmlose Texte nicht blockieren
    if (is_array($b) && isset($b['_b64']) && is_string($b['_b64'])) {
        $dec = base64_decode($b['_b64'], true);
        $b = $dec === false ? null : json_decode($dec, true);
    }
    if (!is_array($b)) fail('Ungültige Anfrage.');
    return $b;
}
function isAdmin(): bool { return !empty($_SESSION['admin']); }
function requireAdmin(): void { if (!isAdmin()) fail('Bitte als Admin anmelden.', 401); }
function now(): string { return date('Y-m-d H:i:s'); }
function uid(): string { return base_convert((string)time(), 10, 36) . bin2hex(random_bytes(5)); }
function ipHash(): string {
    global $CFG;
    return hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . ($_SERVER['HTTP_USER_AGENT'] ?? '') . '|' . ($CFG['secret'] ?: $CFG['db_pass']));
}
function norm(string $s): string {
    $s = mb_strtolower(trim($s), 'UTF-8');
    $s = preg_replace('/[.!?"„“\']/u', '', $s);
    return preg_replace('/\s+/u', ' ', $s);
}
function str($v, int $max): string {
    $s = is_scalar($v) ? trim((string)$v) : '';
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $s) ?? '';
    return mb_substr($s, 0, $max, 'UTF-8');
}
function numOrEmpty($v) {
    if ($v === '' || $v === null) return '';
    if (is_string($v)) $v = str_replace(',', '.', $v);
    return is_numeric($v) ? 0 + $v : '';
}
function keys($v, int $max = 40): array {
    if (!is_array($v)) return [];
    $o = [];
    foreach ($v as $k) if (is_string($k) && preg_match('/^[a-z0-9_]{1,30}$/', $k)) $o[] = $k;
    return array_values(array_unique(array_slice($o, 0, $max)));
}
function coords($v, int $max): array {
    if (!is_array($v)) return [];
    $o = [];
    foreach ($v as $p) {
        if (!is_array($p) || count($p) < 2 || !is_numeric($p[0]) || !is_numeric($p[1])) continue;
        $la = round((float)$p[0], 6); $ln = round((float)$p[1], 6);
        if ($la < -90 || $la > 90 || $ln < -180 || $ln > 180) continue;
        $o[] = [$la, $ln];
        if (count($o) >= $max) break;
    }
    return $o;
}
function url($v): string {
    $u = str($v, 300);
    if ($u === '') return '';
    if (!preg_match('~^https?://~i', $u)) $u = 'https://' . $u;
    return filter_var($u, FILTER_VALIDATE_URL) ? $u : '';
}

/** Prüft und bereinigt die Felder eines Eintrags je nach Typ. */
function clean(string $type, array $in): array {
    $plz = preg_replace('/\D/', '', (string)($in['plz'] ?? ''));
    if (!preg_match('/^\d{5}$/', $plz)) fail('Bitte eine gültige 5-stellige PLZ angeben.');
    $ort = str($in['ort'] ?? '', 100);
    if ($ort === '') fail('Bitte einen Ort angeben.');
    $email = str($in['email'] ?? '', 150);
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Die E-Mail-Adresse ist ungültig.');

    if ($type === 'route') {
        $d = [
            'title' => str($in['title'] ?? '', 120),
            'category' => in_array($in['category'] ?? '', ['bossel', 'kohlfahrt', 'beides'], true) ? $in['category'] : '',
            'plz' => $plz, 'ort' => $ort,
            'description' => str($in['description'] ?? '', 3000),
            'features' => keys($in['features'] ?? []),
            'points' => coords($in['points'] ?? [], 300),
            'roundtrip' => !empty($in['roundtrip']),
            'geometry' => coords($in['geometry'] ?? [], 25000),
            'lengthKm' => round((float)numOrEmpty($in['lengthKm'] ?? 0), 2),
        ];
        if ($d['title'] === '') fail('Bitte einen Titel eingeben.');
        if ($d['category'] === '') fail('Bitte eine Kategorie wählen.');
        if (count($d['points']) < 2 || count($d['geometry']) < 2) fail('Bitte Start- und Zielpunkt in der Karte setzen.');
        return $d;
    }
    $lat = $in['lat'] ?? null; $lng = $in['lng'] ?? null;
    if (!is_numeric($lat) || !is_numeric($lng)) fail('Bitte den Standort in der Karte setzen.');
    $base = [
        'name' => str($in['name'] ?? '', 120), 'adresse' => str($in['adresse'] ?? '', 150), 'plz' => $plz, 'ort' => $ort,
        'web' => url($in['web'] ?? ''), 'telefon' => str($in['telefon'] ?? '', 40), 'email' => $email,
        'lat' => round((float)$lat, 6), 'lng' => round((float)$lng, 6),
    ];
    if ($base['name'] === '') fail('Bitte einen Namen angeben.');
    if ($type === 'gasthaus') {
        $regions = ['Emsland','Ostfriesland','Friesland','Oldenburger Land','Ammerland','Oldenburger Münsterland','Wesermarsch','Bremen','Grafschaft Bentheim','Osnabrücker Land','Sonstige'];
        $g = $base + [
            'bossel' => !empty($in['bossel']), 'bosselText' => str($in['bosselText'] ?? '', 1000),
            'region' => in_array($in['region'] ?? '', $regions, true) ? $in['region'] : '',
            'quelle' => url($in['quelle'] ?? ''),
            'saal' => numOrEmpty($in['saal'] ?? ''), 'kohlfahrt' => !empty($in['kohlfahrt']),
            'preis' => numOrEmpty($in['preis'] ?? ''), 'saison' => str($in['saison'] ?? '', 60),
            'minPers' => numOrEmpty($in['minPers'] ?? ''), 'kohlText' => str($in['kohlText'] ?? '', 2000),
            'inkl' => keys($in['inkl'] ?? []),
        ];
        if (isAdmin()) {   // bezahlte Banner nur durch die Redaktion
            $bis = (string)($in['premiumBis'] ?? '');
            $g += ['premium' => !empty($in['premium']), 'premiumBis' => preg_match('/^\d{4}-\d{2}-\d{2}$/', $bis) ? $bis : '',
                   'bannerText' => str($in['bannerText'] ?? '', 120), 'bannerImg' => (string)($in['bannerImg'] ?? '')];
        }
        return $g;
    }
    return $base + [
        'anzahl' => numOrEmpty($in['anzahl'] ?? ''), 'preisTag' => numOrEmpty($in['preisTag'] ?? ''),
        'preisWE' => numOrEmpty($in['preisWE'] ?? ''), 'kaution' => numOrEmpty($in['kaution'] ?? ''),
        'zuladung' => numOrEmpty($in['zuladung'] ?? ''), 'kisten' => numOrEmpty($in['kisten'] ?? ''),
        'beschreibung' => str($in['beschreibung'] ?? '', 2000), 'ausst' => keys($in['ausst'] ?? []),
    ];
}
function typeOk($t): string {
    if (!in_array($t, ['route', 'gasthaus', 'verleih'], true)) fail('Unbekannter Typ.');
    return $t;
}

/* ------------------------------------------------------------------ */
/* Fotos                                                               */
/* ------------------------------------------------------------------ */
function uploadDir(): string {
    $dir = __DIR__ . '/uploads';
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) fail('Upload-Ordner konnte nicht angelegt werden.', 500);
    if (!is_file($dir . '/.htaccess')) {
        @copy(__DIR__ . '/assets/uploads.htaccess', $dir . '/.htaccess');
    }
    return $dir;
}
/** Wandelt neue Fotos (data:-URLs) in Dateien um und behält bestehende. */
function savePhotos($photos, array $old = []): array {
    if (!is_array($photos)) return [];
    $outList = [];
    foreach (array_slice($photos, 0, MAX_PHOTOS) as $p) {
        if (!is_string($p)) continue;
        if (in_array($p, $old, true)) { $outList[] = $p; continue; }
        if (str_starts_with($p, 'data:image/svg+xml') && isAdmin() && strlen($p) < 20000) { $outList[] = $p; continue; } // Beispielbilder
        if (!preg_match('~^data:image/(jpeg|png|webp);base64,~', $p, $m)) continue;
        $bin = base64_decode(substr($p, strpos($p, ',') + 1), true);
        if ($bin === false || strlen($bin) > MAX_PHOTO_BYTES) fail('Ein Foto ist zu groß (max. 6 MB).');
        $info = @getimagesizefromstring($bin);
        $ext = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'][$info[2] ?? 0] ?? null;
        if (!$info || !$ext) fail('Ein Foto hat ein ungültiges Format (erlaubt: JPG, PNG, WebP).');
        $name = date('Ym') . '-' . bin2hex(random_bytes(10)) . '.' . $ext;
        if (file_put_contents(uploadDir() . '/' . $name, $bin) === false) fail('Foto konnte nicht gespeichert werden.', 500);
        $outList[] = 'uploads/' . $name;
    }
    foreach ($old as $o) if (!in_array($o, $outList, true)) deletePhoto($o);
    return $outList;
}
function deletePhoto(string $p): void {
    if (preg_match('~^uploads/([A-Za-z0-9_-]+\.(jpg|png|webp))$~', $p, $m)) @unlink(__DIR__ . '/uploads/' . $m[1]);
}

/* ------------------------------------------------------------------ */
/* Einträge lesen / schreiben                                          */
/* ------------------------------------------------------------------ */
function rowToItem(array $r, bool $admin): array {
    $d = json_decode($r['data'], true) ?: [];
    $d['id'] = $r['id']; $d['status'] = $r['status'];
    $d['created'] = strtotime($r['created']) * 1000;
    $d['author'] = $r['author'];
    if ($admin) $d['authorMail'] = $r['author_mail'];
    return $d;
}
function getEntry(string $id): ?array {
    $st = db()->prepare('SELECT * FROM bs_entries WHERE id=?');
    $st->execute([$id]);
    return $st->fetch() ?: null;
}
function insertEntry(string $type, array $d, string $status, string $author = '', string $mail = '', ?int $createdMs = null): string {
    $id = uid();
    $created = $createdMs ? date('Y-m-d H:i:s', intdiv($createdMs, 1000)) : now();
    db()->prepare('INSERT INTO bs_entries (id,type,status,title,plz,ort,data,author,author_mail,created,updated) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
        ->execute([$id, $type, $status, $d['title'] ?? $d['name'] ?? '', $d['plz'], $d['ort'],
            json_encode($d, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), str($author, 100), str($mail, 150), $created, now()]);
    return $id;
}
function ratingsFor(array $ids): array {
    if (!$ids) return [];
    $in = implode(',', array_fill(0, count($ids), '?'));
    $st = db()->prepare("SELECT entry_id, stars FROM bs_ratings WHERE entry_id IN ($in) ORDER BY id");
    $st->execute($ids);
    $o = [];
    foreach ($st as $r) $o[$r['entry_id']][] = (int)$r['stars'];
    return $o;
}
function listAll(): array {
    $admin = isAdmin();
    $rows = db()->query('SELECT * FROM bs_entries ' . ($admin ? '' : "WHERE status='approved' ") . 'ORDER BY created')->fetchAll();
    $res = ['routes' => [], 'gasthaeuser' => [], 'verleih' => []];
    $map = ['route' => 'routes', 'gasthaus' => 'gasthaeuser', 'verleih' => 'verleih'];
    $routeIds = array_column(array_filter($rows, fn($r) => $r['type'] === 'route'), 'id');
    $ratings = ratingsFor($routeIds);
    foreach ($rows as $r) {
        if (!isset($map[$r['type']])) continue;
        $it = rowToItem($r, $admin);
        if ($r['type'] === 'route') $it['ratings'] = $ratings[$r['id']] ?? [];
        $res[$map[$r['type']]][] = $it;
    }
    if ($admin) {
        $res['mails'] = array_map(fn($m) => [
            'id' => (int)$m['id'], 'to' => $m['to_addr'], 'subject' => $m['subject'], 'body' => $m['body'],
            'date' => strtotime($m['created']) * 1000, 'sent' => (bool)$m['sent'], 'error' => $m['error'],
            'ref' => $m['ref_type'] ? ['type' => $m['ref_type'], 'id' => $m['ref_id']] : null,
        ], db()->query('SELECT * FROM bs_mails ORDER BY id DESC LIMIT 200')->fetchAll());
    }
    return $res;
}

/* ------------------------------------------------------------------ */
/* Sicherheitsfrage (serverseitig)                                     */
/* ------------------------------------------------------------------ */
function newCaptcha(): array {
    $w = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn'];
    $trivia = [
        ['Welches Gemüse wird bei einer Kohlfahrt gegessen? (Tipp: Grün…)', ['grünkohl', 'gruenkohl', 'kohl']],
        ['Was rollt beim Boßeln über die Straße? (Tipp: K…)', ['kugel', 'boßelkugel', 'bosselkugel', 'die kugel']],
        ['Welche Farbe hat frisches Gras?', ['grün', 'gruen']],
        ['Welche Farbe hat der Himmel an einem sonnigen Tag?', ['blau', 'hellblau']],
        ['Wie heißt der Wagen, der bei der Kohlfahrt gezogen wird? (Tipp: Boller…)', ['bollerwagen', 'boller wagen']],
    ];
    if (random_int(0, 1)) {
        $a = random_int(2, 9); $b = random_int(1, 9);
        $q = "Wie viel ist {$w[$a]} plus {$w[$b]}? (bitte in Ziffern)"; $ans = [(string)($a + $b)];
    } else {
        [$q, $ans] = $trivia[random_int(0, count($trivia) - 1)];
    }
    $_SESSION['cap'] = ['a' => $ans, 't' => time()];
    return ['q' => $q];
}
function checkCaptcha(array $b): void {
    $cap = $_SESSION['cap'] ?? null;
    unset($_SESSION['cap']);
    if (!empty($b['website'])) fail('Anfrage abgelehnt.', 400, ['newCaptcha' => true]);
    if (!$cap) fail('Die Sicherheitsfrage ist abgelaufen – bitte neu beantworten.', 400, ['newCaptcha' => true]);
    if (time() - $cap['t'] < 3) fail('Bitte etwas langsamer ausfüllen.', 400, ['newCaptcha' => true]);
    if (time() - $cap['t'] > 3 * 3600) fail('Die Sicherheitsfrage ist abgelaufen – bitte neu beantworten.', 400, ['newCaptcha' => true]);
    if (!in_array(norm((string)($b['captcha'] ?? '')), $cap['a'], true)) fail('Die Sicherheitsfrage wurde nicht richtig beantwortet.', 400, ['newCaptcha' => true]);
    // Begrenzung: max. 15 Einreichungen pro Stunde und Anschluss
    $ip = ipHash();
    $st = db()->prepare('SELECT COUNT(*) FROM bs_submissions WHERE ip_hash=? AND created > ?');
    $st->execute([$ip, date('Y-m-d H:i:s', time() - 3600)]);
    if ((int)$st->fetchColumn() >= 15) fail('Zu viele Einträge in kurzer Zeit – bitte später erneut versuchen.', 429);
    db()->prepare('INSERT INTO bs_submissions (ip_hash, created) VALUES (?, ?)')->execute([$ip, now()]);
    db()->prepare('DELETE FROM bs_submissions WHERE created < ?')->execute([date('Y-m-d H:i:s', time() - 2 * 86400)]);
}

/* ------------------------------------------------------------------ */
/* E-Mail                                                              */
/* ------------------------------------------------------------------ */
function sendMail(string $subject, string $body, ?string $refType = null, ?string $refId = null): array {
    global $CFG;
    $to = $CFG['mail_to'];
    db()->prepare('INSERT INTO bs_mails (to_addr,subject,body,ref_type,ref_id,created) VALUES (?,?,?,?,?,?)')
        ->execute([$to, mb_substr($subject, 0, 250), $body, $refType, $refId, now()]);
    $mid = (int)db()->lastInsertId();
    $err = null;
    try {
        if ($CFG['smtp_host']) smtpSend($to, $subject, $body);
        else phpMail($to, $subject, $body);
    } catch (Throwable $e) { $err = mb_substr($e->getMessage(), 0, 250); error_log('[Kohlfahrten.de] Mail: ' . $err); }
    db()->prepare('UPDATE bs_mails SET sent=?, error=? WHERE id=?')->execute([$err ? 0 : 1, $err, $mid]);
    return ['sent' => !$err, 'error' => $err];
}
function mailFrom(): string {
    global $CFG;
    if ($CFG['mail_from']) return $CFG['mail_from'];
    $host = preg_replace('/^www\./', '', $_SERVER['SERVER_NAME'] ?? 'localhost');
    return 'noreply@' . $host;
}
function mailHeaders(string $to, string $subject): string {
    global $CFG;
    $from = mailFrom();
    $dom = substr(strrchr($from, '@') ?: '@localhost', 1);
    return 'From: =?UTF-8?B?' . base64_encode($CFG['mail_from_name']) . "?= <$from>\r\n" .
        "To: <$to>\r\n" .
        'Subject: =?UTF-8?B?' . base64_encode($subject) . "?=\r\n" .
        'Date: ' . date('r') . "\r\n" .
        'Message-ID: <' . bin2hex(random_bytes(10)) . "@$dom>\r\n" .
        "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n";
}
function phpMail(string $to, string $subject, string $body): void {
    $from = mailFrom();
    $headers = 'From: =?UTF-8?B?' . base64_encode($GLOBALS['CFG']['mail_from_name']) . "?= <$from>\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64";
    if (!mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', chunk_split(base64_encode($body)), $headers, '-f' . $from)) {
        throw new RuntimeException('PHP mail() fehlgeschlagen – bitte SMTP in config.php eintragen.');
    }
}
function smtpSend(string $to, string $subject, string $body): void {
    global $CFG;
    $secure = $CFG['smtp_secure'];
    $remote = ($secure === 'ssl' ? 'ssl://' : 'tcp://') . $CFG['smtp_host'] . ':' . (int)$CFG['smtp_port'];
    $fp = @stream_socket_client($remote, $en, $es, 15);
    if (!$fp) throw new RuntimeException("SMTP-Verbindung fehlgeschlagen: $es");
    stream_set_timeout($fp, 20);
    $read = function () use ($fp): string {
        $d = '';
        while (($l = fgets($fp, 515)) !== false) { $d .= $l; if (strlen($l) < 4 || $l[3] === ' ') break; }
        return $d;
    };
    $cmd = function (?string $c, $ok) use ($fp, $read): string {
        if ($c !== null) fwrite($fp, $c . "\r\n");
        $r = $read();
        if (!in_array((int)substr($r, 0, 3), (array)$ok, true)) throw new RuntimeException('SMTP: ' . trim($r));
        return $r;
    };
    $ehlo = 'EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'localhost');
    $cmd(null, 220);
    $cmd($ehlo, 250);
    if ($secure === 'tls') {
        $cmd('STARTTLS', 220);
        if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) throw new RuntimeException('SMTP: STARTTLS fehlgeschlagen');
        $cmd($ehlo, 250);
    }
    if ($CFG['smtp_user'] !== '') {
        $cmd('AUTH LOGIN', 334);
        $cmd(base64_encode($CFG['smtp_user']), 334);
        $cmd(base64_encode($CFG['smtp_pass']), 235);
    }
    $cmd('MAIL FROM:<' . mailFrom() . '>', 250);
    $cmd("RCPT TO:<$to>", [250, 251]);
    $cmd('DATA', 354);
    $cmd(mailHeaders($to, $subject) . "\r\n" . chunk_split(base64_encode($body)) . "\r\n.", 250);
    $cmd('QUIT', [221, 250]);
    fclose($fp);
}
function notify(string $type, string $id, array $d, string $author, string $mail, bool $raffle = false): void {
    global $CFG;
    $labels = ['route' => 'Kohlfahrt-Strecke', 'gasthaus' => 'Gaststätte', 'verleih' => 'Bollerwagenverleih'];
    $name = $d['title'] ?? $d['name'] ?? '';
    $site = rtrim($CFG['site_url'] ?: (($GLOBALS['https'] ? 'https://' : 'http://') . ($_SERVER['HTTP_HOST'] ?? '') . rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/'), '/')), '/');
    $body = "Hallo,\n\nes wurde ein neuer Eintrag vom Typ „{$labels[$type]}“ eingereicht:\n\n" .
        "  Titel: $name\n  Ort:   {$d['plz']} {$d['ort']}\n  Von:   " . ($author ?: 'anonym') . ($mail ? " <$mail>" : '') . "\n  Zeit:  " . date('d.m.Y H:i') . "\n" .
        ($raffle ? "  Gewinnspiel: JA (Teilnahme wird erst mit Freigabe der Strecke gültig)\n" : '') . "\n" .
        "Bitte im Adminbereich prüfen und freigeben:\n$site/#admin\n\n– Kohlfahrten.de";
    sendMail("[Kohlfahrten.de] Neuer Eintrag ({$labels[$type]}): $name", $body, $type, $id);
}

/* ------------------------------------------------------------------ */
/* Gewinnspiel                                                         */
/* ------------------------------------------------------------------ */
function raffleOpen(): bool { return time() <= strtotime(RAFFLE_END); }
function cleanPhone(string $p): string {
    $p = preg_replace('/[^\d+]/', '', $p) ?? '';
    return preg_match('/^\+?\d{6,16}$/', $p) ? $p : '';
}
/** Prüft die Gewinnspiel-Angaben und liefert [email, phone, name] oder null (keine Teilnahme). */
function raffleInput(array $b): ?array {
    $r = (array)($b['raffle'] ?? []);
    if (empty($r['join'])) return null;
    if (!raffleOpen()) fail('Das Gewinnspiel ist beendet – eine Teilnahme ist nicht mehr möglich.');
    if (empty($r['adult'])) fail('Gewinnspiel: Bitte bestätige, dass du mindestens 18 Jahre alt bist und die Teilnahmebedingungen akzeptierst.');
    $name  = str($r['name'] ?? '', 100);
    if (mb_strlen($name) < 2) fail('Gewinnspiel: Bitte deinen Namen angeben.');
    $email = str($r['email'] ?? '', 150);
    $phone = str($r['phone'] ?? '', 40);
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Gewinnspiel: Die E-Mail-Adresse ist ungültig.');
    $phoneC = $phone === '' ? '' : cleanPhone($phone);
    if ($phone !== '' && $phoneC === '') fail('Gewinnspiel: Die Handynummer ist ungültig.');
    if ($email === '' && $phoneC === '') fail('Gewinnspiel: Bitte E-Mail-Adresse oder Handynummer für die Gewinnbenachrichtigung angeben.');
    return [$email, $phoneC, $name];
}
function raffleList(?string $month = null): array {
    $sql = 'SELECT r.*, e.title, e.status FROM bs_raffle r LEFT JOIN bs_entries e ON e.id = r.entry_id';
    $p = [];
    if ($month) { $sql .= ' WHERE r.month = ?'; $p[] = $month; }
    $st = db()->prepare($sql . ' ORDER BY r.id DESC');
    $st->execute($p);
    return array_map(fn($r) => [
        'id' => (int)$r['id'], 'entryId' => $r['entry_id'], 'name' => $r['name'] ?? '', 'title' => $r['title'] ?? '(Strecke gelöscht)', 'status' => $r['status'] ?? 'deleted',
        'email' => $r['email'], 'phone' => $r['phone'], 'month' => $r['month'], 'date' => strtotime($r['created']) * 1000,
    ], $st->fetchAll());
}

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */
$action = (string)($_GET['action'] ?? '');
$isPost = ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST';
if ($isPost && !hash_equals($_SESSION['csrf'], (string)($_SERVER['HTTP_X_CSRF'] ?? ''))) {
    fail('Sitzung abgelaufen – bitte Seite neu laden.', 403, ['csrf' => $_SESSION['csrf']]);
}

switch ($action) {

    case 'list':
        out(listAll() + ['admin' => isAdmin(), 'csrf' => $_SESSION['csrf'], 'version' => APP_VERSION, 'mailTo' => $CFG['mail_to'],
            'raffleOpen' => raffleOpen(), 'raffleEnd' => RAFFLE_END]);

    case 'captcha':
        out(newCaptcha());

    case 'submit': {
        if (!$isPost) fail('POST erwartet.', 405);
        $b = body();
        $type = typeOk($b['type'] ?? '');
        checkCaptcha($b);
        if (empty($b['privacy'])) fail('Bitte die Datenschutzerklärung bestätigen.');
        $d = clean($type, (array)($b['data'] ?? []));
        $raffle = $type === 'route' ? raffleInput($b) : null;
        if ($type === 'route') $d['photos'] = savePhotos($b['data']['photos'] ?? []);
        $author = str($b['author'] ?? '', 100);
        $mail = str($b['authorMail'] ?? '', 150);
        if ($mail !== '' && !filter_var($mail, FILTER_VALIDATE_EMAIL)) $mail = '';
        $id = insertEntry($type, $d, 'pending', $author, $mail);
        if ($raffle) {
            db()->prepare('INSERT INTO bs_raffle (entry_id, name, email, phone, month, created) VALUES (?,?,?,?,?,?)')
                ->execute([$id, $raffle[2], $raffle[0], $raffle[1], date('Y-m'), now()]);
        }
        notify($type, $id, $d, $author, $mail, (bool)$raffle);
        out(['ok' => true, 'id' => $id]);
    }

    case 'banner_request': {
        if (!$isPost) fail('POST erwartet.', 405);
        $b = body();
        checkCaptcha($b);
        if (empty($b['privacy'])) fail('Bitte die Datenschutzerklärung bestätigen.');
        $f = [];
        foreach (['name' => 120, 'ort' => 100, 'person' => 100, 'email' => 150, 'telefon' => 40, 'paket' => 40, 'nachricht' => 2000] as $k => $len) $f[$k] = str($b[$k] ?? '', $len);
        if ($f['name'] === '' || $f['ort'] === '' || $f['person'] === '' || $f['email'] === '') fail('Bitte alle Pflichtfelder ausfüllen.');
        if (!filter_var($f['email'], FILTER_VALIDATE_EMAIL)) fail('Die E-Mail-Adresse ist ungültig.');
        $body = "Hallo,\n\nes gibt eine neue Banner-Anfrage auf Kohlfahrten.de:\n\n" .
            "Gaststätte: {$f['name']}\nOrt: {$f['ort']}\nAnsprechpartner: {$f['person']}\nE-Mail: {$f['email']}\nTelefon: {$f['telefon']}\nPaket: {$f['paket']}\n\nNachricht:\n{$f['nachricht']}\n\n– Kohlfahrten.de";
        sendMail("[Kohlfahrten.de] Banner-Anfrage: {$f['name']} ({$f['ort']})", $body);
        out(['ok' => true]);
    }

    case 'rate': {
        if (!$isPost) fail('POST erwartet.', 405);
        $b = body();
        $stars = (int)($b['stars'] ?? 0);
        if ($stars < 1 || $stars > 5) fail('Bitte 1 bis 5 Sterne wählen.');
        $e = getEntry((string)($b['id'] ?? ''));
        if (!$e || $e['type'] !== 'route' || $e['status'] !== 'approved') fail('Strecke nicht gefunden.', 404);
        try {
            db()->prepare('INSERT INTO bs_ratings (entry_id, stars, voter, created) VALUES (?,?,?,?)')->execute([$e['id'], $stars, ipHash(), now()]);
        } catch (PDOException $ex) {
            if ($ex->getCode() === '23000') fail('Du hast diese Strecke bereits bewertet.', 409);
            throw $ex;
        }
        out(['ok' => true, 'ratings' => ratingsFor([$e['id']])[$e['id']] ?? []]);
    }

    case 'login': {
        if (!$isPost) fail('POST erwartet.', 405);
        $_SESSION['tries'] = array_values(array_filter($_SESSION['tries'] ?? [], fn($t) => $t > time() - 900));
        if (count($_SESSION['tries']) >= 5) fail('Zu viele Fehlversuche – bitte 15 Minuten warten.', 429);
        $pw = (string)(body()['password'] ?? '');
        $hash = (string)($CFG['admin_password'] ?? '');
        $ok = $hash !== '' && (str_starts_with($hash, '$2y$') || str_starts_with($hash, '$argon2') ? password_verify($pw, $hash) : hash_equals($hash, $pw));
        if (!$ok) { $_SESSION['tries'][] = time(); sleep(1); fail('Falsches Passwort.', 401); }
        session_regenerate_id(true);
        $_SESSION['admin'] = true;
        $_SESSION['csrf'] = bin2hex(random_bytes(16));
        out(['ok' => true, 'csrf' => $_SESSION['csrf']]);
    }

    case 'logout':
        $_SESSION = [];
        session_regenerate_id(true);
        $_SESSION['csrf'] = bin2hex(random_bytes(16));
        out(['ok' => true, 'csrf' => $_SESSION['csrf']]);

    /* ---------------- Admin ---------------- */
    case 'admin_save': {
        requireAdmin();
        if (!$isPost) fail('POST erwartet.', 405);
        $b = body();
        $type = typeOk($b['type'] ?? '');
        $item = (array)($b['item'] ?? []);
        $status = in_array($item['status'] ?? '', ['pending', 'approved', 'rejected'], true) ? $item['status'] : 'approved';
        $d = clean($type, $item);
        $id = (string)($item['id'] ?? '');
        $old = $id ? getEntry($id) : null;
        if ($old) {
            $oldData = json_decode($old['data'], true) ?: [];
            if ($type === 'route') $d['photos'] = savePhotos($item['photos'] ?? [], $oldData['photos'] ?? []);
            if ($type === 'gasthaus') $d['bannerImg'] = savePhotos($d['bannerImg'] !== '' ? [$d['bannerImg']] : [], !empty($oldData['bannerImg']) ? [$oldData['bannerImg']] : [])[0] ?? '';
            db()->prepare('UPDATE bs_entries SET status=?, title=?, plz=?, ort=?, data=?, updated=? WHERE id=?')
                ->execute([$status, $d['title'] ?? $d['name'], $d['plz'], $d['ort'], json_encode($d, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), now(), $id]);
            if (!empty($b['clearRatings'])) db()->prepare('DELETE FROM bs_ratings WHERE entry_id=?')->execute([$id]);
        } else {
            if ($type === 'route') $d['photos'] = savePhotos($item['photos'] ?? []);
            if ($type === 'gasthaus') $d['bannerImg'] = savePhotos($d['bannerImg'] !== '' ? [$d['bannerImg']] : [])[0] ?? '';
            $id = insertEntry($type, $d, $status, str($item['author'] ?? 'Admin', 100));
        }
        out(['ok' => true, 'id' => $id]);
    }

    case 'admin_status': {
        requireAdmin();
        $b = body();
        $s = $b['status'] ?? '';
        if (!in_array($s, ['pending', 'approved', 'rejected'], true)) fail('Ungültiger Status.');
        db()->prepare('UPDATE bs_entries SET status=?, updated=? WHERE id=?')->execute([$s, now(), (string)($b['id'] ?? '')]);
        out(['ok' => true]);
    }

    case 'admin_delete': {
        requireAdmin();
        $id = (string)(body()['id'] ?? '');
        $e = getEntry($id);
        if ($e) {
            foreach ((json_decode($e['data'], true)['photos'] ?? []) as $p) if (is_string($p)) deletePhoto($p);
            db()->prepare('DELETE FROM bs_entries WHERE id=?')->execute([$id]);
            db()->prepare('DELETE FROM bs_ratings WHERE entry_id=?')->execute([$id]);
            db()->prepare('DELETE FROM bs_raffle WHERE entry_id=?')->execute([$id]);
        }
        out(['ok' => true]);
    }

    case 'admin_import': {
        requireAdmin();
        $b = body();
        $status = in_array($b['status'] ?? '', ['pending', 'approved'], true) ? $b['status'] : 'approved';
        $items = array_slice((array)($b['items'] ?? []), 0, 200);
        $ids = [];
        foreach ($items as $it) $ids[] = insertEntry('route', clean('route', (array)$it) + ['photos' => []], $status, 'CSV-Import');
        out(['ok' => true, 'ids' => $ids]);
    }

    case 'admin_seed': {
        requireAdmin();
        if (empty(body()['append']) && (int)db()->query('SELECT COUNT(*) FROM bs_entries')->fetchColumn() > 0) fail('Es sind bereits Einträge vorhanden – Startdaten werden nur in eine leere Datenbank geladen.');
        $data = (array)(body()['data'] ?? []);
        $n = 0;
        foreach (['routes' => 'route', 'gasthaeuser' => 'gasthaus', 'verleih' => 'verleih'] as $k => $type) {
            foreach ((array)($data[$k] ?? []) as $it) {
                $d = clean($type, (array)$it);
                if ($type === 'route') $d['photos'] = savePhotos($it['photos'] ?? []);
                if ($type === 'gasthaus') $d['bannerImg'] = '';
                $st = in_array($it['status'] ?? '', ['pending', 'approved', 'rejected'], true) ? $it['status'] : 'approved';
                $id = insertEntry($type, $d, $st, (string)($it['author'] ?? 'Redaktion'), '', isset($it['created']) ? (int)$it['created'] : null);
                foreach ((array)($it['ratings'] ?? []) as $i => $s) {
                    db()->prepare('INSERT INTO bs_ratings (entry_id, stars, voter, created) VALUES (?,?,?,?)')->execute([$id, max(1, min(5, (int)$s)), hash('sha256', "seed-$id-$i"), now()]);
                }
                $n++;
            }
        }
        out(['ok' => true, 'count' => $n]);
    }

    case 'admin_testmail': {
        requireAdmin();
        out(sendMail('[Kohlfahrten.de] Testmail', "Hallo,\n\ndies ist eine Testmail aus dem Adminbereich von Kohlfahrten.de.\nWenn du sie liest, funktioniert der Mailversand.\n\n– Kohlfahrten.de"));
    }

    case 'admin_status_info': {
        requireAdmin();
        $schema = db()->query("SELECT v FROM bs_meta WHERE k='schema'")->fetchColumn();
        $dir = __DIR__ . '/uploads';
        out([
            'version' => APP_VERSION, 'schema' => (int)$schema, 'php' => PHP_VERSION,
            'mysql' => db()->query('SELECT VERSION()')->fetchColumn(),
            'uploadsWritable' => is_dir($dir) ? is_writable($dir) : is_writable(__DIR__),
            'mailMode' => $CFG['smtp_host'] ? 'SMTP (' . $CFG['smtp_host'] . ')' : 'PHP mail()',
            'mailTo' => $CFG['mail_to'],
            'passwordHashed' => str_starts_with((string)($CFG['admin_password'] ?? ''), '$'),
        ]);
    }

    case 'admin_raffle': {
        requireAdmin();
        $month = (string)($_GET['month'] ?? '');
        if ($month !== '' && !preg_match('/^\d{4}-\d{2}$/', $month)) fail('Ungültiger Monat.');
        $draws = db()->query('SELECT d.*, r.name, r.email, r.phone, r.entry_id, e.title FROM bs_raffle_draws d LEFT JOIN bs_raffle r ON r.id = d.raffle_id LEFT JOIN bs_entries e ON e.id = r.entry_id ORDER BY d.id DESC')->fetchAll();
        $months = db()->query("SELECT month, COUNT(*) n FROM bs_raffle GROUP BY month ORDER BY month DESC")->fetchAll();
        out([
            'entries' => raffleList($month ?: null),
            'months' => array_map(fn($m) => ['month' => $m['month'], 'count' => (int)$m['n']], $months),
            'draws' => array_map(fn($d) => ['id' => (int)$d['id'], 'month' => $d['month'], 'raffleId' => (int)$d['raffle_id'], 'pool' => (int)$d['pool'], 'name' => $d['name'] ?? '',
                'email' => $d['email'] ?? '', 'phone' => $d['phone'] ?? '', 'title' => $d['title'] ?? '', 'note' => $d['note'], 'date' => strtotime($d['created']) * 1000], $draws),
            'open' => raffleOpen(), 'end' => RAFFLE_END,
        ]);
    }

    case 'admin_raffle_draw': {
        requireAdmin();
        $b = body();
        $month = (string)($b['month'] ?? '');
        if (!preg_match('/^\d{4}-\d{2}$/', $month)) fail('Bitte einen Monat wählen.');
        $onlyApproved = !isset($b['onlyApproved']) || !empty($b['onlyApproved']);
        $sql = "SELECT r.* FROM bs_raffle r JOIN bs_entries e ON e.id = r.entry_id WHERE r.month = ?" . ($onlyApproved ? " AND e.status = 'approved'" : " AND e.status <> 'rejected'");
        $st = db()->prepare($sql . ' ORDER BY r.id');
        $st->execute([$month]);
        // Jede Person (gleiche E-Mail bzw. Handynummer) nur einmal pro Monat im Lostopf
        $pool = []; $seen = [];
        foreach ($st as $r) {
            $key = strtolower($r['email']) ?: $r['phone'];
            if (isset($seen[$key])) continue;
            $seen[$key] = true; $pool[] = $r;
        }
        // bereits gezogene Gewinner dieses Monats ausschließen (bei Neuauslosung)
        $prev = db()->prepare('SELECT raffle_id FROM bs_raffle_draws WHERE month = ?');
        $prev->execute([$month]);
        $prevIds = array_map('intval', $prev->fetchAll(PDO::FETCH_COLUMN));
        $pool = array_values(array_filter($pool, fn($r) => !in_array((int)$r['id'], $prevIds, true)));
        if (!$pool) fail('Für diesen Monat gibt es keine (weiteren) gültigen Teilnahmen.');
        $win = $pool[random_int(0, count($pool) - 1)];
        $note = str($b['note'] ?? '', 250);
        db()->prepare('INSERT INTO bs_raffle_draws (month, raffle_id, pool, note, created) VALUES (?,?,?,?,?)')
            ->execute([$month, $win['id'], count($pool), $note, now()]);
        out(['ok' => true, 'winner' => ['name' => $win['name'], 'email' => $win['email'], 'phone' => $win['phone'], 'entryId' => $win['entry_id']], 'pool' => count($pool)]);
    }

    case 'admin_raffle_delete': {
        requireAdmin();
        $b = body();
        if (($b['confirm'] ?? '') !== 'LÖSCHEN') fail('Bitte zur Bestätigung LÖSCHEN eingeben.');
        if (!empty($b['id'])) {
            db()->prepare('DELETE FROM bs_raffle WHERE id = ?')->execute([(int)$b['id']]);
        } else {
            db()->exec('DELETE FROM bs_raffle'); db()->exec('DELETE FROM bs_raffle_draws');
        }
        out(['ok' => true]);
    }

    case 'admin_hash': {
        requireAdmin();
        $pw = (string)(body()['password'] ?? '');
        if (mb_strlen($pw) < 10) fail('Bitte mindestens 10 Zeichen verwenden.');
        out(['hash' => password_hash($pw, PASSWORD_DEFAULT)]);
    }

    default:
        fail('Unbekannte Aktion.', 404);
}
