# MMA Tipovací Aplikace

## Popis
Webová aplikace pro tipování výsledků MMA zápasů. Uživatel tipuje vítěze a způsob ukončení zápasu, označuje tipy jako správné či špatné a sleduje svoji úspěšnost. Data jsou uchovávána v místním úložišti prohlížeče (localStorage), takže tipy zůstanou i po obnovení stránky.

## Funkce
- **Úvodní stránka**: Rozcestník mezi tipováním a bodovací aplikací [MMAJudge](https://dohnos.github.io/MMAJudge/).
- **Výběr zápasů**: Všechny zápasy jsou hned vidět jako dlaždice s barevně odlišenými rohy — červený nahoře, modrý dole. Dlaždice ukazuje, jestli je zápas už tipnutý a jak dopadl. K tomu vyhledávání podle jména bojovníka se zvýrazněním shody.
- **Tipování**: Vítěz i způsob ukončení se volí jedním klepnutím — segmentovaný přepínač místo rozbalovacích seznamů. Tlačítko vítěze se obarví podle rohu. Po uložení aplikace sama přeskočí na první ještě netipnutý zápas.
- **Uložené tipy**: Správný tip zezelená, špatný zčervená. Tip lze smazat a opětovné klepnutí na už zvolený stav vyhodnocení zruší.
- **Statistika**: Počet správných a špatných tipů, nejdelší série správných tipů, procentuální úspěšnost a postup vyhodnocování.
- **Sdílecí karta**: Jakmile jsou všechny zápasy tipnuté a vyhodnocené, aplikace vykreslí obrázek 1080 × 1350 px pro Instagram a Facebook — se skóre, úspěšností a přehledem všech tipů. Lze ho stáhnout nebo poslat přes systémové sdílení.
- **Světlý a tmavý režim**: Přepínač v hlavičce, volba se pamatuje.
- **Responzivní design**: Od mobilu po desktop.

## Design
Minimalistický **neobrutalismus** v čistě černobílé paletě:
- silné rámečky a ostré (neblurované) offsetové stíny,
- výhradně zaoblené tvary — žádné ostré rohy,
- barva nese význam, ne dekoraci: červený a modrý roh bojovníka, zelený správný tip a červený špatný. Všechno ostatní zůstává černobílé,
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
