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

        const winHost = document.getElementById('win-term-userhost');
        if (winHost) winHost.textContent = `${task.host === 'hq-cli' ? 'user' : 'root'}@${task.host}:~`;

        this.termPrompt.textContent = task.prompt;

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

        const line = document.createElement('div');
        line.className = 'term-line';
        line.innerHTML = `<span class="prompt">${currentTask.prompt}</span><span class="user-cmd">${this.escapeHtml(cmd)}</span>`;
        this.termOutput.appendChild(line);

        if (normUser === 'clear') {
            this.termOutput.innerHTML = '';
            this.termInput.value = '';
            return;
        }
        if (normUser === 'help') {
            this.printOutput("Доступные команды: clear (очистить), help (помощь). Вводите команду для настройки стенда.", "sys-msg");
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

        const isCorrect = currentTask.correctAnswers.some(ans => {
            const normAns = this.normalizeCommand(ans);
            return normUser === normAns;
        });

        if (isCorrect) {
            this.handleSuccess(currentTask, cmd);
            // Реальное сохранение состояния на узле стенда!
            if (window.standSimulator) {
                window.standSimulator.executeSimulatedCommand(currentTask.host, cmd, true);
                window.standSimulator.saveState();
            }
        } else {
            // Проверяем: не является ли это командой живой диагностики перед выполнением?
            const isDiagnostic = /^(ip\b|cat\b|ping\b|hostname\b|timedatectl\b|sysctl\b|systemctl status\b|vtysh\b|dig\b|ssh\b|ls\b|head\b|tail\b)/i.test(normUser);
            if (isDiagnostic && window.standSimulator) {
                const diagOut = window.standSimulator.executeSimulatedCommand(currentTask.host, cmd, false);
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
