// js/exam_mode.js
// Модуль режима «Экзамен» по регламенту Proxmox VE / Альт Линукс
// Включает:
// 1. Таймер обратного отсчета на 15 минут
// 2. Строгий режим: без подсказок и без показа ответов
// 3. Выборку: 5 практических задач + 3 вопроса экзаменатора
// 4. Итоговый разбор ошибок с оценкой по 5-балльной шкале и анализом тем к сдаче 14 ноября

class ExamManager {
    constructor() {
        this.examDurationSeconds = 15 * 60; // 15 минут
        this.timeRemaining = this.examDurationSeconds;
        this.timerInterval = null;
        this.isExamActive = false;
        this.isExamFinished = false;

        this.questions = [];
        this.currentQIndex = 0;
        this.userAnswers = {}; // { qIdx: { cmd, isCorrect, timestamp } }

        this.initDOMElements();
        this.bindEvents();
    }

    initDOMElements() {
        this.timerDisplay = document.getElementById('exam-timer-display');
        this.btnStartExam = document.getElementById('exam-btn-start');
        this.btnRestartExam = document.getElementById('exam-btn-restart');
        this.examIntroBox = document.getElementById('exam-intro-box');
        this.examActiveContainer = document.getElementById('exam-active-container');
        this.examResultsBox = document.getElementById('exam-results-box');

        // Элементы вопроса
        this.navPills = document.getElementById('exam-nav-pills');
        this.qBadge = document.getElementById('exam-q-badge');
        this.qTitle = document.getElementById('exam-q-title');
        this.qDesc = document.getElementById('exam-q-desc');
        this.termOutput = document.getElementById('exam-term-output');
        this.termInput = document.getElementById('exam-term-input');
        this.termPrompt = document.getElementById('exam-term-prompt');
        this.btnSubmit = document.getElementById('exam-btn-submit');
        this.btnNextQ = document.getElementById('exam-btn-next');
        this.btnFinishEarly = document.getElementById('exam-btn-finish-early');
    }

