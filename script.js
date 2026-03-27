import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 1. MASUKKAN CONFIG FIREBASE ANDA DI SINI (Ini aman ditaruh di GitHub Pages)
const firebaseConfig = {
    apiKey: "AIzaSyC8V6_Rj5xsM8fPDL04FMORkrdygL2yV2o",
    authDomain: "wms-helper-5c6ca.firebaseapp.com",
    projectId: "wms-helper-5c6ca",
    storageBucket: "wms-helper-5c6ca.firebasestorage.app",
    messagingSenderId: "425367035686",
    appId: "1:425367035686:web:7d89def2b71ca5de57abe7"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Variabel untuk menyimpan data mentah dari Firebase
let rawData = [];

// Elemen DOM
const dataContainer = document.getElementById('dataContainer');
const searchInput = document.getElementById('searchInput');
const filterDate = document.getElementById('filterDate');
const filterStatus = document.getElementById('filterStatus');
const filterDest = document.getElementById('filterDest');

// 2. REAL-TIME LISTENER DARI FIREBASE
onSnapshot(collection(db, "picking_list"), (snapshot) => {
    rawData = [];
    const uniqueDestinations = new Set();

    snapshot.forEach((doc) => {
        const item = doc.data();
        rawData.push(item);
        if (item.destination) uniqueDestinations.add(item.destination);
    });

    // Update opsi dropdown Destination secara dinamis
    updateDestDropdown(uniqueDestinations);
    
    // Render tampilan
    renderData();
});

// 3. FUNGSI RENDER & FILTER (Tanpa Refresh)
function renderData() {
    const searchVal = searchInput.value.toLowerCase();
    const dateVal = filterDate.value; // format YYYY-MM-DD
    const statusVal = filterStatus.value;
    const destVal = filterDest.value;

    dataContainer.innerHTML = ''; // Bersihkan container

    // Terapkan Filter & Search
    const filteredData = rawData.filter(item => {
        // Konversi format tanggal (WMS: DD/MM/YYYY) ke (Input: YYYY-MM-DD)
        let itemDateFormatted = "";
        if (item.picking_date) {
            const parts = item.picking_date.split('/');
            if(parts.length === 3) itemDateFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }

        const matchSearch = item.picking_doc.toLowerCase().includes(searchVal);
        const matchDate = dateVal === "" || itemDateFormatted === dateVal;
        const matchStatus = statusVal === "" || item.status.includes(statusVal);
        const matchDest = destVal === "" || item.destination === destVal;

        return matchSearch && matchDate && matchStatus && matchDest;
    });

    if (filteredData.length === 0) {
        dataContainer.innerHTML = `<div class="text-center mt-4 text-muted">Data tidak ditemukan.</div>`;
        return;
    }

    // Buat Kartu (Cards) untuk setiap data
    filteredData.forEach(item => {
        // Tentukan Icon & Warna berdasarkan status
        let iconHtml = '<i class="fa-solid fa-spinner fa-spin text-warning icon-status"></i>';
        let cardClass = 'card-pl';
        
        if (item.status.toLowerCase().includes("complete")) {
            iconHtml = '<i class="fa-solid fa-circle-check text-success icon-status"></i>';
            cardClass += ' status-complete';
        }

        // Susun HTML Kartu
        const card = document.createElement('div');
        card.className = 'col-12';
        card.innerHTML = `
            <div class="card ${cardClass} shadow-sm">
                <div class="card-body p-2 d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fw-bold text-dark">${item.picking_doc}</div>
                        <div class="text-muted" style="font-size: 12px;">
                            <i class="fa-regular fa-calendar-days"></i> ${item.picking_date} | 
                            <i class="fa-solid fa-location-dot"></i> ${item.destination.substring(0, 15)}...
                        </div>
                    </div>
                    <div class="text-end">
                        ${iconHtml}
                        <div style="font-size: 10px;" class="text-muted">${item.status}</div>
                    </div>
                </div>
            </div>
        `;
        dataContainer.appendChild(card);
    });
}

function updateDestDropdown(destSet) {
    const currentVal = filterDest.value;
    filterDest.innerHTML = '<option value="">Semua Tujuan</option>';
    destSet.forEach(dest => {
        const option = document.createElement('option');
        option.value = dest;
        option.textContent = dest.substring(0, 20) + (dest.length > 20 ? '...' : ''); // Persingkat teks
        filterDest.appendChild(option);
    });
    filterDest.value = currentVal; // Kembalikan pilihan sebelumnya
}

// 4. EVENT LISTENER UNTUK SEARCH & FILTER (Memicu renderData saat diketik/diubah)
searchInput.addEventListener('input', renderData);
filterDate.addEventListener('change', renderData);
filterStatus.addEventListener('change', renderData);
filterDest.addEventListener('change', renderData);