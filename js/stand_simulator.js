// js/stand_simulator.js
// Полноценный эмулятор реального стенда Proxmox VE (6 виртуальных машин)
// Обеспечивает:
// 1. Отдельные консоли для всех 6 ВМ (ISP, HQ-RTR, BR-RTR, HQ-SRV, BR-SRV, HQ-CLI)
// 2. Реальное запоминание состояния (файлы в /etc/net/ifaces, IP-адреса, NAT, OSPF, таймзоны)
// 3. Динамическую реакцию команд: cat выводит то, что записали через echo;
//    ip -br -c a показывает настроенные порты после systemctl restart network;
//    ping реально проверяет связь между машинами через шлюзы, NAT и GRE-туннель!

class StandSimulator {
    constructor() {
        this.activeVmId = 'hq-rtr'; // 'isp' | 'hq-rtr' | 'br-rtr' | 'hq-srv' | 'br-srv' | 'hq-cli'
        this.storageKey = 'alt_proxmox_stand_state_v1';
        this.vmHistory = {};
        this.vmHistoryIdx = {};

        this.initDefaultState();
        this.loadState();
        this.initDOMElements();
        this.bindEvents();
        this.renderActiveVmConsole();
    }

    initDefaultState() {
        this.defaultState = {
            'isp': {
                id: 'isp',
                vmid: 10601,
                name: 'ISP',
                hostname: 'localhost',
                timezone: 'UTC',
                user: 'root',
                ipForward: false,
                natMasquerade: false,
                ifaces: {
                    'enp7s1': { ip: '10.100.0.54/24', state: 'UP', gw: '10.100.0.1' }, // WAN
                    'enp7s2': { ip: null, state: 'DOWN', gw: null },
                    'enp7s3': { ip: null, state: 'DOWN', gw: null }
                },
                files: {},
                services: { network: true }
            },
            'hq-rtr': {
                id: 'hq-rtr',
                vmid: 10602,
                name: 'HQ-RTR',
                hostname: 'localhost',
                timezone: 'UTC',
                user: 'root',
                ipForward: false,
                natMasquerade: false,
                ifaces: {
                    'enp7s1': { ip: null, state: 'DOWN', gw: null },
                    'enp7s2': { ip: null, state: 'DOWN', gw: null },
                    'enp7s2.100': { ip: null, state: 'DOWN', gw: null },
                    'enp7s2.200': { ip: null, state: 'DOWN', gw: null },
                    'gre1': { ip: null, state: 'DOWN', gw: null, remote: null, mtu: 1500 }
                },
                ospf: { running: false, networks: [], md5Key: null },
                dhcp: { running: false, iface: null, range: null, opt3: null, opt6: null },
                files: {},
                services: { network: true, dnsmasq: false, frr: false }
            },
            'br-rtr': {
                id: 'br-rtr',
                vmid: 10605,
                name: 'BR-RTR',
                hostname: 'localhost',
                timezone: 'UTC',
                user: 'root',
                ipForward: false,
                natMasquerade: false,
                ifaces: {
                    'enp7s1': { ip: null, state: 'DOWN', gw: null },
                    'enp7s2': { ip: null, state: 'DOWN', gw: null },
                    'gre1': { ip: null, state: 'DOWN', gw: null, remote: null, mtu: 1500 }
                },
                ospf: { running: false, networks: [], md5Key: null },
                files: {},
                services: { network: true, frr: false }
            },
            'hq-srv': {
                id: 'hq-srv',
                vmid: 10603,
                name: 'HQ-SRV',
                hostname: 'localhost',
                timezone: 'UTC',
                user: 'root',
                ifaces: {
                    'enp7s2.100': { ip: null, state: 'DOWN', gw: null }
                },
                dns: { running: false, records: {} },
                sshPort: 22,
                users: { root: 'altlinux' },
                files: {},
                services: { network: true, dnsmasq: false, sshd: true }
            },
            'br-srv': {
                id: 'br-srv',
                vmid: 10606,
                name: 'BR-SRV',
                hostname: 'localhost',
                timezone: 'UTC',
                user: 'root',
                ifaces: {
                    'enp7s1': { ip: null, state: 'DOWN', gw: null }
                },
                files: {},
                services: { network: true }
            },
            'hq-cli': {
                id: 'hq-cli',
                vmid: 10604,
                name: 'HQ-CLI',
                hostname: 'localhost',
                timezone: 'UTC',
                user: 'user',
                ifaces: {
                    'enp7s2.200': { ip: null, state: 'DOWN', gw: null }
                },
                resolvConfDns: null,
                files: {},
                services: { network: true }
            }
        };
    }

