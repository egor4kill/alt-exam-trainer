// Модуль вопросов преподавателя для сдачи и защиты работ
// Включает:
// 1. Карточки теоретических вопросов (14 тем)
// 2. Тренажёр «Ответ своими словами» с проверкой ключевых смысловых понятий и эталоном

class ExamQAManager {
    constructor() {
        this.currentMode = 'cards'; // 'cards' | 'freetext'
        this.currentFilter = "all";
        this.searchQuery = "";
        this.learnedQuestions = new Set(JSON.parse(localStorage.getItem('alt_learned_qa') || '[]'));

        // Для режима «Ответ своими словами»
        this.currentFreeTextIdx = 0;
        this.freeTextResults = {};

        this.initDOMElements();
        this.bindEvents();
        this.renderQuestions();
        this.renderFreeTextQuestion();
    }

    initDOMElements() {
        this.qaContainer = document.getElementById('qa-cards-container');
        this.topicFilter = document.getElementById('qa-topic-filter');
        this.searchInput = document.getElementById('qa-search-input');
        this.statLearned = document.getElementById('stat-qa-learned');
        this.btnRandomQ = document.getElementById('btn-random-qa');

        // Переключатель режимов теории
        this.modeCardsBtn = document.getElementById('qa-mode-cards');
        this.modeFreeTextBtn = document.getElementById('qa-mode-freetext');
        this.paneCards = document.getElementById('qa-pane-cards');
        this.paneFreeText = document.getElementById('qa-pane-freetext');

        // Элементы тренажера свободных ответов
        this.ftNavPills = document.getElementById('ft-nav-pills');
        this.ftQuestionTitle = document.getElementById('ft-question-title');
        this.ftCriteriaList = document.getElementById('ft-criteria-list');
        this.ftTextarea = document.getElementById('ft-textarea');
        this.ftBtnCheck = document.getElementById('ft-btn-check');
        this.ftResultBox = document.getElementById('ft-result-box');
    }

