// js/sync.js
// Модуль синхронизации и переноса прогресса между устройствами (ПК, ноутбук, телефон, GitHub)

class ProgressSyncManager {
    constructor() {
        this.DEFAULT_GDRIVE_URL = '';
        this.modal = null;
        this.initDOM();
        this.checkUrlSync();
        this.checkDefaultRepoProgress();
    }

    initDOM() {
        this.modal = document.getElementById('sync-modal');
        const openBtn = document.getElementById('btn-open-sync-modal');
        const closeBtn = document.getElementById('sync-modal-close-btn');

        openBtn?.addEventListener('click', () => this.openModal());
        closeBtn?.addEventListener('click', () => this.closeModal());

        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });

        // Обработчик загрузки файла прогресса
        const fileInput = document.getElementById('sync-file-input');
        fileInput?.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (this.applyProgressData(data)) {
                        alert('🎉 Прогресс успешно загружен из файла!');
                        window.location.reload();
                    } else {
                        alert('✖ Некорректный формат файла прогресса.');
                    }
                } catch (err) {
                    alert('✖ Ошибка при чтении JSON-файла: ' + err.message);
                }
            };
            reader.readAsText(file);
        });
    }

    openModal() {
        if (!this.modal) return;
        this.renderModalContent();
        this.modal.classList.remove('hidden');
    }

    closeModal() {
        if (!this.modal) return;
        this.modal.classList.add('hidden');
    }

    // Сбор всего прогресса из localStorage (все ключи с префиксом alt_)
    exportAllProgress() {
        const progress = {
            version: 1,
            exportedAt: new Date().toISOString(),
            storage: {}
        };

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('alt_')) {
                    progress.storage[key] = localStorage.getItem(key);
                }
            }
        } catch (e) {
            console.error('Ошибка экспорта localStorage:', e);
        }

        return progress;
    }

    // Применение данных прогресса в localStorage
    applyProgressData(data) {
        if (!data || !data.storage || typeof data.storage !== 'object') {
            return false;
        }

        try {
            for (const [key, val] of Object.entries(data.storage)) {
                if (key.startsWith('alt_') && typeof val === 'string') {
                    localStorage.setItem(key, val);
                }
            }
            return true;
        } catch (e) {
            console.error('Ошибка записи в localStorage:', e);
            return false;
        }
    }

    // Подсчет статистики для отображения в модалке
    getProgressSummary() {
        const completedTasks = JSON.parse(localStorage.getItem('alt_completed_tasks_v2') || '[]');
        const teacherTasks = JSON.parse(localStorage.getItem('alt_teacher_completed') || '[]');
        const checklist = JSON.parse(localStorage.getItem('alt_checklist_state') || '{}');
        const checklistCount = Object.values(checklist).filter(Boolean).length;
        const teacherScore = parseInt(localStorage.getItem('alt_teacher_score') || '0', 10);
        const quizScore = parseInt(localStorage.getItem('alt_topo_quiz_score') || '0', 10);

        return {
            tasksCount: completedTasks.length,
            teacherCount: teacherTasks.length,
            teacherScore,
            checklistCount,
            quizScore
        };
    }

    // Построение ссылки для моментальной синхронизации
    getSyncUrl() {
        const progress = this.exportAllProgress();
        const jsonStr = JSON.stringify(progress);
        const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}#sync=${b64}`;
    }

    renderModalContent() {
        const summary = this.getProgressSummary();
        const syncUrl = this.getSyncUrl();
        const progressJson = JSON.stringify(this.exportAllProgress(), null, 2);

        // QR-код через сервис QuickChart / QRServer
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(syncUrl)}`;

        const bodyEl = document.getElementById('sync-modal-body');
        if (!bodyEl) return;

        bodyEl.innerHTML = `
            <!-- Сводка текущего прогресса -->
            <div class="sync-summary-card mb-3">
                <div class="d-flex justify-between align-center flex-wrap gap-2 mb-2">
                    <span class="text-xs text-muted">📊 Текущий прогресс на этом устройстве:</span>
                    <span class="badge badge-success">${summary.tasksCount} / 101 заданий выполнено</span>
                </div>
                <div class="sync-stats-grid">
                    <div class="sync-stat-item">
                        <span class="sync-stat-num text-cyan">${summary.tasksCount}</span>
                        <span class="sync-stat-lbl">Практика 2–8</span>
                    </div>
                    <div class="sync-stat-item">
                        <span class="sync-stat-num text-yellow">${summary.teacherCount}</span>
                        <span class="sync-stat-lbl">У преподавателя</span>
                    </div>
                    <div class="sync-stat-item">
                        <span class="sync-stat-num text-green">${summary.checklistCount}/5</span>
                        <span class="sync-stat-lbl">Чек-лист</span>
                    </div>
                    <div class="sync-stat-item">
                        <span class="sync-stat-num text-purple">${summary.quizScore}</span>
                        <span class="sync-stat-lbl">Блиц-тест</span>
                    </div>
                </div>
            </div>

            <!-- Вкладки способов синхронизации -->
            <div class="subtabs-group mb-3" id="sync-subtabs">
                <button class="trouble-subtab active" onclick="progressSyncManager.switchSyncTab('qr')">📱 На телефон (QR / Ссылка)</button>
                <button class="trouble-subtab" onclick="progressSyncManager.switchSyncTab('gdrive')">☁️ Google Диск</button>
                <button class="trouble-subtab" onclick="progressSyncManager.switchSyncTab('file')">💾 Файл / Репозиторий</button>
                <button class="trouble-subtab" onclick="progressSyncManager.switchSyncTab('code')">📋 Код вручную</button>
            </div>

            <!-- Способ 1: QR-код и прямая ссылка -->
            <div id="sync-tab-qr" class="sync-tab-pane">
                <div class="d-flex gap-3 align-center flex-wrap mb-3">
                    <div class="qr-box">
                        <img src="${qrUrl}" alt="QR код для синхронизации" width="160" height="160" style="border-radius:6px; background:#fff; padding:6px;">
                    </div>
                    <div style="flex:1; min-width:240px;">
                        <h4 class="text-cyan mb-1">Как открыть на телефоне за 2 секунды:</h4>
                        <ol class="text-xs text-light mb-2" style="padding-left:1.2rem; line-height:1.5;">
                            <li>Наведите камеру смартфона на этот QR-код.</li>
                            <li>Откройте появившуюся ссылку в браузере телефона.</li>
                            <li>Тренажёр автоматически считает весь ваш прогресс и перенесёт его!</li>
                        </ol>
                        <button class="btn btn-sm btn-outline text-cyan w-100" onclick="progressSyncManager.copySyncUrl()">
                            📋 Скопировать ссылку синхронизации
                        </button>
                    </div>
                </div>
            </div>

            <!-- Способ 2: Google Диск (Персональный Webhook) -->
            <div id="sync-tab-gdrive" class="sync-tab-pane hidden">
                <div class="alert alert-info text-xs mb-3">
                    <b>☁️ Синхронизация с вашим личным Google Диском:</b><br>
                    Файл <code>alt_trainer_progress.json</code> сохраняется в ваш личный Google Диск. Другие пользователи сайта никак не могут его увидеть или перезаписать!
                </div>
                <div class="mb-3">
                    <label class="text-xs text-light mb-1 d-block">Ваш личный URL скрипта Google Apps Script:</label>
                    <input type="text" id="gdrive-webhook-url" class="term-input mb-1" style="width:100%; font-size:0.8rem; padding:0.45rem;" 
                           placeholder="https://script.google.com/macros/s/.../exec"
                           value="${this.getSavedGDriveUrl()}">
                    <span class="text-xs text-muted">Сохраняется только в вашем браузере. Достаточно ввести один раз.</span>
                </div>
                <div class="d-flex gap-2 flex-wrap mb-2">
                    <button class="btn btn-sm btn-success" onclick="progressSyncManager.saveToGDrive()">
                        💾 Сохранить на Google Диск
                    </button>
                    <button class="btn btn-sm btn-outline text-cyan" onclick="progressSyncManager.loadFromGDrive()">
                        📥 Загрузить с Google Диска
                    </button>
                    <button class="btn btn-sm btn-outline text-yellow" onclick="progressSyncManager.toggleGDriveInstructions()">
                        ❓ Как настроить за 1 минуту
                    </button>
                </div>
                <div id="gdrive-setup-instructions" class="hidden alert alert-info text-xs mt-3" style="background:#070d18; border-color:rgba(56, 189, 248, 0.35);">
                    <h5 class="text-yellow mb-2">📝 4 простых шага для подключения вашего Google Диска:</h5>
                    <ol style="padding-left:1.2rem; line-height:1.6;" class="text-light">
                        <li>Откройте <a href="https://script.google.com/home/start" target="_blank" class="text-cyan underline">script.google.com</a> (под вашим аккаунтом Google) и нажмите <b>«Новый проект»</b>.</li>
                        <li>Сотрите всё и вставьте этот мини-код (всего 15 строк):
