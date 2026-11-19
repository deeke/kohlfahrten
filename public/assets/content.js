/* =====================================================================
   Kohlfahrten.de – Inhalte (Spiele, Shop-Kategorien, Werbung, Regionen)
   Diese Datei kann ohne Programmierkenntnisse angepasst werden:
   Texte ändern, Einträge kopieren/löschen – Komma am Ende beachten.
   ===================================================================== */
"use strict";

const SHOP = 'https://www.bossel.de';

/* ---------- Shop-Kategorien (verlinken auf bossel.de) ---------- */
const SHOP_CATS = [
  {k:'keramik',  t:'Witzige Schnapsgläser aus Keramik', i:'fa-mug-hot',          img:'keramik',  url:SHOP+'/Witzige-Schnapsglaeser-aus-Keramik', top:true,
   d:'Der Hingucker an jedem Hals: lustige Keramik-Schnapsbecher in vielen Motiven – unzerbrechlicher Spaß für die ganze Truppe.'},
  {k:'bedruckt', t:'Schnapsgläser mit Druck',            i:'fa-print',            img:'druck',    url:SHOP+'/schnapsglas-schnapskrug-bedruckt-mit-druck', top:true,
   d:'Mit Gruppenname, Logo oder Jahreszahl bedruckt – das perfekte Erinnerungsstück an eure Kohlfahrt.'},
  {foto:'assets/img/fotos/shop-schnapsglaeser.jpg', k:'band',     t:'Schnapsgläser am Band',              i:'fa-ribbon',           img:'band',     url:SHOP+'/Schnapsglaeser-am-Band', top:true,
   d:'Der Klassiker: Glas ans Band, Band um den Hals – Hände frei für Kugel und Bollerwagen.'},
  {foto:'assets/img/fotos/shop-bosselset.jpg', k:'kugeln',   t:'Boßelkugeln',                        i:'fa-bowling-ball',     img:'kugel',    url:SHOP+'/Bosselkugeln-Freizeit_2', top:true,
   d:'Freizeitkugeln aus Kunststoff, Gummi oder Pockholz – für Kohlfahrt, Boßeltour und Turnier.'},
  {foto:'assets/img/fotos/shop-schnapsglaeser.jpg', k:'glaeser',  t:'Schnapsgläser',                      i:'fa-whiskey-glass',    url:SHOP+'/Schnapsglaeser', d:'Gläser in allen Größen und Farben – auch zur Gruppeneinteilung.'},
  {k:'becher',   t:'Partybecher mit Namen/Logo',         i:'fa-glass-water',      url:SHOP+'/Partybecher-Trinkbecher-mit-Namen-Logo-indivduell', d:'Individuell bedruckte Trinkbecher für die ganze Gruppe.'},
  {foto:'assets/img/fotos/shop-bollerwagen.jpg', k:'boller',   t:'Bollerwagen',                        i:'fa-trailer',          url:SHOP+'/Bollerwagen_1', d:'Robuste Bollerwagen für Getränke, Proviant und Spiele.'},
  {k:'zubehoer', t:'Kohlfahrten-Zubehör',                i:'fa-toolbox',          url:SHOP+'/Kohlfahrten-Zubehoer', d:'Alles, was eine gelungene Kohltour braucht.'},
  {foto:'assets/img/fotos/shop-kronen.jpg', k:'krone',    t:'Kohlkönig & Kohlkönigin – Kronen',   i:'fa-crown',            url:SHOP+'/Kohlkoenig-Koenigin-Krone-Kronen', d:'Kronen, Schärpen und Insignien für das neue Königspaar.'},
  {foto:'assets/img/fotos/shop-kohlorden.jpg', k:'orden',    t:'Kohlorden & Kohlmedaillen',          i:'fa-medal',            url:SHOP+'/Kohlorden-Kohlmedaille-Kohltourorden', d:'Orden und Medaillen für Sieger, König und Pechvogel.'},
  {foto:'assets/img/fotos/shop-spiele.jpg', k:'spiele',   t:'Kohltour-Spiele',                    i:'fa-dice',             url:SHOP+'/Kohltour-Spiele', d:'Spielesets und Ideen für unterwegs.'},
  {foto:'assets/img/fotos/shop-warnwesten.jpg', k:'westen',   t:'Kohlfahrt-Warnwesten',               i:'fa-vest',             url:SHOP+'/Kohltour-Kohlfahrt-Warnwesten', d:'Sicher unterwegs – auch in der Dämmerung. Gerne mit Aufdruck.'},
  {foto:'assets/img/fotos/shop-buttons.jpg', k:'buttons',  t:'Buttons',                            i:'fa-certificate',      url:SHOP+'/Buttons-Kohltour', d:'Witzige Kohltour-Buttons zur Gruppeneinteilung.'},
  {k:'pokale',   t:'Pokale',                             i:'fa-trophy',           url:SHOP+'/Pokale', d:'Pokale für Spielesieger und Wanderpokale.'},
  {k:'medaillen',t:'Medaillen',                          i:'fa-award',            url:SHOP+'/bosseln-medaillen', d:'Medaillen mit farbiger Beschriftung.'},
  {k:'druck',    t:'Beschriftungen',                     i:'fa-pen-nib',          url:SHOP+'/Beschriftungen', d:'Aufdrucke und Beschriftungen nach euren Wünschen.'},
];