    bindEvents() {
        this.topicFilter?.addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.renderQuestions();
        });

        this.searchInput?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase().trim();
            this.renderQuestions();
        });

        this.btnRandomQ?.addEventListener('click', () => {
            this.pickRandomQuestion();
        });

        // Переключение режимов: Карточки vs Своими словами
        this.modeCardsBtn?.addEventListener('click', () => this.switchMode('cards'));
        this.modeFreeTextBtn?.addEventListener('click', () => this.switchMode('freetext'));

        // Проверка ответа своими словами
        this.ftBtnCheck?.addEventListener('click', () => this.checkFreeTextAnswer());
    }

    switchMode(mode) {
        this.currentMode = mode;
        if (mode === 'cards') {
            this.modeCardsBtn?.classList.add('active');
            this.modeFreeTextBtn?.classList.remove('active');
            this.paneCards?.classList.remove('hidden');
            this.paneFreeText?.classList.add('hidden');
        } else {
            this.modeCardsBtn?.classList.remove('active');
            this.modeFreeTextBtn?.classList.add('active');
            this.paneCards?.classList.add('hidden');
            this.paneFreeText?.classList.remove('hidden');
            this.renderFreeTextQuestion();
        }
    }

    // =========================================================================
    // 1. КАРТОЧКИ ТЕОРИИ (БИЛЕТЫ)
    // =========================================================================

    renderQuestions() {
        if (!this.qaContainer) return;

        let filtered = APP_DATA.examQuestions;

        // Фильтр по теме
        if (this.currentFilter !== "all") {
            const tid = parseInt(this.currentFilter, 10);
            filtered = filtered.filter(q => q.topicId === tid);
        }

        // Поиск по ключевым словам
        if (this.searchQuery) {
            filtered = filtered.filter(q => 
                q.question.toLowerCase().includes(this.searchQuery) ||
                q.shortAnswer.toLowerCase().includes(this.searchQuery) ||
                q.fullAnswer.toLowerCase().includes(this.searchQuery) ||
                q.tags.some(t => t.toLowerCase().includes(this.searchQuery))
            );
        }

        if (filtered.length === 0) {
            this.qaContainer.innerHTML = `
                <div class="empty-state text-center py-5">
                    <p class="text-muted">Вопросов по заданным критериям не найдено.</p>
                </div>
            `;
            return;
        }

        this.qaContainer.innerHTML = filtered.map(q => {
            const isLearned = this.learnedQuestions.has(q.id);
            const topic = APP_DATA.topics.find(t => t.id === q.topicId);

            return `
                <div class="qa-card ${isLearned ? 'is-learned' : ''}" id="qa-${q.id}">
                    <div class="qa-header" onclick="examQAManager.toggleCard('${q.id}')">
                        <div class="qa-header-left">
                            <span class="badge badge-topic">${topic ? topic.badge : 'Тема ' + q.topicId}</span>
                            <h3 class="qa-title">${q.question}</h3>
                        </div>
                        <div class="qa-header-right">
                            <span class="toggle-icon">▼</span>
                        </div>
                    </div>
                    
                    <div class="qa-body hidden" id="qa-body-${q.id}">
                        <div class="qa-short-answer mb-3">
                            <span class="label-badge text-yellow">Краткий ответ (что сказать сразу преподавателю):</span>
                            <p class="text-bold mt-1">${q.shortAnswer}</p>
                        </div>

                        <div class="qa-full-answer mb-3">
                            <span class="label-badge text-cyan">Развернутое пояснение (на «отлично»):</span>
                            <div class="mt-1 answer-text">${this.formatAnswerText(q.fullAnswer)}</div>
                        </div>

                        <div class="qa-footer">
                            <div class="qa-tags">
                                ${q.tags.map(t => `<span class="tag">#${t}</span>`).join('')}
                            </div>
                            <button class="btn btn-sm ${isLearned ? 'btn-success' : 'btn-outline'}" 
                                onclick="examQAManager.toggleLearned('${q.id}', event)">
                                ${isLearned ? '✔ Выучено' : 'Отметить как выученное'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.updateStats();
    }

    toggleCard(id) {
        const body = document.getElementById(`qa-body-${id}`);
        const card = document.getElementById(`qa-${id}`);
        if (!body || !card) return;

        const isHidden = body.classList.contains('hidden');
        body.classList.toggle('hidden');
        card.classList.toggle('is-expanded', isHidden);

        const icon = card.querySelector('.toggle-icon');
        if (icon) {
            icon.textContent = isHidden ? '▲' : '▼';
        }
    }

    toggleLearned(id, event) {
        event.stopPropagation();
        if (this.learnedQuestions.has(id)) {
            this.learnedQuestions.delete(id);
        } else {
            this.learnedQuestions.add(id);
        }
        localStorage.setItem('alt_learned_qa', JSON.stringify([...this.learnedQuestions]));
        this.renderQuestions();
    }

    pickRandomQuestion() {
        const randomIndex = Math.floor(Math.random() * APP_DATA.examQuestions.length);
        const randomQ = APP_DATA.examQuestions[randomIndex];

        this.currentFilter = "all";
        if (this.topicFilter) this.topicFilter.value = "all";
        this.searchQuery = "";
        if (this.searchInput) this.searchInput.value = "";

        this.renderQuestions();

        const card = document.getElementById(`qa-${randomQ.id}`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            this.toggleCard(randomQ.id);
            card.classList.add('highlight-pulse');
            setTimeout(() => card.classList.remove('highlight-pulse'), 2000);
        }
    }

    formatAnswerText(text) {
        return text
            .split('\n')
            .map(line => `<p class="mb-1">${line}</p>`)
            .join('')
            .replace(/`([^`]+)`/g, '<code>$1</code>');
    }

    updateStats() {
        const total = APP_DATA.examQuestions.length;
        const learned = this.learnedQuestions.size;
        if (this.statLearned) {
            this.statLearned.textContent = `${learned} / ${total}`;
        }
    }


    // =========================================================================
    // 2. ОТВЕТ СВОИМИ СЛОВАМИ (СМЫСЛОВАЯ ПРОВЕРКА ПО КЛЮЧЕВЫМ ПОНЯТИЯМ)
    // =========================================================================

    renderFreeTextQuestion() {
        const list = APP_DATA.freeTextQuestions;
        if (!list || list.length === 0) return;

        const q = list[this.currentFreeTextIdx];

        // Навигационные пилюли
        if (this.ftNavPills) {
            this.ftNavPills.innerHTML = list.map((item, idx) => {
                const isActive = idx === this.currentFreeTextIdx;
                const res = this.freeTextResults[item.id];
                const isPassed = res && res.score >= 60;

                let pillClass = 'task-pill';
                if (isActive) pillClass += ' active';
                if (res) pillClass += isPassed ? ' completed' : ' repeat-pill';

                return `
                    <button class="${pillClass}" onclick="examQAManager.loadFreeText(${idx})">
                        ${res ? (isPassed ? '✔' : '⚠️') : ''} #${idx + 1}
                    </button>
                `;
            }).join('');
        }

        if (this.ftQuestionTitle) {
            this.ftQuestionTitle.innerHTML = `<span class="text-yellow">Вопрос #${this.currentFreeTextIdx + 1}:</span> ${q.question}`;
        }

        if (this.ftCriteriaList) {
            this.ftCriteriaList.innerHTML = q.criteria.map(c => `<li>• ${c}</li>`).join('');
        }

        if (this.ftTextarea) {
            const savedText = this.freeTextResults[q.id]?.userText || '';
            this.ftTextarea.value = savedText;
            this.ftTextarea.focus();
        }

        if (this.ftResultBox) {
            if (this.freeTextResults[q.id]) {
                this.displayFreeTextResult(q, this.freeTextResults[q.id]);
            } else {
                this.ftResultBox.classList.add('hidden');
                this.ftResultBox.innerHTML = '';
            }
        }
    }

    loadFreeText(idx) {
        this.currentFreeTextIdx = idx;
        this.renderFreeTextQuestion();
    }

    checkFreeTextAnswer() {
        const list = APP_DATA.freeTextQuestions;
        const q = list[this.currentFreeTextIdx];
        const text = (this.ftTextarea?.value || '').trim();

        if (!text) {
            alert("Пожалуйста, напишите ваш ответ своими словами (1-3 предложения).");
            return;
        }

        const lowerText = text.toLowerCase();
        let matchedGroups = 0;
        const groupMatches = [];

        q.keywords.forEach((group, gIdx) => {
            const matchedWord = group.find(word => lowerText.includes(word.toLowerCase()));
            if (matchedWord) {
                matchedGroups++;
                groupMatches.push({
                    groupIndex: gIdx,
                    criterion: q.criteria[gIdx] || `Ключевой аспект ${gIdx + 1}`,
                    found: true,
                    matchedWord
                });
            } else {
                groupMatches.push({
                    groupIndex: gIdx,
                    criterion: q.criteria[gIdx] || `Ключевой аспект ${gIdx + 1}`,
                    found: false
                });
            }
        });

        const score = Math.round((matchedGroups / q.keywords.length) * 100);

        this.freeTextResults[q.id] = {
            userText: text,
            score,
            groupMatches,
            isPassed: score >= 60
        };

        this.renderFreeTextQuestion();
    }

    displayFreeTextResult(q, res) {
        if (!this.ftResultBox) return;
        this.ftResultBox.classList.remove('hidden');

        const isGood = res.score >= 70;
        const isMedium = res.score >= 50 && res.score < 70;

        let statusClass = 'border-danger';
        let statusTitle = 'Требуется дополнить ответ';
        let statusIcon = '⚠️';
        if (isGood) {
            statusClass = 'border-success';
            statusTitle = 'Отличный ответ! Зачёт получен';
            statusIcon = '🎉';
        } else if (isMedium) {
            statusClass = 'border-warning';
            statusTitle = 'Хорошо, но ответ не полон';
            statusIcon = '👍';
        }

        let html = `
            <div class="ft-result-card ${statusClass}">
                <div class="d-flex justify-between align-center mb-2 flex-wrap gap-2">
                    <div class="d-flex align-center gap-2">
                        <span class="text-xl">${statusIcon}</span>
                        <h4 class="${isGood ? 'text-green' : (isMedium ? 'text-yellow' : 'text-danger')}">${statusTitle}</h4>
                    </div>
                    <span class="badge badge-topic">Полнота ответа: ${res.score}%</span>
                </div>

                <div class="ft-criteria-chips mb-3">
                    <span class="text-xs text-muted d-block mb-1">Смысловой анализ по критериям преподавателя:</span>
                    <div class="d-flex flex-wrap gap-2">
        `;

        res.groupMatches.forEach(gm => {
            if (gm.found) {
                html += `<span class="chip chip-success">✔ ${gm.criterion} (найдено слово: «${gm.matchedWord}»)</span>`;
            } else {
                html += `<span class="chip chip-danger">✖ Не упомянуто: ${gm.criterion}</span>`;
            }
        });

        html += `
                    </div>
                </div>

                <div class="ft-ideal-box mb-3">
                    <span class="text-xs text-cyan font-bold d-block mb-1">🌟 Эталонный лаконичный ответ (как сказать преподавателю):</span>
                    <p class="text-sm text-light">${q.idealAnswer}</p>
                </div>

                <div class="d-flex justify-between align-center mt-3">
                    <span class="text-xs text-muted">Используйте техническую терминологию (трансляция, шлюз, инкапсуляция).</span>
                    ${this.currentFreeTextIdx < APP_DATA.freeTextQuestions.length - 1 ? `
                        <button class="btn btn-sm btn-outline text-cyan" onclick="examQAManager.loadFreeText(${this.currentFreeTextIdx + 1})">
                            Следующий вопрос →
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        this.ftResultBox.innerHTML = html;
    }
}

// Экспорт
window.ExamQAManager = ExamQAManager;
