/* Gestione Veicoli & Tariffe Regionali — GitHub Pages
   - Dropdown veicoli con datalist (scrittura libera + suggerimenti)
   - Select regioni
   - Tariffa compilata automaticamente (lookup)
   - Salvataggio locale (LocalStorage)
   - Import/Export JSON
*/

(() => {
  "use strict";

  const LS_KEY = "vehapp.records.v1";

  // Selettori
  const $ = (q) => document.querySelector(q);
  const form = $("#recordForm");
  const vehicleInput = $("#vehicleInput");
  const vehiclesList = $("#vehiclesList");
  const regionSelect = $("#regionSelect");
  const tariffInput = $("#tariffInput");
  const errorsBox = $("#formErrors");
  const clearBtn = $("#clearBtn");
  const exportBtn = $("#exportBtn");
  const importInput = $("#importInput");
  const toast = $("#toast");
  const recordsBody = $("#recordsBody");

  // Stato
  let regionMap = new Map();
  let records = [];

  // --- Utils ---
  const normalize = (s) =>
    (s ?? "")
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ");

  const showToast = (msg, ms = 1800) => {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), ms);
  };

  const showError = (msg) => {
    errorsBox.textContent = msg || "";
  };

  const fmtDate = (ts) =>
    new Date(ts).toLocaleString(undefined, {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });

  const saveLS = () => localStorage.setItem(LS_KEY, JSON.stringify(records));
  const loadLS = () => {
    try { records = JSON.parse(localStorage.getItem(LS_KEY)) || []; }
    catch { records = []; }
  };

  // --- Rendering ---
  const renderRecords = () => {
    recordsBody.innerHTML = "";
    if (!records.length) {
      recordsBody.innerHTML = `<tr class="empty"><td colspan="5">Nessun record ancora. Aggiungine uno dal form.</td></tr>`;
      return;
    }
    for (const rec of records) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${fmtDate(rec.ts)}</td>
        <td>${escapeHtml(rec.vehicle)}</td>
        <td>${escapeHtml(rec.region)}</td>
        <td>${rec.tariff}</td>
        <td><button class="btn danger" data-del="${rec.id}">Elimina</button></td>
      `;
      recordsBody.appendChild(tr);
    }
  };

  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // --- Eventi tabella ---
  const onDeleteClick = (e) => {
    const btn = e.target.closest("button[data-del]");
    if (!btn) return;
    const id = btn.getAttribute("data-del");
    records = records.filter((r) => r.id !== id);
    saveLS(); renderRecords(); showToast("Record eliminato");
  };

  // --- Lookup tariffa ---
  const getTariffByRegion = (regionLabel) => {
    return regionMap.get(normalize(regionLabel)) ?? null;
  };

  const updateTariffOnRegionChange = () => {
    const r = regionSelect.value;
    const t = getTariffByRegion(r);
    tariffInput.value = t != null ? t : "";
  };

  // --- Validazione form ---
  const validateForm = () => {
    if (!vehicleInput.value.trim()) return "Inserisci il veicolo.";
    if (!regionSelect.value) return "Seleziona la regione.";
    if (!tariffInput.value) return "Tariffa non disponibile per la regione.";
    return "";
  };

  // --- Submit ---
  const onSubmit = (e) => {
    e.preventDefault();
    showError("");
    const err = validateForm();
    if (err) { showError(err); return; }
    const record = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      ts: Date.now(),
      vehicle: vehicleInput.value.trim(),
      region: regionSelect.value,
      tariff: tariffInput.value
    };
    records.unshift(record);
    saveLS();
    renderRecords();
    form.reset();
    tariffInput.value = "";
    showToast("Record aggiunto");
  };

  // --- Export / Import ---
  const onExport = () => {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "records.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (file) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error("Formato non valido");
      records = data.concat(records);
      saveLS(); renderRecords(); showToast("Import completato");
    } catch (err) {
      showError("Import fallito: " + err.message);
    }
  };

  const onClearAll = () => {
    if (!confirm("Vuoi davvero eliminare tutti i record?")) return;
    records = [];
    saveLS(); renderRecords(); showToast("Archivio svuotato");
  };

  // --- Inizializzazione ---
  const init = async () => {
    // Carica veicoli
    try {
      const res = await fetch("assets/data/vehicles.json");
      const arr = await res.json();
      vehiclesList.innerHTML = arr.map(v => `<option value="${v}">`).join("");
    } catch {
      vehiclesList.innerHTML = "";
    }

    // Carica regioni
    try {
      const res = await fetch("assets/data/regions.json");
      const arr = await res.json();
      regionSelect.innerHTML = `<option value="">— Seleziona la regione —</option>` +
        arr.map(r => `<option value="${r.regione}">${r.regione}</option>`).join("");
      regionMap = new Map(arr.map(r => [normalize(r.regione), r.tariffa]));
    } catch {
      regionMap = new Map();
    }

    loadLS();
    renderRecords();

    regionSelect.addEventListener("change", updateTariffOnRegionChange);
    form.addEventListener("submit", onSubmit);
    $("#recordsTable").addEventListener("click", onDeleteClick);
    clearBtn.addEventListener("click", onClearAll);
    exportBtn.addEventListener("click", onExport);
    importInput.addEventListener("change", e => {
      if (e.target.files[0]) onImport(e.target.files[0]);
      e.target.value = "";
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