/* ---------- Werbeblöcke für bossel.de (rotieren auf den Seiten) ---------- */
const ADS = [
  {img:'keramik', badge:'Bestseller', t:'Keramik-Schnapsgläser', s:'Witzige Motive, unzerbrechlich und der Lacher jeder Kohltour.', url:SHOP+'/Witzige-Schnapsglaeser-aus-Keramik', btn:'Motive ansehen'},
  {img:'druck',   badge:'Mit eurem Namen', t:'Gläser mit Druck', s:'Gruppenname, Logo oder Jahreszahl – euer Andenken an die Kohlfahrt.', url:SHOP+'/schnapsglas-schnapskrug-bedruckt-mit-druck', btn:'Jetzt gestalten'},
  {img:'band', foto:'assets/img/fotos/shop-schnapsglaeser.jpg',    badge:'Klassiker', t:'Schnapsglas am Band', s:'Hände frei für Kugel und Bollerwagen – das Glas hängt immer griffbereit.', url:SHOP+'/Schnapsglaeser-am-Band', btn:'Zum Shop'},
  {img:'kugel', foto:'assets/img/fotos/shop-bosselset.jpg',   badge:'Boßeln', t:'Boßelkugeln', s:'Freizeitkugeln für jede Strecke – mit Spielplan und Anleitung im Paket.', url:SHOP+'/Bosselkugeln-Freizeit_2', btn:'Kugeln entdecken'},
];

/* ---------- Regionen für Gaststätten ---------- */
const REGIONS = ['Emsland','Ostfriesland','Friesland','Oldenburger Land','Ammerland','Oldenburger Münsterland','Wesermarsch','Bremen','Grafschaft Bentheim','Osnabrücker Land','Sonstige'];

/* ---------- Kohlfahrten-Spiele ----------
   mat = Material, pers = Spieler, ort = draußen/drinnen, shop = passende Shop-Kategorie (siehe SHOP_CATS.k) */
