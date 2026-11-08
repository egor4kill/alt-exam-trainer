// js/troubleshoot.js
// Модуль диагностики и траблшутинга стенда ОС «Альт»
// Включает:
// 1. Режим «Авария» (Цепочка диагностики от симптома к первопричине)
// 2. Чтение вывода консоли (Интерпретация логов и статусов вместо ввода команд)
// 3. Сквозной путь пакета («HQ-CLI не открывает ya.ru» — диагностика 7 хопов)

class TroubleshootManager {
    constructor() {
        this.currentSubTab = 'incidents'; // 'incidents' | 'output' | 'packet'
        
        // Инциденты (Аварии)
        this.currentIncidentIdx = 0;
        this.currentIncidentStep = 0;
        this.incidentHistory = [];

        // Чтение вывода
        this.currentOutputIdx = 0;
        this.outputAnswered = {};

        // Сквозной путь пакета
        this.currentPacketHop = 0;

        this.initDOMElements();
        this.bindEvents();
        this.renderCurrentSubTab();
    }

    initDOMElements() {
        // Подвкладки
        this.subTabs = document.querySelectorAll('.trouble-subtab');
        this.subSections = document.querySelectorAll('.trouble-subpane');

        // Элементы Аварий
        this.incidentSelector = document.getElementById('incident-select');
        this.incidentSymptomBox = document.getElementById('incident-symptom-card');
        this.incidentStepsBar = document.getElementById('incident-steps-bar');
        this.incidentTermOutput = document.getElementById('incident-term-output');
        this.incidentTermInput = document.getElementById('incident-term-input');
        this.incidentTermPrompt = document.getElementById('incident-term-prompt');
        this.btnIncidentHint = document.getElementById('incident-btn-hint');
        this.btnIncidentAnswer = document.getElementById('incident-btn-answer');
        this.incidentHintBox = document.getElementById('incident-hint-box');

        // Элементы Чтения вывода
        this.outputNavContainer = document.getElementById('output-nav-pills');
        this.outputSnippetTitle = document.getElementById('output-snippet-title');
        this.outputSnippetCode = document.getElementById('output-snippet-code');
        this.outputQuestionText = document.getElementById('output-question-text');
        this.outputOptionsBox = document.getElementById('output-options-box');
        this.outputExplanationBox = document.getElementById('output-explanation-box');

        // Элементы Сквозного пути пакета
        this.packetHopsNav = document.getElementById('packet-hops-nav');
        this.packetHopCard = document.getElementById('packet-hop-card');
    }

