// Модуль вопросов преподавателя для сдачи и защиты работ

class ExamQAManager {
    constructor() {
        this.currentFilter = "all";
        this.searchQuery = "";
        this.learnedQuestions = new Set(JSON.parse(localStorage.getItem('alt_learned_qa') || '[]'));

        this.initDOMElements();
        this.bindEvents();
        this.renderQuestions();
    }

    initDOMElements() {
        this.qaContainer = document.getElementById('qa-cards-container');
        this.topicFilter = document.getElementById('qa-topic-filter');
        this.searchInput = document.getElementById('qa-search-input');
        this.statLearned = document.getElementById('stat-qa-learned');
        this.btnRandomQ = document.getElementById('btn-random-qa');
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
    }

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
                            <span class="label-badge text-yellow">Краткий ответ (что сказать сразу):</span>
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
}
