// === КОНФИГУРАЦИЯ ===
const CONFIG = {
  // ⚠️ ЗАМЕНИТЕ ЭТОТ URL НА ВАШ НОВЫЙ ИЗ НОВОГО СКРИПТА
  API_URL: "https://script.google.com/macros/s/AKfycbzkLbw9dekhpuQsctrdTRkMitrNhSsg7bqDRpSYnhcPqScLlhRzisoTcx1p8ECbzUTF/exec",
  SHEET_IDS: {
    "ULN": "1wX3MOY3OMFl1sTZCKyZvusjnpnjn8dn9VLKUBkqjJ9w",
    "VRN": "1Ai820refQUAqUjNbfrv5ZUTP1pQqY3-MFqyF92U-a2A",
    "SMR": "1iEUoKlBXm7Nm3ixaDEQ8HFLcVh0hbfaL2Kwjxh25Uc0",
    "KRD": "1TyyLWAlbY8ohpmgdBbIi1iXZCTkxwm4psQdSpNu1iaI",
    "NBCH": "1a6pwlwjnmdl3U43JeLBDqmVBKepJfy-RsUKE8e7GxE0",
    "VLG": "1a8Q2fNaIMNUnctpktbnu_I9GgKCzWW_S4wf39QGpc-M"
  }

};

// === МАССОВЫЙ ПОИСК ГМ ===
function openBulkCitySelection() {
  pushNavState({ screen: 'bulkCitySelection' });
}

function bulkGoBackToMain() {
  history.back();
}

function bulkGoBackToCitySelection() {
  history.back();
}

function selectBulkCity(cityCode, cityName) {
  bulkCity = cityCode;
  bulkCityName = cityName;
  bulkCurrentCityElement.textContent = `РЦ: ${cityName}`;
  pushNavState({ screen: 'bulkSearch', cityCode, cityName });
  if (cityCode === 'ALL') {
    bulkResultText.innerHTML = `📦 Массовый поиск: <strong>ВСЕ РЦ</strong><br><br>
                                Поиск по всем городам займет больше времени.<br>
                                Мы проверим до 10 ГМ в каждой таблице.<br><br>
                                <small>Только цифры</small>`;
  } else {
    bulkResultText.innerHTML = `📦 Массовый поиск ГМ: <strong>${cityName}</strong><br><br>
                              Вставьте до 10 номеров (Enter/запятая)<br>
                              или заполните поля ниже.<br><br>
                              <small>Только цифры</small>`;
  }
  showToast(`Выбран режим: ${cityName}`);
}

function parseBulkGmListFromUi() {
  const fromTextarea = (bulkGmTextarea.value || '')
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(Boolean);

  const fromFields = bulkGmInputs
    .map(i => (i.value || '').trim())
    .filter(Boolean);

  const merged = [];
  const seen = new Set();
  for (const v of [...fromTextarea, ...fromFields]) {
    if (seen.has(v)) continue;
    seen.add(v);
    merged.push(v);
  }

  return merged.slice(0, 10);
}

function showBulkLoading(show) {
  bulkLoadingElement.classList.toggle('active', show);
}

async function fetchGm(city, gm) {
  const params = new URLSearchParams({ gm, text: gm, city });
  const url = `${CONFIG.API_URL}?${params.toString()}`;
  const response = await fetch(url, { method: 'GET' });
  return response.json();
}

function renderBulkResultItem(gm, data) {
  if (!data || !data.ok) {
    return `
      <div class="bulk-result-item error">
        <div class="bulk-result-title">❌ ГМ: ${gm}</div>
        <div class="bulk-result-body">Ошибка: ${(data && data.error) ? data.error : 'Неизвестная ошибка'}</div>
      </div>
    `;
  }

  const res = data.result || {};

  if (!res.found && res.correctCity) {
    return `
      <div class="bulk-result-item wrong">
        <div class="bulk-result-title">⚠️ ГМ: ${gm}</div>
        <div class="bulk-result-body">${formatText(res.text || '')}</div>
        <button class="switch-city-btn" onclick="bulkSwitchCityAndSearch('${res.correctCity}', '${res.correctCityName}', '${gm}')">
          <span class="material-icons">swap_horiz</span>
          ПЕРЕЙТИ В РЦ ${String(res.correctCityName || '').toUpperCase()}
        </button>
      </div>
    `;
  }

  return `
    <div class="bulk-result-item ${res.found ? 'ok' : 'nf'}">
      <div class="bulk-result-title">${res.found ? '✅' : '😔'} ГМ: ${gm}</div>
      <div class="bulk-result-body">${formatText(res.text || '')}</div>
    </div>
  `;
}

