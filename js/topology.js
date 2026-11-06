// Модуль интерактивной топологии сети и блиц-теста

class TopologyManager {
    constructor() {
        this.quizIndex = 0;
        this.quizScore = 0;
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
            
            <h4 class="mt-4 mb-2 text-cyan">Сетевые интерфейсы</h4>
            <div class="table-responsive">
                <table class="table-custom">
                    <thead>
                        <tr>
                            <th>Интерфейс</th>
                            <th>IP / Маска</th>
                            <th>Шлюз</th>
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
        if (!this.subnetTableBody) return;
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
        if (!this.quizQuestion) return;

        const q = APP_DATA.topologyQuiz[this.quizIndex];
        this.quizQuestion.textContent = `${this.quizIndex + 1}. ${q.q}`;
        this.quizResult.classList.add('hidden');
        this.quizNextBtn.classList.add('hidden');
        this.quizScoreDisplay.textContent = `Счет: ${this.quizScore} / ${APP_DATA.topologyQuiz.length}`;

        this.quizOptions.innerHTML = '';
        q.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-quiz-opt';
            btn.textContent = opt;
            btn.addEventListener('click', () => this.checkQuizAnswer(idx, q));
            this.quizOptions.appendChild(btn);
        });
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
