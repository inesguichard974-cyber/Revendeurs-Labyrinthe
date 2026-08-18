// Empreinte SHA-256 sécurisée du mot de passe "0211@"
const PASSWORD_HASH = "e8cf1689ea523588fa8e202570077ca827f8d689b25547071db136894c7b802e";
const AUTH_KEY = "auth_revendeurs_token";

let allRevendeurs = [];

// Fonction utilitaire pour hasher le mot de passe saisi
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// -------------------------------------------------------------
// GESTION DE L'AUTHENTIFICATION & DU STOCKAGE LOCAL
// -------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('passwordInput');
    const loginError = document.getElementById('loginError');

    // Vérifier si l'utilisateur est déjà connecté sur cet appareil
    const savedToken = localStorage.getItem(AUTH_KEY);
    if (savedToken === PASSWORD_HASH) {
        loginOverlay.style.display = 'none';
        initApp();
    } else {
        loginOverlay.style.display = 'flex';
        passwordInput.focus();
    }

    // Gestion de la soumission du mot de passe
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inputHash = await sha256(passwordInput.value);

        if (inputHash === PASSWORD_HASH) {
            localStorage.setItem(AUTH_KEY, inputHash);
            loginOverlay.style.display = 'none';
            loginError.style.display = 'none';
            initApp();
        } else {
            loginError.style.display = 'block';
            passwordInput.value = '';
            passwordInput.focus();
        }
    });
});

// -------------------------------------------------------------
// CHARGEMENT DES DONNÉES & LOGIQUE MÉTIER
// -------------------------------------------------------------

function initApp() {
    fetch('revendeurs.csv')
        .then(response => {
            if (!response.ok) {
                throw new Error("Impossible de charger le fichier revendeurs.csv");
            }
            return response.text();
        })
        .then(data => {
            const rows = data.split('\n');
            const separator = rows[0].includes(';') ? ';' : ',';

            allRevendeurs = rows
                .filter(row => row.trim() !== "" && !row.toUpperCase().includes("LISTE") && !row.toUpperCase().includes("NOM"))
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
                .sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));

            setupCityFilter();
            setupEvents();
            updateDisplay();
        })
        .catch(err => {
            console.error(err);
            document.getElementById('grid-revendeurs').innerHTML = `
                <p class="no-result">Erreur lors du chargement des données. Vérifiez l'accès au fichier CSV.</p>
            `;
        });
}

function setupEvents() {
    ['searchInput', 'zoneFilter', 'cityFilter'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updateDisplay);
            element.addEventListener('change', updateDisplay);
        }
    });
}

// Remplissage dynamique du menu des villes
function setupCityFilter() {
    const citySelect = document.getElementById('cityFilter');
    citySelect.innerHTML = '<option value="toutes">Toutes les villes</option>';

    const uniqueCities = [...new Set(allRevendeurs.map(r => r.ville).filter(v => v.trim() !== ""))].sort((a, b) => a.localeCompare(b, 'fr'));

    uniqueCities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
    });
}

// Filtrage et recherche
function updateDisplay() {
    const search = document.getElementById('searchInput').value.toLowerCase().trim();
    const zone = document.getElementById('zoneFilter').value;
    const city = document.getElementById('cityFilter').value;

    const filtered = allRevendeurs.filter(r => {
        const matchesSearch = r.nom.toLowerCase().includes(search) || 
                              r.produits.toLowerCase().includes(search) ||
                              r.ville.toLowerCase().includes(search);
        const matchesZone = zone === "tous" || r.zone === zone;
        const matchesCity = city === "toutes" || r.ville === city;

        return matchesSearch && matchesZone && matchesCity;
    });

    render(filtered);
}

// Rendu visuel des cartes
function render(list) {
    const grid = document.getElementById('grid-revendeurs');
    
    if (list.length === 0) {
        grid.innerHTML = `<p class="no-result">Aucun revendeur ne correspond à vos critères de recherche.</p>`;
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
