// js/app.js
// Главный контроллер приложения и навигации между модулями

document.addEventListener('DOMContentLoaded', () => {
    // Инициализация вкладок
    initTabs();

    // Инициализация модулей с защитой от ошибок
    try { window.terminalTrainer = new TerminalTrainer(); } catch (e) { console.error('Error init TerminalTrainer:', e); }
    try { window.standSimulator = new StandSimulator(); } catch (e) { console.error('Error init StandSimulator:', e); }
    try { window.troubleshootManager = new TroubleshootManager(); } catch (e) { console.error('Error init TroubleshootManager:', e); }
    try { window.examManager = new ExamManager(); } catch (e) { console.error('Error init ExamManager:', e); }
    try { window.teacherTrainer = new TeacherExamTrainer(); } catch (e) { console.error('Error init TeacherExamTrainer:', e); }
    try { window.topologyManager = new TopologyManager(); } catch (e) { console.error('Error init TopologyManager:', e); }
    try { window.examQAManager = new ExamQAManager(); } catch (e) { console.error('Error init ExamQAManager:', e); }

    // Рендер шпаргалки конфигураций
    try { renderReferenceTables(); } catch (e) { console.error('Error renderReferenceTables:', e); }
    try { renderCopyableSnippets(); } catch (e) { console.error('Error renderCopyableSnippets:', e); }

    // Чек-лист, подвкладки шпаргалки и поиск
    try { initRefSubtabs(); } catch (e) { console.error('Error initRefSubtabs:', e); }
    try { initPlainCheatsSearch(); } catch (e) { console.error('Error initPlainCheatsSearch:', e); }
    try { initExpressChecklist(); } catch (e) { console.error('Error initExpressChecklist:', e); }
    try { initTabPlayground(); } catch (e) { console.error('Error initTabPlayground:', e); }

    // Быстрое копирование в буфер
    try { initCopyButtons(); } catch (e) { console.error('Error initCopyButtons:', e); }
});

function initTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    const sections = document.querySelectorAll('.app-section');
    const navTabs = document.getElementById('main-nav-tabs');
    const btnLeft = document.getElementById('nav-scroll-btn-left');
    const btnRight = document.getElementById('nav-scroll-btn-right');

    // Переключение основных вкладок
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetSection = tab.getAttribute('data-target');

            tabs.forEach(t => t.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            tab.classList.add('active');
            const targetEl = document.getElementById(targetSection);
            if (targetEl) {
                targetEl.classList.add('active');
            }

            // Плавная прокрутка активной вкладки в область видимости
            tab.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });

            // Фокус в соответствующий терминал при открытии вкладки
            if (targetSection === 'sec-terminal') {
                document.getElementById('terminal-input')?.focus();
            } else if (targetSection === 'sec-stand') {
                document.getElementById('stand-term-input')?.focus();
            } else if (targetSection === 'sec-teacher') {
                document.getElementById('teacher-term-input')?.focus();
            } else if (targetSection === 'sec-troubleshoot') {
                document.getElementById('incident-term-input')?.focus();
            } else if (targetSection === 'sec-exam') {
                if (window.examManager && window.examManager.isExamActive) {
                    document.getElementById('exam-term-input')?.focus();
                }
            }
        });
    });

    // Горизонтальный скролл колёсиком мыши по шапке вкладок
    if (navTabs) {
        navTabs.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                navTabs.scrollLeft += (e.deltaY > 0 ? 90 : -90);
                updateNavScrollButtons();
            }
        }, { passive: false });
    }

    // Кнопки быстрой прокрутки влево/вправо (‹ и ›)
    function updateNavScrollButtons() {
        if (!navTabs) return;
        const hasOverflow = navTabs.scrollWidth > navTabs.clientWidth + 5;
        if (btnLeft) {
            btnLeft.style.display = hasOverflow ? 'flex' : 'none';
            btnLeft.style.opacity = navTabs.scrollLeft > 5 ? '1' : '0.35';
        }
        if (btnRight) {
            btnRight.style.display = hasOverflow ? 'flex' : 'none';
            btnRight.style.opacity = (navTabs.scrollLeft < navTabs.scrollWidth - navTabs.clientWidth - 5) ? '1' : '0.35';
        }
    }

    if (btnLeft && navTabs) {
        btnLeft.addEventListener('click', () => {
            navTabs.scrollBy({ left: -220, behavior: 'smooth' });
            setTimeout(updateNavScrollButtons, 320);
        });
    }

    if (btnRight && navTabs) {
        btnRight.addEventListener('click', () => {
            navTabs.scrollBy({ left: 220, behavior: 'smooth' });
            setTimeout(updateNavScrollButtons, 320);
        });
    }

    if (navTabs) {
        navTabs.addEventListener('scroll', updateNavScrollButtons, { passive: true });
    }
    window.addEventListener('resize', updateNavScrollButtons, { passive: true });
    setTimeout(updateNavScrollButtons, 100);
}