<pre style="background:#020617; padding:0.5rem; border-radius:4px; margin:0.3rem 0; overflow-x:auto; color:#38bdf8;">function doGet() {
  var f = DriveApp.getFilesByName("alt_trainer_progress.json");
  return ContentService.createTextOutput(f.hasNext() ? f.next().getBlob().getDataAsString() : "{}").setMimeType(ContentService.MimeType.JSON);
}
function doPost(e) {
  var f = DriveApp.getFilesByName("alt_trainer_progress.json");
  if (f.hasNext()) { f.next().setContent(e.postData.contents); }
  else { DriveApp.createFile("alt_trainer_progress.json", e.postData.contents, MimeType.PLAIN_TEXT); }
  return ContentService.createTextOutput('{"status":"ok"}').setMimeType(ContentService.MimeType.JSON);
}</pre>
                        </li>
                        <li>Нажмите синюю кнопку <b>«Развернуть» ➔ «Новое развертывание»</b>, выберите тип <b>«Веб-приложение»</b>, в поле <i>«У кого есть доступ»</i> укажите <b>«Все»</b> (Anyone), и нажмите «Развернуть».</li>
                        <li>Скопируйте полученный <b>URL веб-приложения</b> и вставьте в поле выше! Всё готово!</li>
                    </ol>
                </div>
            </div>

            <!-- Способ 2: Файл прогресса и GitHub -->
            <div id="sync-tab-file" class="sync-tab-pane hidden">
                <div class="alert alert-info text-xs mb-3">
                    <b>📁 Как залить прогресс прямо в GitHub-репозиторий:</b><br>
                    1. Нажмите <b>«Скачать файл прогресса»</b> ниже (скачается <code>alt_progress.json</code>).<br>
                    2. Переименуйте его в <code>default_progress.json</code> и положите в папку проекта.<br>
                    3. Залейте на GitHub (<code>git push</code>) — теперь любой, кто открывает ваш сайт на GitHub Pages, сможет загрузить ваш прогресс в 1 клик!
                </div>
                <div class="d-flex gap-2 flex-wrap mb-3">
                    <button class="btn btn-sm btn-success" onclick="progressSyncManager.downloadProgressFile()">
                        📥 Скачать файл прогресса (.json)
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="document.getElementById('sync-file-input').click()">
                        📤 Загрузить файл с диска
                    </button>
                </div>
            </div>

            <!-- Способ 3: Текстовый код -->
            <div id="sync-tab-code" class="sync-tab-pane hidden">
                <p class="text-xs text-muted mb-2">Скопируйте этот текст и отправьте себе (например, в Избранное Telegram), а на втором устройстве вставьте сюда и нажмите «Применить»:</p>
                <textarea id="sync-raw-textarea" class="term-input" style="width:100%; height:110px; font-size:0.75rem; font-family:var(--font-mono); resize:vertical; padding:0.5rem;" readonly>${progressJson}</textarea>
                <div class="d-flex gap-2 mt-2">
                    <button class="btn btn-sm btn-outline text-cyan" onclick="progressSyncManager.copyCodeText()">
                        📋 Скопировать код
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="progressSyncManager.applyFromPrompt()">
                        📥 Вставить чужой код и применить
                    </button>
                </div>
            </div>
        `;
    }

    switchSyncTab(tabId) {
        document.querySelectorAll('#sync-subtabs .trouble-subtab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.sync-tab-pane').forEach(p => p.classList.add('hidden'));

        const targetPane = document.getElementById(`sync-tab-${tabId}`);
        if (targetPane) targetPane.classList.remove('hidden');

        // Подсветка активной кнопки
        const eventBtn = window.event?.target;
        if (eventBtn) eventBtn.classList.add('active');
    }

    getSavedGDriveUrl() {
        let saved = localStorage.getItem('alt_gdrive_sync_url');
        // Если запускается с локального компьютера автора, автоматически подключаем персональный скрипт
        if (!saved && (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            saved = 'https://script.google.com/macros/s/AKfycbzHFwQDagJUNcEqyP7Jg7D0BBqgmtJfyXfRQYPye2QtrWLxj6Bev3eI6jpFNU0KDy52/exec';
            localStorage.setItem('alt_gdrive_sync_url', saved);
        }
        return saved || '';
    }

    toggleGDriveInstructions() {
        const box = document.getElementById('gdrive-setup-instructions');
        if (box) box.classList.toggle('hidden');
    }

    async saveToGDrive() {
        const input = document.getElementById('gdrive-webhook-url');
        const url = (input?.value || this.getSavedGDriveUrl()).trim();
        if (!url || !url.startsWith('https://script.google.com/')) {
            alert('✖ Введите корректный URL веб-приложения Google Apps Script (начинается с https://script.google.com/...)');
            return;
        }

        localStorage.setItem('alt_gdrive_sync_url', url);
        const progress = this.exportAllProgress();

        try {
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(progress)
            });
            alert('🎉 Прогресс успешно сохранён на ваш Google Диск!\nФайл: alt_trainer_progress.json');
        } catch (err) {
            try {
                await fetch(url, {
                    method: 'POST',
                    mode: 'no-cors',
                    body: JSON.stringify(progress)
                });
                alert('✔ Запрос на сохранение отправлен в Google Диск!\nФайл alt_trainer_progress.json обновлён.');
            } catch (fallbackErr) {
                alert('✖ Ошибка соединения с Google Apps Script: ' + fallbackErr.message);
            }
        }
    }

    async loadFromGDrive() {
        const input = document.getElementById('gdrive-webhook-url');
        const url = (input?.value || this.getSavedGDriveUrl()).trim();
        if (!url || !url.startsWith('https://script.google.com/')) {
            alert('✖ Введите корректный URL веб-приложения Google Apps Script');
            return;
        }

        localStorage.setItem('alt_gdrive_sync_url', url);

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data && data.storage) {
                this.applyProgressData(data);
                alert('🎉 Прогресс успешно загружен с вашего Google Диска!');
                window.location.reload();
            } else {
                alert('ℹ Файл на Google Диске пока пуст или не содержит прогресса. Сначала нажмите «Сохранить на Google Диск».');
            }
        } catch (err) {
            alert('✖ Не удалось загрузить прогресс из Google Apps Script: ' + err.message + '\nУбедитесь, что веб-приложение развернуто с доступом "Все" (Anyone).');
        }
    }

    copySyncUrl() {
        const url = this.getSyncUrl();
        navigator.clipboard.writeText(url).then(() => {
            alert('✔ Ссылка для синхронизации скопирована в буфер обмена!\nОтправьте её себе на телефон или другое устройство.');
        }).catch(() => {
            prompt('Скопируйте ссылку вручную:', url);
        });
    }

    copyCodeText() {
        const ta = document.getElementById('sync-raw-textarea');
        if (!ta) return;
        navigator.clipboard.writeText(ta.value).then(() => {
            alert('✔ Код прогресса скопирован в буфер обмена!');
        }).catch(() => {
            ta.select();
            document.execCommand('copy');
            alert('✔ Скопировано!');
        });
    }

    downloadProgressFile() {
        const progress = this.exportAllProgress();
        const blob = new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `alt_progress_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }

    applyFromPrompt() {
        const code = prompt('Вставьте ранее скопированный JSON-код прогресса:');
        if (!code) return;
        try {
            const data = JSON.parse(code.trim());
            if (this.applyProgressData(data)) {
                alert('🎉 Прогресс успешно применён!');
                window.location.reload();
            } else {
                alert('✖ Некорректный формат данных.');
            }
        } catch (e) {
            alert('✖ Ошибка при парсинге JSON: ' + e.message);
        }
    }

    // Автоматический перенос по ссылке #sync=...
    checkUrlSync() {
        if (!window.location.hash || !window.location.hash.startsWith('#sync=')) return;

        try {
            const rawB64 = window.location.hash.substring(6);
            const jsonStr = decodeURIComponent(escape(atob(rawB64)));
            const data = JSON.parse(jsonStr);

            if (this.applyProgressData(data)) {
                // Убираем длинный хеш из адресной строки без перезагрузки
                try {
                    history.replaceState(null, null, window.location.pathname);
                } catch (e) {}

                alert('🎉 Прогресс успешно перенесён и синхронизирован на этом устройстве!');
                window.location.reload();
            }
        } catch (e) {
            console.error('Ошибка импорта прогресса из URL-хеша:', e);
        }
    }

    // Автоматическая подгрузка дефолтного прогресса из GitHub-репозитория, если на устройстве пусто
    checkDefaultRepoProgress() {
        // Если уже есть локально решенные задания — не перезаписываем
        try {
            const localCompleted = JSON.parse(localStorage.getItem('alt_completed_tasks_v2') || '[]');
            if (localCompleted.length > 0) return;
        } catch (e) {
            return;
        }

        // Проверяем наличие файла default_progress.json в репозитории
        fetch('default_progress.json')
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('No default_progress.json');
            })
            .then(data => {
                if (data && data.storage) {
                    const tasks = JSON.parse(data.storage.alt_completed_tasks_v2 || '[]');
                    if (tasks.length > 0) {
                        const accept = confirm(`Найдено сохранение из GitHub-репозитория (пройдено заданий: ${tasks.length}). Загрузить этот прогресс на текущее устройство?`);
                        if (accept) {
                            this.applyProgressData(data);
                            window.location.reload();
                        }
                    }
                }
            })
            .catch(() => {
                // Файла нет или ошибка — ничего страшного, нормальный пустой старт
            });
    }
}

// Глобальная инициализация
window.ProgressSyncManager = ProgressSyncManager;
