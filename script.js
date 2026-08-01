/* =============================================================
   MMA TIPOVÁNÍ — aplikační logika
   Sdíleno oběma stránkami; každý blok se aktivuje jen tam,
   kde k němu existují odpovídající prvky.
   ============================================================= */
(function () {
    'use strict';

    var STORAGE_TIPS = 'mmaTips';
    var STORAGE_THEME = 'mmaTheme';

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

    /* ---------------------------------------------------------
       Přepínač světlého/tmavého režimu
       --------------------------------------------------------- */
    function initTheme() {
        var toggle = document.getElementById('themeToggle');
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
        var el = document.getElementById('toast');
        var text = document.getElementById('toastText');
        var use = document.querySelector('#toastIcon use');
        if (!el || !text) return;

        text.textContent = message;
        if (use) use.setAttribute('href', icon || '#i-check');
        el.dataset.open = 'true';

        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(function () {
            el.dataset.open = 'false';
        }, 3200);
    }

    /* ---------------------------------------------------------
       Stránka tipování
       --------------------------------------------------------- */
    function initTipovani() {
        var form = document.getElementById('tipForm');
        if (!form) return;

        var matchSelect = document.getElementById('match');
        var matchHint = document.getElementById('matchHint');
        var winnerChoices = document.getElementById('winnerChoices');
        var tipList = document.getElementById('tipList');
        var tipsEmpty = document.getElementById('tipsEmpty');
        var tipsCount = document.getElementById('tipsCount');
        var clearAll = document.getElementById('clearAll');
        var clearAllText = document.getElementById('clearAllText');

        var METHOD_LABELS = {
            KO: 'KO',
            TKO: 'TKO',
            SUBMISE: 'Submise',
            BODY: 'Body'
        };

        /* ---- Načtení zápasů ---- */
        fetch('matches.txt')
            .then(function (response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.text();
            })
            .then(function (data) {
                var matches = data.split('\n')
                    .map(function (line) { return line.trim(); })
                    .filter(function (line) { return line.length > 0; });

                matchSelect.innerHTML = '';
                var placeholder = new Option('Vyber zápas…', '');
                placeholder.disabled = true;
                placeholder.selected = true;
                matchSelect.appendChild(placeholder);

                matches.forEach(function (match, index) {
                    matchSelect.appendChild(new Option((index + 1) + '. ' + match, match));
                });

                if (matchHint) {
                    matchHint.textContent = matches.length === 1
                        ? 'K dispozici je 1 zápas.'
                        : 'K dispozici je ' + matches.length + ' zápasů.';
                }
            })
            .catch(function () {
                matchSelect.innerHTML = '';
                matchSelect.appendChild(new Option('Zápasy se nepodařilo načíst', ''));
                matchSelect.disabled = true;
                if (matchHint) {
                    matchHint.textContent =
                        'Soubor matches.txt se nepodařilo načíst. Otevři stránku přes webový server, ne přímo ze souboru.';
                }
            });

        /* ---- Volba vítěze podle vybraného zápasu ---- */
        matchSelect.addEventListener('change', renderWinnerChoices);

        function renderWinnerChoices() {
            winnerChoices.textContent = '';
            var selected = matchSelect.value;

            if (!selected) {
                var hint = document.createElement('p');
                hint.className = 'field__hint';
                hint.textContent = 'Nejdřív vyber zápas.';
                winnerChoices.appendChild(hint);
                return;
            }

            selected.split(' vs ').forEach(function (fighter, index) {
                var name = fighter.trim();
                var id = 'winner-' + index;

                var wrapper = document.createElement('div');
                wrapper.className = 'choice';

                var input = document.createElement('input');
                input.type = 'radio';
                input.name = 'winner';
                input.id = id;
                input.value = name;
                if (index === 0) input.checked = true;

                var label = document.createElement('label');
                label.className = 'choice__label';
                label.setAttribute('for', id);
                label.textContent = name;

                wrapper.appendChild(input);
                wrapper.appendChild(label);
                winnerChoices.appendChild(wrapper);
            });
        }

        /* ---- Uložení tipu ---- */
        form.addEventListener('submit', function (event) {
            event.preventDefault();

            var match = matchSelect.value;
            var winnerInput = form.querySelector('input[name="winner"]:checked');
            var methodInput = form.querySelector('input[name="method"]:checked');

            if (!match) {
                toast('Vyber zápas.', '#i-x');
                matchSelect.focus();
                return;
            }
            if (!winnerInput) {
                toast('Vyber vítěze.', '#i-x');
                return;
            }

            var tips = loadTips();
            var existing = tips.filter(function (tip) { return tip.match === match; })[0];

            if (existing) {
                existing.winner = winnerInput.value;
                existing.method = methodInput.value;
                existing.result = null;
                existing.createdAt = Date.now();
                saveTips(tips);
                render();
                toast('Tip pro tento zápas byl aktualizován.', '#i-save');
                return;
            }

            tips.push({
                id: 't' + Date.now() + Math.random().toString(36).slice(2, 7),
                match: match,
                winner: winnerInput.value,
                method: methodInput.value,
                result: null,
                createdAt: Date.now()
            });

            if (!saveTips(tips)) {
                toast('Tip se nepodařilo uložit.', '#i-x');
                return;
            }

            render();
            toast('Tip uložen.', '#i-check');
        });

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

            updateStats(tips);
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
            matchName.textContent = tip.match;
            head.appendChild(matchName);

            var badge = document.createElement('span');
            badge.className = 'badge';
            if (tip.result === true) {
                badge.classList.add('badge--solid');
                badge.textContent = 'Správně';
            } else if (tip.result === false) {
                badge.textContent = 'Špatně';
            } else {
                badge.textContent = 'Čeká';
            }
            head.appendChild(badge);
            item.appendChild(head);

            /* Detaily tipu */
            var rows = document.createElement('div');
            rows.className = 'tip__rows';
            rows.appendChild(buildRow('#i-crown', 'Vítěz', tip.winner));
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
            valueEl.textContent = value;

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

        function makeIcon(iconId) {
            var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'icon');
            svg.setAttribute('aria-hidden', 'true');
            var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
            use.setAttribute('href', iconId);
            svg.appendChild(use);
            return svg;
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
            var pending = tips.length - correct - wrong;
            var judged = correct + wrong;
            var accuracy = judged > 0 ? Math.round((correct / judged) * 100) : 0;

            document.getElementById('correctCount').textContent = String(correct);
            document.getElementById('wrongCount').textContent = String(wrong);
            document.getElementById('pendingCount').textContent = String(pending);

            var value = document.getElementById('accuracyValue');
            var fill = document.getElementById('accuracyFill');
            var bar = document.getElementById('accuracyBar');

            value.textContent = judged > 0 ? accuracy + ' %' : '—';
            fill.style.width = accuracy + '%';
            bar.setAttribute('aria-valuenow', String(accuracy));
            bar.setAttribute('aria-valuetext', judged > 0
                ? accuracy + ' % z ' + judged + ' vyhodnocených tipů'
                : 'Zatím žádný vyhodnocený tip');
        }

        renderWinnerChoices();
        render();
    }

    /* ---------------------------------------------------------
       Start
       --------------------------------------------------------- */
    document.addEventListener('DOMContentLoaded', function () {
        initTheme();
        initTipovani();
    });
})();
