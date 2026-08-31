// DEFAULT DATA STRUCTURE
const STORAGE_KEY = 'motolog_garage_data';

let garage = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
  activeVehicleId: "v1",
  vehicles: [
    {
      id: "v1",
      name: "TVS NTorq 125 (2018)",
      regNumber: "KA-04",
      serviceIntervalKm: 2500,
      serviceIntervalMonths: 3,
      createdAt: new Date().toISOString()
    }
  ],
  fuelLogs: [
    { id: "f1", vehicleId: "v1", date: "2026-08-10", odo: 52635, liters: 4.36, rate: 127.98, brand: "Shell V-Power" },
    { id: "f2", vehicleId: "v1", date: "2026-08-18", odo: 52783, liters: 4.11, rate: 110.93, brand: "HP Petrol" },
    { id: "f3", vehicleId: "v1", date: "2026-08-25", odo: 52937, liters: 4.11, rate: 127.98, brand: "Shell Petrol" },
    { id: "f4", vehicleId: "v1", date: "2026-08-30", odo: 53113, liters: 4.11, rate: 110.93, brand: "HP Petrol" },
    { id: "f5", vehicleId: "v1", date: "2026-08-31", odo: 53282, liters: 4.11, rate: 110.93, brand: "HP Petrol" }
  ],
  serviceLogs: [],
  parts: [
    { id: "p1", vehicleId: "v1", name: "Engine Oil (Motul 10W-30)", installedOdo: 52635, lifeKm: 3000 },
    { id: "p2", vehicleId: "v1", name: "CVT Drive Belt", installedOdo: 45000, lifeKm: 20000 }
  ]
};

function saveToLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(garage));
  renderAll();
}

function getActiveVehicle() {
  return garage.vehicles.find(v => v.id === garage.activeVehicleId) || garage.vehicles[0];
}

// ----------------------------------------------------
// TAB NAVIGATION & MODALS
// ----------------------------------------------------
function showTab(tabId, element) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  element.classList.add('active');
}

