# Super-todo

En supersmart och enkel to-do-app på svenska. Skriv en rad — appen förstår, prioriterar och planerar.

Byggd med React + Vite som en installerbar PWA (fungerar offline, kan läggas på hemskärmen).

## Funktioner

Blixtsnabb inmatning med svensk språktolkning ("ring Anna fre 10 !viktigt", "betala hyran 25/8 varje månad"), tre vyer (Idag, Inkorg, Kommande), morgonflödet "Planera min dag" med smart poängbaserad prioritering, återkommande uppgifter, påminnelser med notiser, knuffar för uppgifter som legat länge, kortkommandon (n, 1/2/3, p) samt export/import av data. Allt sparas lokalt i webbläsaren — inget konto, ingen server.

## Lägg upp på GitHub och Vercel (steg för steg)

### 1. Skapa GitHub-repot

1. Gå till **github.com/new**
2. Döp repot till t.ex. `supertodo`, välj **Private** om du vill, klicka **Create repository**
3. På nästa sida, klicka länken **uploading an existing file**
4. Dra in **allt innehåll i den här mappen** (inte mappen `node_modules` — den ska inte med, och finns inte i zip-filen)
5. Klicka **Commit changes**

### 2. Koppla Vercel

1. Gå till **vercel.com** och logga in
2. Klicka **Add New… → Project**
3. Välj **Import Git Repository** och koppla ditt GitHub-konto om det inte redan är gjort
4. Välj `supertodo`-repot → Vercel känner automatiskt igen Vite (Framework Preset: **Vite**) — ändra ingenting
5. Klicka **Deploy** och vänta ca en minut

Klart! Du får en adress i stil med `https://supertodo-xxx.vercel.app`. Varje gång du (eller Claude) uppdaterar koden på GitHub byggs och publiceras appen automatiskt.

### 3. Flytta dina uppgifter från den gamla versionen

Uppgifterna sparas i webbläsaren, inte i koden. Öppna din gamla version → kugghjulet ⚙ → **Exportera**. Öppna den nya Vercel-adressen → ⚙ → **Importera** → välj filen.

### 4. Installera på mobilen

iPhone (Safari): öppna adressen → dela-knappen → **Lägg till på hemskärmen**.
Android (Chrome): öppna adressen → menyn ⋮ → **Lägg till på startskärmen**.

## Utveckla lokalt

```bash
npm install     # en gång
npm run dev     # utvecklingsserver på localhost:5173
npm test        # 30 enhetstester för språktolkningen
npm run build   # produktionsbygge till dist/
```

## Struktur

```
src/
  lib/parser.js        # Svensk språktolkning + poängmodell (ren logik, enhetstestad)
  lib/format.js        # Datumformatering och sortering
  components/          # Capture, TaskItem, PlanSheet, SettingsSheet
  App.jsx              # Vyer, tillstånd, påminnelser, kortkommandon
  styles.css           # All styling (ljust + mörkt läge)
tests/parser.test.js   # Vitest-svit
vite.config.js         # Vite + PWA-manifest och service worker
```