    loadState() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (raw) {
                this.state = JSON.parse(raw);
            } else {
                this.state = JSON.parse(JSON.stringify(this.defaultState));
            }
        } catch (e) {
            this.state = JSON.parse(JSON.stringify(this.defaultState));
        }

        // Инициализация истории команд для каждого узла
        Object.keys(this.state).forEach(node => {
            this.vmHistory[node] = [];
            this.vmHistoryIdx[node] = -1;
        });
    }

    saveState() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.state));
        } catch (e) {
            console.error('Ошибка сохранения состояния стенда', e);
        }
    }

    resetAllVms() {
        if (confirm("Вы уверены, что хотите сбросить состояние всех 6 ВМ к чистому заводскому состоянию?")) {
            this.state = JSON.parse(JSON.stringify(this.defaultState));
            this.saveState();
            this.renderActiveVmConsole();
            this.renderStateInspector();
        }
    }

    applyPracticeProgress() {
        // Удобная кнопка: быстро преднастроить стенд на основе решённых в практике шагов
        const completed = new Set(JSON.parse(localStorage.getItem('alt_completed_tasks_v2') || '[]'));
        if (completed.size === 0) {
            alert("У вас пока нет выполненных заданий в разделе Практика 2–8.");
            return;
        }

        APP_DATA.commandTasks.forEach(task => {
            if (completed.has(task.id)) {
                this.executeSimulatedCommand(task.host, task.correctAnswers[0], true);
            }
        });

        this.saveState();
        this.renderActiveVmConsole();
        this.renderStateInspector();
        alert(`Настройки успешно применены! Стенд синхронизирован с вашим прогрессом практик (${completed.size} заданий).`);
    }

    initDOMElements() {
        this.vmTabs = document.querySelectorAll('.pve-vm-tab');
        this.termOutput = document.getElementById('stand-term-output');
        this.termInput = document.getElementById('stand-term-input');
        this.termPrompt = document.getElementById('stand-term-prompt');
        this.winTitle = document.getElementById('stand-win-title');
        this.inspectorBox = document.getElementById('stand-inspector-box');
        this.btnReset = document.getElementById('stand-btn-reset');
        this.btnSync = document.getElementById('stand-btn-sync');
    }

    bindEvents() {
        // Переключение ВМ
        this.vmTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetVm = tab.getAttribute('data-vm');
                if (targetVm) {
                    this.switchVm(targetVm);
                }
            });
        });

        // Ввод команд в консоли ВМ
        this.termInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleInput(this.termInput.value);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateHistory(-1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateHistory(1);
            }
        });

        document.getElementById('stand-btn-run')?.addEventListener('click', () => {
            this.handleInput(this.termInput.value);
        });

        this.btnReset?.addEventListener('click', () => this.resetAllVms());
        this.btnSync?.addEventListener('click', () => this.applyPracticeProgress());

        // Подключение Tab completer
        if (window.altTabCompleter) {
            window.altTabCompleter.attachToInput(
                this.termInput,
                this.termOutput,
                () => this.getPromptText(this.activeVmId)
            );
        }

        // Мобильные спецсимволы стенда
        document.querySelectorAll('#sec-stand .key-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.preventDefault();
                const key = chip.getAttribute('data-key');
                const action = chip.getAttribute('data-action');
                if (action === 'tab') {
                    if (window.altTabCompleter) {
                        window.altTabCompleter.handleTab(this.termInput, this.termOutput, this.getPromptText(this.activeVmId));
                        this.termInput.focus();
                    }
                } else if (action === 'clear') {
                    this.termInput.value = '';
                    this.termInput.focus();
                } else if (key && this.termInput) {
                    const start = this.termInput.selectionStart ?? this.termInput.value.length;
                    const end = this.termInput.selectionEnd ?? this.termInput.value.length;
                    const val = this.termInput.value;
                    this.termInput.value = val.substring(0, start) + key + val.substring(end);
                    this.termInput.focus();
                    this.termInput.setSelectionRange(start + key.length, start + key.length);
                }
            });
        });
    }

    switchVm(vmId) {
        if (!this.state[vmId]) return;
        this.activeVmId = vmId;

        this.vmTabs.forEach(t => {
            if (t.getAttribute('data-vm') === vmId) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });

        this.renderActiveVmConsole();
        this.renderStateInspector();
    }

    getPromptText(vmId) {
        const vm = this.state[vmId];
        const isRoot = vm.user === 'root';
        const sign = isRoot ? '#' : '$';
        const hostShort = vm.hostname === 'localhost' ? vm.hostname : vm.hostname.split('.')[0];
        return `${vm.user}@${hostShort}:~${sign} `;
    }

    renderActiveVmConsole() {
        const vm = this.state[this.activeVmId];
        const promptText = this.getPromptText(this.activeVmId);

        if (this.termPrompt) this.termPrompt.textContent = promptText;
        if (this.winTitle) {
            this.winTitle.innerHTML = `<b>${vm.vmid}: ${vm.name}</b> (${vm.hostname}) — Proxmox noVNC Web Console`;
        }

        if (this.termOutput) {
            this.termOutput.innerHTML = `
                <div class="term-line sys-msg">
                    <span class="text-cyan">[Proxmox VE 8.2]</span> Подключение к виртуальной машине <b class="text-green">${vm.name}</b> (ID: ${vm.vmid}).
                </div>
                <div class="term-line sys-msg">
                    ОС: <b>Альт Рабочая станция / Сервер К 10.2</b> | Ядро: <b>Linux 6.1.79-std-def-alt1</b>
                </div>
                <div class="term-line sys-msg text-muted">
                    Все внесённые изменения сохраняются локально. Работает автодополнение <b>Tab</b> и реальный отклик утилит.
                </div>
            `;
        }

        if (this.termInput) {
            this.termInput.value = '';
            this.termInput.focus();
        }

        this.renderStateInspector();
    }

    handleInput(rawCmd) {
        const cmd = (rawCmd || '').trim();
        if (!cmd) return;

        const hist = this.vmHistory[this.activeVmId];
        hist.push(cmd);
        this.vmHistoryIdx[this.activeVmId] = hist.length;

        const promptText = this.getPromptText(this.activeVmId);

        // Печать введённой команды
        const line = document.createElement('div');
        line.className = 'term-line';
        line.innerHTML = `<span class="prompt">${this.escapeHtml(promptText)}</span><span class="user-cmd">${this.escapeHtml(cmd)}</span>`;
        this.termOutput.appendChild(line);

        // Выполнение команды в симуляторе
        const outputHtml = this.executeSimulatedCommand(this.activeVmId, cmd, false);
        if (outputHtml) {
            const outLine = document.createElement('div');
            outLine.className = 'term-line';
            outLine.innerHTML = outputHtml;
            this.termOutput.appendChild(outLine);
        }

        // Обновляем prompt (на случай hostnamectl)
        this.termPrompt.textContent = this.getPromptText(this.activeVmId);

        this.termInput.value = '';
        this.saveState();
        this.renderStateInspector();

        // Скролл вниз
        const win = document.getElementById('stand-term-window');
        if (win) win.scrollTop = win.scrollHeight;
    }

    navigateHistory(dir) {
        const hist = this.vmHistory[this.activeVmId] || [];
        if (hist.length === 0) return;

        let idx = this.vmHistoryIdx[this.activeVmId];
        idx += dir;
        if (idx < 0) idx = 0;
        if (idx > hist.length) idx = hist.length;

        this.vmHistoryIdx[this.activeVmId] = idx;
        if (idx === hist.length) {
            this.termInput.value = '';
        } else {
            this.termInput.value = hist[idx];
        }
    }

    // =========================================================================
    // ЯДРО ЭМУЛЯТОРА КОМАНД LINUX / АЛЬТ
    // =========================================================================

    executeSimulatedCommand(vmId, rawCmd, silent = false) {
        const vm = this.state[vmId];
        const cmd = rawCmd.trim();
        const norm = cmd.replace(/\s+/g, ' ');

        // 1. CLEAR
        if (norm === 'clear') {
            if (!silent) this.termOutput.innerHTML = '';
            return null;
        }

        // 2. HOSTNAMECTL
        if (norm.startsWith('hostnamectl set-hostname')) {
            const match = norm.match(/set-hostname\s+([^\s;]+)/);
            if (match) {
                vm.hostname = match[1];
                return silent ? null : `<span class="text-green">[OK] Имя хоста успешно изменено на ${vm.hostname}.</span>`;
            }
        }
        if (norm === 'hostnamectl' || norm === 'hostnamectl status') {
            return `
                Static hostname: ${vm.hostname}<br>
                Operating System: ALT Server 10.2 (Vladimir)<br>
                Kernel: Linux 6.1.79-std-def-alt1<br>
                Architecture: x86-64
            `;
        }
        if (norm === 'hostname') {
            return vm.hostname;
        }

        // 3. TIMEDATECTL
        if (norm.startsWith('timedatectl set-timezone')) {
            const match = norm.match(/set-timezone\s+([^\s;]+)/);
            if (match) {
                vm.timezone = match[1];
                return silent ? null : `<span class="text-green">[OK] Часовой пояс установлен: ${vm.timezone}.</span>`;
            }
        }
        if (norm === 'timedatectl' || norm === 'timedatectl status') {
            const offset = vm.timezone === 'Asia/Barnaul' ? '+0700' : '+0000';
            return `
                Local time: Вс 2026-11-08 22:50:14 ${vm.timezone.split('/')[1] || vm.timezone}<br>
                Universal time: Вс 2026-11-08 15:50:14 UTC<br>
                Time zone: ${vm.timezone} (${offset})<br>
                System clock synchronized: yes<br>
                NTP service: active
            `;
        }

        // 4. SYSCTL (FORWARDING)
        if (norm.includes('net.ipv4.ip_forward=1')) {
            vm.ipForward = true;
            return silent ? null : `net.ipv4.ip_forward = 1`;
        }
        if (norm === 'sysctl net.ipv4.ip_forward') {
            return `net.ipv4.ip_forward = ${vm.ipForward ? 1 : 0}`;
        }

        // 5. IPTABLES & NAT
        if (norm.includes('iptables') && norm.includes('MASQUERADE')) {
            vm.natMasquerade = true;
            return silent ? null : `<span class="text-green">[OK] Правило MASQUERADE добавлено в цепочку POSTROUTING таблицы nat.</span>`;
        }
        if (norm.includes('iptables') && norm.includes('-t nat') && (norm.includes('-L') || norm.includes('-S'))) {
            if (vm.natMasquerade) {
                return `
                    Chain PREROUTING (policy ACCEPT)<br>
                    Chain INPUT (policy ACCEPT)<br>
                    Chain POSTROUTING (policy ACCEPT)<br>
                    target&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;prot opt source&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;destination<br>
                    <b class="text-cyan">MASQUERADE</b>&nbsp;&nbsp;all&nbsp;&nbsp;--&nbsp;&nbsp;0.0.0.0/0&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;0.0.0.0/0
                `;
            } else {
                return `
                    Chain PREROUTING (policy ACCEPT)<br>
                    Chain INPUT (policy ACCEPT)<br>
                    Chain POSTROUTING (policy ACCEPT)<br>
                    <span class="text-muted">(Цепочка пуста — NAT не настроен)</span>
                `;
            }
        }
        if (norm.includes('iptables-save')) {
            vm.files['/root/iptables_rules'] = '# Generated by iptables-save\n*nat\n-A POSTROUTING -o enp7s1 -j MASQUERADE\nCOMMIT\n';
            return silent ? null : `<span class="text-cyan">[OK] Правила iptables сохранены в /root/iptables_rules.</span>`;
        }

        // 6. ЗАПИСЬ ФАЙЛОВ (ECHO > / CP -R / CAT)
        const echoMatch = norm.match(/echo\s+['"]?([^'">]+)['"]?\s*>\s*([^\s;]+)/);
        if (echoMatch) {
            const content = echoMatch[1];
            const filepath = echoMatch[2];
            vm.files[filepath] = content;
            return silent ? null : '';
        }

        const appendMatch = norm.match(/echo\s+['"]?([^'">]+)['"]?\s*>>\s*([^\s;]+)/);
        if (appendMatch) {
            const content = appendMatch[1];
            const filepath = appendMatch[2];
            vm.files[filepath] = (vm.files[filepath] || '') + '\n' + content;
            return silent ? null : '';
        }

        if (norm.startsWith('cp -r /etc/net/ifaces/')) {
            const parts = norm.split(' ');
            const src = parts[2];
            const dst = parts[3];
            // Копируем все виртуальные файлы из каталога src в dst
            Object.keys(vm.files).forEach(f => {
                if (f.startsWith(src)) {
                    const newF = f.replace(src, dst);
                    vm.files[newF] = vm.files[f];
                }
            });
            // Создаем заглушку каталога
            vm.files[dst + '/options'] = 'TYPE=eth\nDISABLED=no';
            return silent ? null : '';
        }

        if (norm.startsWith('cat ')) {
            const filepath = norm.split(' ')[1];
            if (vm.files[filepath]) {
                return `<pre class="console-box">${this.escapeHtml(vm.files[filepath])}</pre>`;
            } else {
                return `<span class="text-danger">cat: ${this.escapeHtml(filepath)}: Нет такого файла или каталога</span>`;
            }
        }

        // 7. SYSTEMCTL RESTAURT NETWORK (ПРИМЕНЕНИЕ НАСТРОЕК СЕТИ)
        if (norm.includes('systemctl restart network') || norm.includes('restart net')) {
            this.applyEtcNetConfigurations(vm);
            return silent ? null : `<span class="text-green">[OK] Служба network успешно перезапущена. Конфигурации /etc/net применены.</span>`;
        }

        // 8. IP ADDRESS (IP -BR -C A / IP A)
        if (norm.startsWith('ip -br') || norm.startsWith('ip a') || norm.startsWith('ip addr')) {
            return this.renderIpBriefOutput(vm);
        }

        if (norm.startsWith('ip r') || norm.startsWith('ip route')) {
            return this.renderIpRouteOutput(vm);
        }

        // 9. PING (СЕТЕВАЯ ДОСТИЖИМОСТЬ МЕЖДУ ВМ)
        if (norm.startsWith('ping')) {
            return this.simulatePing(vm, norm);
        }

        // 10. VTYSH & OSPF
        if (norm.includes('vtysh')) {
            if (norm.includes('show ip ospf neighbor')) {
                return this.simulateOspfNeighbor(vm);
            }
            if (norm.includes('show ip route')) {
                return this.simulateOspfRoutes(vm);
            }
            if (norm.includes('router ospf') || norm.includes('network') || norm.includes('do wr mem')) {
                vm.services.frr = true;
                vm.ospf.running = true;
                return silent ? null : `<span class="text-green">[OK] Конфигурация OSPF сохранена в /etc/frr/frr.conf.</span>`;
            }
            return `FRRouting 8.5.2 (au-team). Type '?' for help.`;
        }

        // 11. DIG & DNS
        if (norm.startsWith('dig')) {
            return this.simulateDig(vm, norm);
        }

        // 12. SSH
        if (norm.startsWith('ssh')) {
            return this.simulateSsh(vm, norm);
        }

        // 13. SYSTEMCTL СЛУЖБЫ
        if (norm.startsWith('systemctl enable --now') || norm.startsWith('systemctl start')) {
            if (norm.includes('dnsmasq')) vm.services.dnsmasq = true;
            if (norm.includes('frr')) vm.services.frr = true;
            if (norm.includes('sshd')) vm.services.sshd = true;
            return silent ? null : `<span class="text-green">[OK] Служба активирована и запущена.</span>`;
        }
        if (norm.startsWith('systemctl status')) {
            const svc = norm.split(' ')[2] || 'network';
            const isAct = vm.services[svc] !== false;
            return `
                ● ${svc}.service - System Service<br>
                &nbsp;&nbsp;Loaded: loaded (/lib/systemd/system/${svc}.service; enabled; vendor preset: disabled)<br>
                &nbsp;&nbsp;Active: <b class="${isAct ? 'text-green' : 'text-danger'}">${isAct ? 'active (running)' : 'inactive (dead)'}</b>
            `;
        }

        // По умолчанию
        return `<span class="text-muted">Команда выполнена (код возврата 0).</span>`;
    }

    // Применение файлов /etc/net к интерфейсам ВМ
    applyEtcNetConfigurations(vm) {
        Object.keys(vm.files).forEach(path => {
            // Например: /etc/net/ifaces/enp7s1/ipv4address
            const matchIp = path.match(/\/etc\/net\/ifaces\/([^\/]+)\/ipv4address/);
            if (matchIp) {
                const ifaceName = matchIp[1];
                const ipVal = vm.files[path].trim();
                if (!vm.ifaces[ifaceName]) vm.ifaces[ifaceName] = { state: 'DOWN', gw: null };
                vm.ifaces[ifaceName].ip = ipVal;
                vm.ifaces[ifaceName].state = 'UP';
            }

            // Шлюз: /etc/net/ifaces/enp7s1/ipv4route
            const matchRoute = path.match(/\/etc\/net\/ifaces\/([^\/]+)\/ipv4route/);
            if (matchRoute) {
                const ifaceName = matchRoute[1];
                const rVal = vm.files[path];
                const gwMatch = rVal.match(/default via ([^\s]+)/);
                if (gwMatch && vm.ifaces[ifaceName]) {
                    vm.ifaces[ifaceName].gw = gwMatch[1];
                }
            }

            // GRE options: TUNLOCAL, TUNREMOTE, TUNMTU
            if (path.includes('/gre1/options')) {
                const opt = vm.files[path];
                if (!vm.ifaces['gre1']) vm.ifaces['gre1'] = { state: 'DOWN' };
                const remMatch = opt.match(/TUNREMOTE=([^\s]+)/);
                if (remMatch) vm.ifaces['gre1'].remote = remMatch[1];
                const mtuMatch = opt.match(/TUNMTU=([^\s]+)/);
                if (mtuMatch) vm.ifaces['gre1'].mtu = parseInt(mtuMatch[1], 10);
                vm.ifaces['gre1'].state = 'UP';
            }
        });
    }

    renderIpBriefOutput(vm) {
        let rows = [];
        rows.push(`<span class="text-green font-bold">lo</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;UP&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;127.0.0.1/8 ::1/128`);

        Object.keys(vm.ifaces).forEach(name => {
            const iface = vm.ifaces[name];
            const isUp = iface.state === 'UP' && iface.ip;
            const stateStr = isUp ? `<span class="text-green font-bold">UP</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;` : `<span class="text-danger">DOWN</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`;
            const ipStr = iface.ip ? `<span class="text-cyan">${iface.ip}</span>` : `<span class="text-muted">&lt;нет адреса&gt;</span>`;
            const padName = (name + '               ').slice(0, 15);
            rows.push(`${padName} ${stateStr} ${ipStr}`);
        });

        return `<pre class="console-box">${rows.join('\n')}</pre>`;
    }

    renderIpRouteOutput(vm) {
        let routes = [];
        let defaultGw = null;

        Object.values(vm.ifaces).forEach(iface => {
            if (iface.gw) defaultGw = iface.gw;
        });

        if (defaultGw) {
            routes.push(`default via <b class="text-cyan">${defaultGw}</b> dev enp7s1 proto static`);
        }

        Object.entries(vm.ifaces).forEach(([name, iface]) => {
            if (iface.ip && iface.state === 'UP') {
                const subnet = this.calculateSubnet(iface.ip);
                if (subnet) routes.push(`${subnet} dev ${name} proto kernel scope link src ${iface.ip.split('/')[0]}`);
            }
        });

        if (routes.length === 0) {
            return `<span class="text-muted">(Таблица маршрутизации ядра пуста)</span>`;
        }

        return `<pre class="console-box">${routes.join('\n')}</pre>`;
    }

    calculateSubnet(cidr) {
        try {
            const [ip, mask] = cidr.split('/');
            const m = parseInt(mask, 10);
            const parts = ip.split('.').map(Number);
            const ipNum = (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
            const maskNum = -1 << (32 - m);
            const netNum = (ipNum & maskNum) >>> 0;
            const netIp = [(netNum >>> 24) & 255, (netNum >>> 16) & 255, (netNum >>> 8) & 255, netNum & 255].join('.');
            return `${netIp}/${m}`;
        } catch (e) {
            return null;
        }
    }

    simulatePing(vm, cmd) {
        const target = cmd.split(' ').filter(w => !w.startsWith('-') && w !== 'ping')[0];
        if (!target) return 'ping: missing host operand';

        // 1. Пинг шлюза ISP 172.16.1.1
        if (target === '172.16.1.1') {
            const hasLink = vm.ifaces['enp7s1'] && vm.ifaces['enp7s1'].ip;
            if (hasLink || vm.id === 'isp') {
                return `
                    PING 172.16.1.1 (172.16.1.1) 56(84) bytes of data.<br>
                    64 bytes from 172.16.1.1: icmp_seq=1 ttl=64 time=0.412 ms<br>
                    64 bytes from 172.16.1.1: icmp_seq=2 ttl=64 time=0.389 ms<br>
                    --- 172.16.1.1 ping statistics ---<br>
                    2 packets transmitted, 2 received, <b class="text-green">0% packet loss</b>, time 1002ms
                `;
            } else {
                return `<span class="text-danger">From ${vm.hostname} icmp_seq=1 Destination Host Unreachable</span>`;
            }
        }

        // 2. Пинг внешнего интернета (ya.ru / 77.88.8.8)
        if (target === 'ya.ru' || target === '77.88.8.8') {
            const isp = this.state['isp'];
            const ispReady = isp.ipForward && isp.natMasquerade;
            const myGwReady = vm.ifaces['enp7s1']?.gw || vm.id === 'isp';

            if (ispReady && myGwReady) {
                return `
                    PING ya.ru (77.88.55.242) 56(84) bytes of data.<br>
                    64 bytes from ya.ru (77.88.55.242): icmp_seq=1 ttl=55 time=14.2 ms<br>
                    64 bytes from ya.ru (77.88.55.242): icmp_seq=2 ttl=55 time=14.8 ms<br>
                    --- ya.ru ping statistics ---<br>
                    2 packets transmitted, 2 received, <b class="text-green">0% packet loss</b>, time 1001ms<br>
                    <span class="text-cyan">🎉 Выход в интернет через NAT работает идеально!</span>
                `;
            } else {
                let reason = [];
                if (!isp.ipForward) reason.push('на ISP не включен ip_forward');
                if (!isp.natMasquerade) reason.push('на ISP отсутствует правило MASQUERADE');
                if (!myGwReady) reason.push('не указан default via шлюз');
                return `
                    PING ya.ru (77.88.55.242) 56(84) bytes of data.<br>
                    --- ya.ru ping statistics ---<br>
                    2 packets transmitted, 0 received, <b class="text-danger">100% packet loss</b><br>
                    <span class="text-yellow">💡 Причина: ${reason.join(', ')}.</span>
                `;
            }
        }

        // 3. Пинг сервера филиала BR-SRV 192.168.3.2
        if (target === '192.168.3.2') {
            const hqGre = this.state['hq-rtr'].ifaces['gre1']?.state === 'UP';
            const brGre = this.state['br-rtr'].ifaces['gre1']?.state === 'UP';
            const ospfOk = this.state['hq-rtr'].ospf.running && this.state['br-rtr'].ospf.running;

            if (hqGre && brGre && ospfOk) {
                return `
                    PING 192.168.3.2 (192.168.3.2) 56(84) bytes of data.<br>
                    64 bytes from 192.168.3.2: icmp_seq=1 ttl=62 time=2.14 ms<br>
                    64 bytes from 192.168.3.2: icmp_seq=2 ttl=62 time=2.08 ms<br>
                    --- 192.168.3.2 ping statistics ---<br>
                    2 packets transmitted, 2 received, <b class="text-green">0% packet loss</b><br>
                    <span class="text-green">✔ Связность офисов через GRE-туннель и OSPF подтверждена!</span>
                `;
            } else {
                return `
                    From ${vm.hostname} icmp_seq=1 Destination Net Unreachable<br>
                    <span class="text-yellow">💡 Пакеты до филиала не идут. Проверьте GRE-туннель gre1 и статус демона OSPF (vtysh).</span>
                `;
            }
        }

        return `
            PING ${this.escapeHtml(target)} 56(84) bytes of data.<br>
            64 bytes from ${this.escapeHtml(target)}: icmp_seq=1 ttl=64 time=0.45 ms<br>
            --- ${this.escapeHtml(target)} ping statistics ---<br>
            1 packets transmitted, 1 received, 0% packet loss
        `;
    }

    simulateOspfNeighbor(vm) {
        const hqGre = this.state['hq-rtr'].ifaces['gre1']?.state === 'UP';
        const brGre = this.state['br-rtr'].ifaces['gre1']?.state === 'UP';
        const isNeighbor = hqGre && brGre;

        if (isNeighbor) {
            const neighborIp = vm.id === 'hq-rtr' ? '10.0.0.2' : '10.0.0.1';
            const neighborId = vm.id === 'hq-rtr' ? '172.16.2.2' : '172.16.1.2';
            return `
                <pre class="console-box">Neighbor ID     Pri State           Dead Time Address         Interface
${neighborId}   1   <b class="text-green">Full/DROther</b>     34.210s  ${neighborIp}        gre1:10.0.0.1</pre>
            `;
        } else {
            return `<pre class="console-box">(Соседи OSPF отсутствуют: туннель gre1 не поднят или не совпадает MD5-ключ)</pre>`;
        }
    }

    simulateOspfRoutes(vm) {
        return `
            <pre class="console-box">Codes: K - kernel, C - connected, S - static, O - OSPF, IA - OSPF inter area
O   192.168.1.0/27 [110/10] via 10.0.0.1, gre1, 00:14:02
O   192.168.2.0/28 [110/10] via 10.0.0.1, gre1, 00:14:02
O   192.168.3.0/28 [110/10] via 10.0.0.2, gre1, 00:14:02</pre>
        `;
    }

    simulateDig(vm, cmd) {
        const srv = this.state['hq-srv'];
        const dnsActive = srv.services.dnsmasq;
        if (dnsActive) {
            return `
                ; &lt;&lt;&gt;&gt; DiG 9.18.24 &lt;&lt;&gt;&gt; hq-srv.au-team.irpo<br>
                ;; Got answer:<br>
                ;; -&gt;&gt;HEADER&lt;&lt;- opcode: QUERY, status: <b class="text-green">NOERROR</b>, id: 48921<br>
                ;; ANSWER SECTION:<br>
                hq-srv.au-team.irpo.&nbsp;&nbsp;0&nbsp;&nbsp;&nbsp;&nbsp;IN&nbsp;&nbsp;&nbsp;&nbsp;A&nbsp;&nbsp;&nbsp;&nbsp;<b class="text-cyan">192.168.1.2</b><br>
                ;; Query time: 1 msec<br>
                ;; SERVER: 192.168.1.2#53(192.168.1.2)
            `;
        } else {
            return `<span class="text-danger">;; connection timed out; no servers could be reached</span>`;
        }
    }

    simulateSsh(vm, cmd) {
        const srv = this.state['hq-srv'];
        if (cmd.includes('-p 2026') || srv.sshPort === 2026) {
            return `
                sshuser@192.168.1.2's password:<br>
                <span class="text-green">Last login: Sun Nov 8 22:45:10 2026 from ${vm.hostname}<br>
                [sshuser@hq-srv ~]$ (Сессия SSH успешно установлена)</span>
            `;
        } else {
            return `<span class="text-danger">ssh: connect to host 192.168.1.2 port 22: Connection refused</span>`;
        }
    }

    // =========================================================================
    // ИНСПЕКТОР СОСТОЯНИЯ ТЕКУЩЕЙ ВМ (БОКОВАЯ ПАНЕЛЬ)
    // =========================================================================

    renderStateInspector() {
        if (!this.inspectorBox) return;
        const vm = this.state[this.activeVmId];

        const filesList = Object.keys(vm.files);
        const ifacesList = Object.entries(vm.ifaces);

        let html = `
            <div class="vm-inspector-card">
                <div class="d-flex justify-between align-center mb-2">
                    <h4 class="text-cyan">📊 Текущее состояние: ${vm.name}</h4>
                    <span class="badge" style="background:#10b98122; color:#10b981; border:1px solid #10b981">ID: ${vm.vmid}</span>
                </div>

                <div class="inspector-meta-grid mb-3">
                    <div class="meta-item"><span class="text-muted">Hostname:</span> <code>${vm.hostname}</code></div>
                    <div class="meta-item"><span class="text-muted">Таймзона:</span> <code>${vm.timezone}</code></div>
                    <div class="meta-item"><span class="text-muted">Форвардинг:</span> <b class="${vm.ipForward ? 'text-green' : 'text-danger'}">${vm.ipForward ? '1 (ВКЛ)' : '0 (ВЫКЛ)'}</b></div>
                    <div class="meta-item"><span class="text-muted">NAT MASQ:</span> <b class="${vm.natMasquerade ? 'text-green' : 'text-danger'}">${vm.natMasquerade ? 'АКТИВЕН' : 'НЕТ'}</b></div>
                </div>

                <h5 class="text-yellow text-xs uppercase mb-1">Сетевые интерфейсы машины:</h5>
                <div class="inspector-ifaces-list mb-3">
        `;

        ifacesList.forEach(([name, iface]) => {
            const isUp = iface.state === 'UP' && iface.ip;
            html += `
                <div class="iface-status-row">
                    <span class="iface-name font-bold">${name}:</span>
                    <span class="badge-mini ${isUp ? 'badge-success-mini' : 'badge-danger-mini'}">${isUp ? 'UP' : 'DOWN'}</span>
                    <code class="text-xs ${isUp ? 'text-cyan' : 'text-muted'}">${iface.ip || 'нет адреса'}</code>
                    ${iface.gw ? `<span class="text-xs text-muted ml-auto">gw: ${iface.gw}</span>` : ''}
                </div>
            `;
        });

        html += `
                </div>

                <div class="d-flex justify-between align-center mb-1">
                    <h5 class="text-yellow text-xs uppercase">Созданные файлы конфигураций:</h5>
                    <span class="text-xs text-muted">${filesList.length} файлов</span>
                </div>
                <div class="inspector-files-box">
        `;

        if (filesList.length === 0) {
            html += `<span class="text-muted text-xs">Файлов пока нет. Создавайте их командами: echo '...' &gt; /etc/net/...</span>`;
        } else {
            filesList.forEach(f => {
                html += `
                    <div class="file-chip-item">
                        <code>${this.escapeHtml(f)}</code>
                        <button class="btn btn-xs btn-outline ml-auto" onclick="standSimulator.inspectFile('${this.escapeQuotes(f)}')">cat</button>
                    </div>
                `;
            });
        }

        html += `
                </div>
            </div>
        `;

        this.inspectorBox.innerHTML = html;
    }

    inspectFile(filepath) {
        if (this.termInput) {
            this.termInput.value = `cat ${filepath}`;
            this.handleInput(this.termInput.value);
        }
    }

    escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return (text || '').replace(/[&<>"']/g, m => map[m]);
    }

    escapeQuotes(text) {
        return (text || '').replace(/'/g, "\\'");
    }
}

// Экспорт
window.StandSimulator = StandSimulator;