async function bulkSearchGm() {
  if (!bulkCity || !bulkCityName) {
    showToast('Сначала выберите РЦ');
    return;
  }

  const gmList = parseBulkGmListFromUi();
  if (!gmList.length) {
    showToast('Введите хотя бы один номер ГМ');
    return;
  }

  const bad = gmList.find(x => !/^\d+$/.test(x));
  if (bad) {
    showToast(`ГМ должен содержать только цифры: ${bad}`);
    return;
  }

  showBulkLoading(true);
  bulkResultText.innerHTML = `⏳ Ищем в базе данных...<br><br><small>РЦ: ${bulkCityName}</small>`;

  try {
    const results = [];
    for (const gm of gmList) {
      try {
        const r = await fetchGm(bulkCity, gm);
        results.push({ gm, r });
      } catch (e) {
        results.push({ gm, r: { ok: false, error: e.message } });
      }
    }

    const html = results.map(x => renderBulkResultItem(x.gm, x.r)).join('');
    bulkResultText.innerHTML = html || 'Нет результатов';
  } finally {
    showBulkLoading(false);
  }
}

function bulkSwitchCityAndSearch(cityCode, cityName, gm) {
  selectBulkCity(cityCode, cityName);
  bulkGmTextarea.value = gm;
  bulkGmInputs.forEach(i => (i.value = ''));
  bulkSearchGm();
}

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let currentCity = "ULN";
let currentCityName = "Ульяновск";

// === DOM ЭЛЕМЕНТЫ ===
const citySelectionScreen = document.getElementById('citySelection');
const searchScreen = document.getElementById('searchScreen');
const currentCityElement = document.getElementById('currentCity');
const gmInput = document.getElementById('gmInput');
const resultText = document.getElementById('resultText');
const loadingElement = document.getElementById('loading');
const helpModal = document.getElementById('helpModal');
const helpContent = document.getElementById('helpContent');
const toast = document.getElementById('toast');

// === DOM ЭЛЕМЕНТЫ (МАССОВЫЙ ПОИСК) ===
const bulkCitySelectionScreen = document.getElementById('bulkCitySelection');
const bulkSearchScreen = document.getElementById('bulkSearchScreen');
const bulkCurrentCityElement = document.getElementById('bulkCurrentCity');
const bulkGmTextarea = document.getElementById('bulkGmTextarea');
const bulkGmInputs = Array.from(document.querySelectorAll('.bulk-gm'));
const bulkResultText = document.getElementById('bulkResultText');
const bulkLoadingElement = document.getElementById('bulkLoading');

let bulkCity = null;
let bulkCityName = null;

// === НАВИГАЦИЯ (HISTORY API) ===
function applyNavState(state) {
  const screen = state && state.screen ? state.screen : 'main';

  citySelectionScreen.classList.toggle('active', screen === 'main');
  searchScreen.classList.toggle('active', screen === 'search');
  bulkCitySelectionScreen.classList.toggle('active', screen === 'bulkCitySelection');
  bulkSearchScreen.classList.toggle('active', screen === 'bulkSearch');

  if (screen === 'search') {
    currentCity = state.cityCode || currentCity;
    currentCityName = state.cityName || currentCityName;
    currentCityElement.textContent = `РЦ: ${currentCityName}`;
  }

  if (screen === 'bulkSearch') {
    bulkCity = state.cityCode || bulkCity;
    bulkCityName = state.cityName || bulkCityName;
    if (bulkCityName) {
      bulkCurrentCityElement.textContent = `РЦ: ${bulkCityName}`;
    }
  }
}

function pushNavState(state) {
  history.pushState(state, '');
  applyNavState(state);
}

// === ВЫБОР ГОРОДА ===
function selectCity(cityCode, cityName) {
  currentCity = cityCode;
  currentCityName = cityName;
  currentCityElement.textContent = `РЦ: ${cityName}`;
  pushNavState({ screen: 'search', cityCode, cityName });
  if (cityCode === 'ALL') {
    resultText.innerHTML = `🔍 Поиск по <strong>ВСЕМ РЦ</strong><br><br>
                            Это может занять немного больше времени (до 10-15 сек).<br>
                            Мы проверим все таблицы по очереди.<br><br>
                            Введите номер ГМ<br><br>
                            Пример: 112472979`;
  } else {
    resultText.innerHTML = `🔍 Поиск довозов: <strong>${cityName}</strong><br><br>
                          Введите номер ГМ для поиска<br>
                          (только цифры, без букв и символов)<br><br>
                          Пример: 112472979<br><br>
                          <small>Номер ГМ содержит только цифры</small>`;
  }
  showToast(`Выбран режим: ${cityName}`);
}

// === НАЗАД К ВЫБОРУ ГОРОДА ===
function goBack() {
  history.back();
}

