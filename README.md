# MMA Tipovací Aplikace

## Popis
Webová aplikace pro tipování výsledků MMA zápasů. Uživatel tipuje vítěze a způsob ukončení zápasu, označuje tipy jako správné či špatné a sleduje svoji úspěšnost. Data jsou uchovávána v místním úložišti prohlížeče (localStorage), takže tipy zůstanou i po obnovení stránky.

## Funkce
- **Úvodní stránka**: Rozcestník mezi tipováním a bodovací aplikací [MMAJudge](https://dohnos.github.io/MMAJudge/).
- **Výběr zápasů**: Zápasy se načítají ze souboru `matches.txt`.
- **Tipování**: Vítěz i způsob ukončení se volí jedním klepnutím — segmentovaný přepínač místo rozbalovacích seznamů.
- **Uložené tipy**: Přehled tipů s možností označit výsledek nebo tip smazat. Opětovné klepnutí na už zvolený stav vyhodnocení zruší.
- **Statistika**: Počet správných, špatných a nevyhodnocených tipů plus procentuální úspěšnost.
- **Světlý a tmavý režim**: Přepínač v hlavičce, volba se pamatuje.
- **Responzivní design**: Od mobilu po desktop.

## Design
Minimalistický **neobrutalismus** v čistě černobílé paletě:
- silné rámečky a ostré (neblurované) offsetové stíny,
- výhradně zaoblené tvary — žádné ostré rohy,
- stavy se rozlišují tvarem a výplní, nikoliv barvou (správný tip = plná výplň, špatný = přerušovaný rámeček),
- emoji jsou nahrazená inline SVG ikonami, které dědí barvu textu a fungují i offline.

## Technologie
- **HTML**: Struktura webové stránky.
- **CSS**: Vlastní designový systém v `styles.css` — bez frameworku a bez externích závislostí.
- **JavaScript**: Interaktivita a logika aplikace, bez knihoven.
- **GitHub Pages**: Hosting aplikace zdarma.

## Použití
1. **Otevření aplikace**:
   Otevřete `index.html` přes webový server — načítání `matches.txt` pomocí `fetch` nefunguje z adresy `file://`. Například `python3 -m http.server`.

2. **Úprava zápasů**:
   Zápasy lze upravit v souboru `matches.txt` — jeden zápas na řádek ve tvaru `Bojovník A vs Bojovník B`.

## Přístupnost
Aplikace má viditelný stav zaměření pro ovládání klávesnicí, popisky pro odečítače obrazovky, odkaz pro přeskočení na obsah a respektuje nastavení `prefers-reduced-motion`.

## Přispívání
Příspěvky jsou vítány! Pokud máte nápady na nové funkce nebo zlepšení, neváhejte otevřít problém (issue) nebo požadavek na sloučení (pull request).