function renderReferenceTables() {
    // Таблица DNS
    const dnsTbody = document.getElementById('dns-table-body');
    if (dnsTbody) {
        dnsTbody.innerHTML = APP_DATA.dnsRecords.map(r => `
            <tr>
                <td><code>${r.name}</code></td>
                <td><b class="text-cyan">${r.ip}</b></td>
                <td class="text-muted"><code>${r.ptr}</code></td>
            </tr>
        `).join('');
    }

    // Таблица ВМ (с обновленным enp7s1 и заметкой про .12 vs .2)
    const vmTbody = document.getElementById('vm-ref-table-body');
    if (vmTbody) {
        vmTbody.innerHTML = APP_DATA.nodes.map(n => `
            <tr>
                <td><span class="badge" style="background:${n.color}22; color:${n.color}">${n.vmid}</span></td>
                <td><b>${n.name}</b></td>
                <td><code>${n.fqdn}</code></td>
                <td class="text-sm">${n.role}</td>
            </tr>
        `).join('');
    }
}

function renderCopyableSnippets() {
    const container = document.getElementById('snippets-container');
    if (!container) return;

    const snippets = [
        {
            title: "GRE-туннель: /etc/net/ifaces/gre1/options на HQ-RTR",
            code: `TUNLOCAL=172.16.1.2\nTUNREMOTE=172.16.2.2\nTUNTYPE=gre\nTYPE=iptun\nTUNTTL=255\nTUNMTU=1476\nTUNOPTIONS='ttl 255'\nDISABLE=no`
        },
        {
            title: "GRE-туннель: /etc/net/ifaces/gre1/options на BR-RTR",
            code: `TUNLOCAL=172.16.2.2\nTUNREMOTE=172.16.1.2\nTUNTYPE=gre\nTYPE=iptun\nTUNTTL=255\nTUNMTU=1476\nTUNOPTIONS='ttl 255'\nDISABLE=no`
        },
        {
            title: "OSPF на HQ-RTR (через vtysh)",
            code: `vtysh\nconf t\nrouter ospf\n network 10.0.0.0/30 area 0\n network 192.168.1.0/27 area 0\n network 192.168.2.0/28 area 0\n network 192.168.99.0/29 area 0\nexit\nint gre1\n ip ospf authentication message-digest\n ip ospf message-digest-key 1 md5 123qweR%\nexit\ndo wr mem`
        },
        {
            title: "OSPF на BR-RTR (через vtysh)",
            code: `vtysh\nconf t\nrouter ospf\n network 10.0.0.0/30 area 0\n network 192.168.3.0/28 area 0\nexit\nint gre1\n ip ospf authentication message-digest\n ip ospf message-digest-key 1 md5 123qweR%\nexit\ndo wr mem`
        },
        {
            title: "DHCP: /etc/dnsmasq.conf на HQ-RTR (VLAN 200)",
            code: `interface=enp7s2.200\ndhcp-range=192.168.2.2,192.168.2.14,72h\ndhcp-option=3,192.168.2.1\ndhcp-option=6,192.168.1.2\nserver=77.88.8.8`
        },
        {
            title: "DNS: /etc/dnsmasq.conf на HQ-SRV",
            code: `interface=enp0s3.100\nserver=77.88.8.8\ndomain=au-team.irpo\nlisten-address=192.168.1.2\nno-resolv\nno-hosts\n\naddress=/hq-rtr.au-team.irpo/192.168.1.1\naddress=/br-rtr.au-team.irpo/192.168.3.1\naddress=/hq-srv.au-team.irpo/192.168.1.2\naddress=/hq-cli.au-team.irpo/192.168.2.2\naddress=/br-srv.au-team.irpo/192.168.3.2\naddress=/docker.au-team.irpo/172.16.1.1\naddress=/web.au-team.irpo/172.16.2.1\n\nptr-record=1.1.168.192.in-addr.arpa,hq-rtr.au-team.irpo\nptr-record=1.3.168.192.in-addr.arpa,br-rtr.au-team.irpo\nptr-record=2.1.168.192.in-addr.arpa,hq-srv.au-team.irpo\nptr-record=2.2.168.192.in-addr.arpa,hq-cli.au-team.irpo\nptr-record=2.3.168.192.in-addr.arpa,br-srv.au-team.irpo`
        },
        {
            title: "NAT и автозапуск правил через crontab",
            code: `sysctl -w net.ipv4.ip_forward=1\necho "net.ipv4.ip_forward=1" >> /etc/net/sysctl.conf\niptables -t nat -A POSTROUTING -o enp7s1 -j MASQUERADE\niptables-save > /root/iptables_rules\n\n# В crontab -e (@reboot):\n@reboot /sbin/iptables-restore < /root/iptables_rules`
        }
    ];

    container.innerHTML = snippets.map((s, idx) => `
        <div class="snippet-card">
            <div class="snippet-header">
                <b>${s.title}</b>
                <button class="btn btn-sm btn-outline copy-btn" data-copy="${escapeForAttr(s.code)}">
                    📋 Копировать
                </button>
            </div>
            <pre class="snippet-code"><code>${escapeForHtml(s.code)}</code></pre>
        </div>
    `).join('');
}

