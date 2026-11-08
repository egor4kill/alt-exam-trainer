// js/tab_completion.js
// Полноценный эмулятор автодополнения клавиши Tab для ОС «Альт»
// Реализует стандартное поведение оболочки GNU bash:
// 1. Автодополнение команд, ключей, путей файловой системы /etc/net/ifaces
// 2. Дополнение до наибольшего общего префикса
// 3. Вывод списка кандидатов при повторном нажатии Tab (Double-Tab) в окно терминала

(function(global) {
    'use strict';

    const DICTIONARY = [
        // 1. Команды Linux и утилиты
        'hostnamectl',
        'timedatectl',
        'systemctl',
        'iptables',
        'iptables-save',
        'iptables-restore',
        'sysctl',
        'ip',
        'ping',
        'cat',
        'echo',
        'cp',
        'mkdir',
        'chmod',
        'chown',
        'vtysh',
        'dig',
        'ssh',
        'apt-get',
        'useradd',
        'passwd',
        'crontab',
        'grep',
        'head',
        'tail',
        'clear',
        'help',
        'exit',

        // 2. Подкоманды systemd и утилит
        'status',
        'restart',
        'enable',
        'start',
        'stop',
        '--now',
        'network',
        'dnsmasq',
        'frr',
        'sshd',
        'set-timezone',
        'set-hostname',
        'set-ntp',
        'Asia/Barnaul',
        'net.ipv4.ip_forward',
        'net.ipv4.ip_forward=1',

        // 3. Сетевые ключи и параметры
        '-br',
        '-c',
        'POSTROUTING',
        'PREROUTING',
        'MASQUERADE',
        'message-digest',
        '123qweR%',
        '+short',

        // 4. Пути файловой системы ОС «Альт»
        '/etc/',
        '/etc/net/',
        '/etc/net/sysctl.conf',
        '/etc/net/ifaces/',
        '/etc/net/ifaces/default/',
        '/etc/net/ifaces/enp0s3/',
        '/etc/net/ifaces/enp0s3/ipv4address',
        '/etc/net/ifaces/enp0s3/ipv4route',
        '/etc/net/ifaces/enp0s3/options',
        '/etc/net/ifaces/enp0s3/resolv.conf',
        '/etc/net/ifaces/enp0s3.100/',
        '/etc/net/ifaces/enp0s3.100/ipv4address',
        '/etc/net/ifaces/enp0s3.100/ipv4route',
        '/etc/net/ifaces/enp0s3.100/resolv.conf',
        '/etc/net/ifaces/enp0s3.200/',
        '/etc/net/ifaces/enp0s3.200/options',
        '/etc/net/ifaces/enp7s1/',
        '/etc/net/ifaces/enp7s1/ipv4address',
        '/etc/net/ifaces/enp7s1/ipv4route',
        '/etc/net/ifaces/enp7s1/options',
        '/etc/net/ifaces/enp7s2/',
        '/etc/net/ifaces/enp7s2/ipv4address',
        '/etc/net/ifaces/enp7s2/options',
        '/etc/net/ifaces/enp7s2.100/',
        '/etc/net/ifaces/enp7s2.100/ipv4address',
        '/etc/net/ifaces/enp7s2.100/options',
        '/etc/net/ifaces/enp7s2.200/',
        '/etc/net/ifaces/enp7s2.200/ipv4address',
        '/etc/net/ifaces/enp7s2.200/options',
        '/etc/net/ifaces/enp7s3/',
        '/etc/net/ifaces/enp7s3/ipv4address',
        '/etc/net/ifaces/gre1/',
        '/etc/net/ifaces/gre1/ipv4address',
        '/etc/net/ifaces/gre1/options',
        '/etc/dnsmasq.conf',
        '/etc/frr/',
        '/etc/frr/frr.conf',
        '/etc/frr/daemons',
        '/etc/openssh/',
        '/etc/openssh/sshd_config',
        '/etc/resolv.conf',
        '/etc/hostname',
        '/root/iptables_rules',

        // 5. Сетевые FQDN имена и адреса стенда
        'isp.au-team.irpo',
        'hq-rtr.au-team.irpo',
        'br-rtr.au-team.irpo',
        'hq-srv.au-team.irpo',
        'br-srv.au-team.irpo',
        'hq-cli.au-team.irpo',
        'docker.au-team.irpo',
        'web.au-team.irpo',
        'ya.ru',
        '77.88.8.8',
        '172.16.1.1',
        '172.16.1.2',
        '172.16.2.1',
        '172.16.2.2',
        '192.168.1.1',
        '192.168.1.2',
        '192.168.2.1',
        '192.168.2.12',
        '192.168.3.1',
        '192.168.3.2',
        '10.0.0.1',
        '10.0.0.2',
        'sshuser@192.168.1.2'
    ];

    class AltTabCompleter {
        constructor() {
            this.lastTabTime = 0;
            this.lastPrefix = '';
        }

        // Поиск общего префикса массива строк
        findLongestCommonPrefix(strings) {
            if (!strings || strings.length === 0) return '';
            let prefix = strings[0];
            for (let i = 1; i < strings.length; i++) {
                while (strings[i].indexOf(prefix) !== 0) {
                    prefix = prefix.substring(0, prefix.length - 1);
                    if (prefix === '') return '';
                }
            }
            return prefix;
        }

        // Обработка нажатия Tab в поле ввода
        handleTab(inputEl, outputEl, promptText) {
            const val = inputEl.value;
            const cursorPos = inputEl.selectionStart;

            // Находим токен непосредственно перед курсором
            const textBeforeCursor = val.slice(0, cursorPos);
            const textAfterCursor = val.slice(cursorPos);

            // Разделяем по пробелам или кавычкам
            const match = textBeforeCursor.match(/([^\s"'>|;]+)$/);
            if (!match) return false;

            const token = match[1];
            const tokenStart = textBeforeCursor.length - token.length;

            // Ищем кандидатов в словаре
            const candidates = DICTIONARY.filter(item => {
                // Если токен это путь (/etc/...) — строгое совпадение с учётом регистра
                if (token.startsWith('/')) {
                    return item.startsWith(token);
                }
                // Иначе совпадение без учёта регистра
                return item.toLowerCase().startsWith(token.toLowerCase());
            });

            if (candidates.length === 0) {
                // Нет вариантов — визуальная индикация
                inputEl.classList.add('tab-no-match');
                setTimeout(() => inputEl.classList.remove('tab-no-match'), 250);
                return true;
            }

            if (candidates.length === 1) {
                // Ровно одно совпадение — автодополняем полностью!
                const completion = candidates[0];
                const endsWithSlash = completion.endsWith('/');
                const insertion = endsWithSlash ? completion : completion + ' ';

                inputEl.value = val.slice(0, tokenStart) + insertion + textAfterCursor;
                const newPos = tokenStart + insertion.length;
                inputEl.setSelectionRange(newPos, newPos);
                this.lastPrefix = '';
                return true;
            }

            // Множество совпадений
            const lcp = this.findLongestCommonPrefix(candidates);

            // Если общий префикс длиннее текущего токена — дополняем до него!
            if (lcp.length > token.length) {
                inputEl.value = val.slice(0, tokenStart) + lcp + textAfterCursor;
                const newPos = tokenStart + lcp.length;
                inputEl.setSelectionRange(newPos, newPos);
                this.lastPrefix = lcp;
                return true;
            }

            // Двойное нажатие Tab (или уже на максимальном префиксе): выводим список кандидатов в консоль
            const now = Date.now();
            if (now - this.lastTabTime < 1500 || this.lastPrefix === token) {
                if (outputEl) {
                    this.printCandidatesToOutput(outputEl, promptText, val, candidates);
                }
            } else {
                // Первое нажатие при неоднозначности — запоминаем время
                this.lastTabTime = now;
                this.lastPrefix = token;
            }

            return true;
        }

        printCandidatesToOutput(outputEl, promptText, currentLine, candidates) {
            // Эхо текущей набранной строки
            const echoLine = document.createElement('div');
            echoLine.className = 'term-line';
            echoLine.innerHTML = `<span class="prompt">${this.escapeHtml(promptText || '')}</span><span class="user-cmd">${this.escapeHtml(currentLine)}</span>`;
            outputEl.appendChild(echoLine);

            // Блок кандидатов
            const candDiv = document.createElement('div');
            candDiv.className = 'term-line tab-candidates-grid';
            
            // Форматируем список (выводим только относительные имена если это каталог)
            const cleanList = candidates.slice(0, 16).map(c => {
                const parts = c.split('/');
                const display = (c.endsWith('/') && parts.length > 2) ? parts[parts.length - 2] + '/' : parts[parts.length - 1] || c;
                return `<span class="tab-candidate-item">${this.escapeHtml(display)}</span>`;
            });

            if (candidates.length > 16) {
                cleanList.push(`<span class="text-muted">...и ещё ${candidates.length - 16} вариантов</span>`);
            }

            candDiv.innerHTML = cleanList.join('');
            outputEl.appendChild(candDiv);

            // Скролл вниз
            const win = outputEl.closest('.terminal-window') || outputEl;
            win.scrollTop = win.scrollHeight;
        }

        // Подключение слушателя Tab к элементу ввода
        attachToInput(inputEl, outputEl, getPromptFn) {
            if (!inputEl) return;
            inputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    const prompt = typeof getPromptFn === 'function' ? getPromptFn() : (getPromptFn || 'root@alt:~# ');
                    this.handleTab(inputEl, outputEl, prompt);
                }
            });
        }

        escapeHtml(text) {
            const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
            return (text || '').replace(/[&<>"']/g, m => map[m]);
        }
    }

    // Экспорт в глобальную область
    global.altTabCompleter = new AltTabCompleter();

})(typeof window !== 'undefined' ? window : global);
