// =============================================================
// CONFIGURATION & SÉCURITÉ
// Empreinte SHA-256 du mot de passe "0211@"
// =============================================================
const PASSWORD_HASH = "e8cf1689ea523588fa8e202570077ca827f8d689b25547071db136894c7b802e";
const AUTH_KEY = "auth_revendeurs_token";

let allRevendeurs = [];

// Fonction de hachage SHA-256
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// =============================================================
// GESTION DE LA CONNEXION PERSISTANTE (localStorage)
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('passwordInput');
    const loginError = document.getElementById('loginError');

    // Vérifie si la session est déjà enregistrée sur l'ordinateur
    const savedToken = localStorage.getItem(AUTH_KEY);
    if (savedToken === PASSWORD_HASH) {
        if (loginOverlay) loginOverlay.style.display = 'none';
        initApp();
    } else {
        if (loginOverlay) loginOverlay.style.display = 'flex';
        if (passwordInput) passwordInput.focus();
    }

    // Validation du formulaire de mot de passe
    if (loginForm) {
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
    }
});

// =============================================================
// CHARGEMENT ET TRAITEMENT DU FICHIER CSV
// =============================================================
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
                .map(row => row.trim())
                .filter(row => row !== "" && !row.toUpperCase().startsWith("CODE;"))
                .map(row => {
                    const cols = row.split(separator);
                    return {
                        code: cols[0]?.trim() || "",
                        nom: cols[1]?.trim() || "Inconnu",
                        cp: cols[2]?.trim() || "",
                        ville: cols[3]?.trim() || "",
                        zone: cols[4]?.trim() || "NC",
                        produits: cols[5]?.trim() || "Thé",
                        statut: cols[6]?.trim() || "",
                        type: cols[7]?.trim() || "",
                        note: cols[8]?.trim() || ""
                    };
                })
                .sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));

            setupCityFilter();
            setupEvents();
            updateDisplay();
        })
        .catch(err => {
            console.error(err);
            const grid = document.getElementById('grid-revendeurs');
            if (grid) {
                grid.innerHTML = `
                    <p class="no-result">Erreur lors de la lecture des données. Vérifiez la présence du fichier revendeurs.csv.</p>
                `;
            }
        });
}

// =============================================================
// FILTRES ET ÉVÉNEMENTS
// =============================================================
function setupEvents() {
    ['searchInput', 'zoneFilter', 'cityFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateDisplay);
            el.addEventListener('change', updateDisplay);
        }
    });
}

function setupCityFilter() {
    const citySelect = document.getElementById('cityFilter');
    if (!citySelect) return;

    citySelect.innerHTML = '<option value="toutes">Toutes les villes</option>';

    // Extraction des communes uniques et tri alphabétique
    const uniqueCities = [...new Set(allRevendeurs.map(r => r.ville).filter(v => v.length > 0))]
        .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

    uniqueCities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
    });
}

function updateDisplay() {
    const search = document.getElementById('searchInput')?.value.toLowerCase().trim() || "";
    const zone = document.getElementById('zoneFilter')?.value || "tous";
    const city = document.getElementById('cityFilter')?.value || "toutes";

    const filtered = allRevendeurs.filter(r => {
        const matchesSearch = r.nom.toLowerCase().includes(search) || 
                              r.produits.toLowerCase().includes(search) ||
                              r.ville.toLowerCase().includes(search) ||
                              r.type.toLowerCase().includes(search) ||
                              r.code.toLowerCase().includes(search);

        const matchesZone = (zone === "tous") || (r.zone === zone);
        const matchesCity = (city === "toutes") || (r.ville === city);

        return matchesSearch && matchesZone && matchesCity;
    });

    render(filtered);
}

// =============================================================
// RENDU VISUEL DES CARTES
// =============================================================
function render(list) {
    const grid = document.getElementById('grid-revendeurs');
    if (!grid) return;

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
                ${r.type ? `<p><i class="fa-solid fa-shop"></i> ${r.type}</p>` : ''}
                <div class="card-footer">
                    <strong>Produits :</strong> ${r.produits}
                    ${r.statut ? `<br><small style="color: #666;">Statut : ${r.statut}</small>` : ''}
                </div>
            </div>
        </article>
    `).join('');
}