const GAMES = [
  {t:'Boßeln', foto:'assets/img/fotos/sp-bosseln.jpg', i:'fa-bowling-ball', tag:'Klassiker', pers:'2 Teams à 4–10', ort:'Strecke', mat:'Boßelkugel(n), Kescher, ggf. Kreide', shop:'kugeln',
   d:'Ziel ist es, eine festgelegte Strecke mit möglichst wenigen Würfen zu schaffen. Team A wirft zuerst, dann Team B. Jeder Wurf endet dort, wo die Kugel liegen bleibt – landet sie im Graben, wird an der Straße weitergeworfen. Es wirft immer das Team, dessen Kugel zurückliegt.'},
  {t:'Teebeutel-Weitwurf', i:'fa-mug-hot', tag:'Klassiker', pers:'beliebig', ort:'Strecke', mat:'Teebeutel (nass oder trocken), Maßband',
   d:'Teebeutel an der Schnur nehmen, mit dem Mund festhalten und per Kopfschwung so weit wie möglich schleudern. Wer am weitesten wirft, gewinnt – nass fliegt er weiter, ist aber auch gemeiner.'},
  {t:'Stift in die Flasche', i:'fa-pen', tag:'Lacher', pers:'2+ Teams', ort:'Strecke / Saal', mat:'Schnur, Kugelschreiber, leere Flaschen',
   d:'Jedem wird eine Schnur um den Bauch gebunden, am Ende baumelt ein Kugelschreiber. Eine Flasche steht zwischen den Füßen. Ohne Hände muss der Stift in die Flasche – das schnellste Team gewinnt.'},
  {t:'Tischtennisball-Pusten', i:'fa-wind', tag:'Duell', pers:'2 Spieler', ort:'Tisch / Straße', mat:'2 Tischtennisbälle, Kreide oder Band',
   d:'Zwei Linien, zwei Bälle, zwei kräftige Puster: Wer seinen Ball zuerst über die Ziellinie pustet, gewinnt. Bei steigendem Promillewert wird es interessant.'},
  {t:'Ringe werfen', i:'fa-ring', tag:'Geschick', pers:'2 Teams', ort:'Strecke', mat:'2 Ringe (Draht), 2 Stäbe',
   d:'Aus festgelegter Entfernung werden Ringe auf einen Stab geworfen. Entweder entscheidet der erste Treffer oder ihr vergebt Punkte nach Distanz.'},
  {t:'Sackhüpfen', foto:'assets/img/fotos/sp-sackhuepfen.jpg', i:'fa-person-running', tag:'Bewegung', pers:'beliebig', ort:'Wiese / Weg', mat:'Kartoffelsäcke',
   d:'In den Sack, Enden am Bauch festhalten und auf Kommando ins Ziel hüpfen. Als Paar-Variante oder mit Parcours noch lustiger.'},
  {t:'Besenwerfen', i:'fa-broom', tag:'Klassiker', pers:'2 Teams', ort:'Strecke', mat:'Besen ohne Stiel',
   d:'Wie Boßeln – nur mit einem Besen ohne Stiel. Jedes Team schleudert den Besen Richtung Ziel; wer hinten liegt, ist am Zug. Wer mit den wenigsten Würfen ankommt, gewinnt.'},
  {t:'Bierdeckel-Zielwurf', i:'fa-bullseye', tag:'Geschick', pers:'2+ Werfer', ort:'Strecke / Saal', mat:'mind. 6 Bierdeckel, Kreide oder 2 Bänder',
   d:'Abwurflinie und Zielfeld markieren. Wer die meisten Bierdeckel im Ziel platziert, gewinnt. Startet mit großer Distanz und verkürzt von Runde zu Runde.'},
  {t:'Löffelkette', i:'fa-spoon', tag:'Team', pers:'2 Teams', ort:'überall', mat:'2 Löffel, ca. 8 m Schnur je Team',
   d:'Das Team stellt sich nebeneinander auf. Ein Löffel mit Schnur wird durch den einen Jackenärmel hinein und durch den anderen wieder heraus gefädelt – von Person zu Person. Wer zuerst komplett verbunden ist, gewinnt.'},
  {t:'Mausefallen-Ping-Pong', i:'fa-table-tennis-paddle-ball', tag:'Geschick', pers:'2 Teams', ort:'Tisch / Straße', mat:'2 Mausefallen, 2 Tischtennisbälle',
   d:'Die gespannten Fallen stehen in einiger Entfernung. Mit dem Ball müssen sie zum Zuschnappen gebracht werden – jede/r im Team muss die Falle einmal auslösen.'},
  {t:'Spaghetti-Makkaroni-Fädeln', i:'fa-bowl-food', tag:'Lacher', pers:'Kreis, Paare', ort:'Saal', mat:'Spaghetti und Makkaroni (roh)',
   d:'Abwechselnd hat jede/r eine Spaghetti oder eine Makkaroni im Mund. Die Spaghetti muss in die Makkaroni des Nachbarn – ohne Hände. Welches Paar ist zuerst fertig?'},
  {t:'Lieder gurgeln', i:'fa-music', tag:'Party', pers:'2 Gruppen', ort:'Saal / Pause', mat:'Wasser (oder Schnaps), Becher',
   d:'Jede Gruppe überlegt sich drei Lieder für die andere. Freiwillige gurgeln das Lied, das eigene Team rät. Mit Wasser gibt es einen Punkt, mit Schnaps zwei.', shop:'band'},
  {t:'Bierdeckel-Inseln', i:'fa-shoe-prints', tag:'Bewegung', pers:'beliebig', ort:'Strecke', mat:'3 Bierdeckel je Spieler',
   d:'Eine Strecke muss nur über drei Bierdeckel zurückgelegt werden – Deckel legen, drauftreten, nächsten nachlegen. Wer den Boden berührt oder zu langsam ist, verliert.'},
  {t:'Buchstabensalat', i:'fa-font', tag:'Köpfchen', pers:'Teams', ort:'Pause / Saal', mat:'Zettel und Stift',
   d:'Ihr schreibt Wörter mit vertauschten Buchstaben auf (z. B. HOKLRÖGN). Das Team mit der schnellsten richtigen Lösung bekommt den Punkt.'},
  {t:'Pärchen-Fußball', i:'fa-futbol', tag:'Team', pers:'2 Teams aus Paaren', ort:'Wiese', mat:'Ball, Luftballon oder Schaumstoffwürfel, Bänder',
   d:'Je zwei Spieler werden an einem Fuß zusammengebunden. Dann geht es ums Tor, eine Zielmarke oder die weiteste Schussdistanz – Koordination ist alles.'},
  {t:'Kartoffel-Golf', i:'fa-golf-ball-tee', tag:'Lacher', pers:'beliebig', ort:'Strecke', mat:'2 rohe Kartoffeln je Spieler, Band',
   d:'Eine Kartoffel baumelt am Band kurz über dem Boden und dient als Schläger, eine zweite liegt als Ball am Boden. Ohne Hände und Füße wird sie ins Ziel bugsiert – gern mit Hindernissen.'},
  {t:'Kerze auspendeln', i:'fa-fire', tag:'Geschick', pers:'2+', ort:'Saal', mat:'Kerzen, Korken/Kronkorken, Bänder',
   d:'Ein Korken baumelt am Band an der Hüfte. Damit muss die Kerze gelöscht werden – Hüftschwung gefragt!'},
  {t:'Schwamm-Staffel', i:'fa-bucket', tag:'Team', pers:'2 Teams', ort:'draußen', mat:'4 Eimer, 2 Schwämme, ca. 5 l Wasser',
   d:'Zwei Eimer stehen etwa 10 m auseinander, einer ist mit Wasser gefüllt. Per Schwamm wird das Wasser in den leeren Eimer transportiert. Wer zuerst die Markierung erreicht, gewinnt.'},
  {t:'Ballon-Platzer', i:'fa-circle', tag:'Lacher', pers:'Paare', ort:'Saal', mat:'Luftballons',
   d:'Zwei Spieler pro Team bringen einen Luftballon zwischen ihren Bäuchen zum Platzen. Schnellstes Paar gewinnt.'},
  {t:'Flaschen-Treffer', i:'fa-wine-bottle', tag:'Team', pers:'2 Teams', ort:'Wiese / Weg', mat:'Plastikflaschen, Ball',
   d:'Leere Plastikflaschen stehen in einer Reihe, beide Teams 15 Fußlängen entfernt. Wer eine Flasche umwirft, darf trinken, bis das andere Team die Flaschen wieder aufgestellt und den Ball hinter die Linie gebracht hat. Bitte mit Augenmaß – Wasser und Alkoholfreies zählen auch.'},
  {t:'Wäscheklammer-Jagd', i:'fa-paperclip', tag:'Lacher', pers:'2 Teams', ort:'überall', mat:'20–30 Wäscheklammern',
   d:'Jedes Team versucht, möglichst viele Klammern an einer Person des anderen Teams zu befestigen – die darf sich nicht bewegen. Nach Ablauf der Zeit wird gezählt: Wer mehr Klammern trägt, verliert.'},
  {t:'Schuhsalat', i:'fa-shoe-prints', tag:'Königswahl', pers:'alle', ort:'Saal / trocken', mat:'2 große Säcke oder Müllbeutel',
   d:'Jeder wirft einen Schuh in den Sack, auf Kommando wird ausgekippt. Wer zuerst wieder beide Schuhe an und zugebunden hat, gewinnt – auch eine lustige Methode, das Königspaar zu finden.'},
  {t:'Zwinker-Duell', i:'fa-eye', tag:'Duell', pers:'2', ort:'überall', mat:'nichts',
   d:'Zwei Kohlfahrer stehen sich gegenüber und schauen sich in die Augen. Wer zuerst zwinkert, hat verloren. Perfekt für die Wartezeit am Tresen.'},
  {t:'Kohlkönig-Wiegen', i:'fa-weight-scale', tag:'Königswahl', pers:'alle', ort:'Gasthaus', mat:'Personenwaage, Liste',
   d:'Alle werden vor und nach dem Grünkohlessen gewogen. Wer am meisten zugelegt hat, wird Kohlkönig bzw. Kohlkönigin – und organisiert die nächste Tour.', shop:'krone'},
  {t:'Nageln', foto:'assets/img/fotos/sp-nageln.jpg', i:'fa-hammer', tag:'Duell', pers:'2–6 Spieler', ort:'Gaststätte / Hof', mat:'Baumstumpf, Hammer, lange Nägel',
   d:'Jeder bekommt einen Nagel, gehämmert wird reihum mit genau einem Schlag pro Runde. Wer seinen Nagel zuerst ganz im Holz versenkt, gewinnt. Mit Abstand spielen!'},
  {t:'Dosenwerfen', foto:'assets/img/fotos/sp-dosen.jpg', i:'fa-bullseye', tag:'Geschick', pers:'beliebig', ort:'Strecke / Saal', mat:'10 leere Dosen, 3 Bälle',
   d:'Dosenpyramide aufbauen und mit drei Würfen so viele Dosen wie möglich abräumen. Jeder Treffer zählt fürs Team – der Klassiker für zwischendurch.'}
];

