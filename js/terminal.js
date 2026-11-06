// Модуль интерактивного терминала-тренажёра (Практики 2–8)

class TerminalTrainer {
    constructor() {
        this.completedTasks = new Set(JSON.parse(localStorage.getItem('alt_completed_tasks_v2') || '[]'));
        this.history = [];
        this.historyIndex = -1;
        this.streak = 0;

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
    }

    bindEvents() {
        if (!this.termInput) return;

        // Ввод команды
        this.termInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
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
        this.btnShowAnswer?.addEventListener('click', () => this.showAnswer());

        // Смена темы
        this.topicSelect?.addEventListener('change', (e) => {
            this.filterTasks(e.target.value, true);
        });

        // Кнопка сброса прогресса
        this.btnReset?.addEventListener('click', () => {
            if (confirm("Вы уверены, что хотите сбросить прогресс выполнения практик?")) {
                this.completedTasks.clear();
                localStorage.removeItem('alt_completed_tasks_v2');
                for (let i = 2; i <= 8; i++) {
                    localStorage.removeItem(`alt_term_index_${i}`);
                }
                localStorage.removeItem('alt_term_index_all');
                this.currentTaskIndex = 0;
                this.streak = 0;
                this.renderTaskNavigator();
                this.loadCurrentTask();
                this.updateStats();
            }
        });

        // Горячие клавиши F1 (Подсказка 1), F2 (Подсказка 2), F3 (Показать ответ)
        window.addEventListener('keydown', (e) => {
            const secTerm = document.getElementById('sec-terminal');
            if (!secTerm || !secTerm.classList.contains('active')) return;

            if (e.key === 'F1') {
                e.preventDefault();
                this.showHint(1);
            } else if (e.key === 'F2') {
                e.preventDefault();
                this.showHint(2);
            } else if (e.key === 'F3') {
                e.preventDefault();
                this.showAnswer();
            }
        });

        // Кнопка запуска (для мобилок)
        document.getElementById('btn-term-run')?.addEventListener('click', () => {
            this.handleCommand(this.termInput.value);
        });

        // Мобильные быстрые клавиши-чипы
        document.querySelectorAll('#sec-terminal .key-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.preventDefault();
                const key = chip.getAttribute('data-key');
                const action = chip.getAttribute('data-action');
                if (action === 'paste') {
                    const currentTask = this.filteredTasks[this.currentTaskIndex];
                    if (currentTask) this.pasteAnswer(currentTask.correctAnswers[0]);
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
        this.currentTopic = topicId;
        localStorage.setItem('alt_term_current_topic', topicId);

        if (topicId === "all") {
            this.filteredTasks = [...APP_DATA.commandTasks];
        } else {
            const tid = parseInt(topicId, 10);
            this.filteredTasks = APP_DATA.commandTasks.filter(t => t.topicId === tid);
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
            const isDone = this.completedTasks.has(task.id);
            const isActive = idx === this.currentTaskIndex;

            const pill = document.createElement('button');
            pill.className = `task-pill ${isDone ? 'completed' : ''} ${isActive ? 'active' : ''}`;
            pill.title = task.task;
            pill.innerHTML = isDone ? `✔ ${idx + 1}` : `${idx + 1}`;
            pill.addEventListener('click', () => {
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

    loadCurrentTask() {
        if (!this.filteredTasks || this.filteredTasks.length === 0) {
            if (this.taskTitle) this.taskTitle.textContent = "Нет заданий в этой категории";
            if (this.taskDesc) this.taskDesc.textContent = "";
            return;
        }

        const task = this.filteredTasks[this.currentTaskIndex];
        const topic = APP_DATA.topics.find(t => t.id === task.topicId);

        if (this.taskTitle) this.taskTitle.textContent = `Задание #${this.currentTaskIndex + 1}: ${task.host.toUpperCase()}`;
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

        const isDone = this.completedTasks.has(task.id);

        this.termOutput.innerHTML = `
            <div class="term-line sys-msg">
                <span class="text-cyan">[Стенд Proxmox VE]</span> Виртуальная машина: <b class="text-green">${task.host.toUpperCase()}</b>
                ${isDone ? '<span class="text-success font-bold ml-2">✔ (Выполнено)</span>' : ''}
            </div>
            <div class="term-line sys-msg">
                <span class="text-yellow">Цель:</span> ${task.task}
            </div>
            <div class="term-line sys-msg text-muted">
                Введите команду и нажмите <b>Enter</b>. Доступны подсказки кнопками вверху или клавишами <b>F1 / F2 / F3</b>.
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
            this.printOutput("Доступные команды: clear (очистить), help (помощь). Вводите требуемую команду для настройки стенда.", "sys-msg");
            this.termInput.value = '';
            return;
        }

        const isCorrect = currentTask.correctAnswers.some(ans => {
            const normAns = this.normalizeCommand(ans);
            return normUser === normAns;
        });

        if (isCorrect) {
            this.handleSuccess(currentTask);
        } else {
            this.handleError(currentTask, cmd);
        }

        this.termInput.value = '';
        this.scrollToBottom();
    }

    handleSuccess(task) {
        this.streak++;
        this.completedTasks.add(task.id);
        this.saveState();

        this.printOutput(`✔ ВЕРНО! [OK]`, "text-success font-bold");
        if (task.explanation) {
            this.printOutput(`💡 Пояснение: ${task.explanation}`, "text-info");
        }

        this.updateStats();
        this.renderTaskNavigator();

        setTimeout(() => {
            if (this.currentTaskIndex < this.filteredTasks.length - 1) {
                this.currentTaskIndex++;
                this.saveState();
                this.loadCurrentTask();
            } else {
                this.printOutput("🎉 ПОЗДРАВЛЯЕМ! Все задания этого раздела успешно пройдены!", "text-yellow font-bold");
            }
        }, 1600);
    }

    handleError(task, cmd) {
        this.streak = 0;
        this.updateStats();

        this.printOutput(`✖ Команда не распознана или содержит ошибку в параметрах.`, "text-danger");
        this.printOutput(`Попробуйте еще раз или воспользуйтесь кнопкой «Подсказка».`, "text-muted");
    }

    showHint(level) {
        const task = this.filteredTasks[this.currentTaskIndex];
        this.hintBox.classList.remove('hidden');
        if (level === 1) {
            this.hintBox.innerHTML = `<div class="text-cyan"><b>💡 [F1 Наводящая мысль]:</b> ${task.hint1}</div>`;
        } else {
            this.hintBox.innerHTML = `<div class="text-yellow"><b>🔍 [F2 Шаблон синтаксиса (подставьте параметры сами)]:</b> <code>${this.escapeHtml(task.hint2)}</code></div>`;
        }
    }

    showAnswer() {
        const task = this.filteredTasks[this.currentTaskIndex];
        const correct = task.correctAnswers[0];
        this.hintBox.classList.remove('hidden');
        this.hintBox.innerHTML = `
            <div class="text-green">
                <b>🔑 [F3 Готовый ответ]:</b> <code>${this.escapeHtml(correct)}</code>
                <button class="btn btn-sm btn-outline ml-2" onclick="terminalTrainer.pasteAnswer('${this.escapeQuotes(correct)}')">📋 Вставить в терминал</button>
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
