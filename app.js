// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA1GIv5HTZ6RibTiNt0H4e3h8z5uyu4u88",
  authDomain: "ultimate-garagetracker.firebaseapp.com",
  projectId: "ultimate-garagetracker",
  storageBucket: "ultimate-garagetracker.firebasestorage.app",
  messagingSenderId: "1021924497902",
  appId: "1:1021924497902:web:629922edf3ffbef0e516ff",
  measurementId: "G-M9SQQB649N"
};


// Global App State
let auth, db;
let currentUser = null;
let garage = {
  activeVehicleId: null,
  vehicles: [],
  fuelLogs: [],
  serviceLogs: [],
  parts: []
};
let isSignUpMode = false;

// Safe Firebase Initializer
try {
  if (typeof firebase === 'undefined') {
    console.error("Firebase SDK failed to load.");
  } else {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    auth = firebase.auth();
    db = firebase.firestore();
  }
} catch (err) {
  console.error("Firebase Init Error:", err);
}

// ------------------------------------------
// 2. AUTH STATE & EVENT LISTENERS
// ------------------------------------------
if (auth) {
  auth.onAuthStateChanged(async (user) => {
    const authScreen = document.getElementById('authScreen');
    const appScreen = document.getElementById('appScreen');

    if (user) {
      currentUser = user;
      if (authScreen) authScreen.classList.add('hidden');
      if (appScreen) appScreen.classList.remove('hidden');
      await loadUserData();
    } else {
      currentUser = null;
      if (authScreen) authScreen.classList.remove('hidden');
      if (appScreen) appScreen.classList.add('hidden');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const authForm = document.getElementById('authForm');
  const authToggleBtn = document.getElementById('authToggleBtn');

  if (authToggleBtn) {
    authToggleBtn.addEventListener('click', toggleAuthMode);
  }

  if (authForm) {
    authForm.addEventListener('submit', handleAuthSubmit);
  }
});

function toggleAuthMode(e) {
  if (e) e.preventDefault();
  isSignUpMode = !isSignUpMode;

  const submitBtn = document.getElementById('authSubmitBtn');
  const toggleText = document.getElementById('authToggleText');
  const toggleBtn = document.getElementById('authToggleBtn');
  const errorEl = document.getElementById('authError');

  if (submitBtn) submitBtn.innerText = isSignUpMode ? "Sign Up" : "Sign In";
  if (toggleText) toggleText.innerText = isSignUpMode ? "Already have an account?" : "Don't have an account?";
  if (toggleBtn) toggleBtn.innerText = isSignUpMode ? "Sign In" : "Sign Up";
  if (errorEl) errorEl.classList.add('hidden');
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('authEmail').value.trim();
  const pass = document.getElementById('authPassword').value;
  const errorEl = document.getElementById('authError');
  const submitBtn = document.getElementById('authSubmitBtn');

  if (!email || !pass) return;

  if (pass.length < 6) {
    if (errorEl) {
      errorEl.innerText = "Password must be at least 6 characters.";
      errorEl.classList.remove('hidden');
    }
    return;
  }

  if (errorEl) errorEl.classList.add('hidden');
  submitBtn.disabled = true;
  submitBtn.innerText = isSignUpMode ? "Creating Account..." : "Signing In...";

  try {
    if (isSignUpMode) {
      await auth.createUserWithEmailAndPassword(email, pass);
    } else {
      await auth.signInWithEmailAndPassword(email, pass);
    }
  } catch (err) {
    console.error("Auth Error:", err);
    if (errorEl) {
      errorEl.innerText = err.message;
      errorEl.classList.remove('hidden');
    } else {
      alert(err.message);
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = isSignUpMode ? "Sign Up" : "Sign In";
  }
}

function logoutUser() {
  if (auth) auth.signOut();
}

// ------------------------------------------
// 3. FIRESTORE DATABASE CONTROLLER
// ------------------------------------------
async function loadUserData() {
  if (!currentUser || !db) return;
  try {
    const docRef = db.collection('users').doc(currentUser.uid);
    const doc = await docRef.get();

    if (doc.exists) {
      garage = doc.data();
    } else {
      // Empty template for brand new user
      garage = {
        activeVehicleId: null,
        vehicles: [],
        fuelLogs: [],
        serviceLogs: [],
        parts: []
      };
      await saveUserData();
    }
    renderAll();
  } catch (err) {
    console.error("Firestore Load Error:", err);
  }
}

async function saveUserData() {
  if (!currentUser || !db) return;
  try {
    await db.collection('users').doc(currentUser.uid).set(garage);
    renderAll();
  } catch (err) {
    console.error("Firestore Save Error:", err);
  }
}

function getActiveVehicle() {
  if (!garage.vehicles || garage.vehicles.length === 0) return null;
  return garage.vehicles.find(v => v.id === garage.activeVehicleId) || garage.vehicles[0];
}

// ------------------------------------------
// 4. UI TAB NAVIGATION & MODALS
// ------------------------------------------
function showTab(tabId, element) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  element.classList.add('active');
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
  const today = new Date().toISOString().split('T')[0];
  if (document.getElementById('fDate')) document.getElementById('fDate').value = today;
  if (document.getElementById('sDate')) document.getElementById('sDate').value = today;
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

function switchVehicle(id) {
  garage.activeVehicleId = id;
  saveUserData();
}

// ------------------------------------------
// 5. DATA LOGGING ENGINE
// ------------------------------------------
async function addVehicle(e) {
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

  if (!garage.vehicles) garage.vehicles = [];
  if (!garage.fuelLogs) garage.fuelLogs = [];
  if (!garage.serviceLogs) garage.serviceLogs = [];
  if (!garage.parts) garage.parts = [];

  garage.vehicles.push(newV);
  garage.activeVehicleId = newV.id;

  garage.fuelLogs.push({
    id: 'f_' + Date.now(),
    vehicleId: newV.id,
    date: new Date().toISOString().split('T')[0],
    odo: initOdo,
    liters: 0,
    rate: 0,
    brand: "Initial Odometer Baseline"
  });

  closeModal('vehicleModal');
  await saveUserData();
}

async function addFuelLog(e) {
  e.preventDefault();
  const v = getActiveVehicle();
  if (!v) return;

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
  await saveUserData();
}

async function addServiceLog(e) {
  e.preventDefault();
  const v = getActiveVehicle();
  if (!v) return;

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
  await saveUserData();
}

async function addTrackedPart(e) {
  e.preventDefault();
  const v = getActiveVehicle();
  if (!v) return;

  garage.parts.push({
    id: 'p_' + Date.now(),
    vehicleId: v.id,
    name: document.getElementById('pName').value,
    installedOdo: parseFloat(document.getElementById('pInstalledOdo').value),
    lifeKm: parseFloat(document.getElementById('pLifeKm').value)
  });
  closeModal('partModal');
  await saveUserData();
}

async function saveServiceConfig(e) {
  e.preventDefault();
  const v = getActiveVehicle();
  if (!v) return;
  v.serviceIntervalKm = parseFloat(document.getElementById('cfgIntervalKm').value) || null;
  v.serviceIntervalMonths = parseFloat(document.getElementById('cfgIntervalMonths').value) || null;
  await saveUserData();
}

async function deleteItem(collection, id) {
  garage[collection] = garage[collection].filter(item => item.id !== id);
  await saveUserData();
}

// ------------------------------------------
// 6. FORMULAS & DOM RENDER ENGINE
// ------------------------------------------
function renderAll() {
  const v = getActiveVehicle();
  const selector = document.getElementById('vehicleSelector');

  if (!v) {
    if (selector) selector.innerHTML = '<option>No Bikes Added</option>';
    document.getElementById('statOdo').innerText = '--';
    document.getElementById('statFE').innerText = '--';
    document.getElementById('statCostPerKm').innerText = '--';
    document.getElementById('statServiceDue').innerText = '--';
    document.getElementById('fuelTableBody').innerHTML = '<tr><td colspan="11" style="text-align:center;">Click "+ Add Bike" above to start your garage!</td></tr>';
    document.getElementById('serviceTableBody').innerHTML = '';
    document.getElementById('partsList').innerHTML = '<p style="color:var(--text-muted)">Add a bike to begin tracking.</p>';
    return;
  }

  if (selector) {
    selector.innerHTML = garage.vehicles.map(item => `
      <option value="${item.id}" ${item.id === v.id ? 'selected' : ''}>${item.name}</option>
    `).join('');
  }

  if (document.getElementById('cfgIntervalKm')) {
    document.getElementById('cfgIntervalKm').value = v.serviceIntervalKm || '';
    document.getElementById('cfgIntervalMonths').value = v.serviceIntervalMonths || '';
  }

  const fuels = (garage.fuelLogs || []).filter(f => f.vehicleId === v.id).sort((a,b) => a.odo - b.odo);
  const services = (garage.serviceLogs || []).filter(s => s.vehicleId === v.id).sort((a,b) => a.odo - b.odo);
  const parts = (garage.parts || []).filter(p => p.vehicleId === v.id);

  const latestFuelOdo = fuels.length ? fuels[fuels.length - 1].odo : 0;
  const latestServiceOdo = services.length ? services[services.length - 1].odo : 0;
  const currentOdo = Math.max(latestFuelOdo, latestServiceOdo);

  document.getElementById('statOdo').innerText = currentOdo ? `${currentOdo.toLocaleString()} km` : '--';

  // 1. Calculate Fuel Economics
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
    const totalBill = (s.laborCost || 0) + (s.partsCost || 0);
    serviceTbody.innerHTML += `
      <tr>
        <td>${s.date}</td>
        <td><strong>${s.odo} km</strong></td>
        <td><strong>${s.title}</strong></td>
        <td>${s.garage || '-'}</td>
        <td>${s.mechName || '-'}</td>
        <td>${s.mechPhone ? `<a class="phone-link" href="tel:${s.mechPhone}">📞 ${s.mechPhone}</a>` : '-'}</td>
        <td>${s.billNumber || '-'}</td>
        <td>₹${(s.laborCost || 0).toFixed(2)}</td>
        <td>₹${(s.partsCost || 0).toFixed(2)}</td>
        <td><strong>₹${totalBill.toFixed(2)}</strong></td>
        <td><button class="btn btn-danger" onclick="deleteItem('serviceLogs', '${s.id}')">✕</button></td>
      </tr>
    `;
  });

  // 3. Render Spare Parts Wear Bars
  const partsContainer = document.getElementById('partsList');
  partsContainer.innerHTML = '';
  parts.forEach(p => {
    const usedKm = Math.max(0, currentOdo - p.installedOdo);
    const percentage = Math.min(100, Math.round((usedKm / p.lifeKm) * 100));
    let color = 'var(--green)';
    if (percentage > 70) color = 'var(--yellow)';
    if (percentage >= 95) color = 'var(--red)';

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

  // 4. Smart Service Interval Reminder Engine
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
    const diffTime = targetDate - new Date();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  if (kmRemaining === null && daysRemaining === null) {
    statServiceDue.innerText = "No Interval Set";
    alertEl.classList.add('hidden');
    return;
  }

  let statusText = [];
  if (kmRemaining !== null) statusText.push(`${kmRemaining} km left`);
  if (daysRemaining !== null) statusText.push(`${daysRemaining} days left`);
  statServiceDue.innerText = statusText.join(' or ');

  if ((kmRemaining !== null && kmRemaining <= 0) || (daysRemaining !== null && daysRemaining <= 0)) {
    alertEl.className = 'alert-banner danger';
    alertEl.innerText = `🚨 Service Overdue! Passed threshold (${kmRemaining <= 0 ? 'KM exceeded' : 'Time exceeded'}).`;
  } else if ((kmRemaining !== null && kmRemaining <= 200) || (daysRemaining !== null && daysRemaining <= 15)) {
    alertEl.className = 'alert-banner warning';
    alertEl.innerText = `⚠️ Service Due Soon: ${statusText.join(' | ')}`;
  } else {
    alertEl.classList.add('hidden');
  }
}