// === ПОИСК ГМ ===
async function searchGm() {
  const gmNumber = gmInput.value.trim();
  if (!gmNumber) {
    showToast("Введите номер ГМ");
    return;
  }
  if (!/^\d+$/.test(gmNumber)) {
    showToast("Номер ГМ должен содержать только цифры");
    return;
  }

  showLoading(true);
  resultText.textContent = "⏳ Ищем в базе данных...";

  try {
    // 🔹 ИСПОЛЬЗУЕМ GET (не POST!)
    const params = new URLSearchParams({
      gm: gmNumber,
      text: gmNumber,
      city: currentCity
    });
    const url = `${CONFIG.API_URL}?${params.toString()}`;
    
    const response = await fetch(url, { method: 'GET' });
    const data = await response.json();

    if (data.ok) {
      const res = data.result;
      if (!res.found && res.correctCity) {
        // Если ГМ от другого города, предлагаем переключиться
        resultText.innerHTML = `
          <div class="wrong-city-box">
            <p>${formatText(res.text)}</p>
            <button class="switch-city-btn" onclick="selectCity('${res.correctCity}', '${res.correctCityName}')">
              <span class="material-icons">swap_horiz</span>
              ПЕРЕЙТИ В РЦ ${res.correctCityName.toUpperCase()}
            </button>
          </div>
        `;
      } else {
        resultText.innerHTML = formatText(res.text || "📊 Ответ получен");
      }
    } else {
      resultText.textContent = `❌ Ошибка: ${data.error || "Неизвестная ошибка"}`;
    }
  } catch (error) {
    resultText.innerHTML = `⚠️ Ошибка подключения<br><br>
      Не удалось подключиться к серверу.<br>
      Проверьте интернет.<br><br>
      <small>Ошибка: ${error.message}</small>`;
  } finally {
    showLoading(false);
  }
}

// === ПРОВЕРКА СООТВЕТСТВИЯ ГОРОДА И ГМ ===
function checkCityConsistency(gmNumber) {
  const firstDigit = gmNumber.charAt(0);
  let expectedCity = null;
  switch(firstDigit) {
    case '1': case '2': case '4': case '9': expectedCity = "ULN"; break;
    case '5': expectedCity = "VRN"; break;
    case '6': expectedCity = "SMR"; break;
    case '3': expectedCity = "KRD"; break;
    case '7': expectedCity = "NBCH"; break;
    case '8': expectedCity = "VLG"; break;
  }
  if (expectedCity && expectedCity !== currentCity) {
    showToast(`⚠️ Вы ищете ГМ другого города. Выбран РЦ: ${currentCityName}`, 4000);
  }
}

// === ФОРМАТИРОВАНИЕ ТЕКСТА ===
function formatText(text) {
  return text.replace(/\n/g, '<br>')
             .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
             .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

// === ЗАГРУЗКА И ТОСТЫ ===
function showLoading(show) {
  loadingElement.classList.toggle('active', show);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

async function hardResetCacheAndReload() {
  try {
    showToast('Сброс кеша...');

    if (typeof caches !== 'undefined' && caches.keys) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }

    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }

    try { localStorage.clear(); } catch (_) {}
    try { sessionStorage.clear(); } catch (_) {}
  } finally {
    location.reload();
  }
}

function showHelp() {
  const helpText = `
    <h4>📋 Помощь по использованию</h4>
    <p><strong>Выбран РЦ:</strong> ${currentCityName}</p>
    <p><strong>Что можно искать:</strong></p>
    <ul><li>Номер ГМ (ШК) из РАН - только цифры</li></ul>
    <p><strong>Что НЕЛЬЗЯ:</strong></p>
    <ul><li>Накладные (123/456), текст, буквы</li></ul>
    <p><strong>Города и цифры:</strong></p>
    <ul>
      <li>1,2,4,9 – Ульяновск</li>
      <li>5 – Воронеж</li>
      <li>6 – Самара</li>
      <li>3 – Краснодар</li>
      <li>7 – НБЧ</li>
      <li>8 – Волгоград</li>
    </ul>
  `;
  helpContent.innerHTML = helpText;
  helpModal.classList.add('active');
}

function closeHelp() {
  helpModal.classList.remove('active');
}

// === ОБРАБОТЧИКИ ===
gmInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') searchGm();
});

helpModal.addEventListener('click', (e) => {
  if (e.target === helpModal) closeHelp();
});

if (bulkGmTextarea) {
  bulkGmTextarea.addEventListener('blur', () => {
    const list = (bulkGmTextarea.value || '')
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 10);

    bulkGmInputs.forEach((input, idx) => {
      input.value = list[idx] || '';
    });
  });
}

// === ИНИЦИАЛИЗАЦИЯ ===
document.addEventListener('DOMContentLoaded', () => {
  const cacheResetBtn = document.getElementById('cacheResetBtn');
  if (cacheResetBtn) {
    let pressTimer = null;
    const startPress = () => {
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = setTimeout(() => {
        pressTimer = null;
        hardResetCacheAndReload();
      }, 1200);
    };
    const endPress = () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    cacheResetBtn.addEventListener('pointerdown', startPress);
    cacheResetBtn.addEventListener('pointerup', endPress);
    cacheResetBtn.addEventListener('pointercancel', endPress);
    cacheResetBtn.addEventListener('pointerleave', endPress);
    cacheResetBtn.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('✅ Service Worker зарегистрирован'))
      .catch(err => console.error('❌ Ошибка Service Worker:', err));
  }

  // Базовое состояние навигации, чтобы системная кнопка "Назад" работала внутри PWA
  if (!history.state || !history.state.screen) {
    history.replaceState({ screen: 'main' }, '');
  }
  applyNavState(history.state);

  window.addEventListener('popstate', (e) => {
    applyNavState(e.state);
  });

  gmInput.focus();
});
