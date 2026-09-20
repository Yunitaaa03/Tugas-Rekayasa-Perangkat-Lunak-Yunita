// GANTI DENGAN API KEY DAN FOLDER ID ANDA
const API_KEY = 'AIzaSyDuzY6sP3KQ2vekT1Lgh3-NkK_zw09Kjkc';
const ROOT_FOLDER_ID = '1RsFLkHJusICsij9OmKkwIGsSGW2BP5a1';

let folderHistory = [{ id: ROOT_FOLDER_ID, name: 'Katalog Utama' }];
let rawItems = [];
const driveCache = {}; // Cache untuk mempercepat navigasi folder

function getCurrentFolder() {
    return folderHistory[folderHistory.length - 1];
}

// FUNGSI MEMANGGIL API GOOGLE DRIVE V3
async function fetchDriveContents(folderId) {
    const loadingEl = document.getElementById('loading');
    const bookGrid = document.getElementById('bookGrid');

    // Cek apakah data folder sudah ada di memori cache lokal
    if (driveCache[folderId]) {
        loadingEl.style.display = 'none';
        rawItems = driveCache[folderId];
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
            driveCache[folderId] = data.files; // Simpan ke Cache
            rawItems = data.files;
            filterAndSort();
        } else {
            bookGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: var(--text-secondary);">Folder ini kosong.</p>';
        }
    } catch (error) {
        console.error('Fetch Error:', error);
        loadingEl.style.display = 'none';
        bookGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #ef4444;">Terjadi kesalahan koneksi jaringan.</p>';
    }

    renderBreadcrumb();
}

// RENDER KARTU BUKU 3D INTERAKTIF
function renderBooks(items) {
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

        const card = document.createElement('div');
        card.className = 'book-card-3d';

        if (isFolder) {
            card.innerHTML = `
                <div class="book-inner">
                    <div class="book-front">
                        <div class="book-cover folder-bg">
                            <i class="fa-solid ${iconClass} cover-icon"></i>
                            <span class="badge">Folder</span>
                        </div>
                        <div class="book-info-front">
                            <h3 class="book-title">${item.name}</h3>
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
                            <h3 class="book-title">${item.name}</h3>
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
                        </div>
                    </div>
                </div>
            `;
        }

        bookGrid.appendChild(card);
    });
}

// FILTER & SORTING
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

    renderBooks(result);
}

// MODAL PREVIEW & SUBFOLDER
function openPreviewModal(id, title, extension, description) {
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
    folderHistory.push({ id: folderId, name: folderName });
    fetchDriveContents(folderId);
}

function navigateToBreadcrumb(index) {
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

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function escapeQuotes(str) {
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// EFEK PARALLAX PARAPET RAK BUKU SAAT DI-SCROLL
window.addEventListener('scroll', () => {
    const bg = document.getElementById('bookshelfBg');
    if (bg) {
        let scrollPos = window.scrollY;
        bg.style.transform = `translateY(${scrollPos * 0.1}px)`;
    }
});

// INITIAL LOAD
document.addEventListener('DOMContentLoaded', () => {
    fetchDriveContents(ROOT_FOLDER_ID);
});