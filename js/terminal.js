// Модуль интерактивного терминала-тренажёра (Практики 2–8)
// Включает:
// 1. Пошаговый тренажер всех команд стенда (97 заданий)
// 2. Блокировку ответа до первой попытки (с прогрессивными подсказками)
// 3. Интервальное повторение (задание с открытым ответом возвращается через 3 шага)
// 4. Карточку разбора команды ("Почему именно так?") с подробным объяснением каждого флага и параметра

class TerminalTrainer {
    constructor() {
        this.completedTasks = new Set(JSON.parse(localStorage.getItem('alt_completed_tasks_v2') || '[]'));
        this.history = [];
        this.historyIndex = -1;
        this.streak = 0;
        this.currentTaskAttempts = 0;
        this.hintsViewed = { h1: false, h2: false };
        this.autoAdvanceTimer = null;
        this.cwd = '/root';

        // Восстанавливаем выбранную тему
        const savedTopic = localStorage.getItem('alt_term_current_topic') || 'all';
        this.currentTopic = savedTopic;

        this.initDOMElements();
        if (this.topicSelect) {
            this.topicSelect.value = this.currentTopic;
        }

        this.bindEvents();
        this.filterTasks(this.currentTopic, false);
    }

    initDOMElements() {
        this.termOutput = document.getElementById('terminal-output');
        this.termInput = document.getElementById('terminal-input');
        this.termPrompt = document.getElementById('terminal-prompt');
        this.taskTitle = document.getElementById('task-title');
        this.taskDesc = document.getElementById('task-desc');
        this.taskBadge = document.getElementById('task-badge');
        this.taskCounter = document.getElementById('task-counter');
        this.btnHint1 = document.getElementById('btn-hint1');
        this.btnHint2 = document.getElementById('btn-hint2');
        this.btnShowAnswer = document.getElementById('btn-show-answer');
        this.hintBox = document.getElementById('hint-box');
        this.topicSelect = document.getElementById('terminal-topic-filter');
        this.statCompleted = document.getElementById('stat-term-completed');
        this.statStreak = document.getElementById('stat-term-streak');
        this.taskNavContainer = document.getElementById('term-task-nav');
        this.btnReset = document.getElementById('btn-reset-term-progress');

        // Элементы переключения ВМ стенда в режиме практики
        this.practiceVmTabs = document.querySelectorAll('.practice-vm-tab');
        this.practiceVmBanner = document.getElementById('practice-vm-inspect-banner');
        this.btnReturnToTask = document.getElementById('btn-return-to-task');
        this.inspectingVm = null;
    }

