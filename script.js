import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { firebaseConfig } from "https://lazy-zal.github.io/wms-monitor/";

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

// 2. FUNGSI GLOBAL UNTUK COPY TEXT (Click-to-Copy)
window.copyToClipboard = function(text, elementId) {
    navigator.clipboard.writeText(text).then(() => {
        const el = document.getElementById(elementId);
        const originalText = el.innerHTML;
        
        // Ubah tampilan sementara menjadi "Tersalin!"
        el.innerHTML = `<i class="fa-solid fa-check text-success"></i> <span class="text-success">Tersalin!</span>`;
        
        // Kembalikan ke teks asli setelah 1.5 detik
        setTimeout(() => {
            el.innerHTML = originalText;
        }, 1500);
    }).catch(err => console.error('Gagal menyalin teks: ', err));
};

// 3. REAL-TIME LISTENER DARI FIREBASE
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
    
    // Render tampilan setiap ada perubahan data
    renderData();
});

// 4. FUNGSI RENDER, FILTER & SORTING (Tanpa Refresh)
function renderData() {
    const searchVal = searchInput.value.toLowerCase();
    const dateVal = filterDate.value; // format YYYY-MM-DD
    const statusVal = filterStatus.value;
    const destVal = filterDest.value;

    dataContainer.innerHTML = ''; // Bersihkan container

    // A. FILTERING (Mencakup Search PL & Tujuan)
    let filteredData = rawData.filter(item => {
        // Konversi format tanggal (WMS: DD/MM/YYYY) ke (Input: YYYY-MM-DD)
        let itemDateFormatted = "";
        if (item.picking_date) {
            const parts = item.picking_date.split('/');
            if(parts.length === 3) itemDateFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }

        // Search mengecek ke No PL ATAU Destination
        const plString = item.picking_doc ? item.picking_doc.toLowerCase() : "";
        const destString = item.destination ? item.destination.toLowerCase() : "";
        const matchSearch = plString.includes(searchVal) || destString.includes(searchVal);
        
        const matchDate = dateVal === "" || itemDateFormatted === dateVal;
        const matchStatus = statusVal === "" || item.status.includes(statusVal);
        const matchDest = destVal === "" || item.destination === destVal;

        return matchSearch && matchDate && matchStatus && matchDest;
    });

    // B. SORTING (Tanggal Terbaru di Atas)
    filteredData.sort((a, b) => {
        // Ubah DD/MM/YYYY menjadi angka YYYYMMDD untuk dibandingkan
        let dateA = 0, dateB = 0;
        if (a.picking_date) {
            const pA = a.picking_date.split('/');
            if (pA.length === 3) dateA = parseInt(`${pA[2]}${pA[1]}${pA[0]}`);
        }
        if (b.picking_date) {
            const pB = b.picking_date.split('/');
            if (pB.length === 3) dateB = parseInt(`${pB[2]}${pB[1]}${pB[0]}`);
        }
        
        // Jika tanggalnya sama, urutkan berdasarkan No PL (yang lebih besar/baru di atas)
        if (dateA === dateB) {
            const plA = a.picking_doc || "";
            const plB = b.picking_doc || "";
            return plB.localeCompare(plA);
        }
        
        return dateB - dateA; // Descending (Terbaru di atas)
    });

    // C. Handle jika data kosong
    if (filteredData.length === 0) {
        dataContainer.innerHTML = `<div class="text-center mt-4 text-muted">Data tidak ditemukan.</div>`;
        return;
    }

    // D. RENDERING CARDS
    filteredData.forEach((item, index) => {
        // Tentukan Icon & Warna berdasarkan status
        let iconHtml = '<i class="fa-solid fa-spinner fa-spin text-warning icon-status"></i>';
        let cardClass = 'card-pl';
        
        if (item.status.toLowerCase().includes("complete")) {
            iconHtml = '<i class="fa-solid fa-circle-check text-success icon-status"></i>';
            cardClass += ' status-complete';
        }

        const uniqueId = `copy-text-${index}`; // ID Unik untuk animasi copy

        // Susun HTML Kartu
        const card = document.createElement('div');
        card.className = 'col-12';
        card.innerHTML = `
            <div class="card ${cardClass} shadow-sm">
                <div class="card-body p-2 d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fw-bold text-primary mb-1" style="cursor: pointer; font-size: 15px;" 
                             onclick="copyToClipboard('${item.picking_doc}', '${uniqueId}')"
                             id="${uniqueId}">
                            <i class="fa-regular fa-copy"></i> ${item.picking_doc}
                        </div>
                        <div class="text-muted" style="font-size: 12px;">
                            <i class="fa-solid fa-location-crosshairs"></i> ${item.outbound_doc}
                        </div>
                        <div class="text-muted" style="font-size: 12px;">
                            <i class="fa-regular fa-calendar-days"></i> ${item.picking_date} | 
                            <i class="fa-solid fa-location-dot"></i> ${item.destination}
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

// 5. FUNGSI UPDATE DROPDOWN DESTINASI
function updateDestDropdown(destSet) {
    const currentVal = filterDest.value;
    filterDest.innerHTML = '<option value="">Semua Tujuan</option>';
    
    // Sort tujuan secara alfabetis agar rapi
    Array.from(destSet).sort().forEach(dest => {
        const option = document.createElement('option');
        option.value = dest;
        option.textContent = dest.substring(0, 25) + (dest.length > 25 ? '...' : ''); // Persingkat teks jika kepanjangan
        filterDest.appendChild(option);
    });
    filterDest.value = currentVal; // Kembalikan pilihan sebelumnya jika ada
}

// 6. EVENT LISTENER UNTUK SEARCH & FILTER (Memicu renderData saat diketik/diubah)
searchInput.addEventListener('input', renderData);
filterDate.addEventListener('change', renderData);
filterStatus.addEventListener('change', renderData);
filterDest.addEventListener('change', renderData);