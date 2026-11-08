// Модуль режима «Сдача у преподавателя» (Живой экзамен)

class TeacherExamTrainer {
    constructor() {
        this.tasks = APP_DATA.teacherTasks || [];
        this.completedTasks = new Set(JSON.parse(localStorage.getItem('alt_teacher_completed') || '[]'));
        this.history = [];
        this.historyIndex = -1;
        this.score = parseInt(localStorage.getItem('alt_teacher_score') || '0', 10);
        this.streak = 0;

        // Восстанавливаем сохраненный индекс задания
        const savedIndex = parseInt(localStorage.getItem('alt_teacher_task_index') || '0', 10);
        this.currentTaskIndex = (savedIndex >= 0 && savedIndex < this.tasks.length) ? savedIndex : 0;

        // Если сохраненное задание уже сделано, переходим к первому нерешенному
        if (this.completedTasks.has(this.tasks[this.currentTaskIndex]?.id)) {
            const firstUnsolved = this.tasks.findIndex(t => !this.completedTasks.has(t.id));
            if (firstUnsolved !== -1) {
                this.currentTaskIndex = firstUnsolved;
            }
        }

        this.initDOMElements();
        this.bindEvents();
        this.renderTaskNavigator();
        this.loadCurrentTask();
        this.updateStats();
    }

    initDOMElements() {
        this.termOutput = document.getElementById('teacher-term-output');
        this.termInput = document.getElementById('teacher-term-input');
        this.termPrompt = document.getElementById('teacher-term-prompt');
        this.speechText = document.getElementById('teacher-speech-text');
        this.taskGoal = document.getElementById('teacher-task-goal');
        this.hostBadge = document.getElementById('teacher-host-badge');
        this.taskCounter = document.getElementById('teacher-task-counter');
        this.btnHint = document.getElementById('teacher-btn-hint');
        this.btnShowAnswer = document.getElementById('teacher-btn-answer');
        this.btnPaste = document.getElementById('teacher-btn-paste');
        this.hintBox = document.getElementById('teacher-hint-box');
        this.navContainer = document.getElementById('teacher-task-nav');
        this.statCompleted = document.getElementById('stat-teacher-completed');
        this.btnReset = document.getElementById('btn-reset-teacher-progress');
    }

