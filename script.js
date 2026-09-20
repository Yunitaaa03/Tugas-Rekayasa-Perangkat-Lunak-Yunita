// GANTI DENGAN API KEY DAN FOLDER ID ANDA
const API_KEY = 'AIzaSyDuzY6sP3KQ2vekT1Lgh3-NkK_zw09Kjkc';
const FOLDER_ID = '1RsFLkHJusICsij9OmKkwIGsSGW2BP5a1';

let allFiles = [];

// Fungsi untuk mengambil daftar file dari Google Drive API v3
async function fetchDriveFiles() {
    const loadingEl = document.getElementById('loading');
    const bookGrid = document.getElementById('bookGrid');

    // Query untuk mengambil file yang ada di dalam FOLDER_ID tertentu
    const query = encodeURIComponent(`'${FOLDER_ID}' in parents and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,description)&key=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        loadingEl.style.display = 'none';

        if (data.files && data.files.length > 0) {
            allFiles = data.files;
            renderBooks(allFiles);
        } else {
            bookGrid.innerHTML = '<p style="text-align:center; width:100%;">Tidak ada file yang ditemukan di folder Google Drive ini.</p>';
        }
    } catch (error) {
        console.error('Error fetching Google Drive API:', error);
        loadingEl.innerHTML = '<p style="color:red;">Gagal terhubung ke Google Drive API. Pastikan API Key dan Folder ID sudah benar.</p>';
    }
}

// Menampilkan file ke dalam kartu bergaya toko buku
function renderBooks(files) {
    const bookGrid = document.getElementById('bookGrid');
    bookGrid.innerHTML = '';

    files.forEach(file => {
        const extension = file.name.split('.').pop().toUpperCase();
        
        let iconClass = 'fa-file-lines';
        if (['PDF'].includes(extension)) iconClass = 'fa-file-pdf';
        else if (['DOC', 'DOCX'].includes(extension)) iconClass = 'fa-file-word';
        else if (['ZIP', 'RAR'].includes(extension)) iconClass = 'fa-file-zipper';
        else if (['PNG', 'JPG', 'JPEG'].includes(extension)) iconClass = 'fa-file-image';

        const description = file.description || 'Dokumen tugas terverifikasi di Google Drive.';
        
        // Link langsung untuk mengunduh file dari Google Drive via API endpoint uc?export=download
        const downloadUrl = `https://drive.google.com/uc?export=download&id=${file.id}`;

        const cardHTML = `
            <div class="book-card">
                <div class="book-cover">
                    <i class="fa-solid ${iconClass} cover-icon"></i>
                    <span class="badge">${extension}</span>
                </div>
                <div class="book-details">
                    <h3 class="book-title">${file.name}</h3>
                    <p class="book-desc">${description}</p>
                    <a href="${downloadUrl}" target="_blank" class="download-btn">
                        <i class="fa-solid fa-download"></i> Unduh File
                    </a>
                </div>
            </div>
        `;

        bookGrid.innerHTML += cardHTML;
    });
}

// Fungsi Pencarian
function filterBooks() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filteredFiles = allFiles.filter(file => file.name.toLowerCase().includes(query));
    renderBooks(filteredFiles);
}

// Jalankan fungsi saat halaman selesai dimuat
document.addEventListener('DOMContentLoaded', fetchDriveFiles);