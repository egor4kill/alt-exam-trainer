// js/breakdown.js
// Разбор синтаксиса команд Linux / Альт Линукс ("Почему именно так?")
// Детальный разбор каждого ключа, параметра и пути для понимания логики стенда

(function(global) {
    'use strict';

    function getCommandTokensExplanation(rawCmd) {
        if (!rawCmd) return null;
        const cmd = rawCmd.trim();

        // 1. IPTABLES & NAT
        if (cmd.includes('iptables')) {
            const tokens = [];
            tokens.push({ token: 'iptables', desc: 'Утилита управления межсетевым экраном Netfilter в ядре Linux.' });
            if (cmd.includes('-t nat')) {
                tokens.push({ token: '-t nat', desc: 'Выбор таблицы NAT (трансляция сетевых адресов).' });
            }
            if (cmd.includes('-A POSTROUTING')) {
                tokens.push({ token: '-A POSTROUTING', desc: 'Добавить правило в цепочку POSTROUTING (срабатывает ПОСЛЕ маршрутизации, перед выходом пакета в кабель).' });
            }
            if (cmd.includes('-A PREROUTING')) {
                tokens.push({ token: '-A PREROUTING', desc: 'Цепочка PREROUTING (срабатывает ДО принятия решения о маршрутизации).' });
            }
            const outIface = cmd.match(/-o\s+([^\s]+)/);
            if (outIface) {
                tokens.push({ token: `-o ${outIface[1]}`, desc: `Исходящий сетевой интерфейс (${outIface[1]}), через который пакет уходит наружу.` });
            }
            if (cmd.includes('-j MASQUERADE')) {
                tokens.push({ token: '-j MASQUERADE', desc: 'Действие MASQUERADE (маскарадинг): подменяет серый IP источника на публичный IP исходящего интерфейса.' });
            }
            if (cmd.includes('-L')) {
                tokens.push({ token: '-L', desc: 'Вывести список (List) текущих активных правил фильтрации.' });
            }
            if (cmd.includes('iptables-save')) {
                tokens.push({ token: 'iptables-save > /root/iptables_rules', desc: 'Сохранить текущие правила из оперативной памяти ядра в постоянный файл на диске.' });
            }
            if (cmd.includes('iptables-restore')) {
                tokens.push({ token: 'iptables-restore < /root/iptables_rules', desc: 'Восстановить правила в ядро из сохранённого файла (используется при автозагрузке @reboot).' });
            }
            return {
                title: 'Разбор параметров iptables (NAT)',
                summary: 'Команда настраивает шлюз для трансляции частных адресов локальной сети в публичный адрес.',
                tokens
            };
        }

        // 2. SYSCTL (Форвардинг)
        if (cmd.includes('sysctl')) {
            const tokens = [
                { token: 'sysctl', desc: 'Утилита для чтения и настройки параметров ядра Linux на лету.' }
            ];
            if (cmd.includes('-w')) {
                tokens.push({ token: '-w', desc: 'Флаг записи (write): немедленно применить значение в работающем ядре без перезагрузки.' });
            }
            if (cmd.includes('net.ipv4.ip_forward=1') || cmd.includes('net.ipv4.ip_forward')) {
                tokens.push({ token: 'net.ipv4.ip_forward=1', desc: 'Разрешает ядру пересылать транзитные IP-пакеты между интерфейсами (превращает ВМ в маршрутизатор).' });
            }
            return {
                title: 'Разбор sysctl (Маршрутизация IPv4)',
                summary: 'Без этого параметра ядро отбрасывает любые чужие пакеты, даже если сеть и шлюзы настроены верно.',
                tokens
            };
        }

        // 3. IP ROUTE / IP ADDRESS
        if (cmd.startsWith('ip ') || cmd.includes('ip -')) {
            const tokens = [
                { token: 'ip', desc: 'Современная утилита из пакета iproute2 для управления сетью Linux.' }
            ];
            if (cmd.includes('-br')) {
                tokens.push({ token: '-br (brief)', desc: 'Компактный вывод одной строкой на интерфейс (без лишнего шума).' });
            }
            if (cmd.includes('-c')) {
                tokens.push({ token: '-c (color)', desc: 'Цветная подсветка: зеленый UP (линк есть), красный DOWN (линк лежит).' });
            }
            if (cmd.includes(' a') || cmd.includes(' addr')) {
                tokens.push({ token: 'a / address', desc: 'Управление и просмотр IPv4/IPv6 адресов.' });
            }
            if (cmd.includes(' r') || cmd.includes(' route')) {
                tokens.push({ token: 'r / route', desc: 'Просмотр таблицы маршрутизации ядра.' });
            }
            if (cmd.includes('link set')) {
                tokens.push({ token: 'link set dev ... up', desc: 'Включение сетевого интерфейса на канальном уровне L2.' });
            }
            return {
                title: 'Разбор утилиты ip',
                summary: 'Главный диагностический инструмент сетевого инженера на стенде.',
                tokens
            };
        }

        // 4. TIMEDATECTL & HOSTNAMECTL
        if (cmd.includes('timedatectl')) {
            return {
                title: 'Разбор timedatectl (Системное время)',
                summary: 'Управление часами, таймзонами и NTP через systemd.',
                tokens: [
                    { token: 'timedatectl', desc: 'Диспетчер службы systemd-timedated.' },
                    { token: 'set-timezone', desc: 'Директива установки часового пояса системы.' },
                    { token: 'Asia/Barnaul', desc: 'Часовой пояс Барнаула (UTC+7, Красноярское время), требуемый по регламенту.' },
                    { token: 'set-ntp true', desc: 'Активация демона автоматической синхронизации времени по сети.' }
                ]
            };
        }

        if (cmd.includes('hostnamectl')) {
            return {
                title: 'Разбор hostnamectl (Имя хоста)',
                summary: 'Устанавливает постоянное FQDN имя узла.',
                tokens: [
                    { token: 'hostnamectl', desc: 'Утилита systemd для конфигурации сетевого имени.' },
                    { token: 'set-hostname <fqdn>', desc: 'Записывает имя в /etc/hostname и применяет его в ядре.' },
                    { token: 'exec bash', desc: 'Перезапускает командную оболочку, чтобы в prompt сразу отобразилось новое имя хоста.' }
                ]
            };
        }

        // 5. /ETC/NET В АЛЬТ ЛИНУКС
        if (cmd.includes('/etc/net/')) {
            const tokens = [];
            if (cmd.includes('cp -r')) {
                tokens.push({ token: 'cp -r /etc/net/ifaces/...', desc: 'Копирует каталог настроек интерфейса как шаблон для нового интерфейса.' });
            }
            if (cmd.includes('ipv4address')) {
                tokens.push({ token: 'ipv4address', desc: 'Файл в каталоге интерфейса, где хранится статический IP-адрес с маской в формате CIDR.' });
            }
            if (cmd.includes('ipv4route')) {
                tokens.push({ token: 'ipv4route', desc: 'Файл статических маршрутов интерфейса (строка "default via <IP>" задаёт шлюз).' });
            }
            if (cmd.includes('options')) {
                tokens.push({ token: 'options', desc: 'Файл параметров интерфейса: тип (TYPE=vlan / iptun), привязка к родителю (HOST=enp7s2) и т.д.' });
            }
            if (cmd.includes('systemctl restart network')) {
                tokens.push({ token: 'systemctl restart network', desc: 'Перезапуск сетевого сервиса ОС «Альт» для применения всех каталогов /etc/net/ifaces.' });
            }
            return {
                title: 'Разбор сетевой подсистемы /etc/net (Альт Линукс)',
                summary: 'В ОС «Альт» каждый интерфейс настраивается через отдельный каталог с текстовыми файлами параметров.',
                tokens
            };
        }

        // 6. GRE-ТУННЕЛЬ
        if (cmd.includes('gre') || cmd.includes('TUNLOCAL') || cmd.includes('iptun')) {
            return {
                title: 'Разбор параметров GRE-туннеля',
                summary: 'Инкапсуляция трафика филиала через публичную сеть провайдера.',
                tokens: [
                    { token: 'TUNLOCAL', desc: 'Внешний IP-адрес текущего маршрутизатора (точка входа в туннель).' },
                    { token: 'TUNREMOTE', desc: 'Внешний IP-адрес удалённого маршрутизатора (противоположный конец туннеля).' },
                    { token: 'TUNTYPE=gre', desc: 'Тип протокола инкапсуляции — Generic Routing Encapsulation (IP-протокол 47).' },
                    { token: 'TUNMTU=1476', desc: 'Максимальный размер пакета: 1500 минус 24 байта заголовка GRE (чтобы избежать фрагментации).' },
                    { token: 'TUNTTL=255', desc: 'Время жизни инкапсулированного пакета (максимально 255 хопов).' }
                ]
            };
        }

        // 7. OSPF & VTYSH (FRR)
        if (cmd.includes('vtysh') || cmd.includes('ospf') || cmd.includes('area 0')) {
            const tokens = [
                { token: 'vtysh', desc: 'Универсальная CLI-оболочка пакета FRRouting (синтаксис Cisco IOS).' }
            ];
            if (cmd.includes('router ospf')) {
                tokens.push({ token: 'router ospf', desc: 'Запуск процесса динамической маршрутизации OSPF (протокол состояния каналов).' });
            }
            if (cmd.includes('network')) {
                tokens.push({ token: 'network <сеть> area 0', desc: 'Включение OSPF на всех интерфейсах данной сети и анонс её в магистральную Area 0 (Backbone).' });
            }
            if (cmd.includes('authentication message-digest')) {
                tokens.push({ token: 'ip ospf authentication message-digest', desc: 'Включение проверки подлинности пакетов OSPF по криптографическому хэшу MD5.' });
            }
            if (cmd.includes('message-digest-key 1 md5')) {
                tokens.push({ token: 'message-digest-key 1 md5 123qweR%', desc: 'Идентификатор ключа (1) и общий секретный пароль, который должен строго совпадать на обоих роутерах.' });
            }
            if (cmd.includes('do wr mem')) {
                tokens.push({ token: 'do wr mem (write memory)', desc: 'Сохранение настроек OSPF из оперативной памяти демона ospfd в файл /etc/frr/frr.conf.' });
            }
            return {
                title: 'Разбор OSPF и FRRouting',
                summary: 'OSPF автоматически обменивается маршрутами между HQ и филиалом через туннель gre1.',
                tokens
            };
        }

        // 8. DHCP (dnsmasq)
        if (cmd.includes('dnsmasq') || cmd.includes('dhcp-range') || cmd.includes('dhcp-option')) {
            const tokens = [];
            if (cmd.includes('interface=')) {
                tokens.push({ token: 'interface=enp7s2.200', desc: 'Слушать DHCP-запросы только в клиентском VLAN 200, не загрязняя другие сети.' });
            }
            if (cmd.includes('dhcp-range=')) {
                tokens.push({ token: 'dhcp-range=192.168.2.2,192.168.2.14,72h', desc: 'Пул выдаваемых адресов клиентам (.2–.14) и срок аренды (72 часа).' });
            }
            if (cmd.includes('dhcp-option=3')) {
                tokens.push({ token: 'dhcp-option=3,192.168.2.1', desc: 'Опция 3 (Router): шлюз по умолчанию для клиента — интерфейс HQ-RTR.' });
            }
            if (cmd.includes('dhcp-option=6')) {
                tokens.push({ token: 'dhcp-option=6,192.168.1.2', desc: 'Опция 6 (DNS Server): адрес корпоративного DNS-сервера HQ-SRV.' });
            }
            return {
                title: 'Разбор DHCP-сервера (dnsmasq)',
                summary: 'Автоматически конфигурирует клиентские ПК: выдаёт IP, шлюз и адрес DNS.',
                tokens
            };
        }

        // 9. DNS & SSH
        if (cmd.includes('address=/') || cmd.includes('ptr-record=') || cmd.includes('ssh') || cmd.includes('2026')) {
            const tokens = [];
            if (cmd.includes('address=/')) {
                tokens.push({ token: 'address=/имя/IP', desc: 'Прямая статическая DNS-запись (A): сопоставляет доменное имя узла с его IPv4-адресом.' });
            }
            if (cmd.includes('ptr-record=')) {
                tokens.push({ token: 'ptr-record=<IP-наоборот>.in-addr.arpa,<имя>', desc: 'Обратная DNS-запись (PTR): позволяет по IP-адресу узнать FQDN-имя узла.' });
            }
            if (cmd.includes('-p 2026') || cmd.includes('Port 2026')) {
                tokens.push({ token: '-p 2026 / Port 2026', desc: 'Нестандартный порт SSH (вместо стандартного 22 по требованиям безопасности регламента).' });
            }
            return {
                title: 'Разбор DNS / SSH параметров',
                summary: 'Обеспечивает разрешение имён в домене au-team.irpo и защищённый доступ.',
                tokens
            };
        }

        return null;
    }

    function renderBreakdownCardHtml(rawCmd, customExplanation) {
        const bd = getCommandTokensExplanation(rawCmd);
        if (!bd && !customExplanation) return '';

        let html = `
            <div class="cmd-breakdown-card">
                <div class="cmd-breakdown-header">
                    <span class="cmd-breakdown-icon">🧠</span>
                    <b>${bd ? bd.title : 'Разбор команды'}</b>
                    <span class="badge badge-topic text-xs ml-auto">Почему именно так</span>
                </div>
        `;

        if (bd && bd.summary) {
            html += `<p class="cmd-breakdown-summary">${bd.summary}</p>`;
        }

        if (bd && bd.tokens && bd.tokens.length > 0) {
            html += `<div class="cmd-breakdown-tokens">`;
            bd.tokens.forEach(t => {
                html += `
                    <div class="cmd-breakdown-item">
                        <code class="cmd-token-badge">${escapeHtml(t.token)}</code>
                        <span class="cmd-token-desc">${t.desc}</span>
                    </div>
                `;
            });
            html += `</div>`;
        }

        if (customExplanation) {
            html += `<div class="cmd-breakdown-custom">💡 <b>Контекст задачи:</b> ${customExplanation}</div>`;
        }

        html += `</div>`;
        return html;
    }

    function escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    global.CommandBreakdown = {
        getExplanation: getCommandTokensExplanation,
        renderHtml: renderBreakdownCardHtml
    };

})(window);