    bindEvents() {
        if (!this.termInput) return;

        // Подключение автодополнения Tab
        if (window.altTabCompleter) {
            window.altTabCompleter.attachToInput(
                this.termInput,
                this.termOutput,
                () => this.termPrompt?.textContent || 'root@hq-rtr:~# '
            );
        }

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

        this.btnHint?.addEventListener('click', () => this.showHint());
        this.btnShowAnswer?.addEventListener('click', () => this.showAnswer());
        this.btnPaste?.addEventListener('click', () => this.pasteCurrentAnswer());

        this.btnReset?.addEventListener('click', () => {
            if (confirm("Сбросить весь прогресс сдачи у преподавателя?")) {
                this.completedTasks.clear();
                localStorage.removeItem('alt_teacher_completed');
                localStorage.removeItem('alt_teacher_task_index');
                localStorage.removeItem('alt_teacher_score');
                this.currentTaskIndex = 0;
                this.score = 0;
                this.streak = 0;
                this.renderTaskNavigator();
                this.loadCurrentTask();
                this.updateStats();
            }
        });

        // Горячие клавиши F1 (Подсказка), F2 (Показать команду), F3 (Вставить)
        window.addEventListener('keydown', (e) => {
            const secTeacher = document.getElementById('sec-teacher');
            if (!secTeacher || !secTeacher.classList.contains('active')) return;

            if (e.key === 'F1') {
                e.preventDefault();
                this.showHint();
            } else if (e.key === 'F2') {
                e.preventDefault();
                this.showAnswer();
            } else if (e.key === 'F3') {
                e.preventDefault();
                this.pasteCurrentAnswer();
            }
        });

        // Кнопка запуска (для мобилок)
        document.getElementById('teacher-btn-run')?.addEventListener('click', () => {
            if (this.isWaitingNext) {
                if (this.advanceCallback) this.advanceCallback();
                return;
            }
            this.handleCommand(this.termInput.value);
        });

        // Мобильные быстрые клавиши-чипы
        document.querySelectorAll('#sec-teacher .key-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.preventDefault();
                const key = chip.getAttribute('data-key');
                const action = chip.getAttribute('data-action');
                if (action === 'tab') {
                    if (window.altTabCompleter) {
                        window.altTabCompleter.handleTab(this.termInput, this.termOutput, this.termPrompt?.textContent || 'root@hq-rtr:~# ');
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

        document.querySelector('#sec-teacher .terminal-window')?.addEventListener('click', () => {
            this.termInput.focus();
        });
    }

    renderTaskNavigator() {
        if (!this.navContainer) return;
        this.navContainer.innerHTML = '';

        this.tasks.forEach((task, idx) => {
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
            this.navContainer.appendChild(pill);

            if (isActive) {
                setTimeout(() => pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }), 40);
            }
        });
    }

    loadCurrentTask() {
        this.isWaitingNext = false;
        this.advanceCallback = null;
        if (this.tasks.length === 0) return;

        const task = this.tasks[this.currentTaskIndex];
        this.hostBadge.textContent = task.host.toUpperCase();
        this.speechText.innerHTML = `«${task.teacherSpeech}»`;
        this.taskGoal.textContent = `Цель: ${task.task}`;
        this.taskCounter.textContent = `Вопрос ${this.currentTaskIndex + 1} из ${this.tasks.length}`;
        this.termPrompt.textContent = task.prompt;

        const winHost = document.getElementById('win-teacher-userhost');
        if (winHost) winHost.textContent = task.prompt.trim();

        this.hintBox.classList.add('hidden');
        this.hintBox.innerHTML = '';
        this.termInput.value = '';
        this.termInput.focus();

        const isDone = this.completedTasks.has(task.id);

        this.termOutput.innerHTML = `
            <div class="term-line sys-msg">
                <span class="text-cyan">[Сдача экзамена]</span> Машина: <b class="text-green">${task.host.toUpperCase()}</b>
                ${isDone ? '<span class="text-success font-bold ml-2">✔ (Уже сдано)</span>' : ''}
            </div>
            <div class="term-line sys-msg">
                <span class="text-yellow">Преподаватель ждёт выполнения команды:</span> ${task.task}
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

        const task = this.tasks[this.currentTaskIndex];
        const normUser = this.normalizeCommand(cmd);

        const line = document.createElement('div');
        line.className = 'term-line';
        line.innerHTML = `<span class="prompt">${task.prompt}</span><span class="user-cmd">${this.escapeHtml(cmd)}</span>`;
        this.termOutput.appendChild(line);

        if (normUser === 'clear') {
            this.termOutput.innerHTML = '';
            this.termInput.value = '';
            return;
        }

        const isCorrect = task.correctAnswers.some(ans => {
            const normAns = this.normalizeCommand(ans);
            return normUser === normAns;
        });

        if (isCorrect) {
            this.handleSuccess(task);
        } else {
            this.handleError(task, cmd);
        }

        this.termInput.value = '';
        this.scrollToBottom();
    }

    handleSuccess(task) {
        this.streak++;
        this.score += 10;
        this.completedTasks.add(task.id);
        this.saveState();

        this.printOutput(`👨‍🏫 <b>Преподаватель:</b> «Отлично, всё верно! [Зачёт по вопросу]»`, "text-success font-bold");
        if (task.explanation) {
            this.printOutput(`💡 <i>Примечание: ${task.explanation}</i>`, "text-info");
        }

        this.updateStats();
        this.renderTaskNavigator();

        this.isWaitingNext = true;

        // Кнопка перехода к следующему вопросу (без принудительного таймера!)
        const nextBtnDiv = document.createElement('div');
        nextBtnDiv.className = 'term-line mt-3 d-flex gap-3 align-center flex-wrap';
        nextBtnDiv.innerHTML = `
            <button id="btn-teacher-next-step" class="btn btn-sm btn-success font-bold" style="padding: 0.55rem 1.3rem; font-size: 0.92rem; cursor: pointer;">
                Следующий вопрос преподавателя → [Enter]
            </button>
            <span class="text-light text-xs">Изучите примечание преподавателя выше. Когда будете готовы перейти дальше — нажмите Enter или кнопку.</span>
        `;
        this.termOutput.appendChild(nextBtnDiv);
        this.scrollToBottom();

        const doAdvance = () => {
            if (!this.isWaitingNext) return;
            this.isWaitingNext = false;
            this.advanceCallback = null;
            if (this.currentTaskIndex < this.tasks.length - 1) {
                this.currentTaskIndex++;
                this.saveState();
                this.loadCurrentTask();
            } else {
                this.printOutput("🎓 ПРЕВОСХОДНО! Вы ответили на ВСЕ вопросы преподавателя!", "text-yellow font-bold");
            }
        };

        this.advanceCallback = doAdvance;
        document.getElementById('btn-teacher-next-step')?.addEventListener('click', doAdvance);
    }

    handleError(task, cmd) {
        this.streak = 0;
        this.printOutput(`👨‍🏫 <b>Преподаватель качает головой:</b> «Нет, команда не та или параметры неверные. Подумай ещё раз.»`, "text-danger");
    }

    showHint() {
        const task = this.tasks[this.currentTaskIndex];
        this.hintBox.classList.remove('hidden');
        this.hintBox.innerHTML = `
            <div class="text-yellow">
                <b>💡 [F1 Наводка экзаменатора]:</b> ${task.hint1}
            </div>
        `;
    }

    showAnswer() {
        const task = this.tasks[this.currentTaskIndex];
        const correct = task.correctAnswers[0];
        this.hintBox.classList.remove('hidden');
        this.hintBox.innerHTML = `
            <div class="text-green">
                <b>🔑 [F2 Ответ]:</b> <code>${this.escapeHtml(correct)}</code>
                <button class="btn btn-sm btn-outline ml-2" onclick="teacherTrainer.pasteAnswer('${this.escapeQuotes(correct)}')">📋 Вставить в консоль</button>
            </div>
        `;
    }

    pasteCurrentAnswer() {
        const task = this.tasks[this.currentTaskIndex];
        const correct = task.correctAnswers[0];
        this.pasteAnswer(correct);
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
        const win = document.querySelector('#sec-teacher .terminal-window');
        if (win) {
            win.scrollTop = win.scrollHeight;
        }
    }

    saveState() {
        localStorage.setItem('alt_teacher_completed', JSON.stringify([...this.completedTasks]));
        localStorage.setItem('alt_teacher_task_index', this.currentTaskIndex.toString());
        localStorage.setItem('alt_teacher_score', this.score.toString());
    }

    updateStats() {
        const total = this.tasks.length;
        const count = this.completedTasks.size;
        if (this.statCompleted) this.statCompleted.textContent = `${count} / ${total}`;
    }

    escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    escapeQuotes(text) {
        return text.replace(/'/g, "\\'");
    }
}