function openModal(id) {
  document.getElementById(id).classList.add('active');
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  if(document.getElementById('fDate')) document.getElementById('fDate').value = today;
  if(document.getElementById('sDate')) document.getElementById('sDate').value = today;
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// ----------------------------------------------------
// VEHICLE MANAGEMENT
// ----------------------------------------------------
function switchVehicle(id) {
  garage.activeVehicleId = id;
  saveToLocalStorage();
}

function addVehicle(e) {
  e.preventDefault();
  const newV = {
    id: 'v_' + Date.now(),
    name: document.getElementById('vName').value,
    regNumber: document.getElementById('vReg').value,
    serviceIntervalKm: 2500,
    serviceIntervalMonths: 3,
    createdAt: new Date().toISOString()
  };
  const initOdo = parseFloat(document.getElementById('vOdo').value);
  garage.vehicles.push(newV);
  garage.activeVehicleId = newV.id;

  // Initial dummy fuel log to seed odo
  garage.fuelLogs.push({
    id: 'f_' + Date.now(),
    vehicleId: newV.id,
    date: new Date().toISOString().split('T')[0],
    odo: initOdo,
    liters: 0,
    rate: 0,
    brand: "Initial Odo Seed"
  });

  closeModal('vehicleModal');
  saveToLocalStorage();
}

// ----------------------------------------------------
// FUEL & SERVICE LOGGING
// ----------------------------------------------------
function addFuelLog(e) {
  e.preventDefault();
  const v = getActiveVehicle();
  garage.fuelLogs.push({
    id: 'f_' + Date.now(),
    vehicleId: v.id,
    date: document.getElementById('fDate').value,
    odo: parseFloat(document.getElementById('fOdo').value),
    liters: parseFloat(document.getElementById('fLiters').value),
    rate: parseFloat(document.getElementById('fRate').value),
    brand: document.getElementById('fBrand').value || 'Standard'
  });
  closeModal('fuelModal');
  saveToLocalStorage();
}

function addServiceLog(e) {
  e.preventDefault();
  const v = getActiveVehicle();
  garage.serviceLogs.push({
    id: 's_' + Date.now(),
    vehicleId: v.id,
    date: document.getElementById('sDate').value,
    odo: parseFloat(document.getElementById('sOdo').value),
    title: document.getElementById('sTitle').value,
    garage: document.getElementById('sGarage').value,
    mechName: document.getElementById('sMechName').value,
    mechPhone: document.getElementById('sMechPhone').value,
    billNumber: document.getElementById('sBill').value,
    laborCost: parseFloat(document.getElementById('sLabor').value) || 0,
    partsCost: parseFloat(document.getElementById('sPartsCost').value) || 0
  });
  closeModal('serviceModal');
  saveToLocalStorage();
}

function addTrackedPart(e) {
  e.preventDefault();
  const v = getActiveVehicle();
  garage.parts.push({
    id: 'p_' + Date.now(),
    vehicleId: v.id,
    name: document.getElementById('pName').value,
    installedOdo: parseFloat(document.getElementById('pInstalledOdo').value),
    lifeKm: parseFloat(document.getElementById('pLifeKm').value)
  });
  closeModal('partModal');
  saveToLocalStorage();
}

function saveServiceConfig(e) {
  e.preventDefault();
  const v = getActiveVehicle();
  v.serviceIntervalKm = parseFloat(document.getElementById('cfgIntervalKm').value) || null;
  v.serviceIntervalMonths = parseFloat(document.getElementById('cfgIntervalMonths').value) || null;
  saveToLocalStorage();
}

// ----------------------------------------------------
// RENDERING & CALCULATIONS ENGINE
// ----------------------------------------------------
function renderAll() {
  const v = getActiveVehicle();
  
  // Render Vehicle Dropdown
  const selector = document.getElementById('vehicleSelector');
  selector.innerHTML = garage.vehicles.map(item => `
    <option value="${item.id}" ${item.id === v.id ? 'selected' : ''}>${item.name}</option>
  `).join('');

  document.getElementById('cfgIntervalKm').value = v.serviceIntervalKm || '';
  document.getElementById('cfgIntervalMonths').value = v.serviceIntervalMonths || '';

  // Filter logs for active vehicle
  const fuels = garage.fuelLogs.filter(f => f.vehicleId === v.id).sort((a,b) => a.odo - b.odo);
  const services = garage.serviceLogs.filter(s => s.vehicleId === v.id).sort((a,b) => a.odo - b.odo);
  const parts = garage.parts.filter(p => p.vehicleId === v.id);

  // Latest overall Odometer
  const latestFuelOdo = fuels.length ? fuels[fuels.length - 1].odo : 0;
  const latestServiceOdo = services.length ? services[services.length - 1].odo : 0;
  const currentOdo = Math.max(latestFuelOdo, latestServiceOdo);

  document.getElementById('statOdo').innerText = currentOdo ? `${currentOdo.toLocaleString()} km` : '--';

  // 1. Render Fuel Table & Calculate Stats
  let lastFE = '--';
  let totalSpent = 0;
  let totalDistance = 0;
  const fuelTbody = document.getElementById('fuelTableBody');
  fuelTbody.innerHTML = '';

  fuels.forEach((entry, idx) => {
    let tripDist = idx > 0 ? entry.odo - fuels[idx - 1].odo : 0;
    let cost = entry.liters * entry.rate;
    let fe = (tripDist > 0 && entry.liters > 0) ? (tripDist / entry.liters).toFixed(2) : '--';
    let costPerKm = (tripDist > 0 && cost > 0) ? `₹${(cost / tripDist).toFixed(2)}` : '--';
    let kmPerRe = (tripDist > 0 && cost > 0) ? `${(tripDist / cost).toFixed(3)} km` : '--';

    if (fe !== '--') {
      lastFE = fe;
      totalSpent += cost;
      totalDistance += tripDist;
    }

    fuelTbody.innerHTML += `
      <tr>
        <td>${entry.date}</td>
        <td><strong>${entry.odo}</strong></td>
        <td>${tripDist > 0 ? tripDist + ' km' : '-'}</td>
        <td>${entry.liters}</td>
        <td>₹${entry.rate}</td>
        <td>₹${cost.toFixed(2)}</td>
        <td>${entry.brand}</td>
        <td><strong class="text-green">${fe}</strong></td>
        <td>${costPerKm}</td>
        <td>${kmPerRe}</td>
        <td><button class="btn btn-danger" onclick="deleteItem('fuelLogs', '${entry.id}')">✕</button></td>
      </tr>
    `;
  });

  document.getElementById('statFE').innerText = lastFE !== '--' ? `${lastFE} km/L` : '--';
  document.getElementById('statCostPerKm').innerText = (totalDistance > 0 && totalSpent > 0) 
    ? `₹${(totalSpent / totalDistance).toFixed(2)} /km` 
    : '₹-- /km';

  // 2. Render Service Logs
  const serviceTbody = document.getElementById('serviceTableBody');
  serviceTbody.innerHTML = '';
  services.forEach(s => {
    const totalBill = s.laborCost + s.partsCost;
    serviceTbody.innerHTML += `
      <tr>
        <td>${s.date}</td>
        <td><strong>${s.odo} km</strong></td>
        <td><strong>${s.title}</strong></td>
        <td>${s.garage || '-'}</td>
        <td>${s.mechName || '-'}</td>
        <td>${s.mechPhone ? `<a class="phone-link" href="tel:${s.mechPhone}">📞 ${s.mechPhone}</a>` : '-'}</td>
        <td>${s.billNumber || '-'}</td>
        <td>₹${s.laborCost.toFixed(2)}</td>
        <td>₹${s.partsCost.toFixed(2)}</td>
        <td><strong>₹${totalBill.toFixed(2)}</strong></td>
        <td><button class="btn btn-danger" onclick="deleteItem('serviceLogs', '${s.id}')">✕</button></td>
      </tr>
    `;
  });

  // 3. Render Parts Wear
  const partsContainer = document.getElementById('partsList');
  partsContainer.innerHTML = '';
  parts.forEach(p => {
    const usedKm = Math.max(0, currentOdo - p.installedOdo);
    const percentage = Math.min(100, Math.round((usedKm / p.lifeKm) * 100));
    let color = 'var(--green)';
    if(percentage > 70) color = 'var(--yellow)';
    if(percentage >= 95) color = 'var(--red)';

    partsContainer.innerHTML += `
      <div class="part-card">
        <h4>${p.name}</h4>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-top:4px;">
          Installed at: ${p.installedOdo} km | Lifespan: ${p.lifeKm} km
        </p>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${percentage}%; background-color: ${color};"></div>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.85rem;">
          <span>Used: ${usedKm} km (${percentage}%)</span>
          <span>Remaining: ${Math.max(0, p.lifeKm - usedKm)} km</span>
        </div>
      </div>
    `;
  });

  // 4. Smart Service Interval Logic (Whichever comes first)
  evaluateServiceReminder(v, currentOdo, services);
}

function evaluateServiceReminder(v, currentOdo, services) {
  const alertEl = document.getElementById('serviceAlertBanner');
  const statServiceDue = document.getElementById('statServiceDue');

  let lastServiceOdo = services.length ? services[services.length - 1].odo : (currentOdo || 0);
  let lastServiceDate = services.length ? new Date(services[services.length - 1].date) : new Date(v.createdAt);

  let kmRemaining = null;
  let daysRemaining = null;

  if (v.serviceIntervalKm) {
    const targetKm = lastServiceOdo + v.serviceIntervalKm;
    kmRemaining = targetKm - currentOdo;
  }

  if (v.serviceIntervalMonths) {
    let targetDate = new Date(lastServiceDate);
    targetDate.setMonth(targetDate.getMonth() + v.serviceIntervalMonths);
    const today = new Date();
    const diffTime = targetDate - today;
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Display status
  if (kmRemaining === null && daysRemaining === null) {
    statServiceDue.innerText = "No Interval Set";
    alertEl.classList.add('hidden');
    return;
  }

  let statusText = [];
  if (kmRemaining !== null) statusText.push(`${kmRemaining} km left`);
  if (daysRemaining !== null) statusText.push(`${daysRemaining} days left`);
  statServiceDue.innerText = statusText.join(' or ');

  // Alert triggers
  if ((kmRemaining !== null && kmRemaining <= 0) || (daysRemaining !== null && daysRemaining <= 0)) {
    alertEl.className = 'alert-banner danger';
    alertEl.innerText = `🚨 Service Overdue! You have passed the target threshold (${kmRemaining <= 0 ? 'KM exceeded' : 'Time exceeded'}).`;
  } else if ((kmRemaining !== null && kmRemaining <= 200) || (daysRemaining !== null && daysRemaining <= 15)) {
    alertEl.className = 'alert-banner warning';
    alertEl.innerText = `⚠️ Service Due Soon: ${statusText.join(' | ')}`;
  } else {
    alertEl.classList.add('hidden');
  }
}

function deleteItem(collection, id) {
  garage[collection] = garage[collection].filter(item => item.id !== id);
  saveToLocalStorage();
}

function exportData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(garage, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `motolog_backup_${new Date().toISOString().split('T')[0]}.json`);
  dlAnchor.click();
}

function importData(event) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      garage = JSON.parse(e.target.result);
      saveToLocalStorage();
      alert("Garage data restored successfully!");
    } catch(err) {
      alert("Invalid JSON backup file.");
    }
  };
  reader.readAsText(event.target.files[0]);
}

// Initial boot
document.addEventListener('DOMContentLoaded', renderAll);
