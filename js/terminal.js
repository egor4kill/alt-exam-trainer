// Модуль интерактивного терминала-тренажёра

class TerminalTrainer {
    constructor() {
        this.currentTaskIndex = 0;
        this.filteredTasks = [...APP_DATA.commandTasks];
        this.currentTopic = "all";
        this.history = [];
        this.historyIndex = -1;
        this.score = 0;
        this.streak = 0;
        this.completedTasks = new Set(JSON.parse(localStorage.getItem('alt_completed_tasks') || '[]'));

        this.initDOMElements();
        this.bindEvents();
        this.filterTasks("all");
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
            this.filterTasks(e.target.value);
        });

        // Клик по окну терминала переносит фокус в инпут
        document.querySelector('.terminal-window')?.addEventListener('click', () => {
            this.termInput.focus();
        });
    }

    filterTasks(topicId) {
        this.currentTopic = topicId;
        if (topicId === "all") {
            this.filteredTasks = [...APP_DATA.commandTasks];
        } else {
            const tid = parseInt(topicId, 10);
            this.filteredTasks = APP_DATA.commandTasks.filter(t => t.topicId === tid);
        }
        this.currentTaskIndex = 0;
        this.loadCurrentTask();
        this.updateStats();
    }

    loadCurrentTask() {
        if (this.filteredTasks.length === 0) {
            this.taskTitle.textContent = "Нет заданий в этой категории";
            this.taskDesc.textContent = "";
            return;
        }

        const task = this.filteredTasks[this.currentTaskIndex];
        const topic = APP_DATA.topics.find(t => t.id === task.topicId);

        this.taskTitle.textContent = `Задание #${this.currentTaskIndex + 1}: ${task.host.toUpperCase()}`;
        this.taskDesc.textContent = task.task;
        this.taskBadge.textContent = topic ? topic.badge : `Тема ${task.topicId}`;
        this.taskCounter.textContent = `${this.currentTaskIndex + 1} / ${this.filteredTasks.length}`;
        this.termPrompt.textContent = task.prompt;

        this.hintBox.classList.add('hidden');
        this.hintBox.innerHTML = '';
        this.termInput.value = '';
        this.termInput.focus();

        // Очищаем терминал и выводим вводное сообщение
        this.termOutput.innerHTML = `
            <div class="term-line sys-msg">
                <span class="text-cyan">[Стенд Proxmox VE]</span> Виртуальная машина: <b class="text-green">${task.host.toUpperCase()}</b>
            </div>
            <div class="term-line sys-msg">
                <span class="text-yellow">Цель:</span> ${task.task}
            </div>
            <div class="term-line sys-msg text-muted">
                Введите команду и нажмите <b>Enter</b>. Доступны подсказки кнопками вверху.
            </div>
        `;
    }

    normalizeCommand(cmd) {
        return cmd
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/["']/g, "'") // унифицируем кавычки
            .replace(/\s*>\s*/g, ' > ') // пробелы вокруг редиректа
            .replace(/\s*\|\s*/g, ' | ') // пробелы вокруг пайпа
            .replace(/;\s*$/, ''); // удаляем точку с запятой на конце если есть
    }

    handleCommand(rawCmd) {
        const cmd = rawCmd.trim();
        if (!cmd) return;

        // Добавляем в историю
        this.history.push(cmd);
        this.historyIndex = this.history.length;

        const currentTask = this.filteredTasks[this.currentTaskIndex];
        const normUser = this.normalizeCommand(cmd);

        // Отображаем введенную команду в выводе
        const line = document.createElement('div');
        line.className = 'term-line';
        line.innerHTML = `<span class="prompt">${currentTask.prompt}</span><span class="user-cmd">${this.escapeHtml(cmd)}</span>`;
        this.termOutput.appendChild(line);

        // Системные вспомогательные команды
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

        // Проверяем правильность
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
        this.score += 10;
        this.completedTasks.add(task.id);
        localStorage.setItem('alt_completed_tasks', JSON.stringify([...this.completedTasks]));

        this.printOutput(`✔ ВЕРНО! [OK]`, "text-success font-bold");
        if (task.explanation) {
            this.printOutput(`💡 Пояснение: ${task.explanation}`, "text-info");
        }

        this.updateStats();

        // Переход к следующему заданию через небольшую паузу
        setTimeout(() => {
            if (this.currentTaskIndex < this.filteredTasks.length - 1) {
                this.currentTaskIndex++;
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
            this.hintBox.innerHTML = `<div class="alert alert-info"><b>Подсказка 1:</b> ${task.hint1}</div>`;
        } else {
            this.hintBox.innerHTML = `<div class="alert alert-warning"><b>Подсказка 2:</b> <code>${this.escapeHtml(task.hint2)}</code></div>`;
        }
    }

    showAnswer() {
        const task = this.filteredTasks[this.currentTaskIndex];
        const correct = task.correctAnswers[0];
        this.hintBox.classList.remove('hidden');
        this.hintBox.innerHTML = `
            <div class="alert alert-warning">
                <b>Правильный ответ:</b> <code>${this.escapeHtml(correct)}</code>
                <button class="btn btn-sm btn-outline ml-2" onclick="terminalTrainer.pasteAnswer('${this.escapeQuotes(correct)}')">Вставить в терминал</button>
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
        const win = document.querySelector('.terminal-window');
        if (win) {
            win.scrollTop = win.scrollHeight;
        }
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