/* ---------- Kohlkönig: Wahlmethoden ---------- */
const KING_METHODS = [
  ['fa-weight-scale','Wiegen','Vorher-nachher-Wiegen: Der größte Zuwachs gewinnt.'],
  ['fa-utensils','Portionen zählen','Wer die meisten Teller Grünkohl schafft, wird gekrönt.'],
  ['fa-trophy','Spielepunkte','Die meisten Siege bei den Spielen unterwegs entscheiden.'],
  ['fa-shuffle','Losglück','Ein Kohlblatt, eine Bohne oder ein Zettel im Essen – der Zufall krönt.'],
];

/* ---------- Fotos (aus dem bisherigen Kohlfahrten.de-Auftritt) ---------- */
const PHOTOS = {
  start: [['kf-gruppe','Mit Bollerwagen und Warnweste unterwegs'],['kf-gruenkohl','Grünkohl mit Pinkel, Kassler & Kartoffeln'],['sp-bosseln','Boßeln auf der Strecke'],['kf-westen','Kohltour-Westen'],['kf-gruppe2','Die ganze Truppe am Start'],['kf-weg','Auf zur Gaststätte']],
  bollerwagen: [['bw-party','Party-Bollerwagen'],['bw-gruenkohl','Grünkohl on Tour'],['bw-holz','Klassischer Holz-Bollerwagen'],['bw-theke','Rollende Theke'],['bw-box','Bollerwagen mit Getränkebox'],['bw-detail','Gläserhalter im Bollerwagen']],
  spiele: [['sp-bosseln','Boßeln'],['sp-sackhuepfen','Sackhüpfen'],['sp-dosen','Dosenwerfen'],['sp-nageln','Nageln'],['sp-werfen','Weitwurf'],['sp-gruppe','Spielestation unterwegs']],
  infos: [['kf-gruenkohl','Grünkohl'],['kf-gruppe','Kohltour'],['kf-weg','Unterwegs']]
};
