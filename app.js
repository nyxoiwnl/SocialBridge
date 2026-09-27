let currentStep = 1;
let transferData = {
    source: null,
    destination: null,
    selectedPlaylists: []
};
let authToken = null;
let currentPlatform = null;

// Revisar si venimos de un login exitoso
window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const platform = urlParams.get('platform');

    if (token && platform) {
        authToken = token;
        currentPlatform = platform;
        // Limpiar URL
        window.history.replaceState({}, document.title, "/");
        // Saltar directo al paso de seleccionar origen
        
        if (platform === 'youtube') {
            selectSource('YouTube');
        }
    }
};

function showStep(stepNumber) {
    document.querySelectorAll('.wizard-step').forEach(step => {
        step.classList.remove('active');
    });
    document.getElementById(`step-${stepNumber}`).classList.add('active');

    for(let i = 1; i <= 4; i++) {
        const nav = document.getElementById(`step-nav-${i}`);
        if(i < stepNumber) {
            nav.classList.add('completed');
            nav.classList.remove('active');
        } else if (i === stepNumber) {
            nav.classList.add('active');
            nav.classList.remove('completed');
        } else {
            nav.classList.remove('active');
            nav.classList.remove('completed');
        }
    }
}

function nextStep() {
    if (currentStep === 2) {
        const checkboxes = document.querySelectorAll('.playlist-item input:checked');
        if (checkboxes.length === 0) {
            alert('Por favor, selecciona al menos una playlist.');
            return;
        }
        transferData.selectedPlaylists = Array.from(checkboxes).map(cb => cb.value);
        prepareDestinationStep();
    }
    
    if (currentStep === 3) {
        prepareSummaryStep();
    }

    currentStep++;
    showStep(currentStep);
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
    }
}

// --- Paso 1: Origen ---
function selectSource(platform) {
    if (platform === 'YouTube' && !authToken) {
        // Redirigir a nuestro backend para iniciar sesión REAL en YouTube
        window.location.href = '/auth/youtube';
        return;
    }

    if (platform === 'Spotify' && !authToken) {
        window.location.href = '/auth/spotify';
        return;
    }

    transferData.source = platform;
    document.getElementById('source-name').textContent = platform + " (Real)";
    
    if (platform === 'YouTube') {
        loadRealYouTubePlaylists();
    } else if (platform === 'Spotify') {
        loadRealSpotifyPlaylists();
    }
    
    currentStep = 2;
    showStep(currentStep);
}

// --- Paso 2: Playlists ---

async function loadRealSpotifyPlaylists() {
    const container = document.getElementById('playlist-container');
    container.innerHTML = '<p style="text-align:center; padding: 2rem;">Buscando tus playlists de Spotify...</p>';
    
    try {
        const response = await fetch('/api/spotify/playlists', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) throw new Error('Error al obtener playlists de Spotify');
        
        const playlists = await response.json();
        
        container.innerHTML = '';
        if(!playlists || playlists.length === 0) {
            container.innerHTML = '<p style="text-align:center;">No se encontraron playlists.</p>';
            return;
        }

        playlists.forEach((pl, index) => {
            const div = document.createElement('div');
            div.className = 'playlist-item';
            div.innerHTML = `
                <input type="checkbox" id="pl-${index}" value="${pl.name}">
                <label for="pl-${index}" style="width: 100%; cursor: pointer;">
                    <strong>${pl.name}</strong> (${pl.tracks.total} canciones)
                </label>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p style="text-align:center; color: red;">Error al cargar playlists de Spotify.</p>';
    }
}
async function loadRealYouTubePlaylists() {
    const container = document.getElementById('playlist-container');
    container.innerHTML = '<p style="text-align:center; padding: 2rem;">Buscando tus playlists reales de YouTube...</p>';
    
    try {
        const response = await fetch('/api/youtube/playlists', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) throw new Error('Error al obtener playlists');
        
        const playlists = await response.json();
        
        container.innerHTML = '';
        if(playlists.length === 0) {
            container.innerHTML = '<p style="text-align:center;">No se encontraron playlists en tu canal de YouTube.</p>';
            return;
        }

        playlists.forEach((pl, index) => {
            // YouTube devuelve el titulo en snippet.title
            const title = pl.snippet.title;
            const itemCount = pl.contentDetails.itemCount;
            const thumbnail = pl.snippet.thumbnails?.default?.url || '';

            const div = document.createElement('div');
            div.className = 'playlist-item';
            div.innerHTML = `
                <input type="checkbox" id="pl-${index}" value="${title}">
                <label for="pl-${index}" style="width: 100%; cursor: pointer; display: flex; align-items: center; gap: 10px;">
                    ${thumbnail ? `<img src="${thumbnail}" width="40" style="border-radius:4px;">` : ''}
                    <div>
                        <strong>${title}</strong> 
                        <span style="font-size:0.8rem; color:#aaa; display:block;">${itemCount} videos/canciones</span>
                    </div>
                </label>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p style="text-align:center; color: red;">Error al cargar playlists. ¿Pegaste bien las claves en el archivo .env?</p>';
    }
}

// --- Paso 3 y 4 (Simulados hacia Spotify) ---
function prepareDestinationStep() {
    const grid = document.getElementById('destination-grid');
    grid.innerHTML = '';
    
    grid.innerHTML += `
        <button class="platform-btn spotify" onclick="selectDestination('Spotify')">
            <img src="https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg" alt="Spotify" width="50">
            <span>Spotify (Destino Simulado)</span>
        </button>
    `;
}

function selectDestination(platform) {
    transferData.destination = platform;
    nextStep(); 
}

function prepareSummaryStep() {
    document.getElementById('summary-source').textContent = transferData.source;
    document.getElementById('summary-dest').textContent = transferData.destination;
    
    const list = document.getElementById('summary-playlists');
    list.innerHTML = '';
    transferData.selectedPlaylists.forEach(pl => {
        const li = document.createElement('li');
        li.textContent = pl;
        list.appendChild(li);
    });
}

function startTransfer() {
    document.querySelector('.stepper').style.display = 'none';
    document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
    document.getElementById('step-success').classList.add('active');

    let progress = 0;
    const bar = document.getElementById('progress-bar');
    const text = document.getElementById('progress-text');
    
    const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 10) + 5;
        if (progress > 100) progress = 100;
        
        bar.style.width = progress + '%';
        text.textContent = progress + '% transferido...';

        if (progress === 100) {
            clearInterval(interval);
            text.textContent = '¡Completado con éxito! 🎉 (Hacia Spotify es simulación por ahora)';
            document.getElementById('btn-restart').style.display = 'inline-block';
        }
    }, 500);
}