    bindEvents() {
        if (!this.termInput) return;

        // Подключение автодополнения Tab (как в реальном Альт Линуксе)
        if (window.altTabCompleter) {
            window.altTabCompleter.attachToInput(
                this.termInput,
                this.termOutput,
                () => this.termPrompt?.textContent || 'root@alt:~# '
            );
        }

        // Ввод команды
        this.termInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (this.isWaitingNext) {
                    e.preventDefault();
                    if (this.advanceCallback) this.advanceCallback();
                    return;
                }
                this.handleCommand(this.termInput.value);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateHistory(-1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateHistory(1);
            }
        });

        // Кнопки подсказок
        this.btnHint1?.addEventListener('click', () => this.showHint(1));
        this.btnHint2?.addEventListener('click', () => this.showHint(2));
        this.btnShowAnswer?.addEventListener('click', () => this.requestShowAnswer(false));

        // Смена темы
        this.topicSelect?.addEventListener('change', (e) => {
            this.filterTasks(e.target.value, true);
        });

        // Переключение виртуальных машин стенда в практике
        this.practiceVmTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetVm = tab.getAttribute('data-vm');
                const currentTask = this.filteredTasks[this.currentTaskIndex];
                if (!currentTask) return;

                if (targetVm === currentTask.host) {
                    this.inspectingVm = null;
                    this.loadCurrentTask();
                } else {
                    this.switchToInspectVm(targetVm);
                }
            });
        });

        this.btnReturnToTask?.addEventListener('click', () => {
            this.inspectingVm = null;
            this.loadCurrentTask();
        });

        // Кнопка сброса прогресса
        this.btnReset?.addEventListener('click', () => {
            if (confirm("Вы уверены, что хотите сбросить прогресс выполнения практик?")) {
                if (this.autoAdvanceTimer) clearTimeout(this.autoAdvanceTimer);
                this.completedTasks.clear();
                localStorage.removeItem('alt_completed_tasks_v2');
                for (let i = 2; i <= 8; i++) {
                    localStorage.removeItem(`alt_term_index_${i}`);
                }
                localStorage.removeItem('alt_term_index_all');
                this.currentTaskIndex = 0;
                this.streak = 0;
                this.filterTasks(this.currentTopic, true);
            }
        });

        // Горячие клавиши F1, F2, F3 и переход к следующему заданию
        window.addEventListener('keydown', (e) => {
            const secTerm = document.getElementById('sec-terminal');
            if (!secTerm || !secTerm.classList.contains('active')) return;

            if (this.isWaitingNext && (e.key === 'Enter' || e.key === ' ')) {
                if (document.activeElement !== this.termInput) {
                    e.preventDefault();
                    if (this.advanceCallback) this.advanceCallback();
                    return;
                }
            }

            if (e.key === 'F1') {
                e.preventDefault();
                this.showHint(1);
            } else if (e.key === 'F2') {
                e.preventDefault();
                this.showHint(2);
            } else if (e.key === 'F3') {
                e.preventDefault();
                this.requestShowAnswer(false);
            }
        });

        // Кнопка запуска (для мобилок)
        document.getElementById('btn-term-run')?.addEventListener('click', () => {
            if (this.isWaitingNext) {
                if (this.advanceCallback) this.advanceCallback();
                return;
            }
            this.handleCommand(this.termInput.value);
        });

        // Мобильные быстрые клавиши-чипы
        document.querySelectorAll('#sec-terminal .key-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.preventDefault();
                const key = chip.getAttribute('data-key');
                const action = chip.getAttribute('data-action');
                if (action === 'tab') {
                    if (window.altTabCompleter) {
                        window.altTabCompleter.handleTab(this.termInput, this.termOutput, this.termPrompt?.textContent || 'root@isp:~# ');
                        this.termInput.focus();
                    }
                } else if (action === 'clear') {
                    this.termInput.value = '';
                    this.termInput.focus();
                } else if (key) {
                    const start = this.termInput.selectionStart ?? this.termInput.value.length;
                    const end = this.termInput.selectionEnd ?? this.termInput.value.length;
                    const val = this.termInput.value;
                    this.termInput.value = val.substring(0, start) + key + val.substring(end);
                    this.termInput.focus();
                    this.termInput.setSelectionRange(start + key.length, start + key.length);
                }
            });
        });

        // Клик по окну терминала переносит фокус в инпут
        document.querySelector('#sec-terminal .terminal-window')?.addEventListener('click', () => {
            this.termInput.focus();
        });
    }

    filterTasks(topicId, resetIndex = false) {
        if (this.autoAdvanceTimer) clearTimeout(this.autoAdvanceTimer);
        this.currentTopic = topicId;
        localStorage.setItem('alt_term_current_topic', topicId);

        if (topicId === "all") {
            this.filteredTasks = APP_DATA.commandTasks.map(t => Object.assign({}, t));
        } else {
            const tid = parseInt(topicId, 10);
            this.filteredTasks = APP_DATA.commandTasks.filter(t => t.topicId === tid).map(t => Object.assign({}, t));
        }

        // Восстановление индекса задачи
        const savedIndexKey = `alt_term_index_${topicId}`;
        const savedIndex = parseInt(localStorage.getItem(savedIndexKey) || '0', 10);

        if (resetIndex) {
            this.currentTaskIndex = 0;
        } else if (savedIndex >= 0 && savedIndex < this.filteredTasks.length) {
            this.currentTaskIndex = savedIndex;
            // Если сохраненное задание уже сделано, переходим к первому нерешенному
            if (this.completedTasks.has(this.filteredTasks[this.currentTaskIndex]?.id)) {
                const firstUnsolved = this.filteredTasks.findIndex(t => !this.completedTasks.has(t.id));
                if (firstUnsolved !== -1) {
                    this.currentTaskIndex = firstUnsolved;
                }
            }
        } else {
            this.currentTaskIndex = 0;
        }

        this.renderTaskNavigator();
        this.loadCurrentTask();
        this.updateStats();
    }

    renderTaskNavigator() {
        if (!this.taskNavContainer) return;
        this.taskNavContainer.innerHTML = '';

        this.filteredTasks.forEach((task, idx) => {
            const isDone = this.completedTasks.has(task.id) && !task._isRepeat;
            const isRepeat = !!task._isRepeat;
            const isActive = idx === this.currentTaskIndex;

            const pill = document.createElement('button');
            pill.className = `task-pill ${isDone ? 'completed' : ''} ${isRepeat ? 'repeat-pill' : ''} ${isActive ? 'active' : ''}`;
            pill.title = `${task.task}${isRepeat ? ' (Повторение после открытия ответа)' : ''}`;

            if (isRepeat) {
                pill.innerHTML = `↻ ${idx + 1}`;
            } else if (isDone) {
                pill.innerHTML = `✔ ${idx + 1}`;
            } else {
                pill.innerHTML = `${idx + 1}`;
            }

            pill.addEventListener('click', () => {
                if (this.autoAdvanceTimer) clearTimeout(this.autoAdvanceTimer);
                this.currentTaskIndex = idx;
                this.saveState();
                this.renderTaskNavigator();
                this.loadCurrentTask();
            });
            this.taskNavContainer.appendChild(pill);

            if (isActive) {
                setTimeout(() => pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }), 40);
            }
        });
    }

    switchToInspectVm(targetVm) {
        if (this.autoAdvanceTimer) clearTimeout(this.autoAdvanceTimer);
        this.inspectingVm = targetVm;
        this.practiceVmBanner?.classList.remove('hidden');

        this.practiceVmTabs.forEach(tab => {
            const vm = tab.getAttribute('data-vm');
            if (vm === targetVm) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        const promptText = window.standSimulator ? window.standSimulator.getPromptText(targetVm) : `root@${targetVm}:~# `;
        this.termPrompt.textContent = promptText;

        const winHost = document.getElementById('win-term-userhost');
        if (winHost) winHost.textContent = promptText.trim().replace(/#|\$/g, '');

        const currentTask = this.filteredTasks[this.currentTaskIndex];

        this.termOutput.innerHTML = `
            <div class="term-line sys-msg">
                <span class="text-cyan">[Стенд Proxmox VE]</span> Вы переключились на узел <b class="text-green">${targetVm.toUpperCase()}</b> в режиме свободной инспекции.
            </div>
            <div class="term-line sys-msg">
                <span class="text-yellow">Возможности:</span> Проверяйте линки (<code>ip a</code>), пингуйте шлюз (<code>ping 172.16.1.1</code>) или смотрите созданные файлы.
            </div>
            <div class="term-line sys-msg text-muted">
                Чтобы продолжить выполнять <b>Задание #${this.currentTaskIndex + 1} (${currentTask.host.toUpperCase()})</b>, нажмите кнопку вверху <b>«Вернуться к заданию»</b> или выберите его вкладку.
            </div>
        `;

        this.termInput.value = '';
        this.termInput.focus();
    }

    loadCurrentTask() {
        this.isWaitingNext = false;
        this.advanceCallback = null;
        if (this.autoAdvanceTimer) clearTimeout(this.autoAdvanceTimer);
        this.currentTaskAttempts = 0;
        this.hintsViewed = { h1: false, h2: false };
        this.inspectingVm = null;
        this.practiceVmBanner?.classList.add('hidden');

        if (!this.filteredTasks || this.filteredTasks.length === 0) {
            if (this.taskTitle) this.taskTitle.textContent = "Нет заданий в этой категории";
            if (this.taskDesc) this.taskDesc.textContent = "";
            return;
        }

        const task = this.filteredTasks[this.currentTaskIndex];
        const topic = APP_DATA.topics.find(t => t.id === task.topicId);

        // Подсветка активной ВМ в кластерной панели
        this.practiceVmTabs.forEach(tab => {
            const vm = tab.getAttribute('data-vm');
            if (vm === task.host) {
                tab.classList.add('active');
                tab.classList.add('is-task-node');
            } else {
                tab.classList.remove('active');
                tab.classList.remove('is-task-node');
            }
        });

        const repeatBadge = task._isRepeat ? `<span class="badge badge-warning ml-2">↻ Повтор материала</span>` : '';
        if (this.taskTitle) {
            this.taskTitle.innerHTML = `Задание #${this.currentTaskIndex + 1}: ${task.host.toUpperCase()} ${repeatBadge}`;
        }
        if (this.taskDesc) this.taskDesc.textContent = task.task;
        if (this.taskBadge) this.taskBadge.textContent = topic ? topic.badge : `Тема ${task.topicId}`;
        if (this.taskCounter) this.taskCounter.textContent = `${this.currentTaskIndex + 1} / ${this.filteredTasks.length}`;

        const isRoot = task.host !== 'hq-cli';
        this.homeDir = isRoot ? '/root' : '/home/user';
        this.cwd = this.homeDir;
        this.updatePrompt(task);

        this.hintBox.classList.add('hidden');
        this.hintBox.innerHTML = '';
        this.termInput.value = '';
        this.termInput.focus();

        const isDone = this.completedTasks.has(task.id) && !task._isRepeat;

        this.termOutput.innerHTML = `
            <div class="term-line sys-msg">
                <span class="text-cyan">[Стенд Proxmox VE]</span> Виртуальная машина: <b class="text-green">${task.host.toUpperCase()}</b>
                ${isDone ? '<span class="text-success font-bold ml-2">✔ (Выполнено ранее)</span>' : ''}
                ${task._isRepeat ? '<span class="text-yellow font-bold ml-2">↻ (Закрепление после просмотра ответа)</span>' : ''}
            </div>
            <div class="term-line sys-msg">
                <span class="text-yellow">Цель:</span> ${task.task}
            </div>
            <div class="term-line sys-msg text-muted">
                Введите команду и нажмите <b>Enter</b>. Подсказка: <b>F1</b> | Шаблон: <b>F2</b> | Ответ: <b>F3</b>.
            </div>
        `;

        this.renderTaskNavigator();
    }

    updatePrompt(task) {
        const curTask = task || this.filteredTasks[this.currentTaskIndex];
        if (!curTask) return;
        const promptStr = this.getDisplayPrompt(curTask);
        if (this.termPrompt) this.termPrompt.textContent = promptStr;

        const isRoot = curTask.host !== 'hq-cli';
        const user = isRoot ? 'root' : 'user';
        const homeDir = isRoot ? '/root' : '/home/user';
        let pathDisplay = this.cwd || homeDir;
        if (pathDisplay === homeDir) {
            pathDisplay = '~';
        } else if (pathDisplay.startsWith(homeDir + '/')) {
            pathDisplay = '~' + pathDisplay.slice(homeDir.length);
        }

        const winHost = document.getElementById('win-term-userhost');
        if (winHost) winHost.textContent = `${user}@${curTask.host}:${pathDisplay}`;
    }

    getDisplayPrompt(task) {
        const isRoot = task.host !== 'hq-cli';
        const user = isRoot ? 'root' : 'user';
        const homeDir = isRoot ? '/root' : '/home/user';
        const sign = isRoot ? '#' : '$';

        let pathDisplay = this.cwd || homeDir;
        if (pathDisplay === homeDir) {
            pathDisplay = '~';
        } else if (pathDisplay.startsWith(homeDir + '/')) {
            pathDisplay = '~' + pathDisplay.slice(homeDir.length);
        }

        return `${user}@${task.host}:${pathDisplay}${sign} `;
    }

    resolvePath(rawPath) {
        if (!rawPath) return this.cwd || '/root';
        let p = rawPath.trim();
        const curTask = (this.filteredTasks && this.filteredTasks[this.currentTaskIndex]) ? this.filteredTasks[this.currentTaskIndex] : null;
        const isRoot = curTask ? (curTask.host !== 'hq-cli') : true;
        const home = isRoot ? '/root' : '/home/user';

        if (p === '~') return home;
        if (p.startsWith('~/')) return home + '/' + p.slice(2);
        if (!p.startsWith('/')) {
            const base = (this.cwd && this.cwd !== '/') ? this.cwd : '';
            p = base + '/' + p;
        }

        const parts = p.split('/').filter(Boolean);
        const stack = [];
        for (const part of parts) {
            if (part === '.') continue;
            if (part === '..') {
                if (stack.length > 0) stack.pop();
            } else {
                stack.push(part);
            }
        }
        return '/' + stack.join('/');
    }

    isValidDirectory(path, host) {
        if (!path) return false;
        const norm = path.replace(/\/+$/, '') || '/';
        const baseDirs = [
            '/', '/root', '/home', '/home/user', '/etc', '/etc/net', '/etc/net/ifaces', 
            '/etc/net/ifaces/default', '/etc/frr', '/etc/openssh', '/var', '/var/log', '/tmp', '/bin', '/sbin'
        ];
        if (baseDirs.includes(norm)) return true;

        const commonIfaces = ['enp7s1', 'enp7s2', 'enp7s3', 'enp0s3', 'enp0s3.100', 'enp0s3.200', 'enp7s2.100', 'enp7s2.200', 'enp7s2.999', 'gre1', 'default'];
        if (commonIfaces.some(iface => norm === `/etc/net/ifaces/${iface}`)) return true;

        if (window.standSimulator?.state[host]?.files) {
            for (const f of Object.keys(window.standSimulator.state[host].files)) {
                if (f.startsWith(norm + '/')) return true;
            }
        }
        return false;
    }

    handleCdCommand(cmd, currentTask) {
        const parts = cmd.split(' ').filter(Boolean);
        const arg = parts[1] || '~';
        const target = this.resolvePath(arg);

        if (!this.isValidDirectory(target, currentTask.host)) {
            this.printOutput(`bash: cd: ${this.escapeHtml(arg)}: Нет такого файла или каталога`, "text-danger");
            return;
        }

        this.cwd = target;
        this.updatePrompt(currentTask);
    }

    handleLsCommand(cmd, currentTask) {
        const parts = cmd.split(' ').filter(Boolean);
        let targetArg = parts.find(p => !p.startsWith('-') && p !== 'ls' && p !== 'dir');
        let targetDir = targetArg ? this.resolvePath(targetArg) : this.cwd;
        targetDir = targetDir.replace(/\/+$/, '') || '/';

        if (!this.isValidDirectory(targetDir, currentTask.host)) {
            this.printOutput(`ls: невозможно получить доступ к '${this.escapeHtml(targetArg)}': Нет такого файла или каталога`, "text-danger");
            return;
        }

        const isLong = parts.some(p => p.includes('l'));
        const isAll = parts.some(p => p.includes('a'));

        const subdirs = new Set();
        const files = new Set();

        if (isAll) {
            subdirs.add('.');
            subdirs.add('..');
        }

        if (targetDir === '/etc/net/ifaces') {
            ['default', 'enp0s3', 'enp7s1', 'enp7s2', 'enp7s3', 'gre1'].forEach(d => subdirs.add(d));
            if (window.standSimulator?.state[currentTask.host]?.files) {
                Object.keys(window.standSimulator.state[currentTask.host].files).forEach(f => {
                    if (f.startsWith('/etc/net/ifaces/')) {
                        const sub = f.replace('/etc/net/ifaces/', '').split('/')[0];
                        if (sub) subdirs.add(sub);
                    }
                });
            }
        } else if (targetDir.startsWith('/etc/net/ifaces/')) {
            ['ipv4address', 'ipv4route', 'options', 'resolv.conf'].forEach(f => files.add(f));
        } else if (targetDir === '/etc/net') {
            subdirs.add('ifaces');
            files.add('sysctl.conf');
        } else if (targetDir === '/etc/frr') {
            ['daemons', 'frr.conf', 'vtysh.conf'].forEach(f => files.add(f));
        } else if (targetDir === '/root') {
            files.add('iptables_rules');
        } else if (targetDir === '/etc') {
            ['net', 'frr', 'openssh'].forEach(d => subdirs.add(d));
            ['hostname', 'hosts', 'resolv.conf', 'dnsmasq.conf'].forEach(f => files.add(f));
        } else if (targetDir === '/') {
            ['bin', 'etc', 'home', 'root', 'sbin', 'tmp', 'var'].forEach(d => subdirs.add(d));
        }

        if (window.standSimulator?.state[currentTask.host]?.files) {
            Object.keys(window.standSimulator.state[currentTask.host].files).forEach(f => {
                if (f.startsWith(targetDir + '/')) {
                    const rel = f.slice(targetDir.length + 1);
                    if (!rel.includes('/')) {
                        files.add(rel);
                    } else {
                        subdirs.add(rel.split('/')[0]);
                    }
                }
            });
        }

        if (isLong) {
            let lines = [`total ${subdirs.size + files.size}`];
            subdirs.forEach(d => {
                lines.push(`drwxr-xr-x 2 root root 4096 Ноя 09 07:00 <span class="text-cyan font-bold">${this.escapeHtml(d)}</span>`);
            });
            files.forEach(f => {
                lines.push(`-rw-r--r-- 1 root root  512 Ноя 09 07:00 <span class="text-white">${this.escapeHtml(f)}</span>`);
            });
            this.printOutput(lines.join('<br>'), "console-box");
        } else {
            const renderedSubdirs = Array.from(subdirs).map(d => `<span class="text-cyan font-bold">${this.escapeHtml(d)}/</span>`);
            const renderedFiles = Array.from(files).map(f => `<span class="text-white">${this.escapeHtml(f)}</span>`);
            const allItems = [...renderedSubdirs, ...renderedFiles];
            this.printOutput(allItems.join('&nbsp;&nbsp;&nbsp;&nbsp;'), "console-box");
        }
    }

    handleEditorCommand(editorType, fileArg, currentTask) {
        const resolvedPath = this.resolvePath(fileArg || 'untitled');
        const initialContent = window.standSimulator?.state[currentTask.host]?.files[resolvedPath] || '';
        const container = document.querySelector('.terminal-window') || this.termOutput.parentElement;

        if (!window.terminalEditor) {
            this.printOutput(`${editorType}: редактор недоступен`, "text-danger");
            return;
        }

        window.terminalEditor.open({
            container: container,
            type: editorType,
            filepath: resolvedPath,
            displayPath: fileArg || resolvedPath,
            initialContent: initialContent,
            onSave: (fp, content) => {
                if (window.standSimulator) {
                    window.standSimulator.state[currentTask.host].files[fp] = content;
                    window.standSimulator.applyEtcNetConfigurations(window.standSimulator.state[currentTask.host]);
                    window.standSimulator.saveState();
                }
            },
            onExit: (fp, content, wasSaved) => {
                this.termInput.focus();
                if (wasSaved) {
                    this.printOutput(`[ Записано в файл ${this.escapeHtml(fp)} через ${editorType} ]`, "text-cyan text-xs");
                    const solved = this.checkTaskCompletionByFile(currentTask, fp, content);
                    if (solved) {
                        this.handleSuccess(currentTask, `${editorType} ${fileArg || fp}`);
                    }
                }
            }
        });
    }

    checkTaskCompletionByFile(task, filepath, content) {
        if (!task || !task.correctAnswers) return false;
        const normFp = this.resolvePath(filepath);
        const cleanContent = (content || '').trim();

        for (const ans of task.correctAnswers) {
            // 1. echo 'val' > file
            const echoMatch = ans.match(/echo\s+['"]?([^'">]+)['"]?\s*>\s*([^\s;]+)/);
            if (echoMatch) {
                const expectedVal = echoMatch[1].trim();
                const expectedFile = this.resolvePath(echoMatch[2].trim());
                if (normFp === expectedFile && cleanContent.includes(expectedVal)) {
                    return true;
                }
            }

            // 2. set-hostname или /etc/hostname
            if (ans.includes('set-hostname') && normFp === '/etc/hostname') {
                const hostMatch = ans.match(/set-hostname\s+([^\s;]+)/);
                if (hostMatch && cleanContent.includes(hostMatch[1].trim())) {
                    if (window.standSimulator) {
                        window.standSimulator.state[task.host].hostname = hostMatch[1].trim();
                    }
                    return true;
                }
            }

            // 3. set-timezone или /etc/timezone
            if (ans.includes('set-timezone') && normFp === '/etc/timezone') {
                const tzMatch = ans.match(/set-timezone\s+([^\s;]+)/);
                if (tzMatch && cleanContent.includes(tzMatch[1].trim())) {
                    if (window.standSimulator) {
                        window.standSimulator.state[task.host].timezone = tzMatch[1].trim();
                    }
                    return true;
                }
            }

            
            // 5. GRE options file (/etc/net/ifaces/gre1/options)
            if (normFp.endsWith('/gre1/options')) {
                const isHq = task.host === 'hq-rtr';
                const isBr = task.host === 'br-rtr';
                const expectedRemote = isHq ? '172.16.2.2' : (isBr ? '172.16.1.2' : null);
                if (expectedRemote && cleanContent.includes(expectedRemote)) {
                    if (window.standSimulator && window.standSimulator.state[task.host]) {
                        const vm = window.standSimulator.state[task.host];
                        if (!vm.ifaces['gre1']) vm.ifaces['gre1'] = { state: 'DOWN' };
                        vm.ifaces['gre1'].remote = expectedRemote;
                        vm.ifaces['gre1'].mtu = 1476;
                        vm.ifaces['gre1'].state = 'UP';
                    }
                    return true;
                }
            }
            // 4. sysctl forwarding
            if ((normFp === '/etc/net/sysctl.conf' || normFp === '/etc/sysctl.conf') && ans.includes('ip_forward=1')) {
                if (cleanContent.includes('ip_forward=1') || cleanContent.includes('ip_forward = 1')) {
                    if (window.standSimulator) {
                        window.standSimulator.state[task.host].ipForward = true;
                    }
                    return true;
                }
            }
        }
        return false;
    }

    resolveCommandToCanonical(normCmd) {
        // 1. echo 'val' > file
        const echoMatch = normCmd.match(/^(echo\s+['"]?[^'">]+['"]?\s*>\s*)([^\s;]+)$/);
        if (echoMatch) {
            const prefix = echoMatch[1];
            const file = echoMatch[2];
            const absFile = this.resolvePath(file);
            return this.normalizeCommand(`${prefix}${absFile}`);
        }

        // 2. echo 'val' | tee file
        const teeMatch = normCmd.match(/^(echo\s+['"]?[^'">]+['"]?\s*)\|\s*tee\s+([^\s;]+)$/);
        if (teeMatch) {
            const prefix = teeMatch[1];
            const file = teeMatch[2];
            const absFile = this.resolvePath(file);
            return this.normalizeCommand(`${prefix}> ${absFile}`);
        }

        // 3. cp [-r] src dst
        const cpMatch = normCmd.match(/^cp(\s+-r)?\s+([^\s;]+)\s+([^\s;]+)$/);
        if (cpMatch) {
            const flag = cpMatch[1] || '';
            const src = this.resolvePath(cpMatch[2]);
            const dst = this.resolvePath(cpMatch[3]);
            return this.normalizeCommand(`cp${flag} ${src} ${dst}`);
        }

        // 4. cat file
        const catMatch = normCmd.match(/^cat\s+([^\s;]+)$/);
        if (catMatch) {
            const file = catMatch[1];
            const absFile = this.resolvePath(file);
            return this.normalizeCommand(`cat ${absFile}`);
        }

        return normCmd;
    }

    normalizeCommand(cmd) {
        return cmd
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/["']/g, "'")
            .replace(/\s*>\s*/g, ' > ')
            .replace(/\s*\|\s*/g, ' | ')
            .replace(/;\s*$/, '');
    }

    handleCommand(rawCmd) {
        const cmd = rawCmd.trim();
        if (!cmd) return;

        this.history.push(cmd);
        this.historyIndex = this.history.length;
        this.currentTaskAttempts++;

        const currentTask = this.filteredTasks[this.currentTaskIndex];
        const normUser = this.normalizeCommand(cmd);
        const promptText = this.getDisplayPrompt(currentTask);

        const line = document.createElement('div');
        line.className = 'term-line';
        line.innerHTML = `<span class="prompt">${this.escapeHtml(promptText)}</span><span class="user-cmd">${this.escapeHtml(cmd)}</span>`;
        this.termOutput.appendChild(line);

        if (normUser === 'clear') {
            this.termOutput.innerHTML = '';
            this.termInput.value = '';
            return;
        }
        if (normUser === 'help') {
            this.printOutput("Доступные команды: clear, help, pwd, cd [каталог], ls, cat [файл], cp, nano [файл], mcedit [файл], vim [файл]. Вводите команду для настройки стенда.", "sys-msg");
            this.termInput.value = '';
            return;
        }

        // Если находимся в режиме свободной инспекции другой ВМ
        if (this.inspectingVm) {
            if (window.standSimulator) {
                const outHtml = window.standSimulator.executeSimulatedCommand(this.inspectingVm, cmd, false);
                if (outHtml) {
                    const outLine = document.createElement('div');
                    outLine.className = 'term-line';
                    outLine.innerHTML = outHtml;
                    this.termOutput.appendChild(outLine);
                }
                window.standSimulator.saveState();
            }
            this.termInput.value = '';
            this.scrollToBottom();
            return;
        }

        // Навигация по каталогам
        if (normUser === 'pwd') {
            this.printOutput(this.escapeHtml(this.cwd), "text-white");
            this.termInput.value = '';
            this.scrollToBottom();
            return;
        }
        if (normUser === 'cd' || normUser.startsWith('cd ')) {
            this.handleCdCommand(cmd, currentTask);
            this.termInput.value = '';
            this.scrollToBottom();
            return;
        }
        if (normUser === 'ls' || normUser.startsWith('ls ') || normUser === 'dir') {
            this.handleLsCommand(cmd, currentTask);
            this.termInput.value = '';
            this.scrollToBottom();
            return;
        }

        // Запуск текстовых редакторов: nano, mcedit, vim, vi
        const editorMatch = normUser.match(/^(nano|mcedit|vim|vi)(\s+.*)?$/i);
        if (editorMatch) {
            const edType = editorMatch[1].toLowerCase();
            const edFile = (editorMatch[2] || '').trim();
            this.handleEditorCommand(edType, edFile, currentTask);
            this.termInput.value = '';
            this.scrollToBottom();
            return;
        }

        // Проверка: совпадает ли исходная команда или её канонический вид (с абсолютными путями)
        const canonicalUser = this.resolveCommandToCanonical(normUser);
        const isCorrect = currentTask.correctAnswers.some(ans => {
            const normAns = this.normalizeCommand(ans);
            return normUser === normAns || canonicalUser === normAns;
        });

        if (isCorrect) {
            this.handleSuccess(currentTask, cmd);
            if (window.standSimulator) {
                window.standSimulator.executeSimulatedCommand(currentTask.host, canonicalUser, true);
                window.standSimulator.saveState();
            }
        } else {
            // Проверяем: не является ли это командой живой диагностики перед выполнением?
            const isDiagnostic = /^(ip\b|cat\b|ping\b|hostname\b|timedatectl\b|sysctl\b|systemctl status\b|vtysh\b|dig\b|ssh\b|ls\b|head\b|tail\b|mkdir\b|touch\b)/i.test(normUser);
            if (isDiagnostic && window.standSimulator) {
                const diagOut = window.standSimulator.executeSimulatedCommand(currentTask.host, canonicalUser, false);
                if (diagOut) {
                    const diagLine = document.createElement('div');
                    diagLine.className = 'term-line';
                    diagLine.innerHTML = diagOut;
                    this.termOutput.appendChild(diagLine);
                }
                const infoLine = document.createElement('div');
                infoLine.className = 'term-line text-xs text-yellow mt-1';
                infoLine.innerHTML = `💡 [Живая диагностика узла] Результат выведен выше. Напоминание цели задания: <b>${this.escapeHtml(currentTask.task)}</b>`;
                this.termOutput.appendChild(infoLine);
            } else {
                this.handleError(currentTask, cmd);
            }
        }

        this.termInput.value = '';
        this.scrollToBottom();
    }

    handleSuccess(task, enteredCmd) {
        this.streak++;
        this.completedTasks.add(task.id);
        this.saveState();

        this.printOutput(`✔ ВЕРНО! [OK]`, "text-success font-bold");

        // Отображение подробного разбора команды ("Почему именно так?")
        if (window.CommandBreakdown) {
            const breakdownHtml = window.CommandBreakdown.renderHtml(task.correctAnswers[0], task.explanation);
            if (breakdownHtml) {
                this.printOutput(breakdownHtml, "breakdown-container-line");
            }
        } else if (task.explanation) {
            this.printOutput(`💡 Пояснение: ${task.explanation}`, "text-info");
        }

        this.updateStats();
        this.renderTaskNavigator();

        this.isWaitingNext = true;

        // Кнопка перехода к следующему заданию (без принудительного таймера!)
        const nextBtnDiv = document.createElement('div');
        nextBtnDiv.className = 'term-line mt-3 d-flex gap-3 align-center flex-wrap';
        nextBtnDiv.innerHTML = `
            <button id="btn-term-next-step" class="btn btn-sm btn-success font-bold" style="padding: 0.55rem 1.3rem; font-size: 0.92rem; cursor: pointer;">
                Следующее задание → [Enter]
            </button>
            <span class="text-light text-xs">📖 Спокойно изучите разбор команды выше. Когда будете готовы перейти дальше — нажмите Enter или кнопку.</span>
        `;
        this.termOutput.appendChild(nextBtnDiv);
        this.scrollToBottom();

        const doAdvance = () => {
            if (!this.isWaitingNext) return;
            this.isWaitingNext = false;
            this.advanceCallback = null;
            if (this.currentTaskIndex < this.filteredTasks.length - 1) {
                this.currentTaskIndex++;
                this.saveState();
                this.loadCurrentTask();
            } else {
                this.printOutput("🎉 ПОЗДРАВЛЯЕМ! Все задания этого раздела успешно пройдены!", "text-yellow font-bold");
            }
        };

        this.advanceCallback = doAdvance;
        document.getElementById('btn-term-next-step')?.addEventListener('click', doAdvance);
    }

    handleError(task, cmd) {
        this.streak = 0;
        this.updateStats();

        this.printOutput(`✖ Ошибка в синтаксисе или параметрах команды.`, "text-danger");
        if (this.currentTaskAttempts === 1) {
            this.printOutput(`💡 Подсказка: нажмите клавишу <b>F1</b> (наводящая мысль) или <b>F2</b> (шаблон).`, "text-muted");
        } else {
            this.printOutput(`Попробуйте еще раз. Если сомневаетесь — изучите шаблон синтаксиса (F2).`, "text-muted");
        }
    }

    showHint(level) {
        const task = this.filteredTasks[this.currentTaskIndex];
        this.hintBox.classList.remove('hidden');
        if (level === 1) {
            this.hintsViewed.h1 = true;
            this.hintBox.innerHTML = `
                <div class="hint-content-box">
                    <span class="text-cyan"><b>💡 [F1 Наводящая мысль]:</b> ${task.hint1}</span>
                    <button class="btn btn-xs btn-outline ml-auto" onclick="document.getElementById('hint-box').classList.add('hidden')">✕</button>
                </div>
            `;
        } else {
            this.hintsViewed.h2 = true;
            this.hintBox.innerHTML = `
                <div class="hint-content-box">
                    <span class="text-yellow"><b>🔍 [F2 Шаблон синтаксиса]:</b> <code>${this.escapeHtml(task.hint2)}</code></span>
                    <button class="btn btn-xs btn-outline ml-auto" onclick="document.getElementById('hint-box').classList.add('hidden')">✕</button>
                </div>
            `;
        }
    }

    requestShowAnswer(forced = false) {
        const task = this.filteredTasks[this.currentTaskIndex];
        
        // Требование #4: Ответ закрыт до попытки
        if (!forced && this.currentTaskAttempts === 0 && !this.hintsViewed.h1 && !this.hintsViewed.h2) {
            this.hintBox.classList.remove('hidden');
            this.hintBox.innerHTML = `
                <div class="hint-content-box border-warning">
                    <div class="d-flex align-center gap-2">
                        <span>🔒 <b>Ответ закрыт до попытки!</b></span>
                        <span class="text-muted text-sm">Сначала попробуйте ввести команду или изучите подсказки F1 / F2.</span>
                    </div>
                    <div class="mt-2 d-flex gap-2">
                        <button class="btn btn-xs btn-outline" onclick="terminalTrainer.showHint(1)">💡 Подсказка F1</button>
                        <button class="btn btn-xs btn-outline" onclick="terminalTrainer.showHint(2)">🔍 Шаблон F2</button>
                        <button class="btn btn-xs btn-outline text-yellow ml-auto" onclick="terminalTrainer.requestShowAnswer(true)">
                            👁 Всё равно показать ответ
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        // Если ответ открыт, запланировать интервальное повторение через 3 задания
        this.scheduleSpacedRepetition(task);
        this.showAnswer(task);
    }

    scheduleSpacedRepetition(task) {
        if (task._isRepeat) return; // Уже в режиме повторения

        // Создаем копию задания для повторения
        const repeatTask = Object.assign({}, task, { _isRepeat: true });
        
        // Вставляем через 3 позиции (или в конец)
        const targetPos = Math.min(this.currentTaskIndex + 4, this.filteredTasks.length);
        this.filteredTasks.splice(targetPos, 0, repeatTask);

        this.renderTaskNavigator();
    }

    showAnswer(task) {
        const correct = task.correctAnswers[0];
        this.hintBox.classList.remove('hidden');

        // Подготавливаем разбор команды
        let breakdownSnippet = '';
        if (window.CommandBreakdown) {
            breakdownSnippet = window.CommandBreakdown.renderHtml(correct, task.explanation);
        }

        this.hintBox.innerHTML = `
            <div class="hint-content-box border-success">
                <div class="d-flex justify-between align-center flex-wrap gap-2">
                    <div class="text-green">
                        <b>🔑 [F3 Готовый ответ]:</b> <code>${this.escapeHtml(correct)}</code>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-xs btn-success" onclick="terminalTrainer.pasteAnswer('${this.escapeQuotes(correct)}')">📋 Вставить в терминал</button>
                        <button class="btn btn-xs btn-outline" onclick="document.getElementById('hint-box').classList.add('hidden')">✕ Закрыть</button>
                    </div>
                </div>
                <div class="text-xs text-yellow mt-1">
                    ↻ Задание добавлено в очередь повторения через несколько шагов для закрепления памяти!
                </div>
                ${breakdownSnippet ? `<div class="mt-2">${breakdownSnippet}</div>` : ''}
            </div>
        `;
    }

    pasteAnswer(text) {
        this.termInput.value = text;
        this.termInput.focus();
    }

    navigateHistory(direction) {
        if (this.history.length === 0) return;
        this.historyIndex += direction;
        if (this.historyIndex < 0) this.historyIndex = 0;
        if (this.historyIndex > this.history.length) this.historyIndex = this.history.length;

        if (this.historyIndex === this.history.length) {
            this.termInput.value = '';
        } else {
            this.termInput.value = this.history[this.historyIndex];
        }
    }

    printOutput(msg, cssClass = "") {
        const div = document.createElement('div');
        div.className = `term-line ${cssClass}`;
        div.innerHTML = msg;
        this.termOutput.appendChild(div);
        this.scrollToBottom();
    }

    scrollToBottom() {
        const win = document.querySelector('#sec-terminal .terminal-window');
        if (win) {
            win.scrollTop = win.scrollHeight;
        }
    }

    saveState() {
        localStorage.setItem('alt_completed_tasks_v2', JSON.stringify([...this.completedTasks]));
        localStorage.setItem(`alt_term_index_${this.currentTopic}`, this.currentTaskIndex.toString());
    }

    updateStats() {
        const total = APP_DATA.commandTasks.length;
        const count = this.completedTasks.size;
        if (this.statCompleted) this.statCompleted.textContent = `${count} / ${total}`;
        if (this.statStreak) this.statStreak.textContent = `${this.streak} 🔥`;
    }

    escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    escapeQuotes(text) {
        return text.replace(/'/g, "\\'");
    }
}
