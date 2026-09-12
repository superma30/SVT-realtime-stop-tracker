const REFRESH_INTERVAL_MS = 30000;
const BASE_URL = "https://dms.gds.com/SVT/SVT_1200_1600.aspx";

let currentStopCode = null;
let refreshTimer = null;
let startY = 0;
let isSwiping = false;

//#region Elements
const input = document.getElementById('stopCodeInput');
const searchBtn = document.getElementById('searchBtn');
const stopsGrid = document.getElementById('stopsGrid');

const noSavedText = document.getElementById('no-stops-saved');
const modal = document.getElementById('stopModal');
const modalStopTitle = document.getElementById('modalStopTitle');
const closeModalBtn = document.getElementById('closeModalBtn');
const toggleSaveModalBtn = document.getElementById('toggleSaveModalBtn');
const editNameModalBtn = document.getElementById('editNameModalBtn');
const frame = document.getElementById('aspxFrame');
const frameContainer = document.getElementById('frameContainer');
//#endregion

function getSavedStops() {
    const raw = localStorage.getItem('svt_saved_stops');
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
            return parsed.map(code => ({ code, name: "" }));
        }
        return parsed;
    } catch {
        return [];
    }
}

function saveStops(stops) {
    localStorage.setItem('svt_saved_stops', JSON.stringify(stops));
}

function renderStops() {
    const stops = getSavedStops();
    stopsGrid.innerHTML = '';

    if (stops.length == 0) {
        noSavedText.classList.remove('hidden');
    }
    else {
        noSavedText.classList.add('hidden');
        stops.forEach(item => {
            const card = document.createElement('div');
            card.className = 'stop-card';
            card.onclick = () => openStopModal(item.code);

            const cardContent = document.createElement('div');
            cardContent.className = 'card-content';

            const title = document.createElement('span');
            title.className = 'card-title';
            title.textContent = item.name.trim() ? item.name : item.code;

            const codeSubtitle = document.createElement('span');
            codeSubtitle.className = 'card-subtitle';
            codeSubtitle.textContent = item.code;

            cardContent.appendChild(title);
            cardContent.appendChild(codeSubtitle);
            card.appendChild(cardContent);
            stopsGrid.appendChild(card);
        });
    }
}

function handleSearch() {
    const code = input.value.trim().toUpperCase();
    if (!code) return;
    openStopModal(code);
    input.value = '';
    input.blur();
}

function updateModalControls() {
    const stops = getSavedStops();
    const existingIndex = stops.findIndex(item => item.code === currentStopCode);
    const isSaved = existingIndex > -1;

    if (isSaved) {
        toggleSaveModalBtn.textContent = 'Rimuovi';
        toggleSaveModalBtn.className = 'action-btn delete-btn';
        editNameModalBtn.style.display = 'inline-block';

        const displayName = stops[existingIndex].name.trim() || currentStopCode;
        modalStopTitle.textContent = displayName;
    } else {
        toggleSaveModalBtn.textContent = 'Salva';
        toggleSaveModalBtn.className = 'action-btn save-btn';
        editNameModalBtn.style.display = 'none';

        modalStopTitle.textContent = `Fermata ${currentStopCode}`;
    }
}

function toggleSaveCurrentStop() {
    if (!currentStopCode) return;

    let stops = getSavedStops();
    const index = stops.findIndex(item => item.code === currentStopCode);

    if (index > -1) {
        stops.splice(index, 1);
    } else {
        stops.push({ code: currentStopCode, name: "" });
    }

    saveStops(stops);
    renderStops();
    updateModalControls();
}

function handleEditName() {
    if (!currentStopCode) return;

    let stops = getSavedStops();
    const index = stops.findIndex(item => item.code === currentStopCode);
    if (index === -1) return;

    const currentName = stops[index].name || '';
    const newName = prompt("Nome personalizzato:", currentName);

    if (newName !== null) {
        stops[index].name = newName.trim();
        saveStops(stops);
        renderStops();
        updateModalControls();
    }
}

function fitIframeToScreen() {
    if (!frameContainer || !frame) return;
    
    // Original resolution of ASPX document
    const nativeWidth = 1222;
    const nativeHeight = 1611;
    
    const containerWidth = frameContainer.clientWidth;
    const scale = containerWidth / nativeWidth;
    
    frame.style.width = `${nativeWidth}px`;
    frame.style.height = `${nativeHeight}px`;
    frame.style.transform = `scale(${scale})`;
    frameContainer.style.height = `${nativeHeight * scale}px`;
}

function openStopModal(code) {
    currentStopCode = code;
    frame.src = `${BASE_URL}?sn=${code}&stationID=${code}`;
    
    updateModalControls();
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    setTimeout(fitIframeToScreen, 50);
    resetRefreshTimer();
}

function closeStopModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    if (refreshTimer) clearInterval(refreshTimer);
    // Awaits for the animation to end
    setTimeout(() => {
        if (modal.classList.contains('hidden')) {
            frame.src = '';
            currentStopCode = null;
        }
    }, 300);
}

function resetRefreshTimer() {
    if (refreshTimer) clearInterval(refreshTimer);
    
    refreshTimer = setInterval(() => {
        if (currentStopCode && frame && frame.src) {
            frame.src = frame.src;
        }
    }, REFRESH_INTERVAL_MS);
}

//#region Event Listeners
window.addEventListener('resize', () => {
    if (currentStopCode) fitIframeToScreen();
});

searchBtn.addEventListener('click', handleSearch);
input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

toggleSaveModalBtn.addEventListener('click', toggleSaveCurrentStop);
editNameModalBtn.addEventListener('click', handleEditName);
closeModalBtn.addEventListener('click', closeStopModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeStopModal();
});

modal.addEventListener('touchstart', (e) => {
    // Only track touch if starting outside modal-card
    if (e.target === modal) {
        startY = e.touches[0].clientY;
        isSwiping = true;
    }
}, { passive: true });

modal.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    
    const endY = e.changedTouches[0].clientY;
    const deltaY = endY - startY;

    // Trigger close if dragged by more than 30px
    if (deltaY > 30) {
        closeStopModal();
    }
    
    isSwiping = false;
});

modal.addEventListener('touchcancel', () => {
    isSwiping = false;
});
//#endregion

renderStops();