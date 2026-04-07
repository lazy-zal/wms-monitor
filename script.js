import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
//import { firebaseConfig } from "/wms-monitor/data.js";

const firebaseConfig = {
    apiKey: "AIzaSyC8V6_Rj5xsM8fPDL04FMORkrdygL2yV2o",
    authDomain: "wms-helper-5c6ca.firebaseapp.com",
    projectId: "wms-helper-5c6ca",
    storageBucket: "wms-helper-5c6ca.firebasestorage.app",
    messagingSenderId: "425367035686",
    appId: "1:425367035686:web:7d89def2b71ca5de57abe7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
let rawData = [];

const dataContainer = document.getElementById('dataContainer');
const searchInput = document.getElementById('searchInput');
const filterDate = document.getElementById('filterDate');
const filterStatus = document.getElementById('filterStatus');
const filterDest = document.getElementById('filterDest');

window.copyToClipboard = function(text, elementId) {
    navigator.clipboard.writeText(text).then(() => {
        const el = document.getElementById(elementId);
        const icon = el.innerHTML;
        el.innerHTML = `<i class="fa-solid fa-check text-success"></i>`;
        setTimeout(() => { el.innerHTML = icon; }, 1500);
    });
};

const STATUS_MAP = {
    'waiting for picking': { class: 'status-waiting', badge: 'bg-warning text-dark', icon: 'fa-clock' },
    'picking complete': { class: 'status-complete', badge: 'bg-success text-white', icon: 'fa-check-double' },
    'progress': { class: 'status-progress', badge: 'bg-primary text-white', icon: 'fa-spinner fa-spin' }
};

onSnapshot(collection(db, "picking_list"), (snapshot) => {
    rawData = [];
    const dests = new Set();
    snapshot.forEach(doc => {
        const item = doc.data();
        rawData.push(item);
        if (item.destination) dests.add(item.destination);
    });
    updateDestDropdown(dests);
    renderData();
});

function renderData() {
    const s = searchInput.value.toLowerCase();
    const d = filterDate.value;
    const st = filterStatus.value.toLowerCase();
    const ds = filterDest.value;

    dataContainer.innerHTML = '';

    let filtered = rawData.filter(item => {
        let isoDate = "";
        if (item.picking_date) {
            const p = item.picking_date.split('/');
            isoDate = `${p[2]}-${p[1]}-${p[0]}`;
        }
        return ( (item.picking_doc || "").toLowerCase().includes(s) || (item.destination || "").toLowerCase().includes(s) ) &&
               (d === "" || isoDate === d) &&
               (st === "" || (item.status || "").toLowerCase().includes(st)) &&
               (ds === "" || item.destination === ds);
    });

    filtered.sort((a, b) => {
        const toVal = (s) => { const p = s.split('/'); return parseInt(p[2]+p[1]+p[0]); };
        return toVal(b.picking_date) - toVal(a.picking_date);
    });

    if (filtered.length === 0) {
        dataContainer.innerHTML = `<div class="text-center mt-5 text-muted small">Tidak ada data.</div>`;
        return;
    }

    filtered.forEach((item, i) => {
        const config = STATUS_MAP[(item.status || "").toLowerCase()] || { class: '', badge: 'bg-secondary', icon: 'fa-question' };
        const cid = `cp-${i}`;
        const card = document.createElement('div');
        card.className = 'col-12 mb-1';
        card.innerHTML = `
            <div class="card card-pl ${config.class} shadow-sm">
                <div class="card-body p-3">
                    <div class="info-column">
                        <div class="d-flex align-items-center mb-1">
                            <span class="text-pl me-2">${item.picking_doc}</span>
                            <button class="btn-copy" id="${cid}" onclick="copyToClipboard('${item.picking_doc}', '${cid}')">
                                <i class="fa-regular fa-copy text-muted"></i>
                            </button>
                        </div>
                        <div class="text-outbound mb-1">
                            <i class="fa-solid fa-file-export me-1"></i> ${item.outbound_doc || '-'}
                        </div>
                        <div class="d-flex gap-2 text-muted mt-1" style="font-size: 10px;">
                            <span><i class="fa-regular fa-calendar"></i> ${item.picking_date}</span>
                            <span class="text-truncate" style="max-width: 80px;"><i class="fa-solid fa-map-pin"></i> ${item.destination}</span>
                        </div>
                    </div>
                    <div class="status-column">
                        <span class="badge ${config.badge} badge-status">
                            <i class="fa-solid ${config.icon} me-1"></i> ${item.status}
                        </span>
                    </div>
                </div>
            </div>`;
        dataContainer.appendChild(card);
    });
}

function updateDestDropdown(set) {
    const cur = filterDest.value;
    filterDest.innerHTML = '<option value="">Semua Tujuan</option>';
    Array.from(set).sort().forEach(v => {
        const o = document.createElement('option'); o.value = v; o.textContent = v;
        filterDest.appendChild(o);
    });
    filterDest.value = cur;
}

searchInput.addEventListener('input', renderData);
filterDate.addEventListener('change', renderData);
filterStatus.addEventListener('change', renderData);
filterDest.addEventListener('change', renderData);