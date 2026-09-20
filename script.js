// GANTI DENGAN API KEY DAN FOLDER ID ANDA
const API_KEY = 'AIzaSyDtNPanLUe87ajc_3Fsgj38obFwYbZkArc';
const ROOT_FOLDER_ID = '1Mlj-U0cFIvPonzcTccz5xzr1uSi_0fYC';

let folderHistory = [{ id: ROOT_FOLDER_ID, name: 'Katalog Utama' }];
let rawItems = [];
const driveCache = {};
let isSoundEnabled = true;

// EFEK SUARA BUKU (Sintetis Web Audio API agar tanpa file external)
function playPageFlipSound() {
    if (!isSoundEnabled) return;
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } catch(e){}
}

function getCurrentFolder() {
    return folderHistory[folderHistory.length - 1];
}

// FUNGSI MEMANGGIL API GOOGLE DRIVE V3
async function fetchDriveContents(folderId) {
    const loadingEl = document.getElementById('loading');
    const bookGrid = document.getElementById('bookGrid');

    if (driveCache[folderId]) {
        loadingEl.style.display = 'none';
        rawItems = driveCache[folderId];
        updateStats(rawItems);
        filterAndSort();
        renderBreadcrumb();
        return;
    }

    loadingEl.style.display = 'block';
    bookGrid.innerHTML = '';

    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&pageSize=50&fields=files(id,name,mimeType,description)&key=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        loadingEl.style.display = 'none';

        if (data.error) {
            console.error('API Error Response:', data.error);
            bookGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 20px; background: rgba(239, 68, 68, 0.1); border-radius: 8px;">
                    <p><strong>Gagal Memuat Data:</strong> ${data.error.message}</p>
                </div>
            `;
            return;
        }

        if (data.files && data.files.length > 0) {
            driveCache[folderId] = data.files;
            rawItems = data.files;
            updateStats(rawItems);
            filterAndSort();
        } else {
            bookGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: var(--text-secondary);">Folder ini kosong.</p>';
            updateStats([]);
        }
    } catch (error) {
        console.error('Fetch Error:', error);
        loadingEl.style.display = 'none';
        bookGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #ef4444;">Terjadi kesalahan koneksi jaringan.</p>';
    }

    renderBreadcrumb();
}

// HITUNG STATISTIK FILE
function updateStats(items) {
    let folders = 0, pdfs = 0, docs = 0, zips = 0;

    items.forEach(item => {
        const ext = item.name.split('.').pop().toLowerCase();
        if (item.mimeType === 'application/vnd.google-apps.folder') folders++;
        else if (ext === 'pdf') pdfs++;
        else if (['doc', 'docx'].includes(ext)) docs++;
        else if (['zip', 'rar'].includes(ext)) zips++;
    });

    document.getElementById('statFolders').textContent = folders;
    document.getElementById('statPdfs').textContent = pdfs;
    document.getElementById('statDocs').textContent = docs;
    document.getElementById('statZips').textContent = zips;
}

// RENDER KARTU BUKU 3D INTERAKTIF
function renderBooks(items, searchQuery = '') {
    const bookGrid = document.getElementById('bookGrid');
    bookGrid.innerHTML = '';

    if (items.length === 0) {
        bookGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: var(--text-secondary);">Tidak ada file yang sesuai.</p>';
        return;
    }

    items.forEach(item => {
        const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
        const extension = item.name.split('.').pop().toUpperCase();
        
        let iconClass = 'fa-file-lines';
        if (isFolder) iconClass = 'fa-folder-open';
        else if (['PDF'].includes(extension)) iconClass = 'fa-file-pdf';
        else if (['DOC', 'DOCX'].includes(extension)) iconClass = 'fa-file-word';
        else if (['ZIP', 'RAR'].includes(extension)) iconClass = 'fa-file-zipper';
        else if (['PNG', 'JPG', 'JPEG'].includes(extension)) iconClass = 'fa-file-image';

        const downloadUrl = `https://drive.google.com/uc?export=download&id=${item.id}`;
        const description = item.description || 'Dokumen resmi terverifikasi di Google Drive.';

        // Highlight pencarian
        let displayName = item.name;
        if (searchQuery) {
            const regex = new RegExp(`(${searchQuery})`, 'gi');
            displayName = item.name.replace(regex, '<mark>$1</mark>');
        }

        const card = document.createElement('div');
        card.className = 'book-card-3d';
        card.onmouseenter = () => playPageFlipSound();

        if (isFolder) {
            card.innerHTML = `
                <div class="book-inner">
                    <div class="book-front">
                        <div class="book-cover folder-bg">
                            <i class="fa-solid ${iconClass} cover-icon"></i>
                            <span class="badge">Folder</span>
                        </div>
                        <div class="book-info-front">
                            <h3 class="book-title">${displayName}</h3>
                            <p class="hover-hint"><i class="fa-solid fa-arrows-rotate"></i> Arahkan kursor untuk opsi</p>
                        </div>
                    </div>
                    <div class="book-back">
                        <h3 class="book-title">${item.name}</h3>
                        <p class="book-desc">${description}</p>
                        <div class="action-buttons">
                            <button onclick="openFolder('${item.id}', '${escapeQuotes(item.name)}')" class="btn-folder">
                                <i class="fa-solid fa-folder-open"></i> Buka Folder
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            card.innerHTML = `
                <div class="book-inner">
                    <div class="book-front">
                        <div class="book-cover">
                            <i class="fa-solid ${iconClass} cover-icon"></i>
                            <span class="badge">${extension}</span>
                        </div>
                        <div class="book-info-front">
                            <h3 class="book-title">${displayName}</h3>
                            <p class="hover-hint"><i class="fa-solid fa-arrows-rotate"></i> Arahkan kursor untuk opsi</p>
                        </div>
                    </div>
                    <div class="book-back">
                        <h3 class="book-title">${item.name}</h3>
                        <p class="book-desc">${description}</p>
                        <div class="action-buttons">
                            <button onclick="openPreviewModal('${item.id}', '${escapeQuotes(item.name)}', '${extension}', '${escapeQuotes(description)}')" class="btn-preview">
                                <i class="fa-solid fa-eye"></i> Pratinjau
                            </button>
                            <a href="${downloadUrl}" target="_blank" class="btn-download" onclick="showToast('Mengunduh file...')">
                                <i class="fa-solid fa-download"></i> Unduh File
                            </a>
                            <button onclick="copyDownloadLink('${downloadUrl}')" class="btn-copy">
                                <i class="fa-solid fa-link"></i> Salin Link
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        bookGrid.appendChild(card);
    });
}

