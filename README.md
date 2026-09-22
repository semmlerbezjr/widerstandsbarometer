# Widerstandsbarometer

Web-App für **Systemisches Konsensieren**: Eine moderierende Person legt eine
Fragestellung mit Lösungsoptionen an und bekommt zwei Links:

- **Admin-Link** (privat, mit geheimem Token) – steuert die Abstimmung
  (beenden, zurücksetzen) und zeigt jederzeit den Zwischenstand.
- **Teilnehmer-Link** (öffentlich, per QR-Code teilbar) – jede:r stimmt dort
  mit Reglern (0 = kein Widerstand, 10 = maximaler Widerstand) ab, ohne
  Ergebnisse zu sehen, solange die Abstimmung läuft.

Die Auswertung sortiert automatisch nach geringstem Widerstand und zeigt
Summe, Durchschnitt und Anzahl der Stimmen pro Option.

## Wie die Rollen getrennt sind

Es gibt **keine Logins** – die Trennung läuft über die Links:

- Wer den **Admin-Link** hat (mit `?token=...`), kann beenden, zurücksetzen
  und sieht die Ergebnisse live.
- Wer nur den **Teilnehmer-Link** hat, kann ausschließlich abstimmen. Die
  Ergebnis-Daten werden für diese Ansicht vom Server gar nicht erst
  mitgeschickt (nicht nur versteckt) – ohne Admin-Token sind sie technisch
  nicht abrufbar.

Behandle den Admin-Link entsprechend vertraulich, wie ein Passwort.

## Grenzen (bewusst einfach gehalten)

- **Datenspeicherung:** Stimmen liegen in einer einfachen Datei
  (`data/boards.json`) auf dem Server. Bei einem Neu-Deploy (nicht bei einem
  einfachen Neustart/Aufwachen) kann diese Datei je nach Hosting-Anbieter
  verloren gehen. Für Workshop-Einsätze (Stunden bis wenige Tage) reicht das;
  für dauerhafte Archivierung nicht gedacht.
- **Eine Stimme pro Gerät/Browser:** Die Erkennung "wer hat schon
  abgestimmt" läuft über eine zufällige Kennung im Browser-Speicher
  (localStorage), nicht über echte Accounts. Wer den Browser wechselt oder
  seinen Speicher löscht, kann erneut abstimmen. Für einen offenen
  Workshop-Kontext ist das ein akzeptabler Kompromiss, kein Schutz gegen
  gezieltes Mehrfachabstimmen.
- **Kein Login, keine Verschlüsselung von Inhalten:** Frage und Optionen sind
  Klartext auf dem Server. Für interne, nicht-vertrauliche Fragestellungen
  gedacht.

## Deployment auf Render.com (kostenlos, ohne Kommandozeile)

Du brauchst nur einen Browser. Zwei Konten: GitHub und Render – beide
kostenlos.

### Schritt 1: Code auf GitHub hochladen

1. Gehe auf [github.com](https://github.com) und erstelle (falls noch nicht
   vorhanden) einen kostenlosen Account.
2. Klicke oben rechts auf **+** → **New repository**.
3. Vergib einen Namen, z. B. `widerstandsbarometer`, wähle **Private** oder
   **Public** (beides funktioniert), und klicke **Create repository**.
4. Auf der nächsten Seite: Klicke auf den Link **uploading an existing
   file** (oder „Add file“ → „Upload files“).
5. Ziehe **alle Dateien und Ordner** aus diesem Projekt in das Browserfenster
   (außer den Ordner `node_modules`, falls vorhanden – der wird nicht
   gebraucht, Render installiert die Abhängigkeiten automatisch über
   `package.json`).
6. Scrolle runter, klicke **Commit changes**.

### Schritt 2: Bei Render einen Web Service anlegen

1. Gehe auf [render.com](https://render.com) und melde dich kostenlos an
   (am einfachsten mit deinem GitHub-Account – dann ist Schritt 3 direkt
   erledigt).
2. Klicke auf **New** → **Web Service**.
3. Verbinde dein GitHub-Konto, falls noch nicht geschehen, und wähle das
   Repository `widerstandsbarometer` aus.
4. Render erkennt automatisch Node.js. Trage folgende Einstellungen ein
   (falls nicht automatisch vorausgefüllt):
   - **Name:** z. B. `widerstandsbarometer` (wird Teil der URL)
   - **Region:** Frankfurt (am nächsten zu Deutschland)
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** **Free**
5. Klicke **Create Web Service**. Render baut und startet die App – das
   dauert ein bis zwei Minuten.
6. Sobald der Status **Live** ist, findest du oben die URL, z. B.
   `https://widerstandsbarometer.onrender.com`. Das ist deine dauerhafte
   Adresse – dort rufst du künftig die Startseite auf, legst neue
   Abstimmungen an und bekommst die jeweiligen Admin-/Teilnehmer-Links samt
   QR-Code.

### Hinweis zum kostenlosen Plan

Der Free-Plan von Render "schläft" nach ca. 15 Minuten Inaktivität ein und
braucht beim nächsten Aufruf ca. 30–60 Sekunden zum Aufwachen. Für einen
Workshop heißt das: Rufe den Admin-Link kurz vorher einmal auf, damit die
App wach ist, bevor die Teilnehmenden den QR-Code scannen. Das Datei
`data/boards.json` bleibt beim Schlafen/Aufwachen erhalten (nur bei einem
neuen Deploy nicht).

## Lokal ausprobieren (optional)

Falls du Node.js installiert hast:

```
npm install
npm start
```

Die App läuft dann unter `http://localhost:3000`.

## Eine neue Abstimmung anlegen

1. Startseite (die Haupt-URL) öffnen.
2. Fragestellung eintragen, Optionen hinzufügen (Null-Lösung wird
   automatisch ergänzt).
3. **Abstimmung erstellen** klicken.
4. Admin-Link für dich behalten, Teilnehmer-Link bzw. QR-Code teilen.
5. Im Admin-Panel jederzeit den Zwischenstand sehen; **Abstimmung beenden**,
   sobald alle abgestimmt haben – ab dann sind die Ergebnisse auch über den
   Teilnehmer-Link sichtbar (nur noch lesend, kein Abstimmen mehr möglich).
