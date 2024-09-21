// Načtení zápasů z matches.txt a naplnění selectu
document.addEventListener('DOMContentLoaded', () => {
    const matchSelect = document.getElementById('match');
    const winnerSelect = document.getElementById('winner');
    const tipList = document.getElementById('tipList');
    const correctCountEl = document.getElementById('correctCount');
    const wrongCountEl = document.getElementById('wrongCount');
    let correctCount = 0;
    let wrongCount = 0;

    // Načítání zápasů ze souboru
    fetch('matches.txt')
        .then(response => response.text())
        .then(data => {
            const matches = data.split('\n');
            matches.forEach(match => {
                let option = document.createElement('option');
                option.value = match.trim();
                option.textContent = match.trim();
                matchSelect.appendChild(option);
            });
        });

    // Když uživatel vybere zápas, naplníme možnosti vítěze
    matchSelect.addEventListener('change', () => {
        const selectedMatch = matchSelect.value;
        if (selectedMatch) {
            const fighters = selectedMatch.split(' vs ');
            winnerSelect.innerHTML = '';  // Vyprázdníme select
            fighters.forEach(fighter => {
                let option = document.createElement('option');
                option.value = fighter.trim();
                option.textContent = fighter.trim();
                winnerSelect.appendChild(option);
            });
        } else {
            winnerSelect.innerHTML = '<option value="">Vyberte zápas</option>';
        }
    });

    // Zpracování a uložení tipu
    document.getElementById('tipFormDetails').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const match = document.getElementById('match').value;
        const winner = document.getElementById('winner').value;
        const method = document.getElementById('method').value;

        if (match && winner && method) {
            // Uloží tip do LocalStorage
            const tip = {
                match: match,
                winner: winner,
                method: method,
                result: null  // Výsledek bude později nastaven
            };
            saveTipToLocalStorage(tip);
            displayTips();
        } else {
            alert('⚠️ Vyplňte všechna pole!');
        }
    });

    // Uloží tip do LocalStorage
    function saveTipToLocalStorage(tip) {
        let tips = JSON.parse(localStorage.getItem('mmaTips')) || [];
        tips.push(tip);
        localStorage.setItem('mmaTips', JSON.stringify(tips));
    }

    // Načte tipy z LocalStorage a zobrazí je
    function displayTips() {
        let tips = JSON.parse(localStorage.getItem('mmaTips')) || [];
        tipList.innerHTML = '';

        tips.forEach((tip, index) => {
            const tipItem = document.createElement('li');
            tipItem.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
            tipItem.innerHTML = `
                🛡️<strong>${tip.match}</strong>👑<strong>${tip.winner}</strong>⚔️<strong>${tip.method}</strong>
                <div>
                <br>
                    <button class="btn btn-success btn-sm me-2" onclick="markTip(${index}, true)">Správně ✅</button>
                    <button class="btn btn-danger btn-sm" onclick="markTip(${index}, false)">Špatně ❌</button>
                </div>
            `;
            if (tip.result === true) {
                tipItem.classList.add('list-group-item-success');
            } else if (tip.result === false) {
                tipItem.classList.add('list-group-item-danger');
            }
            tipList.appendChild(tipItem);
        });

        // Aktualizace statistik
        updateStats(tips);
    }

    // Označení tipu jako správně nebo špatně
    window.markTip = function(index, isCorrect) {
        let tips = JSON.parse(localStorage.getItem('mmaTips')) || [];
        tips[index].result = isCorrect;
        localStorage.setItem('mmaTips', JSON.stringify(tips));
        displayTips();
    };

    // Aktualizace statistik správných a špatných tipů
    function updateStats(tips) {
        correctCount = tips.filter(tip => tip.result === true).length;
        wrongCount = tips.filter(tip => tip.result === false).length;
        correctCountEl.textContent = correctCount;
        wrongCountEl.textContent = wrongCount;
    }

    // Načteme a zobrazíme tipy při načtení stránky
    displayTips();
});
