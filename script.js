import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC8V6_Rj5xsM8fPDL04FMORkrdygL2yV2o",
    authDomain: "wms-helper-5c6ca.firebaseapp.com",
    projectId: "wms-helper-5c6ca",
    storageBucket: "wms-helper-5c6ca.firebasestorage.app",
    messagingSenderId: "425367035686",
    appId: "1:425367035686:web:7d89def2b71ca5de57abe7"
};

// 1. Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Variabel Penampung Data
let rawData = [];

// Elemen DOM
const dataContainer = document.getElementById('dataContainer');
const searchInput = document.getElementById('searchInput');
const filterDate = document.getElementById('filterDate');
const filterStatus = document.getElementById('filterStatus');
const filterDest = document.getElementById('filterDest');

// 2. FUNGSI COPY TO CLIPBOARD
window.copyToClipboard = function(text, elementId) {
    navigator.clipboard.writeText(text).then(() => {
        const el = document.getElementById(elementId);
        const originalHTML = el.innerHTML;
        
        // Feedback visual saat berhasil menyalin
        el.innerHTML = `<i class="fa-solid fa-check text-success"></i>`;
        el.classList.add('bg-success-subtle');
        
        setTimeout(() => {
            el.innerHTML = originalHTML;
            el.classList.remove('bg-success-subtle');
        }, 1500);
    }).catch(err => console.error('Gagal menyalin:', err));
};

// 3. MAPPING STATUS (Warna & Icon)
const STATUS_CONFIG = {
    'waiting for picking': { class: 'status-waiting', badge: 'bg-warning text-dark', icon: 'fa-clock' },
    'picking complete': { class: 'status-complete', badge: 'bg-success text-white', icon: 'fa-check-double' },
    'progress': { class: 'status-progress', badge: 'bg-primary text-white', icon: 'fa-spinner fa-spin-slow' }
};

// 4. REAL-TIME LISTENER
onSnapshot(collection(db, "picking_list"), (snapshot) => {
    rawData = [];
    const uniqueDestinations = new Set();

    snapshot.forEach((doc) => {
        const item = doc.data();
        rawData.push(item);
        if (item.destination) uniqueDestinations.add(item.destination);
    });

    updateDestDropdown(uniqueDestinations);
    renderData();
});

// 5. FUNGSI UTAMA RENDER & FILTER
function renderData() {
    const searchVal = searchInput.value.toLowerCase();
    const dateVal = filterDate.value;
    const statusVal = filterStatus.value.toLowerCase();
    const destVal = filterDest.value;

    dataContainer.innerHTML = '';

    // A. Proses Filtering
    let filteredData = rawData.filter(item => {
        // Konversi format tanggal DD/MM/YYYY ke YYYY-MM-DD agar cocok dengan input date
        let itemDateIso = "";
        if (item.picking_date) {
            const p = item.picking_date.split('/');
            if(p.length === 3) itemDateIso = `${p[2]}-${p[1]}-${p[0]}`;
        }

        const matchSearch = (item.picking_doc || "").toLowerCase().includes(searchVal) || 
                            (item.destination || "").toLowerCase().includes(searchVal);
        const matchDate = dateVal === "" || itemDateIso === dateVal;
        const matchStatus = statusVal === "" || (item.status || "").toLowerCase().includes(statusVal);
        const matchDest = destVal === "" || item.destination === destVal;

        return matchSearch && matchDate && matchStatus && matchDest;
    });

    // B. Sorting (Terbaru di atas)
    filteredData.sort((a, b) => {
        const parseDate = (str) => {
            if (!str) return 0;
            const p = str.split('/');
            return parseInt(`${p[2]}${p[1]}${p[0]}`);
        };
        const dateA = parseDate(a.picking_date);
        const dateB = parseDate(b.picking_date);
        
        return dateB - dateA || (b.picking_doc || "").localeCompare(a.picking_doc || "");
    });

    // C. Render ke HTML
    if (filteredData.length === 0) {
        dataContainer.innerHTML = `<div class="text-center mt-5 text-muted small">Data tidak ditemukan atau filter tidak cocok.</div>`;
        return;
    }

    filteredData.forEach((item, index) => {
        const statusLower = (item.status || "").toLowerCase();
        const config = STATUS_CONFIG[statusLower] || { class: '', badge: 'bg-secondary', icon: 'fa-question' };
        const copyId = `btn-copy-${index}`;

        const card = document.createElement('div');
        card.className = 'col-12 mb-2';
        card.innerHTML = `
            <div class="card card-pl ${config.class} shadow-sm">
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center mb-1">
                                <span class="fw-bold text-dark text-pl me-2">${item.picking_doc}</span>
                                <button class="btn-copy" id="${copyId}" onclick="copyToClipboard('${item.picking_doc}', '${copyId}')">
                                    <i class="fa-regular fa-copy"></i>
                                </button>
                            </div>
                            <div class="text-muted mb-2" style="font-size: 13px;">
                                <i class="fa-solid fa-file-invoice me-1"></i> ${item.outbound_doc || '-'}
                            </div>
                            <div class="d-flex flex-wrap gap-2 text-muted" style="font-size: 11px;">
                                <span><i class="fa-regular fa-calendar me-1"></i> ${item.picking_date}</span>
                                <span><i class="fa-solid fa-location-dot me-1"></i> ${item.destination}</span>
                            </div>
                        </div>
                        <div class="text-end">
                            <span class="badge ${config.badge} badge-status">
                                <i class="fa-solid ${config.icon} me-1"></i> ${item.status}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        dataContainer.appendChild(card);
    });
}

// 6. UPDATE DROPDOWN TUJUAN
function updateDestDropdown(destSet) {
    const current = filterDest.value;
    filterDest.innerHTML = '<option value="">Semua Tujuan</option>';
    
    Array.from(destSet).sort().forEach(dest => {
        const opt = document.createElement('option');
        opt.value = dest;
        opt.textContent = dest;
        filterDest.appendChild(opt);
    });
    filterDest.value = current;
}

// 7. EVENT LISTENERS
searchInput.addEventListener('input', renderData);
filterDate.addEventListener('change', renderData);
filterStatus.addEventListener('change', renderData);
filterDest.addEventListener('change', renderData);