    bindEvents() {
        this.btnStartExam?.addEventListener('click', () => this.startNewExam());
        this.btnRestartExam?.addEventListener('click', () => this.startNewExam());

        // Подключение автодополнения Tab в строгом режиме
        if (window.altTabCompleter) {
            window.altTabCompleter.attachToInput(
                this.termInput,
                this.termOutput,
                () => this.termPrompt?.textContent || 'root@node:~# '
            );
        }

        this.termInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.submitCurrentAnswer();
            }
        });

        this.btnSubmit?.addEventListener('click', () => this.submitCurrentAnswer());

        this.btnNextQ?.addEventListener('click', () => {
            if (this.currentQIndex < this.questions.length - 1) {
                this.loadQuestion(this.currentQIndex + 1);
            } else {
                this.finishExam();
            }
        });

        this.btnFinishEarly?.addEventListener('click', () => {
            if (confirm("Вы уверены, что хотите завершить экзамен досрочно?")) {
                this.finishExam();
            }
        });
    }

    generateExamPool() {
        // 1. Выбираем 5 практических задач из разных тем
        const availableTopics = [2, 3, 4, 5, 6, 7, 8];
        const shuffledTopics = [...availableTopics].sort(() => 0.5 - Math.random());
        const selectedPractical = [];

        // Берем по 1 задаче из первых 5 случайно выбранных тем
        for (let i = 0; i < 5; i++) {
            const topicId = shuffledTopics[i];
            const topicTasks = APP_DATA.commandTasks.filter(t => t.topicId === topicId);
            const randomTask = topicTasks[Math.floor(Math.random() * topicTasks.length)];
            if (randomTask) {
                selectedPractical.push(Object.assign({}, randomTask, {
                    type: 'practical',
                    examTypeLabel: 'Практическая настройка'
                }));
            }
        }

        // 2. Выбираем 3 вопроса преподавателя
        const teacherPool = [...APP_DATA.teacherTasks].sort(() => 0.5 - Math.random());
        const selectedTeacher = teacherPool.slice(0, 3).map(t => Object.assign({}, t, {
            type: 'teacher',
            examTypeLabel: 'Вопрос преподавателя'
        }));

        // Объединяем и перемешиваем
        return [...selectedPractical, ...selectedTeacher];
    }

    startNewExam() {
        if (this.timerInterval) clearInterval(this.timerInterval);

        this.questions = this.generateExamPool();
        this.currentQIndex = 0;
        this.userAnswers = {};
        this.timeRemaining = this.examDurationSeconds;
        this.isExamActive = true;
        this.isExamFinished = false;

        if (this.examIntroBox) this.examIntroBox.classList.add('hidden');
        if (this.examResultsBox) this.examResultsBox.classList.add('hidden');
        if (this.examActiveContainer) this.examActiveContainer.classList.remove('hidden');

        this.startTimer();
        this.renderNavPills();
        this.loadQuestion(0);
    }

    startTimer() {
        this.updateTimerDisplay();
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();

            if (this.timeRemaining <= 0) {
                clearInterval(this.timerInterval);
                alert("⏰ Время экзамена истекло! Переходим к подведению итогов.");
                this.finishExam();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        if (!this.timerDisplay) return;
        const mins = Math.floor(this.timeRemaining / 60);
        const secs = this.timeRemaining % 60;
        const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        this.timerDisplay.textContent = formatted;

        if (this.timeRemaining < 180) { // Меньше 3 минут — красный таймер
            this.timerDisplay.classList.add('timer-warning');
        } else {
            this.timerDisplay.classList.remove('timer-warning');
        }
    }

    renderNavPills() {
        if (!this.navPills) return;
        this.navPills.innerHTML = this.questions.map((q, idx) => {
            const isAnswered = this.userAnswers[idx] !== undefined;
            const isActive = idx === this.currentQIndex;
            const qIcon = q.type === 'practical' ? '💻' : '🧑‍🏫';

            return `
                <button class="task-pill ${isActive ? 'active' : ''} ${isAnswered ? 'completed' : ''}" 
                        onclick="examManager.loadQuestion(${idx})">
                    ${qIcon} ${idx + 1}
                </button>
            `;
        }).join('');
    }

    loadQuestion(idx) {
        if (idx < 0 || idx >= this.questions.length) return;
        this.currentQIndex = idx;
        const q = this.questions[idx];

        this.renderNavPills();

        if (this.qBadge) {
            this.qBadge.textContent = `${q.examTypeLabel} • Узел: ${q.host.toUpperCase()}`;
            this.qBadge.className = `badge ${q.type === 'practical' ? 'badge-topic' : 'badge-warning'}`;
        }

        if (this.qTitle) {
            this.qTitle.textContent = `Билет №${idx + 1} из ${this.questions.length}`;
        }

        if (this.qDesc) {
            if (q.type === 'practical') {
                this.qDesc.innerHTML = `<b>Цель:</b> ${q.task}`;
            } else {
                this.qDesc.innerHTML = `<b>Преподаватель спрашивает:</b> «${q.question}»<br><span class="text-sm text-cyan">Цель: ${q.goal}</span>`;
            }
        }

        if (this.termPrompt) {
            this.termPrompt.textContent = q.prompt || `${q.host}# `;
        }

        const isAnswered = this.userAnswers[idx] !== undefined;
        if (this.termInput) {
            this.termInput.value = isAnswered ? this.userAnswers[idx].rawCmd : '';
            this.termInput.disabled = isAnswered;
            if (!isAnswered) this.termInput.focus();
        }

        if (this.btnSubmit) {
            this.btnSubmit.disabled = isAnswered;
        }

        // Рендер окна терминала
        if (this.termOutput) {
            if (isAnswered) {
                const ans = this.userAnswers[idx];
                this.termOutput.innerHTML = `
                    <div class="term-line sys-msg">
                        <span class="text-yellow">[Стенд Proxmox VE]</span> Вопрос сдан.
                    </div>
                    <div class="term-line">
                        <span class="prompt">${q.prompt}</span><span class="user-cmd">${this.escapeHtml(ans.rawCmd)}</span>
                    </div>
                    <div class="term-line ${ans.isCorrect ? 'text-green font-bold' : 'text-danger font-bold'}">
                        ${ans.isCorrect ? '✔ Ответ принят экзаменатором.' : '✖ В ответе зафиксирована ошибка.'}
                    </div>
                `;
            } else {
                this.termOutput.innerHTML = `
                    <div class="term-line sys-msg">
                        <span class="text-cyan">[Экзаменационный терминал]</span> Строгий режим. Подсказки отключены.
                    </div>
                    <div class="term-line sys-msg">
                        Введите команду настройки или диагностическую команду и нажмите <b>Enter</b> или кнопку <b>«Сдать ответ»</b>.
                    </div>
                `;
            }
        }

        // Обновляем текст кнопки далее
        if (this.btnNextQ) {
            this.btnNextQ.textContent = idx === this.questions.length - 1 ? 'Завершить экзамен →' : 'Следующий билет →';
        }
    }

    normalize(cmd) {
        return (cmd || '').trim().replace(/\s+/g, ' ').replace(/["']/g, "'").replace(/\s*>\s*/g, ' > ').replace(/;\s*$/, '');
    }

    submitCurrentAnswer() {
        if (!this.termInput || this.termInput.disabled) return;
        const cmd = this.termInput.value.trim();
        if (!cmd) return;

        const q = this.questions[this.currentQIndex];
        const normUser = this.normalize(cmd);

        let isCorrect = false;
        if (q.type === 'practical') {
            isCorrect = q.correctAnswers.some(ans => this.normalize(ans) === normUser);
        } else {
            isCorrect = q.validCommands.some(ans => this.normalize(ans) === normUser);
        }

        this.userAnswers[this.currentQIndex] = {
            rawCmd: cmd,
            isCorrect,
            question: q
        };

        this.renderNavPills();
        this.loadQuestion(this.currentQIndex);

        // Проверяем, все ли вопросы отвечены
        const answeredCount = Object.keys(this.userAnswers).length;
        if (answeredCount === this.questions.length) {
            setTimeout(() => {
                if (confirm("Вы ответили на все билеты! Завершить экзамен и посмотреть оценку?")) {
                    this.finishExam();
                }
            }, 300);
        }
    }

    finishExam() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.isExamActive = false;
        this.isExamFinished = true;

        if (this.examActiveContainer) this.examActiveContainer.classList.add('hidden');
        if (this.examResultsBox) this.examResultsBox.classList.remove('hidden');

        this.renderExamResults();
    }

    renderExamResults() {
        if (!this.examResultsBox) return;

        const totalQ = this.questions.length;
        let correctCount = 0;

        this.questions.forEach((q, idx) => {
            const ans = this.userAnswers[idx];
            if (ans && ans.isCorrect) correctCount++;
        });

        // 5-балльная шкала
        let grade = 2;
        let gradeTitle = 'Неудовлетворительно';
        let gradeColor = '#ef4444';
        let gradeNote = 'Материал требует повторения перед сдачей 14 ноября. Пройдите практики 2–8 в обычном режиме.';

        if (correctCount >= 7) {
            grade = 5;
            gradeTitle = 'Отлично';
            gradeColor = '#10b981';
            gradeNote = 'Стенд освоен на высоком уровне! Свободное владение конфигурацией и диагностикой.';
        } else if (correctCount >= 5) {
            grade = 4;
            gradeTitle = 'Хорошо';
            gradeColor = '#3b82f6';
            gradeNote = 'Твёрдый зачёт. Обратите внимание на ошибки в билетах ниже, чтобы не допустить их на экзамене.';
        } else if (correctCount >= 3) {
            grade = 3;
            gradeTitle = 'Удовлетворительно';
            gradeColor = '#f59e0b';
            gradeNote = 'Базовые знания есть, но в стрессовой ситуации есть риск провалиться. Потренируйтесь в режиме «Авария».';
        }

        const timeSpent = this.examDurationSeconds - this.timeRemaining;
        const minsSpent = Math.floor(timeSpent / 60);
        const secsSpent = timeSpent % 60;

        let html = `
            <div class="exam-report-card">
                <div class="exam-report-header">
                    <div class="grade-circle" style="border-color:${gradeColor}; color:${gradeColor}">
                        <span class="grade-number">${grade}</span>
                        <span class="grade-word">${gradeTitle}</span>
                    </div>
                    <div class="report-meta">
                        <h2>Протокол сдачи экзамена: ОС «Альт» и Proxmox VE</h2>
                        <p class="text-sm text-light mb-1">Время сдачи: <b>${minsSpent} мин ${secsSpent} сек</b> (лимит: 15:00)</p>
                        <p class="text-sm">Правильных ответов: <b style="color:${gradeColor}">${correctCount} из ${totalQ}</b> (${Math.round((correctCount / totalQ) * 100)}%)</p>
                        <p class="report-note-box">${gradeNote}</p>
                    </div>
                </div>

                <div class="exam-review-section">
                    <h3 class="mb-3 text-cyan">Детальный разбор каждого билета:</h3>
                    <div class="exam-review-list">
        `;

        this.questions.forEach((q, idx) => {
            const ans = this.userAnswers[idx];
            const isCorrect = ans && ans.isCorrect;
            const userCmd = ans ? ans.rawCmd : '(Не было попытки ответа)';
            const correctRef = q.type === 'practical' ? q.correctAnswers[0] : q.validCommands[0];

            html += `
                <div class="exam-item-card ${isCorrect ? 'border-success' : 'border-danger'}">
                    <div class="d-flex justify-between align-center mb-1 flex-wrap gap-1">
                        <span class="badge ${q.type === 'practical' ? 'badge-topic' : 'badge-warning'}">Билет #${idx + 1}: ${q.examTypeLabel} (${q.host.toUpperCase()})</span>
                        <span class="font-bold ${isCorrect ? 'text-green' : 'text-danger'}">${isCorrect ? '✔ ЗАЧТЕНО' : '✖ ОШИБКА'}</span>
                    </div>

                    <div class="text-light text-sm mb-2">
                        ${q.type === 'practical' ? `<b>Задание:</b> ${q.task}` : `<b>Вопрос:</b> «${q.question}»`}
                    </div>

                    <div class="exam-diff-grid">
                        <div class="diff-block">
                            <span class="text-xs text-muted">Ваш ввод:</span>
                            <code class="${isCorrect ? 'text-green' : 'text-danger'}">${this.escapeHtml(userCmd)}</code>
                        </div>
                        <div class="diff-block">
                            <span class="text-xs text-muted">Эталонная команда:</span>
                            <code class="text-green">${this.escapeHtml(correctRef)}</code>
                        </div>
                    </div>

                    <div class="exam-exp-box mt-2 text-xs text-muted">
                        💡 <b>Почему так:</b> ${q.explanation}
                    </div>
                </div>
            `;
        });

        html += `
                    </div>
                </div>

                <div class="exam-report-footer mt-4 text-center">
                    <button class="btn btn-success" onclick="examManager.startNewExam()">
                        🔄 Пройти экзамен ещё раз (новые случайные билеты)
                    </button>
                </div>
            </div>
        `;

        this.examResultsBox.innerHTML = html;
    }

    escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return (text || '').replace(/[&<>"']/g, m => map[m]);
    }
}

// Экспорт в глобальное окружение
window.ExamManager = ExamManager;
