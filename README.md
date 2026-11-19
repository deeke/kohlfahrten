# Kohlfahrten.de

Kohlfahrt-Strecken, Gaststätten (mit Kohlfahrt- und Boßelangeboten), Bollerwagenverleihe,
Kohlfahrt-Spiele, Infos, Shop-Links zu bossel.de und ein PDF-Guide zum Download.

Technik: PHP 8.1+ und MySQL 8 / MariaDB (Strato), Leaflet-Karte mit OpenStreetMap.

## Ordner
- `public/` – alles, was auf den Webspace kommt (Zielordner bei Strato: `/kohlfahrten/public`)
- `public/assets/content.js` – Spiele, Shop-Kategorien, Werbung, Regionen (ohne Programmierkenntnisse änderbar)
- `public/downloads/kohlfahrten-guide.pdf` – der Guide; Quelle in `guide-quelle/`
- `.github/workflows/deploy.yml` – lädt bei jedem Push auf `main` automatisch per SFTP hoch

## Einrichtung (einmalig)
1. In GitHub die Secrets `STRATO_SFTP_HOST`, `STRATO_SFTP_USER`, `STRATO_SFTP_PASS` anlegen.
2. In Strato die Domain/Subdomain auf den Ordner `/kohlfahrten/public` zeigen lassen.
3. Ersten Upload abwarten (Actions-Tab), dann `config.sample.php` als `config.php` in denselben
   Ordner legen und das Datenbank- und Mail-Passwort sowie das Admin-Passwort eintragen.
4. Seite aufrufen → Footer „Admin“ → anmelden → Einstellungen → „Startdaten laden“.
   Damit werden die recherchierten Gaststätten, Bollerwagenverleihe und Strecken angelegt.

`config.php` wird nie ins Repository übernommen und beim Deploy nie überschrieben.

## Premium-Banner für Gaststätten
Im Adminbereich eine Gaststätte bearbeiten → „Premium-Banner“ anhaken, Enddatum, Werbetext
und optional ein Bannerbild setzen. Sie erscheint dann oben auf der Startseite und an erster
Stelle der Gaststätten-Liste. Anfragen über „Werben“ landen per Mail bei der Redaktion.
