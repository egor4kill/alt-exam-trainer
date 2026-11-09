// Модуль интерактивной топологии сети и блиц-теста

class TopologyManager {
    constructor() {
        try {
            this.quizIndex = parseInt(localStorage.getItem('alt_topo_quiz_index') || '0', 10);
            this.quizScore = parseInt(localStorage.getItem('alt_topo_quiz_score') || '0', 10);
        } catch (e) {
            this.quizIndex = 0;
            this.quizScore = 0;
        }

        const quizLen = (typeof APP_DATA !== 'undefined' && APP_DATA.topologyQuiz) ? APP_DATA.topologyQuiz.length : 0;
        if (isNaN(this.quizIndex) || this.quizIndex < 0 || (quizLen > 0 && this.quizIndex >= quizLen)) {
            this.quizIndex = 0;
        }
        if (isNaN(this.quizScore) || this.quizScore < 0) {
            this.quizScore = 0;
        }
        this.selectedNode = null;

        this.initDOMElements();
        this.bindEvents();
        this.renderSubnetTable();
        this.loadQuizQuestion();
    }

    initDOMElements() {
        this.modal = document.getElementById('node-modal');
        this.modalTitle = document.getElementById('modal-node-title');
        this.modalBody = document.getElementById('modal-node-body');
        this.modalClose = document.getElementById('modal-close-btn');

        this.quizCard = document.getElementById('topo-quiz-card');
        this.quizQuestion = document.getElementById('quiz-question');
        this.quizOptions = document.getElementById('quiz-options');
        this.quizResult = document.getElementById('quiz-result');
        this.quizNextBtn = document.getElementById('quiz-next-btn');
        this.quizScoreDisplay = document.getElementById('quiz-score-display');
        this.subnetTableBody = document.getElementById('subnet-table-body');
    }