    bindEvents() {
        // Переключение подвкладок
        this.subTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-subtab');
                this.setSubTab(target);
            });
        });

        // Смена инцидента
        this.incidentSelector?.addEventListener('change', (e) => {
            this.loadIncident(parseInt(e.target.value, 10));
        });

        // Подключение автодополнения Tab
        if (window.altTabCompleter) {
            window.altTabCompleter.attachToInput(
                this.incidentTermInput,
                this.incidentTermOutput,
                () => this.incidentTermPrompt?.textContent || 'root@hq-rtr:~# '
            );
        }

        // Ввод команды в терминале Аварии
        this.incidentTermInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleIncidentCommand(this.incidentTermInput.value);
            }
        });

        document.getElementById('incident-btn-run')?.addEventListener('click', () => {
            this.handleIncidentCommand(this.incidentTermInput.value);
        });

        // Подсказки для Аварий
        this.btnIncidentHint?.addEventListener('click', () => this.showIncidentHint());
        this.btnIncidentAnswer?.addEventListener('click', () => this.showIncidentAnswer());

        // Мобильные спецсимволы в режиме аварии
        document.querySelectorAll('#sec-troubleshoot .key-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.preventDefault();
                const key = chip.getAttribute('data-key');
                const action = chip.getAttribute('data-action');
                if (action === 'tab') {
                    if (window.altTabCompleter) {
                        window.altTabCompleter.handleTab(this.incidentTermInput, this.incidentTermOutput, this.incidentTermPrompt?.textContent || 'root@hq-rtr:~# ');
                        this.incidentTermInput.focus();
                    }
                } else if (action === 'clear') {
                    this.incidentTermInput.value = '';
                    this.incidentTermInput.focus();
                } else if (key && this.incidentTermInput) {
                    const start = this.incidentTermInput.selectionStart ?? this.incidentTermInput.value.length;
                    const end = this.incidentTermInput.selectionEnd ?? this.incidentTermInput.value.length;
                    const val = this.incidentTermInput.value;
                    this.incidentTermInput.value = val.substring(0, start) + key + val.substring(end);
                    this.incidentTermInput.focus();
                    this.incidentTermInput.setSelectionRange(start + key.length, start + key.length);
                }
            });
        });
    }

    setSubTab(tabName) {
        this.currentSubTab = tabName;
        this.subTabs.forEach(t => {
            if (t.getAttribute('data-subtab') === tabName) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });

        this.subSections.forEach(s => {
            if (s.id === `pane-${tabName}`) {
                s.classList.add('active');
            } else {
                s.classList.remove('active');
            }
        });

        this.renderCurrentSubTab();
    }

    renderCurrentSubTab() {
        if (this.currentSubTab === 'incidents') {
            this.loadIncident(this.currentIncidentIdx);
        } else if (this.currentSubTab === 'output') {
            this.loadOutputReading(this.currentOutputIdx);
        } else if (this.currentSubTab === 'packet') {
            this.loadPacketJourney(this.currentPacketHop);
        }
    }

    // =========================================================================
    // 1. РЕЖИМ «АВАРИЯ» (ДИАГНОСТИЧЕСКАЯ ЦЕПОЧКА)
    // =========================================================================

    loadIncident(idx) {
        this.currentIncidentIdx = idx;
        this.currentIncidentStep = 0;
        const incident = APP_DATA.incidents[idx];
        if (!incident) return;

        if (this.incidentSelector) {
            this.incidentSelector.value = idx.toString();
        }

        // Рендер симптома
        if (this.incidentSymptomBox) {
            this.incidentSymptomBox.innerHTML = `
                <div class="incident-alert-banner">
                    <div class="alert-icon">🚨</div>
                    <div class="alert-content">
                        <div class="d-flex justify-between align-center">
                            <h3 class="incident-title">${incident.title}</h3>
                            <span class="badge" style="background:#ef444422; color:#ef4444; border:1px solid #ef4444">Узел: ${incident.host.toUpperCase()}</span>
                        </div>
                        <p class="incident-symptom-text"><b>Симптом:</b> ${incident.symptom}</p>
                    </div>
                </div>
            `;
        }

        this.renderIncidentStepsBar(incident);
        this.initIncidentTerminal(incident);
    }

    renderIncidentStepsBar(incident) {
        if (!this.incidentStepsBar) return;
        this.incidentStepsBar.innerHTML = incident.steps.map((step, sIdx) => {
            let statusClass = 'step-pending';
            if (sIdx < this.currentIncidentStep) statusClass = 'step-done';
            if (sIdx === this.currentIncidentStep) statusClass = 'step-current';

            return `
                <div class="incident-step-pill ${statusClass}">
                    <span class="step-num">${sIdx + 1}</span>
                    <span class="step-name">${this.getStepShortLabel(step.goal)}</span>
                </div>
            `;
        }).join('<span class="step-arrow">→</span>');
    }

    getStepShortLabel(goal) {
        if (goal.includes('статус') || goal.includes('интерфейс')) return 'Проверка линка';
        if (goal.includes('шлюз') || goal.includes('пинг')) return 'Ping шлюза';
        if (goal.includes('forward')) return 'sysctl forward';
        if (goal.includes('правила') || goal.includes('iptables')) return 'Поиск причины (NAT)';
        if (goal.includes('Устранение') || goal.includes('MASQUERADE') || goal.includes('Добавьте')) return 'Устранение аварии';
        if (goal.includes('Контроль') || goal.includes('проверьте')) return 'Контрольная проверка';
        if (goal.includes('конфиг') || goal.includes('options')) return 'Просмотр конфига';
        if (goal.includes('systemctl')) return 'Статус сервиса';
        return 'Диагностика';
    }

    initIncidentTerminal(incident) {
        const step = incident.steps[this.currentIncidentStep];
        if (this.incidentTermPrompt) this.incidentTermPrompt.textContent = step.prompt;
        if (this.incidentTermInput) {
            this.incidentTermInput.value = '';
            this.incidentTermInput.focus();
        }
        if (this.incidentHintBox) {
            this.incidentHintBox.classList.add('hidden');
            this.incidentHintBox.innerHTML = '';
        }

        if (this.incidentTermOutput) {
            this.incidentTermOutput.innerHTML = `
                <div class="term-line sys-msg">
                    <span class="text-yellow">[Диагностический режим]</span> Вы находитесь на узле <b class="text-green">${incident.host.toUpperCase()}</b>.
                </div>
                <div class="term-line sys-msg">
                    <span class="text-cyan">Текущая цель:</span> ${step.goal}
                </div>
                <div class="term-line sys-msg text-muted">
                    Введите команду расследования или воспользуйтесь подсказками вверху.
                </div>
            `;
        }
    }

    normalize(cmd) {
        return (cmd || '').trim().replace(/\s+/g, ' ').replace(/["']/g, "'").replace(/;\s*$/, '');
    }

    handleIncidentCommand(rawCmd) {
        const cmd = rawCmd.trim();
        if (!cmd) return;

        const incident = APP_DATA.incidents[this.currentIncidentIdx];
        const step = incident.steps[this.currentIncidentStep];
        const normUser = this.normalize(cmd);

        // Печатаем команду пользователя
        const line = document.createElement('div');
        line.className = 'term-line';
        line.innerHTML = `<span class="prompt">${step.prompt}</span><span class="user-cmd">${this.escapeHtml(cmd)}</span>`;
        this.incidentTermOutput.appendChild(line);

        const isCorrect = step.validCommands.some(vc => this.normalize(vc) === normUser);

        if (isCorrect) {
            // Выводим результат команды (реалистичный bash вывод)
            const outLine = document.createElement('div');
            outLine.className = 'term-line term-simulated-output';
            outLine.innerHTML = `<pre>${this.escapeHtml(step.output)}</pre>`;
            this.incidentTermOutput.appendChild(outLine);

            // Объяснение
            const expLine = document.createElement('div');
            expLine.className = 'term-line text-cyan font-bold mt-1';
            expLine.innerHTML = `🔎 <b>Анализ вывода:</b> ${step.explanation}`;
            this.incidentTermOutput.appendChild(expLine);

            this.currentIncidentStep++;
            this.renderIncidentStepsBar(incident);

            if (this.currentIncidentStep < incident.steps.length) {
                const nextStep = incident.steps[this.currentIncidentStep];
                this.incidentTermPrompt.textContent = nextStep.prompt;

                const goalLine = document.createElement('div');
                goalLine.className = 'term-line sys-msg mt-2';
                goalLine.innerHTML = `<span class="text-yellow">Следующий шаг:</span> ${nextStep.goal}`;
                this.incidentTermOutput.appendChild(goalLine);
            } else {
                const victoryDiv = document.createElement('div');
                victoryDiv.className = 'term-line sys-msg mt-3 text-green font-bold';
                victoryDiv.innerHTML = `
                    <div class="incident-victory-box">
                        <h3>🏆 АВАРИЯ ПОЛНОСТЬЮ РАССЛЕДОВАНА И УСТРАНЕНА!</h3>
                        <p class="text-sm text-light mt-1">Вы успешно прошли всю цепочку: от симптома через диагностику линков, сервисов и правил до финального устранения первопричины.</p>
                        <button class="btn btn-sm btn-success mt-2" onclick="troubleshootManager.nextIncident()">
                            Перейти к следующей аварии →
                        </button>
                    </div>
                `;
                this.incidentTermOutput.appendChild(victoryDiv);
            }
        } else {
            const errLine = document.createElement('div');
            errLine.className = 'term-line text-danger';
            errLine.innerHTML = `✖ Для текущего шага расследования требуется другая команда. Посмотрите цель шага или нажмите «Подсказка».`;
            this.incidentTermOutput.appendChild(errLine);
        }

        this.incidentTermInput.value = '';
        this.scrollIncidentTerm();
    }

    nextIncident() {
        if (this.currentIncidentIdx < APP_DATA.incidents.length - 1) {
            this.loadIncident(this.currentIncidentIdx + 1);
        } else {
            this.loadIncident(0);
        }
    }

    showIncidentHint() {
        const incident = APP_DATA.incidents[this.currentIncidentIdx];
        const step = incident.steps[this.currentIncidentStep];
        if (!this.incidentHintBox) return;

        this.incidentHintBox.classList.remove('hidden');
        this.incidentHintBox.innerHTML = `
            <div class="hint-content-box">
                <span class="text-yellow">💡 <b>Цель шага:</b> ${step.goal}</span>
                <span class="text-muted text-xs ml-2">(Используйте стандартные утилиты: ip, ping, sysctl, iptables, systemctl, cat)</span>
                <button class="btn btn-xs btn-outline ml-auto" onclick="document.getElementById('incident-hint-box').classList.add('hidden')">✕</button>
            </div>
        `;
    }

    showIncidentAnswer() {
        const incident = APP_DATA.incidents[this.currentIncidentIdx];
        const step = incident.steps[this.currentIncidentStep];
        if (!this.incidentHintBox) return;

        const cmd = step.validCommands[0];
        this.incidentHintBox.classList.remove('hidden');
        this.incidentHintBox.innerHTML = `
            <div class="hint-content-box border-success">
                <span class="text-green">🔑 <b>Команда этого шага:</b> <code>${this.escapeHtml(cmd)}</code></span>
                <button class="btn btn-xs btn-success ml-2" onclick="troubleshootManager.pasteIncidentCommand('${this.escapeQuotes(cmd)}')">📋 Вставить</button>
                <button class="btn btn-xs btn-outline ml-auto" onclick="document.getElementById('incident-hint-box').classList.add('hidden')">✕</button>
            </div>
        `;
    }

    pasteIncidentCommand(cmd) {
        if (this.incidentTermInput) {
            this.incidentTermInput.value = cmd;
            this.incidentTermInput.focus();
        }
    }

    scrollIncidentTerm() {
        const win = document.getElementById('incident-term-window');
        if (win) win.scrollTop = win.scrollHeight;
    }


    // =========================================================================
    // 2. ЧТЕНИЕ ВЫВОДА КОНСОЛИ (ИНТЕРПРЕТАЦИЯ ВМЕСТО ВВОДА)
    // =========================================================================

    loadOutputReading(idx) {
        this.currentOutputIdx = idx;
        const item = APP_DATA.outputReading[idx];
        if (!item) return;

        this.renderOutputNav();

        if (this.outputSnippetTitle) this.outputSnippetTitle.textContent = item.title;
        if (this.outputSnippetCode) this.outputSnippetCode.textContent = item.consoleSnippet;
        if (this.outputQuestionText) this.outputQuestionText.textContent = item.question;

        if (this.outputExplanationBox) {
            this.outputExplanationBox.classList.add('hidden');
            this.outputExplanationBox.innerHTML = '';
        }

        // Рендер вариантов ответов
        if (this.outputOptionsBox) {
            const isAnswered = this.outputAnswered[item.id] !== undefined;
            const chosenIdx = this.outputAnswered[item.id];

            this.outputOptionsBox.innerHTML = item.options.map((opt, oIdx) => {
                let btnClass = 'output-opt-btn';
                if (isAnswered) {
                    if (oIdx === item.correctIndex) {
                        btnClass += ' opt-correct';
                    } else if (oIdx === chosenIdx) {
                        btnClass += ' opt-wrong';
                    } else {
                        btnClass += ' opt-disabled';
                    }
                }

                return `
                    <button class="${btnClass}" ${isAnswered ? 'disabled' : ''} onclick="troubleshootManager.selectOutputAnswer(${oIdx})">
                        <span class="opt-letter">${String.fromCharCode(65 + oIdx)}</span>
                        <span class="opt-text">${this.escapeHtml(opt)}</span>
                    </button>
                `;
            }).join('');

            if (isAnswered) {
                this.showOutputExplanation(item, chosenIdx === item.correctIndex);
            }
        }
    }

    renderOutputNav() {
        if (!this.outputNavContainer) return;
        this.outputNavContainer.innerHTML = APP_DATA.outputReading.map((item, idx) => {
            const isAnswered = this.outputAnswered[item.id] !== undefined;
            const isCorrect = this.outputAnswered[item.id] === item.correctIndex;
            const isActive = idx === this.currentOutputIdx;

            let pillClass = 'task-pill';
            if (isActive) pillClass += ' active';
            if (isAnswered) pillClass += isCorrect ? ' completed' : ' repeat-pill';

            const icon = isAnswered ? (isCorrect ? '✔' : '✖') : '';

            return `
                <button class="${pillClass}" onclick="troubleshootManager.loadOutputReading(${idx})">
                    ${icon} #${idx + 1}
                </button>
            `;
        }).join('');
    }

    selectOutputAnswer(selectedIdx) {
        const item = APP_DATA.outputReading[this.currentOutputIdx];
        this.outputAnswered[item.id] = selectedIdx;
        this.loadOutputReading(this.currentOutputIdx);
    }

    showOutputExplanation(item, isSuccess) {
        if (!this.outputExplanationBox) return;
        this.outputExplanationBox.classList.remove('hidden');
        this.outputExplanationBox.innerHTML = `
            <div class="output-exp-card ${isSuccess ? 'border-success' : 'border-danger'}">
                <div class="d-flex align-center gap-2 mb-2">
                    <span class="text-xl">${isSuccess ? '✔' : '✖'}</span>
                    <b class="${isSuccess ? 'text-green' : 'text-danger'}">
                        ${isSuccess ? 'Абсолютно верно! Преподаватель поставит зачёт за такой ответ.' : 'Не совсем так. Обратите внимание на вывод.'}
                    </b>
                </div>
                <div class="text-sm text-light mb-3">
                    ${item.explanation}
                </div>
                <div class="d-flex justify-between align-center">
                    <span class="text-xs text-muted">Вывод консоли: <code>${item.command}</code></span>
                    ${this.currentOutputIdx < APP_DATA.outputReading.length - 1 ? `
                        <button class="btn btn-sm btn-outline text-cyan" onclick="troubleshootManager.loadOutputReading(${this.currentOutputIdx + 1})">
                            Следующий вопрос →
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }


    // =========================================================================
    // 3. СКВОЗНОЙ СЦЕНАРИЙ: «HQ-CLI НЕ ОТКРЫВАЕТ YA.RU» (7 ХОПОВ)
    // =========================================================================

    loadPacketJourney(hopIdx) {
        this.currentPacketHop = hopIdx;
        const hop = APP_DATA.packetJourney[hopIdx];
        if (!hop) return;

        this.renderPacketHopsNav();

        if (this.packetHopCard) {
            this.packetHopCard.innerHTML = `
                <div class="hop-card-header">
                    <div class="hop-number-badge">Шаг ${hop.hop} из 7</div>
                    <div class="hop-node-title">
                        <h3>${hop.node}</h3>
                        <span class="badge badge-topic">${hop.ip}</span>
                    </div>
                </div>

                <div class="hop-card-body">
                    <h4 class="text-yellow mb-2">${hop.title}</h4>

                    <div class="hop-section mb-3">
                        <label class="hop-label">🔍 Что проверяем в консоли узла:</label>
                        <div class="hop-cmd-box">
                            <code>${this.escapeHtml(hop.checkCmd)}</code>
                            <button class="btn btn-xs btn-outline ml-auto copy-btn" data-copy="${this.escapeForAttr(hop.checkCmd)}">📋 Копировать</button>
                        </div>
                    </div>

                    <div class="hop-section mb-3">
                        <label class="hop-label">✅ Что обязано быть в выводе (Эталон):</label>
                        <div class="hop-expected-box">
                            <span class="text-green font-bold">✔</span> ${hop.expected}
                        </div>
                    </div>

                    <div class="hop-section mb-4">
                        <label class="hop-label">💡 Теория и объяснение преподавателю:</label>
                        <div class="hop-theory-box">
                            ${hop.theory}
                        </div>
                    </div>

                    <div class="hop-nav-buttons d-flex justify-between align-center">
                        <button class="btn btn-sm btn-outline" ${hopIdx === 0 ? 'disabled' : ''} onclick="troubleshootManager.loadPacketJourney(${hopIdx - 1})">
                            ← Назад (Шаг ${hopIdx})
                        </button>
                        <span class="text-muted text-sm">Сквозной путь пакета HQ-CLI ➔ ya.ru</span>
                        <button class="btn btn-sm btn-success" ${hopIdx === APP_DATA.packetJourney.length - 1 ? 'disabled' : ''} onclick="troubleshootManager.loadPacketJourney(${hopIdx + 1})">
                            ${hopIdx === APP_DATA.packetJourney.length - 1 ? 'Финал маршрута ✔' : `Следующий хоп (Шаг ${hopIdx + 2}) →`}
                        </button>
                    </div>
                </div>
            `;
        }
    }

    renderPacketHopsNav() {
        if (!this.packetHopsNav) return;
        this.packetHopsNav.innerHTML = APP_DATA.packetJourney.map((hop, idx) => {
            const isActive = idx === this.currentPacketHop;
            return `
                <div class="packet-hop-node ${isActive ? 'active' : ''}" onclick="troubleshootManager.loadPacketJourney(${idx})">
                    <div class="hop-circle">${idx + 1}</div>
                    <div class="hop-title-mini">${hop.node.split(' ')[0]}</div>
                </div>
            `;
        }).join('<div class="packet-connector-line"></div>');
    }

    escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return (text || '').replace(/[&<>"']/g, m => map[m]);
    }

    escapeQuotes(text) {
        return (text || '').replace(/'/g, "\\'");
    }

    escapeForAttr(text) {
        return (text || '').replace(/"/g, '&quot;');
    }
}

// Экспорт в глобальное окружение
window.TroubleshootManager = TroubleshootManager;
