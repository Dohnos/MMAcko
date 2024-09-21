// Načtení zápasů z matches.txt a naplnění selectu
document.addEventListener('DOMContentLoaded', () => {
    const matchSelect = document.getElementById('match');
    
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
                method: method
            };
            saveTipToLocalStorage(tip);
            alert('✅ Tip byl úspěšně uložen!');
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

    // Načte tipy z LocalStorage při znovu načtení stránky
    function loadTipsFromLocalStorage() {
        let tips = JSON.parse(localStorage.getItem('mmaTips')) || [];
        console.log("Uložené tipy:", tips); // Můžeš je dále zpracovat, např. zobrazit je na stránce
    }

    loadTipsFromLocalStorage();
});