function initCopyButtons() {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.copy-btn');
        if (!btn) return;

        const text = btn.getAttribute('data-copy');
        if (text) {
            navigator.clipboard.writeText(text).then(() => {
                const originalText = btn.innerHTML;
                btn.innerHTML = '✔ Скопировано!';
                btn.classList.add('btn-success');
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.classList.remove('btn-success');
                }, 1500);
            });
        }
    });
}

function escapeForHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeForAttr(str) {
    return (str || '').replace(/"/g, '&quot;');
}

// =========================================================================
// ЭКСПРЕСС-ЧЕКЛИСТ САМОПРОВЕРКИ (2 МИНУТЫ)
// =========================================================================

function initExpressChecklist() {
    const checkboxes = document.querySelectorAll('.checklist-checkbox');
    const badge = document.getElementById('checklist-counter-badge');
    const state = JSON.parse(localStorage.getItem('alt_checklist_state') || '{}');

    function updateCounter() {
        let checkedCount = 0;
        checkboxes.forEach((cb, idx) => {
            const item = document.getElementById(`cl-item-${idx + 1}`);
            if (cb.checked) {
                checkedCount++;
                item?.classList.add('is-done');
            } else {
                item?.classList.remove('is-done');
            }
        });

        if (badge) {
            badge.textContent = `${checkedCount} / ${checkboxes.length} проверок выполнено`;
            if (checkedCount === checkboxes.length) {
                badge.className = 'badge badge-success';
                badge.textContent = '🎉 ВСЕ 5 ПРОВЕРОК ПРОЙДЕНЫ! СТЕНД ГОТОВ К СДАЧЕ';
            } else {
                badge.className = 'badge badge-topic';
            }
        }
    }

    checkboxes.forEach((cb, idx) => {
        const key = `step_${idx + 1}`;
        if (state[key]) {
            cb.checked = true;
        }

        cb.addEventListener('change', () => {
            state[key] = cb.checked;
            localStorage.setItem('alt_checklist_state', JSON.stringify(state));
            updateCounter();
        });
    });

    updateCounter();
}

// =========================================================================
// ИНТЕРАКТИВНАЯ ПЕСОЧНИЦА ТРЕНАЖЁРА КЛАВИШИ TAB
// =========================================================================

function initTabPlayground() {
    const input = document.getElementById('tab-sandbox-input');
    const output = document.getElementById('tab-sandbox-output');
    if (!input || !output) return;

    if (window.altTabCompleter) {
        window.altTabCompleter.attachToInput(
            input,
            output,
            () => 'root@alt-sandbox:~# '
        );
    }

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const val = input.value.trim();
            if (!val) return;

            const line = document.createElement('div');
            line.className = 'term-line';
            line.innerHTML = `<span class="prompt">root@alt-sandbox:~# </span><span class="user-cmd">${escapeForHtml(val)}</span>`;
            output.appendChild(line);

            const outLine = document.createElement('div');
            outLine.className = 'term-line text-cyan text-xs';
            outLine.innerHTML = `[Tab Emulator] Отлично! Продолжайте пробовать автодополнение длинных путей клавишей Tab.`;
            output.appendChild(outLine);

            input.value = '';
            output.scrollTop = output.scrollHeight;
        }
    });
}