function copyDownloadLink(url) {
    navigator.clipboard.writeText(url);
    showToast('Link download berhasil disalin!');
}

function filterAndSort() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    const filterType = document.getElementById('filterType').value;
    const sortBy = document.getElementById('sortBy').value;

    let result = [...rawItems];

    if (searchQuery) {
        result = result.filter(item => item.name.toLowerCase().includes(searchQuery));
    }

    if (filterType !== 'all') {
        result = result.filter(item => {
            const ext = item.name.split('.').pop().toLowerCase();
            const isFolder = item.mimeType === 'application/vnd.google-apps.folder';

            if (filterType === 'folder') return isFolder;
            if (filterType === 'pdf') return ext === 'pdf';
            if (filterType === 'doc') return ['doc', 'docx'].includes(ext);
            if (filterType === 'archive') return ['zip', 'rar'].includes(ext);
            return true;
        });
    }

    result.sort((a, b) => {
        if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
        if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
        return 0;
    });

    renderBooks(result, searchQuery);
}

function openPreviewModal(id, title, extension, description) {
    playPageFlipSound();
    const modal = document.getElementById('previewModal');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBadge').textContent = extension;
    document.getElementById('modalDesc').textContent = description;
    document.getElementById('modalDownloadBtn').href = `https://drive.google.com/uc?export=download&id=${id}`;

    document.getElementById('previewFrameContainer').innerHTML = `
        <iframe src="https://drive.google.com/file/d/${id}/preview"></iframe>
    `;

    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('previewModal').classList.remove('active');
    document.getElementById('previewFrameContainer').innerHTML = '';
}

