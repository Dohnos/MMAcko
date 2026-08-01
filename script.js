/* =============================================================
   MMA TIPOVÁNÍ — aplikační logika
   Sdíleno oběma stránkami; každý blok se aktivuje jen tam,
   kde k němu existují odpovídající prvky.
   ============================================================= */
(function () {
    'use strict';

    var STORAGE_TIPS = 'mmaTips';
    var STORAGE_THEME = 'mmaTheme';

    var METHOD_LABELS = {
        KO: 'KO',
        TKO: 'TKO',
        SUBMISE: 'Submise',
        BODY: 'Body'
    };

    /* ---------------------------------------------------------
       Bezpečný přístup k localStorage
       (v privátním režimu může vyhodit výjimku)
       --------------------------------------------------------- */
    function readStore(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw === null ? fallback : JSON.parse(raw);
        } catch (e) {
            return fallback;
        }
    }

    function writeStore(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            return false;
        }
    }

    function el(id) {
        return document.getElementById(id);
    }

    function makeIcon(iconId) {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'icon');
        svg.setAttribute('aria-hidden', 'true');
        var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttribute('href', iconId);
        svg.appendChild(use);
        return svg;
    }

    function makeDot(corner) {
        var dot = document.createElement('span');
        dot.className = 'dot dot--' + corner;
        dot.setAttribute('aria-hidden', 'true');
        return dot;
    }

    /* Zápas může nést značku v závorce na konci, například
       "A vs B (TITLE)". Značku odděl, ať se nelepí na jméno bojovníka. */
    function matchTag(match) {
        var found = String(match).match(/\(([^)]+)\)\s*$/);
        return found ? found[1].trim() : '';
    }

    function stripTag(match) {
        return String(match).replace(/\s*\([^)]+\)\s*$/, '').trim();
    }

    /* Rozdělí "A vs B" na jména bojovníků. */
    function splitFighters(match) {
        var parts = stripTag(match).split(' vs ');
        return [(parts[0] || '').trim(), (parts[1] || '').trim()];
    }

    /* ---------------------------------------------------------
       Přepínač světlého/tmavého režimu
       --------------------------------------------------------- */
    function initTheme() {
        var toggle = el('themeToggle');
        var iconUse = document.querySelector('#themeIcon use');
        if (!toggle) return;

        function paint() {
            var dark = document.documentElement.dataset.theme === 'dark';
            if (iconUse) iconUse.setAttribute('href', dark ? '#i-sun' : '#i-moon');
            toggle.setAttribute('aria-pressed', String(dark));
            var label = dark ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim';
            toggle.setAttribute('aria-label', label);
            toggle.setAttribute('title', label);
        }

        toggle.addEventListener('click', function () {
            var dark = document.documentElement.dataset.theme === 'dark';
            document.documentElement.dataset.theme = dark ? 'light' : 'dark';
            try {
                localStorage.setItem(STORAGE_THEME, dark ? 'light' : 'dark');
            } catch (e) { /* ignorujeme */ }
            paint();
        });

        paint();
    }

    /* ---------------------------------------------------------
       Krátké oznámení místo alert()
       --------------------------------------------------------- */
    var toastTimer = null;

    function toast(message, icon) {
        var box = el('toast');
        var text = el('toastText');
        var use = document.querySelector('#toastIcon use');
        if (!box || !text) return;

        text.textContent = message;
        if (use) use.setAttribute('href', icon || '#i-check');
        box.dataset.open = 'true';

        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(function () {
            box.dataset.open = 'false';
        }, 3200);
    }

    /* ---------------------------------------------------------
       Stránka tipování
       --------------------------------------------------------- */
    function initTipovani() {
        var form = el('tipForm');
        if (!form) return;

        var matchGrid = el('matchGrid');
        var matchSearch = el('matchSearch');
        var winnerChoices = el('winnerChoices');
        var selectedPanel = el('selectedMatch');
        var tipList = el('tipList');
        var tipsEmpty = el('tipsEmpty');
        var tipsCount = el('tipsCount');
        var pickCount = el('pickCount');
        var clearAll = el('clearAll');
        var clearAllText = el('clearAllText');
        var saveTipText = el('saveTipText');

        var matches = [];
        var selectedMatch = '';

        /* ---- Práce s úložištěm ---- */
        function loadTips() {
            var tips = readStore(STORAGE_TIPS, []);
            if (!Array.isArray(tips)) return [];

            // Doplnění chybějících polí u starších záznamů
            return tips.filter(Boolean).map(function (tip, index) {
                if (!tip.id) tip.id = 'legacy-' + index + '-' + (tip.match || '');
                if (typeof tip.result === 'undefined') tip.result = null;
                return tip;
            });
        }

        function saveTips(tips) {
            return writeStore(STORAGE_TIPS, tips);
        }

        function findTip(tips, match) {
            return tips.filter(function (tip) { return tip.match === match; })[0] || null;
        }

        /* ---- Načtení zápasů ---- */
        fetch('matches.txt')
            .then(function (response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.text();
            })
            .then(function (data) {
                matches = data.split('\n')
                    .map(function (line) { return line.trim(); })
                    .filter(function (line) { return line.length > 0; });

                renderMatchGrid();
                render();
            })
            .catch(function () {
                matchGrid.textContent = '';
                var hint = document.createElement('p');
                hint.className = 'field__hint';
                hint.textContent = 'Soubor matches.txt se nepodařilo načíst. ' +
                    'Otevři stránku přes webový server, ne přímo ze souboru.';
                matchGrid.appendChild(hint);
                render();
            });

        /* ---- Dlaždice zápasů ---- */
        function renderMatchGrid() {
            var tips = loadTips();
            var query = matchSearch.value.trim().toLowerCase();

            matchGrid.textContent = '';

            var visible = 0;

            matches.forEach(function (match, index) {
                if (query && match.toLowerCase().indexOf(query) === -1) return;
                visible++;
                matchGrid.appendChild(buildMatchCard(match, index, findTip(tips, match), query));
            });

            if (visible === 0) {
                var hint = document.createElement('p');
                hint.className = 'field__hint';
                hint.textContent = matches.length === 0
                    ? 'Načítám zápasy…'
                    : 'Žádný zápas neodpovídá hledání.';
                matchGrid.appendChild(hint);
            }
        }

        function buildMatchCard(match, index, tip, query) {
            var fighters = splitFighters(match);

            var wrapper = document.createElement('label');
            wrapper.className = 'matchcard';

            var input = document.createElement('input');
            input.type = 'radio';
            input.name = 'match';
            input.value = match;
            input.checked = match === selectedMatch;
            input.addEventListener('change', function () {
                selectMatch(match);
            });

            var body = document.createElement('span');
            body.className = 'matchcard__body';

            /* Hlavička: pořadí + stav tipu */
            var head = document.createElement('span');
            head.className = 'matchcard__head';

            var no = document.createElement('span');
            no.className = 'matchcard__no';
            no.textContent = 'Zápas ' + (index + 1);

            head.appendChild(no);

            // Štítek je mimo .matchcard__no — to má sníženou průhlednost
            var tag = matchTag(match);
            if (tag) {
                var tagEl = document.createElement('strong');
                tagEl.className = 'matchcard__tag';
                tagEl.textContent = tag;
                head.appendChild(tagEl);
            }

            if (tip) {
                var flag = document.createElement('span');
                flag.className = 'matchcard__flag';
                flag.appendChild(makeIcon(
                    tip.result === true ? '#i-check' : tip.result === false ? '#i-x' : '#i-clock'
                ));
                flag.appendChild(document.createTextNode(
                    tip.result === true ? 'Sedlo' : tip.result === false ? 'Nesedlo' : 'Tipnuto'
                ));
                head.appendChild(flag);
            }

            body.appendChild(head);

            /* Bojovníci — červený roh nahoře, modrý dole */
            body.appendChild(buildFighterLine(fighters[0], 'red', query));

            var vs = document.createElement('span');
            vs.className = 'matchcard__vs';
            vs.textContent = 'vs';
            body.appendChild(vs);

            body.appendChild(buildFighterLine(fighters[1], 'blue', query));

            wrapper.appendChild(input);
            wrapper.appendChild(body);
            return wrapper;
        }

        function buildFighterLine(name, corner, query) {
            var line = document.createElement('span');
            line.className = 'matchcard__fighter';
            line.appendChild(makeDot(corner));
            appendHighlighted(line, name, query);
            return line;
        }

        /* Vloží text a zvýrazní shodu s hledaným výrazem. */
        function appendHighlighted(parent, text, query) {
            if (!query) {
                parent.appendChild(document.createTextNode(text));
                return;
            }

            var lower = text.toLowerCase();
            var start = lower.indexOf(query);

            if (start === -1) {
                parent.appendChild(document.createTextNode(text));
                return;
            }

            parent.appendChild(document.createTextNode(text.slice(0, start)));

            var mark = document.createElement('mark');
            mark.textContent = text.slice(start, start + query.length);
            parent.appendChild(mark);

            parent.appendChild(document.createTextNode(text.slice(start + query.length)));
        }

        matchSearch.addEventListener('input', renderMatchGrid);

        /* ---- Výběr zápasu ---- */
        function selectMatch(match) {
            selectedMatch = match;
            var tip = findTip(loadTips(), match);

            renderSelectedPanel();
            renderWinnerChoices(tip);

            // Už tipnutý zápas se předvyplní a tlačítko změní význam
            if (tip) {
                var methodInput = form.querySelector('input[name="method"][value="' + tip.method + '"]');
                if (methodInput) methodInput.checked = true;
                saveTipText.textContent = 'Aktualizovat tip';
            } else {
                saveTipText.textContent = 'Uložit tip';
            }
        }

        function renderSelectedPanel() {
            selectedPanel.textContent = '';

            if (!selectedMatch) {
                var hint = document.createElement('span');
                hint.className = 'field__hint';
                hint.textContent = 'Nejdřív vyber zápas nahoře.';
                selectedPanel.appendChild(hint);
                return;
            }

            var fighters = splitFighters(selectedMatch);

            [['red', fighters[0]], ['blue', fighters[1]]].forEach(function (pair, index) {
                if (index === 1) {
                    var vs = document.createElement('span');
                    vs.className = 'selected__vs';
                    vs.textContent = 'vs';
                    selectedPanel.appendChild(vs);
                }

                var side = document.createElement('span');
                side.className = 'selected__fighter';
                side.appendChild(makeDot(pair[0]));
                side.appendChild(document.createTextNode(pair[1]));
                selectedPanel.appendChild(side);
            });
        }

        function renderWinnerChoices(tip) {
            winnerChoices.textContent = '';

            if (!selectedMatch) {
                var hint = document.createElement('p');
                hint.className = 'field__hint';
                hint.textContent = 'Nejdřív vyber zápas.';
                winnerChoices.appendChild(hint);
                return;
            }

            var fighters = splitFighters(selectedMatch);
            var corners = ['red', 'blue'];

            fighters.forEach(function (name, index) {
                var id = 'winner-' + index;

                var wrapper = document.createElement('div');
                wrapper.className = 'choice choice--' + corners[index];

                var input = document.createElement('input');
                input.type = 'radio';
                input.name = 'winner';
                input.id = id;
                input.value = name;
                input.checked = tip ? tip.winner === name : index === 0;

                var label = document.createElement('label');
                label.className = 'choice__label';
                label.setAttribute('for', id);
                label.appendChild(makeDot(corners[index]));
                label.appendChild(document.createTextNode(name));

                wrapper.appendChild(input);
                wrapper.appendChild(label);
                winnerChoices.appendChild(wrapper);
            });
        }

        /* ---- Uložení tipu ---- */
        form.addEventListener('submit', function (event) {
            event.preventDefault();

            if (!selectedMatch) {
                toast('Nejdřív vyber zápas.', '#i-x');
                matchGrid.scrollIntoView({ block: 'center' });
                return;
            }

            var winnerInput = form.querySelector('input[name="winner"]:checked');
            var methodInput = form.querySelector('input[name="method"]:checked');

            if (!winnerInput) {
                toast('Vyber vítěze.', '#i-x');
                return;
            }

            var tips = loadTips();
            var existing = findTip(tips, selectedMatch);
            var updated = Boolean(existing);

            if (existing) {
                existing.winner = winnerInput.value;
                existing.method = methodInput.value;
                existing.createdAt = Date.now();
            } else {
                tips.push({
                    id: 't' + Date.now() + Math.random().toString(36).slice(2, 7),
                    match: selectedMatch,
                    winner: winnerInput.value,
                    method: methodInput.value,
                    result: null,
                    createdAt: Date.now()
                });
            }

            if (!saveTips(tips)) {
                toast('Tip se nepodařilo uložit.', '#i-x');
                return;
            }

            toast(updated ? 'Tip aktualizován.' : 'Tip uložen.', '#i-save');

            // Automaticky přeskočíme na první ještě netipnutý zápas
            var next = firstUntipped(loadTips());
            if (next) {
                selectMatch(next);
            } else {
                selectMatch(selectedMatch);
            }

            render();
        });

        function firstUntipped(tips) {
            for (var i = 0; i < matches.length; i++) {
                if (!findTip(tips, matches[i])) return matches[i];
            }
            return null;
        }

        /* ---- Vykreslení seznamu tipů ---- */
        function render() {
            var tips = loadTips();

            tipList.textContent = '';
            tipsEmpty.hidden = tips.length > 0;
            tipsCount.textContent = String(tips.length);
            clearAll.hidden = tips.length === 0;
            resetClearAll();

            // Nejnovější nahoře
            tips.slice().reverse().forEach(function (tip) {
                tipList.appendChild(buildTipItem(tip));
            });

            pickCount.textContent = tips.length + ' / ' + matches.length + ' tipnuto';

            renderMatchGrid();
            updateStats(tips);
            updateShare(tips);
        }

        function buildTipItem(tip) {
            var item = document.createElement('li');
            item.className = 'tip';
            item.dataset.id = tip.id;
            if (tip.result === true) item.classList.add('tip--correct');
            if (tip.result === false) item.classList.add('tip--wrong');

            /* Hlavička: zápas + stav */
            var head = document.createElement('div');
            head.className = 'tip__head';

            var matchName = document.createElement('span');
            matchName.className = 'tip__match';
            matchName.textContent = stripTag(tip.match);

            var matchTagText = matchTag(tip.match);
            if (matchTagText) {
                var tagEl = document.createElement('strong');
                tagEl.className = 'matchcard__tag';
                tagEl.textContent = matchTagText;
                matchName.appendChild(tagEl);
            }

            head.appendChild(matchName);

            var badge = document.createElement('span');
            badge.className = 'badge';
            if (tip.result === true) {
                badge.classList.add('badge--solid');
                badge.textContent = 'Správně';
            } else if (tip.result === false) {
                badge.classList.add('badge--solid');
                badge.textContent = 'Špatně';
            } else {
                badge.textContent = 'Čeká';
            }
            head.appendChild(badge);
            item.appendChild(head);

            /* Detaily tipu */
            var rows = document.createElement('div');
            rows.className = 'tip__rows';

            var winnerRow = buildRow('#i-crown', 'Vítěz', tip.winner);
            var corner = splitFighters(tip.match)[0] === tip.winner ? 'red' : 'blue';
            winnerRow.querySelector('.tip__value').prepend(makeDot(corner));
            rows.appendChild(winnerRow);

            rows.appendChild(buildRow('#i-bolt', 'Způsob', METHOD_LABELS[tip.method] || tip.method));
            item.appendChild(rows);

            /* Akce */
            var actions = document.createElement('div');
            actions.className = 'tip__actions';
            actions.appendChild(buildAction('correct', '#i-check', 'Správně', tip.result === true));
            actions.appendChild(buildAction('wrong', '#i-x', 'Špatně', tip.result === false));
            actions.appendChild(buildAction('delete', '#i-trash', 'Smazat', false));
            item.appendChild(actions);

            /* Čas vytvoření */
            if (tip.createdAt) {
                var meta = document.createElement('p');
                meta.className = 'tip__meta';
                meta.textContent = 'Tipnuto ' + formatDate(tip.createdAt);
                item.appendChild(meta);
            }

            return item;
        }

        function buildRow(iconId, key, value) {
            var row = document.createElement('div');
            row.className = 'tip__row';

            var keyEl = document.createElement('span');
            keyEl.className = 'tip__key';
            keyEl.appendChild(makeIcon(iconId));
            keyEl.appendChild(document.createTextNode(key));

            var valueEl = document.createElement('span');
            valueEl.className = 'tip__value';
            valueEl.style.display = 'inline-flex';
            valueEl.style.alignItems = 'center';
            valueEl.style.gap = '0.45rem';
            valueEl.appendChild(document.createTextNode(value));

            row.appendChild(keyEl);
            row.appendChild(valueEl);
            return row;
        }

        function buildAction(action, iconId, label, pressed) {
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn btn--sm';
            button.dataset.action = action;
            if (action !== 'delete') {
                button.setAttribute('aria-pressed', String(pressed));
            }
            button.appendChild(makeIcon(iconId));
            button.appendChild(document.createTextNode(label));
            return button;
        }

        function formatDate(timestamp) {
            try {
                return new Intl.DateTimeFormat('cs-CZ', {
                    day: 'numeric',
                    month: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }).format(new Date(timestamp));
            } catch (e) {
                return new Date(timestamp).toLocaleString();
            }
        }

        /* ---- Akce nad tipy (delegace událostí) ---- */
        tipList.addEventListener('click', function (event) {
            var button = event.target.closest('[data-action]');
            if (!button) return;

            var item = button.closest('.tip');
            if (!item) return;

            var id = item.dataset.id;
            var tips = loadTips();
            var index = tips.findIndex(function (tip) { return tip.id === id; });
            if (index === -1) return;

            var action = button.dataset.action;

            if (action === 'delete') {
                tips.splice(index, 1);
                saveTips(tips);
                render();
                toast('Tip smazán.', '#i-trash');
                return;
            }

            // Opětovné klepnutí na už zvolený stav vyhodnocení zruší
            var wanted = action === 'correct';
            tips[index].result = tips[index].result === wanted ? null : wanted;
            saveTips(tips);
            render();
        });

        /* ---- Smazání všech tipů (dvoukrokové potvrzení) ---- */
        var clearArmed = false;
        var clearTimer = null;

        function resetClearAll() {
            clearArmed = false;
            window.clearTimeout(clearTimer);
            if (clearAllText) clearAllText.textContent = 'Smazat vše';
            clearAll.setAttribute('aria-pressed', 'false');
        }

        clearAll.addEventListener('click', function () {
            if (!clearArmed) {
                clearArmed = true;
                clearAllText.textContent = 'Opravdu smazat?';
                clearAll.setAttribute('aria-pressed', 'true');
                clearTimer = window.setTimeout(resetClearAll, 4000);
                return;
            }

            saveTips([]);
            render();
            toast('Všechny tipy byly smazány.', '#i-trash');
        });

        /* ---- Statistika ---- */
        function updateStats(tips) {
            var correct = tips.filter(function (tip) { return tip.result === true; }).length;
            var wrong = tips.filter(function (tip) { return tip.result === false; }).length;
            var judged = correct + wrong;
            var accuracy = judged > 0 ? Math.round((correct / judged) * 100) : 0;

            el('correctCount').textContent = String(correct);
            el('wrongCount').textContent = String(wrong);
            el('streakCount').textContent = String(longestStreak(tips));

            var value = el('accuracyValue');
            var fill = el('accuracyFill');
            var bar = el('accuracyBar');

            value.textContent = judged > 0 ? accuracy + ' %' : '—';
            fill.style.width = accuracy + '%';
            bar.setAttribute('aria-valuenow', String(accuracy));
            bar.setAttribute('aria-valuetext', judged > 0
                ? accuracy + ' % z ' + judged + ' vyhodnocených tipů'
                : 'Zatím žádný vyhodnocený tip');

            var total = Math.max(matches.length, tips.length);
            el('judgedValue').textContent = judged + ' / ' + total;
            el('judgedFill').style.width = total > 0 ? (judged / total) * 100 + '%' : '0%';
        }

        /* Nejdelší nepřerušená série správných tipů v pořadí zadání. */
        function longestStreak(tips) {
            var best = 0;
            var current = 0;

            tips.forEach(function (tip) {
                if (tip.result === true) {
                    current++;
                    if (current > best) best = current;
                } else if (tip.result === false) {
                    current = 0;
                }
            });

            return best;
        }

        /* ---- Sdílecí karta ---- */
        var shareLocked = el('shareLocked');
        var sharePanel = el('sharePanel');
        var shareLockedText = el('shareLockedText');
        var shareCanvas = el('shareCanvas');

        function updateShare(tips) {
            var ready = matches.length > 0
                && matches.every(function (match) {
                    var tip = findTip(tips, match);
                    return tip && tip.result !== null;
                });

            shareLocked.hidden = ready;
            sharePanel.hidden = !ready;

            if (!ready) {
                var tipped = matches.filter(function (match) {
                    return Boolean(findTip(tips, match));
                }).length;
                var judged = matches.filter(function (match) {
                    var tip = findTip(tips, match);
                    return tip && tip.result !== null;
                }).length;

                if (matches.length > 0) {
                    shareLockedText.textContent =
                        'Tipnuto ' + tipped + ' z ' + matches.length + ' zápasů, vyhodnoceno ' +
                        judged + '. Až budou všechny tipy vyhodnocené, vygeneruju obrázek ' +
                        'na Instagram a Facebook.';
                }
                return;
            }

            var ordered = matches.map(function (match) { return findTip(tips, match); });
            drawShareCard(shareCanvas, ordered);
        }

        el('downloadShare').addEventListener('click', function () {
            shareCanvas.toBlob(function (blob) {
                if (!blob) {
                    toast('Obrázek se nepodařilo vytvořit.', '#i-x');
                    return;
                }
                var url = URL.createObjectURL(blob);
                var link = document.createElement('a');
                link.href = url;
                link.download = 'moje-mma-tipy.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                toast('Obrázek stažen.', '#i-download');
            }, 'image/png');
        });

        /* Nativní sdílení zobrazíme jen tam, kde ho prohlížeč umí pro soubory */
        var shareNative = el('shareNative');
        if (navigator.canShare && navigator.share) {
            shareNative.hidden = false;
            shareNative.addEventListener('click', function () {
                shareCanvas.toBlob(function (blob) {
                    if (!blob) return;
                    var file = new File([blob], 'moje-mma-tipy.png', { type: 'image/png' });
                    if (!navigator.canShare({ files: [file] })) {
                        toast('Sdílení souborů tenhle prohlížeč neumí.', '#i-x');
                        return;
                    }
                    navigator.share({
                        files: [file],
                        title: 'Moje MMA tipy'
                    }).catch(function () { /* uživatel sdílení zrušil */ });
                }, 'image/png');
            });
        }

        /* ---- Start ---- */
        renderSelectedPanel();
        renderWinnerChoices(null);
        render();
    }

    /* =========================================================
       Vykreslení sdílecí karty (1080 × 1350 px)
       Karta je vždy světlá — na Instagramu i Facebooku vypadá
       konzistentně bez ohledu na režim aplikace.
       ========================================================= */
    var CARD = {
        w: 1080,
        h: 1350,
        ink: '#000000',
        paper: '#ffffff',
        muted: '#6b6b6b',
        hairline: '#dcdcdc',
        red: '#c42b1c',
        blue: '#1350b0',
        green: '#12723c'
    };

    var FONT = '"Segoe UI", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif';

    function font(weight, size) {
        return weight + ' ' + size + 'px ' + FONT;
    }

    function roundRect(ctx, x, y, w, h, r) {
        var radius = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x, y, w, h, radius);
        } else {
            ctx.moveTo(x + radius, y);
            ctx.arcTo(x + w, y, x + w, y + h, radius);
            ctx.arcTo(x + w, y + h, x, y + h, radius);
            ctx.arcTo(x, y + h, x, y, radius);
            ctx.arcTo(x, y, x + w, y, radius);
            ctx.closePath();
        }
    }

    /* Neobrutalistický tvar: výplň, ostrý offsetový stín, silný rámeček. */
    function panel(ctx, x, y, w, h, r, fill, shadow) {
        if (shadow) {
            ctx.fillStyle = CARD.ink;
            roundRect(ctx, x + shadow, y + shadow, w, h, r);
            ctx.fill();
        }
        ctx.fillStyle = fill;
        roundRect(ctx, x, y, w, h, r);
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = CARD.ink;
        ctx.stroke();
    }

    function fitText(ctx, text, maxWidth) {
        if (ctx.measureText(text).width <= maxWidth) return text;

        var trimmed = text;
        while (trimmed.length > 1 && ctx.measureText(trimmed + '…').width > maxWidth) {
            trimmed = trimmed.slice(0, -1);
        }
        return trimmed + '…';
    }

    function dotGrid(ctx) {
        ctx.fillStyle = CARD.hairline;
        for (var y = 20; y < CARD.h; y += 26) {
            for (var x = 20; x < CARD.w; x += 26) {
                ctx.beginPath();
                ctx.arc(x, y, 1.6, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function today() {
        try {
            return new Intl.DateTimeFormat('cs-CZ', {
                day: 'numeric', month: 'long', year: 'numeric'
            }).format(new Date());
        } catch (e) {
            return new Date().toLocaleDateString();
        }
    }

    function drawShareCard(canvas, tips) {
        var ctx = canvas.getContext('2d');
        var correct = tips.filter(function (tip) { return tip.result === true; }).length;
        var wrong = tips.length - correct;
        var accuracy = tips.length > 0 ? Math.round((correct / tips.length) * 100) : 0;

        ctx.clearRect(0, 0, CARD.w, CARD.h);
        ctx.fillStyle = CARD.paper;
        ctx.fillRect(0, 0, CARD.w, CARD.h);
        dotGrid(ctx);

        /* ---- Hlavička ---- */
        panel(ctx, 60, 60, 960, 200, 64, CARD.ink, 10);

        ctx.fillStyle = CARD.paper;
        ctx.textBaseline = 'alphabetic';
        ctx.font = font(900, 84);
        ctx.fillText('MOJE TIPY', 110, 165);

        ctx.font = font(700, 26);
        ctx.globalAlpha = 0.75;
        ctx.fillText('MMA TIPOVÁNÍ · ' + today().toUpperCase(), 112, 212);
        ctx.globalAlpha = 1;

        /* ---- Tři statistiky ---- */
        var statY = 300;
        var statW = 300;
        var statH = 150;

        drawStat(ctx, 60, statY, statW, statH, CARD.green, CARD.paper, 'SPRÁVNĚ', String(correct));
        drawStat(ctx, 390, statY, statW, statH, CARD.red, CARD.paper, 'ŠPATNĚ', String(wrong));
        drawStat(ctx, 720, statY, statW, statH, CARD.paper, CARD.ink, 'ÚSPĚŠNOST', accuracy + ' %');

        /* ---- Seznam tipů ---- */
        var listTop = 500;
        var listBottom = 1250;
        var available = listBottom - listTop;
        var gap = 8;
        var rowH = Math.min(76, (available + gap) / tips.length - gap);
        var nameSize = Math.max(20, Math.min(30, rowH * 0.42));

        tips.forEach(function (tip, index) {
            drawTipRow(ctx, tip, 60, listTop + index * (rowH + gap), 960, rowH, nameSize);
        });

        /* ---- Patička ---- */
        ctx.fillStyle = CARD.muted;
        ctx.font = font(800, 24);
        ctx.textAlign = 'center';
        ctx.fillText('dohnos.github.io/MMAcko', CARD.w / 2, 1305);
        ctx.textAlign = 'left';
    }

    function drawStat(ctx, x, y, w, h, fill, ink, label, value) {
        panel(ctx, x, y, w, h, 40, fill, 8);

        ctx.fillStyle = ink;
        ctx.font = font(800, 20);
        ctx.globalAlpha = fill === CARD.paper ? 0.6 : 0.85;
        ctx.fillText(label, x + 30, y + 50);
        ctx.globalAlpha = 1;

        ctx.font = font(900, 62);
        ctx.fillText(value, x + 28, y + 118);
    }

    function drawTipRow(ctx, tip, x, y, w, h, nameSize) {
        var isCorrect = tip.result === true;
        var fill = isCorrect ? CARD.green : CARD.red;

        panel(ctx, x, y, w, h, h / 2, fill, 0);

        var centerY = y + h / 2;

        /* Kolečko rohu, ze kterého byl vítěz tipnutý.
           Bílý podklad drží červený roh viditelný i na červené kartě. */
        var corner = tip.match.replace(/\s*\([^)]+\)\s*$/, '').trim().split(' vs ')[0].trim() === tip.winner
            ? CARD.red : CARD.blue;
        ctx.beginPath();
        ctx.arc(x + 42, centerY, 15, 0, Math.PI * 2);
        ctx.fillStyle = CARD.paper;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x + 42, centerY, 10, 0, Math.PI * 2);
        ctx.fillStyle = corner;
        ctx.fill();

        /* Ikona výsledku vpravo */
        var iconX = x + w - 48;
        ctx.beginPath();
        ctx.arc(iconX, centerY, 18, 0, Math.PI * 2);
        ctx.fillStyle = CARD.paper;
        ctx.fill();

        ctx.strokeStyle = fill;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        if (isCorrect) {
            ctx.moveTo(iconX - 8, centerY);
            ctx.lineTo(iconX - 2, centerY + 6);
            ctx.lineTo(iconX + 8, centerY - 6);
        } else {
            ctx.moveTo(iconX - 6, centerY - 6);
            ctx.lineTo(iconX + 6, centerY + 6);
            ctx.moveTo(iconX + 6, centerY - 6);
            ctx.lineTo(iconX - 6, centerY + 6);
        }
        ctx.stroke();

        /* Způsob ukončení jako štítek */
        var method = (METHOD_LABELS[tip.method] || tip.method).toUpperCase();
        ctx.font = font(900, Math.max(15, nameSize * 0.55));
        var methodW = ctx.measureText(method).width + 32;
        var methodX = iconX - 30 - methodW;

        ctx.fillStyle = CARD.paper;
        roundRect(ctx, methodX, centerY - 17, methodW, 34, 17);
        ctx.fill();

        ctx.fillStyle = fill;
        ctx.textBaseline = 'middle';
        ctx.fillText(method, methodX + 16, centerY + 1);

        /* Jméno tipnutého vítěze */
        ctx.fillStyle = CARD.paper;
        ctx.font = font(900, nameSize);
        var nameX = x + 70;
        ctx.fillText(fitText(ctx, tip.winner, methodX - nameX - 20), nameX, centerY + 1);
        ctx.textBaseline = 'alphabetic';
    }

    /* ---------------------------------------------------------
       Start
       --------------------------------------------------------- */
    document.addEventListener('DOMContentLoaded', function () {
        initTheme();
        initTipovani();
    });
})();