function triggerMobileTab() {
    const input = document.getElementById('tab-sandbox-input');
    const output = document.getElementById('tab-sandbox-output');
    if (input && window.altTabCompleter) {
        window.altTabCompleter.handleTab(input, output, 'root@alt-sandbox:~# ');
        input.focus();
    }
}

// =========================================================================
// РАСКРЫТИЕ КАРТОЧЕК ШПАРГАЛКИ «НОРМАЛЬНЫМ ЯЗЫКОМ»
// =========================================================================

function togglePlainCheat(headerEl) {
    const card = headerEl.closest('.plain-cheat-card');
    if (!card) return;
    card.classList.toggle('is-expanded');
}

// =========================================================================
// ПОДРАЗДЕЛЫ ШПАРГАЛКИ И ЖИВОЙ ПОИСК ПО КАРТОЧКАМ
// =========================================================================

function initRefSubtabs() {
    const tabs = document.querySelectorAll('.ref-subtab');
    const panes = document.querySelectorAll('.ref-subpane');
    if (!tabs.length || !panes.length) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const reftab = tab.getAttribute('data-reftab');
            if (!reftab) return;

            tabs.forEach(t => t.classList.remove('active'));
            panes.forEach(p => {
                p.classList.remove('active');
                p.classList.add('hidden');
            });

            tab.classList.add('active');
            const targetPane = document.getElementById(`ref-pane-${reftab}`);
            if (targetPane) {
                targetPane.classList.remove('hidden');
                targetPane.classList.add('active');
            }

            if (reftab === 'tabsandbox') {
                document.getElementById('tab-sandbox-input')?.focus();
            }
        });
    });
}

function initPlainCheatsSearch() {
    const searchInput = document.getElementById('plain-cheat-search');
    const container = document.getElementById('plain-cheats-grid-container');
    if (!searchInput || !container) return;

    const cards = container.querySelectorAll('.plain-cheat-card');

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        let matchedCount = 0;

        cards.forEach(card => {
            if (!query) {
                card.style.display = '';
                matchedCount++;
                return;
            }
            const tags = (card.getAttribute('data-tags') || '').toLowerCase();
            const text = card.textContent.toLowerCase();
            if (tags.includes(query) || text.includes(query)) {
                card.style.display = '';
                matchedCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Индикатор пустого результата
        let emptyNotice = document.getElementById('plain-search-empty-notice');
        if (matchedCount === 0) {
            if (!emptyNotice) {
                emptyNotice = document.createElement('div');
                emptyNotice.id = 'plain-search-empty-notice';
                emptyNotice.className = 'alert alert-info text-center';
                emptyNotice.style.gridColumn = '1 / -1';
                emptyNotice.innerHTML = `По запросу «<b>${escapeForHtml(query)}</b>» карточек не найдено. Попробуйте слова: <i>MTU, OSPF, NAT, маска, reboot, ssh</i>.`;
                container.appendChild(emptyNotice);
            } else {
                emptyNotice.style.display = '';
                emptyNotice.innerHTML = `По запросу «<b>${escapeForHtml(query)}</b>» карточек не найдено. Попробуйте слова: <i>MTU, OSPF, NAT, маска, reboot, ssh</i>.`;
            }
        } else if (emptyNotice) {
            emptyNotice.style.display = 'none';
        }
    });
}

// Экспорт глобальных функций для onclick
window.triggerMobileTab = triggerMobileTab;
window.togglePlainCheat = togglePlainCheat;
window.initRefSubtabs = initRefSubtabs;
window.initPlainCheatsSearch = initPlainCheatsSearch;