    bindEvents() {
        // Клик по узлам на схеме
        document.querySelectorAll('.topo-node').forEach(nodeEl => {
            nodeEl.addEventListener('click', (e) => {
                const nodeId = nodeEl.getAttribute('data-node');
                this.showNodeDetails(nodeId);
            });
        });

        // Закрытие модального окна
        this.modalClose?.addEventListener('click', () => {
            this.modal.classList.add('hidden');
        });

        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.modal.classList.add('hidden');
            }
        });

        // Кнопка следующего вопроса квиза
        this.quizNextBtn?.addEventListener('click', () => {
            this.quizIndex = (this.quizIndex + 1) % APP_DATA.topologyQuiz.length;
            localStorage.setItem('alt_topo_quiz_index', this.quizIndex.toString());
            this.loadQuizQuestion();
        });
    }

    showNodeDetails(nodeId) {
        const node = APP_DATA.nodes.find(n => n.id === nodeId);
        if (!node || !this.modal) return;

        this.modalTitle.innerHTML = `
            <span class="badge" style="background:${node.color}22; color:${node.color}; border:1px solid ${node.color}">
                ID: ${node.vmid}
            </span>
            ${node.name} <span class="text-muted text-sm font-normal">(${node.fqdn})</span>
        `;

        let ifacesHtml = node.interfaces.map(i => `
            <tr>
                <td><b class="text-cyan">${i.name}</b></td>
                <td><code>${i.ip}</code></td>
                <td>${i.gw}</td>
                <td><span class="text-yellow font-bold">${i.to || '—'}</span></td>
                <td class="text-sm text-muted">${i.desc}</td>
            </tr>
        `).join('');

        let servicesHtml = node.services.map(s => `
            <span class="tag tag-service">⚡ ${s}</span>
        `).join('');

        let configsHtml = node.configs.map(c => `
            <li><code>${c}</code></li>
        `).join('');

        this.modalBody.innerHTML = `
            <div class="mb-3">
                <b>Роль в стенде:</b> ${node.role}
            </div>

            ${node.defenseSpeech ? `
            <div class="alert alert-info mt-3 mb-3" style="background: rgba(14, 165, 233, 0.12); border-left: 4px solid #06b6d4; padding: 0.8rem 1rem; border-radius: 6px;">
                <div class="d-flex align-center gap-2 mb-1">
                    <span class="text-lg">🗣️</span>
                    <b class="text-yellow" style="font-size: 0.95rem;">Что сказать преподавателю при вопросе об интерфейсах:</b>
                </div>
                <p class="mb-0 text-sm" style="color: #f1f5f9; line-height: 1.55; font-style: italic;">
                    ${node.defenseSpeech}
                </p>
            </div>
            ` : ''}
            
            <h4 class="mt-4 mb-2 text-cyan">Сетевые интерфейсы</h4>
            <div class="table-responsive">
                <table class="table-custom">
                    <thead>
                        <tr>
                            <th>Интерфейс</th>
                            <th>IP / Маска</th>
                            <th>Шлюз</th>
                            <th>Куда ведёт (линк)</th>
                            <th>Назначение</th>
                        </tr>
                    </thead>
                    <tbody>${ifacesHtml}</tbody>
                </table>
            </div>

            <h4 class="mt-4 mb-2 text-yellow">Активные службы и настройки</h4>
            <div class="services-container mb-3">${servicesHtml}</div>

            <h4 class="mt-4 mb-2 text-purple">Ключевые конфигурационные файлы</h4>
            <ul class="file-list">${configsHtml}</ul>

            <div class="alert alert-info mt-3 text-sm">
                <b>Вход в консоль Proxmox noVNC:</b> пользователь <code>root</code> (для HQ-CLI: пользователь <code>user</code>, пароль при входе в <code>su -</code>).
            </div>
        `;

        this.modal.classList.remove('hidden');
    }

    renderSubnetTable() {
        if (!this.subnetTableBody) {
            this.subnetTableBody = document.getElementById('subnet-table-body');
        }
        if (!this.subnetTableBody || typeof APP_DATA === 'undefined' || !APP_DATA.subnets) return;
        this.subnetTableBody.innerHTML = APP_DATA.subnets.map(s => `
            <tr>
                <td><b class="text-yellow">${s.net}</b></td>
                <td><code>${s.mask}</code></td>
                <td><span class="text-cyan">${s.fromTo}</span></td>
                <td>${s.purpose}</td>
            </tr>
        `).join('');
    }

    loadQuizQuestion() {
        if (!this.quizQuestion) {
            this.quizQuestion = document.getElementById('quiz-question');
            this.quizOptions = document.getElementById('quiz-options');
            this.quizResult = document.getElementById('quiz-result');
            this.quizNextBtn = document.getElementById('quiz-next-btn');
            this.quizScoreDisplay = document.getElementById('quiz-score-display');
        }
        if (!this.quizQuestion || typeof APP_DATA === 'undefined' || !APP_DATA.topologyQuiz || APP_DATA.topologyQuiz.length === 0) return;

        if (this.quizIndex >= APP_DATA.topologyQuiz.length || this.quizIndex < 0 || isNaN(this.quizIndex)) {
            this.quizIndex = 0;
        }

        const q = APP_DATA.topologyQuiz[this.quizIndex];
        if (!q) return;

        this.quizQuestion.textContent = `${this.quizIndex + 1}. ${q.q}`;
        if (this.quizResult) this.quizResult.classList.add('hidden');
        if (this.quizNextBtn) this.quizNextBtn.classList.add('hidden');
        if (this.quizScoreDisplay) {
            this.quizScoreDisplay.textContent = `Счет: ${this.quizScore} / ${APP_DATA.topologyQuiz.length}`;
        }

        if (this.quizOptions) {
            this.quizOptions.innerHTML = '';
            (q.options || []).forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.className = 'btn btn-quiz-opt';
                btn.textContent = opt;
                btn.addEventListener('click', () => this.checkQuizAnswer(idx, q));
                this.quizOptions.appendChild(btn);
            });
        }
    }

    checkQuizAnswer(chosenIdx, q) {
        const buttons = this.quizOptions.querySelectorAll('button');
        buttons.forEach((btn, idx) => {
            btn.disabled = true;
            if (idx === q.answer) {
                btn.classList.add('btn-correct');
            } else if (idx === chosenIdx) {
                btn.classList.add('btn-wrong');
            }
        });

        this.quizResult.classList.remove('hidden');
        if (chosenIdx === q.answer) {
            this.quizScore++;
            localStorage.setItem('alt_topo_quiz_score', this.quizScore.toString());
            this.quizResult.innerHTML = `
                <div class="alert alert-success">
                    <b>Верно! ✔</b> ${q.expl}
                </div>
            `;
        } else {
            this.quizResult.innerHTML = `
                <div class="alert alert-danger">
                    <b>Неверно ✖</b> ${q.expl}
                </div>
            `;
        }

        this.quizScoreDisplay.textContent = `Счет: ${this.quizScore} / ${APP_DATA.topologyQuiz.length}`;
        this.quizNextBtn.classList.remove('hidden');
    }
}
