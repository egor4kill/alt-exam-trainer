// js/exam_mode.js
// Модуль режима «Экзамен» по регламенту Proxmox VE / Альт Линукс
// Включает:
// 1. Таймер обратного отсчета на 15 минут
// 2. Строгий режим: без подсказок и без показа ответов
// 3. Выборку: 5 практических задач + 3 вопроса экзаменатора
// 4. Итоговый разбор ошибок с оценкой по 5-балльной шкале и анализом тем к сдаче 14 ноября

class ExamManager {
    constructor() {
        this.examDurationSeconds = 45 * 60; // 45 минут по умолчанию
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
        this.topicSelect = document.getElementById('exam-topic-select');
        this.durationSelect = document.getElementById('exam-duration-select');
        this.ruleDurationText = document.getElementById('exam-rule-duration-text');
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

        this.durationSelect?.addEventListener('change', () => {
            const mins = parseInt(this.durationSelect.value, 10) || 45;
            this.examDurationSeconds = mins * 60;
            if (this.btnStartExam) {
                this.btnStartExam.textContent = `▶ Начать экзамен (${mins}:00)`;
            }
            if (this.ruleDurationText) {
                this.ruleDurationText.textContent = `${mins} минут`;
            }
        });

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

        // Мобильные быстрые клавиши-чипы в экзамене
        document.querySelectorAll('#sec-exam .key-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.preventDefault();
                const key = chip.getAttribute('data-key');
                const action = chip.getAttribute('data-action');
                if (action === 'tab') {
                    if (window.altTabCompleter && this.termInput) {
                        window.altTabCompleter.triggerTab(this.termInput);
                    }
                } else if (action === 'clear') {
                    if (this.termInput) {
                        this.termInput.value = '';
                        this.termInput.focus();
                    }
                } else if (key && this.termInput) {
                    const start = this.termInput.selectionStart || 0;
                    const end = this.termInput.selectionEnd || 0;
                    this.termInput.value = this.termInput.value.substring(0, start) + key + this.termInput.value.substring(end);
                    this.termInput.selectionStart = this.termInput.selectionEnd = start + key.length;
                    this.termInput.focus();
                }
            });
        });
    }

        generateExamPool() {
        const selectedTopic = this.topicSelect ? this.topicSelect.value : 'all';
        const selectedPractical = [];
        const selectedTeacher = [];

        if (selectedTopic === 'all') {
            // Реалистичная цепочка из 14 билетов: Темы 2–8 подряд (Настройка + Проверка работоспособности)
            return [
                {
                    id: 'exam_all_1',
                    topicId: 2,
                    host: 'HQ-SRV',
                    prompt: 'root@hq-srv:~# ',
                    task: 'Установите часовой пояс Asia/Yekaterinburg на сервере HQ-SRV',
                    correctAnswers: [
                        'timedatectl set-timezone Asia/Yekaterinburg',
                        "timedatectl set-timezone 'Asia/Yekaterinburg'",
                        'timedatectl set-timezone "Asia/Yekaterinburg"'
                    ],
                    cmdRegex: '^timedatectl\\s+set-timezone\\s+[\'"]?Asia/Yekaterinburg[\'"]?$',
                    expectedCmd: 'timedatectl set-timezone Asia/Yekaterinburg',
                    explanation: 'Команда timedatectl set-timezone переключает системную зону в systemd без перезагрузки узла.',
                    type: 'practical',
                    examTypeLabel: 'Тема 2: Базовая настройка'
                },
                {
                    id: 'exam_all_2',
                    topicId: 2,
                    host: 'HQ-SRV',
                    prompt: 'root@hq-srv:~# ',
                    task: 'Проверьте статус службы времени и текущий часовой пояс',
                    correctAnswers: [
                        'timedatectl status',
                        'timedatectl'
                    ],
                    cmdRegex: '^timedatectl(\\s+status)?$',
                    expectedCmd: 'timedatectl status',
                    explanation: 'timedatectl (status) отображает текущую временную зону (+05:00) и синхронизацию NTP.',
                    type: 'practical',
                    examTypeLabel: 'Тема 2: Проверка работы'
                },
                {
                    id: 'exam_all_3',
                    topicId: 3,
                    host: 'HQ-RTR',
                    prompt: 'root@hq-rtr:~# ',
                    task: 'Пропишите IP-адрес 172.16.1.1/24 в ipv4address внешнего интерфейса enp7s1',
                    correctAnswers: [
                        "echo '172.16.1.1/24' > /etc/net/ifaces/enp7s1/ipv4address",
                        'echo "172.16.1.1/24" > /etc/net/ifaces/enp7s1/ipv4address'
                    ],
                    cmdRegex: '^echo\\s+[\'"]?172\\.16\\.1\\.1/24[\'"]?\\s+>\\s+/etc/net/ifaces/enp7s1/ipv4address$',
                    expectedCmd: "echo '172.16.1.1/24' > /etc/net/ifaces/enp7s1/ipv4address",
                    explanation: 'В /etc/net каждый сетевой параметр лежит в отдельном файле; ipv4address содержит IP с CIDR-маской.',
                    type: 'practical',
                    examTypeLabel: 'Тема 3: Сетевой стек /etc/net'
                },
                {
                    id: 'exam_all_4',
                    topicId: 3,
                    host: 'HQ-RTR',
                    prompt: 'root@hq-rtr:~# ',
                    task: 'Выведите краткий цветной список сетевых интерфейсов и их IP-адресов',
                    correctAnswers: [
                        'ip -br -c a',
                        'ip -br -c addr',
                        'ip -br a',
                        'ip -br addr',
                        'ip -c -br a',
                        'ip a'
                    ],
                    cmdRegex: '^ip(\\s+(-br|-c|-br\\s+-c|-c\\s+-br))?\\s+(a|addr|address)$',
                    expectedCmd: 'ip -br -c a',
                    explanation: 'ip -br -c a (ip --brief --color address) в компактном виде показывает статус UP/DOWN и назначенные IP.',
                    type: 'practical',
                    examTypeLabel: 'Тема 3: Проверка сети'
                },
                {
                    id: 'exam_all_5',
                    topicId: 4,
                    host: 'HQ-RTR',
                    prompt: 'root@hq-rtr:~# ',
                    task: 'Создайте каталог для тегированного интерфейса VLAN 100 на физическом порту enp7s2',
                    correctAnswers: [
                        'mkdir -p /etc/net/ifaces/enp7s2.100',
                        'mkdir /etc/net/ifaces/enp7s2.100'
                    ],
                    cmdRegex: '^mkdir(\\s+-p)?\\s+/etc/net/ifaces/enp7s2\\.100/?$',
                    expectedCmd: 'mkdir -p /etc/net/ifaces/enp7s2.100',
                    explanation: 'В ОС «Альт» VLAN-сабинтерфейс создается как каталог с точкой: <физ_интерфейс>.<vlan_id>.',
                    type: 'practical',
                    examTypeLabel: 'Тема 4: VLAN 802.1Q'
                },
                {
                    id: 'exam_all_6',
                    topicId: 4,
                    host: 'HQ-RTR',
                    prompt: 'root@hq-rtr:~# ',
                    task: 'Покажите содержимое файла options сабинтерфейса enp7s2.100 (TYPE=vlan, HOST=enp7s2)',
                    correctAnswers: [
                        'cat /etc/net/ifaces/enp7s2.100/options'
                    ],
                    cmdRegex: '^cat\\s+/etc/net/ifaces/enp7s2\\.100/options$',
                    expectedCmd: 'cat /etc/net/ifaces/enp7s2.100/options',
                    explanation: 'Параметры TYPE=vlan и HOST=enp7s2 указывают подсистеме /etc/net, что это тегированный сабинтерфейс.',
                    type: 'practical',
                    examTypeLabel: 'Тема 4: Проверка VLAN'
                },
                {
                    id: 'exam_all_7',
                    topicId: 5,
                    host: 'HQ-RTR',
                    prompt: 'root@hq-rtr:~# ',
                    task: 'Включите постоянный форвардинг пакетов IPv4 (net.ipv4.ip_forward = 1) и примените sysctl',
                    correctAnswers: [
                        "echo 'net.ipv4.ip_forward = 1' > /etc/net/sysctl.conf && sysctl -p /etc/net/sysctl.conf",
                        "echo 'net.ipv4.ip_forward = 1' > /etc/net/sysctl.conf; sysctl -p /etc/net/sysctl.conf",
                        'sysctl -p /etc/net/sysctl.conf',
                        "echo 'net.ipv4.ip_forward = 1' > /etc/net/sysctl.conf"
                    ],
                    cmdRegex: '^(echo\\s+[\'"]?net\\.ipv4\\.ip_forward\\s*=\\s*1[\'"]?\\s+>\\s+/etc/net/sysctl\\.conf(\\s*(&&|;)\\s*sysctl\\s+-p(\\s+/etc/net/sysctl\\.conf)?)?|sysctl\\s+-p(\\s+/etc/net/sysctl\\.conf)?)$',
                    expectedCmd: "echo 'net.ipv4.ip_forward = 1' > /etc/net/sysctl.conf && sysctl -p /etc/net/sysctl.conf",
                    explanation: 'net.ipv4.ip_forward = 1 в sysctl.conf включает маршрутизацию пакетов между интерфейсами на уровне ядра.',
                    type: 'practical',
                    examTypeLabel: 'Тема 5: Маршрутизация'
                },
                {
                    id: 'exam_all_8',
                    topicId: 5,
                    host: 'HQ-RTR',
                    prompt: 'root@hq-rtr:~# ',
                    task: 'Добавьте правило NAT MASQUERADE для исходящих пакетов через внешний интерфейс enp7s1',
                    correctAnswers: [
                        'iptables -t nat -A POSTROUTING -o enp7s1 -j MASQUERADE'
                    ],
                    cmdRegex: '^iptables\\s+-t\\s+nat\\s+-A\\s+POSTROUTING\\s+-o\\s+enp7s1\\s+-j\\s+MASQUERADE$',
                    expectedCmd: 'iptables -t nat -A POSTROUTING -o enp7s1 -j MASQUERADE',
                    explanation: 'POSTROUTING подменяет серые локальные IP клиентов на внешний IP роутера enp7s1 для доступа в интернет.',
                    type: 'practical',
                    examTypeLabel: 'Тема 5: NAT & iptables'
                },
                {
                    id: 'exam_all_9',
                    topicId: 6,
                    host: 'HQ-RTR',
                    prompt: 'root@hq-rtr:~# ',
                    task: 'Задайте MTU 1476 в файле mtu интерфейса tun0 для предотвращения фрагментации GRE',
                    correctAnswers: [
                        "echo '1476' > /etc/net/ifaces/tun0/mtu",
                        'echo "1476" > /etc/net/ifaces/tun0/mtu',
                        'echo 1476 > /etc/net/ifaces/tun0/mtu'
                    ],
                    cmdRegex: '^echo\\s+[\'"]?1476[\'"]?\\s+>\\s+/etc/net/ifaces/tun0/mtu$',
                    expectedCmd: "echo '1476' > /etc/net/ifaces/tun0/mtu",
                    explanation: 'Стандартный Ethernet MTU 1500 минус 24 байта заголовка GRE/IP = 1476 байт.',
                    type: 'practical',
                    examTypeLabel: 'Тема 6: GRE-туннель'
                },
                {
                    id: 'exam_all_10',
                    topicId: 6,
                    host: 'HQ-RTR',
                    prompt: 'root@hq-rtr:~# ',
                    task: 'Проверьте статус OSPF-соседства с BR-RTR через консоль vtysh',
                    correctAnswers: [
                        "vtysh -c 'show ip ospf neighbor'",
                        'vtysh -c "show ip ospf neighbor"',
                        "vtysh -c 'sh ip ospf nei'"
                    ],
                    cmdRegex: '^vtysh\\s+-c\\s+[\'"]sh(ow)?\\s+ip\\s+ospf\\s+nei(ghbor)?[\'"]$',
                    expectedCmd: "vtysh -c 'show ip ospf neighbor'",
                    explanation: 'Статус Full в vtysh подтверждает, что OSPF-роутеры успешно синхронизировали базы топологии (LSA).',
                    type: 'practical',
                    examTypeLabel: 'Тема 6: Проверка OSPF'
                },
                {
                    id: 'exam_all_11',
                    topicId: 7,
                    host: 'HQ-SRV',
                    prompt: 'root@hq-srv:~# ',
                    task: 'Добавьте пул адресов dhcp-range=192.168.1.10,192.168.1.100,24h в конец /etc/dnsmasq.conf',
                    correctAnswers: [
                        "echo 'dhcp-range=192.168.1.10,192.168.1.100,24h' >> /etc/dnsmasq.conf",
                        'echo "dhcp-range=192.168.1.10,192.168.1.100,24h" >> /etc/dnsmasq.conf'
                    ],
                    cmdRegex: '^echo\\s+[\'"]dhcp-range=192\\.168\\.1\\.10,192\\.168\\.1\\.100,24h[\'"]\\s+>>\\s+/etc/dnsmasq\\.conf$',
                    expectedCmd: "echo 'dhcp-range=192.168.1.10,192.168.1.100,24h' >> /etc/dnsmasq.conf",
                    explanation: 'Параметр dhcp-range задает границы динамического пула и время аренды адреса клиентом (24 часа).',
                    type: 'practical',
                    examTypeLabel: 'Тема 7: DHCP-сервер'
                },
                {
                    id: 'exam_all_12',
                    topicId: 7,
                    host: 'HQ-CLI',
                    prompt: 'root@hq-cli:~# ',
                    task: 'Запросите IP-адрес по DHCP на интерфейсе enp7s1 с подробным выводом (verbose)',
                    correctAnswers: [
                        'dhclient -v enp7s1',
                        'dhclient -v'
                    ],
                    cmdRegex: '^dhclient(\\s+-v)?(\\s+enp7s1)?$',
                    expectedCmd: 'dhclient -v enp7s1',
                    explanation: 'dhclient -v выводит фазы DISCOVER -> OFFER -> REQUEST -> ACK и подтверждает получение адреса.',
                    type: 'practical',
                    examTypeLabel: 'Тема 7: Проверка DHCP'
                },
                {
                    id: 'exam_all_13',
                    topicId: 8,
                    host: 'HQ-SRV',
                    prompt: 'root@hq-srv:~# ',
                    task: 'Укажите nameserver 127.0.0.1 в resolv.conf интерфейса enp0s3.100 на сервере',
                    correctAnswers: [
                        "echo 'nameserver 127.0.0.1' > /etc/net/ifaces/enp0s3.100/resolv.conf",
                        'echo "nameserver 127.0.0.1" > /etc/net/ifaces/enp0s3.100/resolv.conf'
                    ],
                    cmdRegex: '^echo\\s+[\'"]nameserver\\s+127\\.0\\.0\\.1[\'"]\\s+>\\s+/etc/net/ifaces/enp0s3\\.100/resolv\\.conf$',
                    expectedCmd: "echo 'nameserver 127.0.0.1' > /etc/net/ifaces/enp0s3.100/resolv.conf",
                    explanation: 'ВАЖНО: В resolv.conf пишется nameserver 127.0.0.1 через ПРОБЕЛ, а не со знаком равно (=)!',
                    type: 'practical',
                    examTypeLabel: 'Тема 8: DNS-сервер'
                },
                {
                    id: 'exam_all_14',
                    topicId: 8,
                    host: 'HQ-SRV',
                    prompt: 'root@hq-srv:~# ',
                    task: 'Проверьте сквозную работу DNS и интернета — отправьте 3 пакета ping на ya.ru',
                    correctAnswers: [
                        'ping -c 3 ya.ru',
                        'ping -c 2 ya.ru',
                        'ping -c 4 ya.ru',
                        'ping ya.ru'
                    ],
                    cmdRegex: '^ping(\\s+-c\\s+[1-9])?\\s+ya\\.ru$',
                    expectedCmd: 'ping -c 3 ya.ru',
                    explanation: 'Пинг ya.ru проверяет одновременно: работу DNS (имя ya.ru разрешается в IP), шлюз по умолчанию и NAT.',
                    type: 'practical',
                    examTypeLabel: 'Тема 8: Итоговая проверка'
                }
            ];
        } else {
            // Экзамен по конкретной выбранной теме
            const tid = parseInt(selectedTopic, 10);
            const topicTasks = [...APP_DATA.commandTasks.filter(t => t.topicId === tid)].sort(() => 0.5 - Math.random());
            topicTasks.slice(0, 5).forEach(t => {
                selectedPractical.push(Object.assign({}, t, {
                    type: 'practical',
                    examTypeLabel: 'Практическая настройка'
                }));
            });

            // 3 вопроса преподавателя
            const teacherPool = [...APP_DATA.teacherTasks].sort(() => 0.5 - Math.random());
            teacherPool.slice(0, 3).forEach(t => {
                selectedTeacher.push(Object.assign({}, t, {
                    type: 'teacher',
                    examTypeLabel: 'Вопрос преподавателя'
                }));
            });
        }

        return [...selectedPractical, ...selectedTeacher];
    }

    startNewExam() {
        if (this.timerInterval) clearInterval(this.timerInterval);

        if (this.durationSelect) {
            const mins = parseInt(this.durationSelect.value, 10) || 45;
            this.examDurationSeconds = mins * 60;
        }

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

        // Определение названия темы для билета
        let topicBadgeName = '';
        if (q.topicId) {
            const topicObj = APP_DATA.topics?.find(t => t.id === q.topicId);
            if (topicObj) topicBadgeName = topicObj.badge || topicObj.name;
        } else if (q.type === 'teacher') {
            topicBadgeName = 'Опрос преподавателя';
        }

        if (this.qBadge) {
            this.qBadge.textContent = `${q.examTypeLabel} • ${topicBadgeName ? topicBadgeName + ' • ' : ''}Узел: ${q.host.toUpperCase()}`;
            this.qBadge.className = `badge ${q.type === 'practical' ? 'badge-topic' : 'badge-warning'}`;
        }

        if (this.qTitle) {
            this.qTitle.innerHTML = `Билет №${idx + 1} из ${this.questions.length} <span class="text-xs text-muted font-normal">(${topicBadgeName || q.host.toUpperCase()})</span>`;
        }

        if (this.qDesc) {
            if (q.type === 'practical') {
                this.qDesc.innerHTML = `<b>Цель:</b> ${this.escapeHtml(q.task)}`;
            } else {
                // Исправление undefined: в teacherTasks поля называются teacherSpeech и task
                const speech = q.teacherSpeech || q.question || 'Ответьте на вопрос преподавателя';
                const goal = q.task || q.goal || 'Выполните требуемую команду проверки';
                this.qDesc.innerHTML = `<b>Преподаватель спрашивает:</b> «${this.escapeHtml(speech)}»<br><span class="text-sm text-cyan font-bold">Цель: ${this.escapeHtml(goal)}</span>`;
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
        if (q.cmdRegex) {
            try {
                const rx = new RegExp(q.cmdRegex, 'i');
                if (rx.test(cmd)) isCorrect = true;
            } catch(e) {}
        }
        if (!isCorrect && Array.isArray(q.correctAnswers)) {
            isCorrect = q.correctAnswers.some(ans => this.normalize(ans) === normUser);
        }
        if (!isCorrect && Array.isArray(q.validCommands)) {
            isCorrect = q.validCommands.some(ans => this.normalize(ans) === normUser);
        }
        if (!isCorrect && q.expectedCmd) {
            isCorrect = this.normalize(q.expectedCmd) === normUser;
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

        const pct = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;

        // 5-балльная шкала по процентам
        let grade = 2;
        let gradeTitle = 'Неудовлетворительно';
        let gradeColor = '#ef4444';
        let gradeNote = 'Материал требует повторения перед сдачей 14 ноября. Пройдите экспресс-повторение всех команд.';

        if (pct >= 85) {
            grade = 5;
            gradeTitle = 'Отлично';
            gradeColor = '#10b981';
            gradeNote = 'Стенд освоен на высшем уровне! Свободное владение настройкой всех служб и их диагностикой.';
        } else if (pct >= 70) {
            grade = 4;
            gradeTitle = 'Хорошо';
            gradeColor = '#3b82f6';
            gradeNote = 'Твёрдый зачёт. Обратите внимание на ошибки в билетах ниже, чтобы не допустить их на экзамене.';
        } else if (pct >= 50) {
            grade = 3;
            gradeTitle = 'Удовлетворительно';
            gradeColor = '#f59e0b';
            gradeNote = 'Базовые знания есть, но в стрессовой ситуации есть риск растеряться. Повторите команды.';
        }

        const timeSpent = this.examDurationSeconds - this.timeRemaining;
        const minsSpent = Math.floor(timeSpent / 60);
        const secsSpent = timeSpent % 60;
        const limitMins = Math.floor(this.examDurationSeconds / 60);

        let html = `
            <div class="exam-report-card">
                <div class="exam-report-header">
                    <div class="grade-circle" style="border-color:${gradeColor}; color:${gradeColor}">
                        <span class="grade-number">${grade}</span>
                        <span class="grade-word">${gradeTitle}</span>
                    </div>
                    <div class="report-meta">
                        <h2>Протокол сдачи экзамена: ОС «Альт» и Proxmox VE</h2>
                        <p class="text-sm text-light mb-1">Время сдачи: <b>${minsSpent} мин ${secsSpent} сек</b> (лимит: ${limitMins}:00)</p>
                        <p class="text-sm">Правильных ответов: <b style="color:${gradeColor}">${correctCount} из ${totalQ}</b> (${pct}%)</p>
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
            const correctRef = (Array.isArray(q.correctAnswers) && q.correctAnswers[0]) 
                || (Array.isArray(q.validCommands) && q.validCommands[0]) 
                || q.expectedCmd 
                || '';
            const goalText = q.task || q.description || q.question || q.teacherSpeech || '';
            const whyText = q.explanation || q.why || '';

            html += `
                <div class="exam-item-card ${isCorrect ? 'border-success' : 'border-danger'}">
                    <div class="d-flex justify-between align-center mb-1 flex-wrap gap-1">
                        <span class="badge ${q.type === 'practical' ? 'badge-topic' : 'badge-warning'}">Билет #${idx + 1}: ${q.examTypeLabel} (${q.host.toUpperCase()})</span>
                        <span class="font-bold ${isCorrect ? 'text-green' : 'text-danger'}">${isCorrect ? '✔ ЗАЧТЕНО' : '✖ ОШИБКА'}</span>
                    </div>

                    <div class="text-light text-sm mb-2">
                        <b>Задание/Проверка:</b> ${this.escapeHtml(goalText)}
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
                        💡 <b>Пояснение:</b> ${this.escapeHtml(whyText)}
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
