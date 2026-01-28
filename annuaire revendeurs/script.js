const motDePasse = "0211@"; // Votre mot de passe
const acces = prompt("Veuillez entrer le mot de passe pour accéder à l'annuaire :");

if (acces !== motDePasse) {
    alert("Accès refusé");
    document.body.innerHTML = "<h1>Accès non autorisé</h1>";
} else {
    // Ici, le reste de votre code existant pour charger le CSV...
}
let allRevendeurs = [];

document.addEventListener('DOMContentLoaded', () => {
    fetch('revendeurs.csv')
        .then(response => response.text())
        .then(data => {
            const rows = data.split('\n');
            const separator = rows[0].includes(';') ? ';' : ',';

            allRevendeurs = rows
                .filter(row => row.trim() !== "" && !row.includes("LISTE") && !row.includes("NOM"))
                .map(row => {
                    const cols = row.split(separator);
                    return {
                        nom: cols[1]?.trim() || "Inconnu",
                        cp: cols[3]?.trim() || "",
                        ville: cols[4]?.trim() || "",
                        zone: cols[5]?.trim() || "NC",
                        produits: cols[6]?.trim() || "Gamme Labyrinthe"
                    };
                })
                .sort((a, b) => a.nom.localeCompare(b.nom)); // Tri A-Z par défaut
            
            setupCityFilter();
            updateDisplay();
        });

    ['searchInput', 'zoneFilter', 'cityFilter'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateDisplay);
    });
});

// Crée dynamiquement la liste des villes à partir du CSV
function setupCityFilter() {
    const citySelect = document.getElementById('cityFilter');
    // On récupère les villes uniques et on les trie
    const uniqueCities = [...new Set(allRevendeurs.map(r => r.ville))].sort();
    
    uniqueCities.forEach(city => {
        if(city) {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            citySelect.appendChild(option);
        }
    });
}

function updateDisplay() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const zone = document.getElementById('zoneFilter').value;
    const city = document.getElementById('cityFilter').value;

    let filtered = allRevendeurs.filter(r => {
        const matchesSearch = r.nom.toLowerCase().includes(search);
        const matchesZone = zone === "tous" || r.zone === zone;
        const matchesCity = city === "toutes" || r.ville === city;
        
        return matchesSearch && matchesZone && matchesCity;
    });

    render(filtered);
}

function render(list) {
    const grid = document.getElementById('grid-revendeurs');
    if (list.length === 0) {
        grid.innerHTML = `<p class="no-result">Aucun revendeur ne correspond à ces critères.</p>`;
        return;
    }
    grid.innerHTML = list.map(r => `
        <article class="card">
            <div class="card-header">
                <span class="card-tag">${r.zone}</span>
                <h3>${r.nom}</h3>
            </div>
            <div class="card-body">
                <p><i class="fa-solid fa-location-dot"></i> ${r.cp} ${r.ville}</p>
                <div class="card-footer">
                    <strong>Produits :</strong> ${r.produits}
                </div>
            </div>
        </article>
    `).join('');
}