function openFolder(folderId, folderName) {
    playPageFlipSound();
    folderHistory.push({ id: folderId, name: folderName });
    fetchDriveContents(folderId);
}

function navigateToBreadcrumb(index) {
    playPageFlipSound();
    folderHistory = folderHistory.slice(0, index + 1);
    fetchDriveContents(getCurrentFolder().id);
}

function renderBreadcrumb() {
    const breadcrumbEl = document.getElementById('breadcrumb');
    const titleEl = document.getElementById('currentFolderTitle');
    
    breadcrumbEl.innerHTML = '';
    titleEl.textContent = getCurrentFolder().name;

    folderHistory.forEach((folder, index) => {
        if (index === folderHistory.length - 1) {
            breadcrumbEl.innerHTML += `<span style="color: var(--text-secondary);">${folder.name}</span>`;
        } else {
            breadcrumbEl.innerHTML += `
                <span class="breadcrumb-item" onclick="navigateToBreadcrumb(${index})">${folder.name}</span>
                <i class="fa-solid fa-chevron-right" style="font-size: 0.7rem; color: var(--text-secondary);"></i>
            `;
        }
    });
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const icon = document.querySelector('#themeToggle i');
    if (document.body.classList.contains('light-mode')) {
        icon.className = 'fa-solid fa-moon';
        showToast('Mode Terang Aktif');
    } else {
        icon.className = 'fa-solid fa-sun';
        showToast('Mode Gelap Aktif');
    }
}

function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    const icon = document.querySelector('#soundToggle i');
    if (isSoundEnabled) {
        icon.className = 'fa-solid fa-volume-high';
        showToast('Suara FX Aktif');
    } else {
        icon.className = 'fa-solid fa-volume-xmark';
        showToast('Suara FX Dibatalkan');
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function escapeQuotes(str) {
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

/* INTERAKSI MOUSE PARALLAX & SPOTLIGHT */
document.addEventListener('mousemove', (e) => {
    const bg = document.getElementById('bookshelfBg');
    const spotlight = document.getElementById('shelfSpotlight');
    const shelves = document.querySelectorAll('.shelf-shelf');

    const x = e.clientX;
    const y = e.clientY;

    if (spotlight) {
        spotlight.style.background = `radial-gradient(circle 350px at ${x}px ${y}px, rgba(245, 158, 11, 0.18), transparent 80%)`;
    }

    const moveX = (x - window.innerWidth / 2) / 45;
    const moveY = (y - window.innerHeight / 2) / 45;

    if (bg) {
        bg.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.02)`;
    }

    shelves.forEach(shelf => {
        const speed = shelf.getAttribute('data-speed') || 2;
        const shelfX = (x - window.innerWidth / 2) / (100 / speed);
        shelf.style.transform = `translateX(${shelfX}px)`;
    });
});

function createGoldParticles() {
    const container = document.getElementById('particlesContainer');
    if (!container) return;

    for (let i = 0; i < 25; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        const size = Math.random() * 4 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}%`;

        const duration = Math.random() * 8 + 6;
        const delay = Math.random() * 5;
        particle.style.animationDuration = `${duration}s`;
        particle.style.animationDelay = `${delay}s`;

        container.appendChild(particle);
    }
}

// LOGIKA INTRO SCREEN & TIMER LOADING DATA GOOGLE DRIVE
document.addEventListener('DOMContentLoaded', () => {
    createGoldParticles();

    const introScreen = document.getElementById('introScreen');

    fetchDriveContents(ROOT_FOLDER_ID);

    setTimeout(() => {
        if (introScreen) {
            introScreen.classList.add('fade-out');
        }
    }, 2600);
});