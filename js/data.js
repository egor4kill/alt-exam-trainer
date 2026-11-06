// База данных тренажёра: топология, команды, вопросы для преподавателя, конфиги

const APP_DATA = {
    // 1. Узлы стенда (ВМ)
    nodes: [
        {
            id: "isp",
            vmid: 10601,
            name: "ISP",
            fqdn: "isp.au-team.irpo",
            role: "Провайдерский маршрутизатор (Интернет-шлюз стенда)",
            color: "#3b82f6",
            interfaces: [
                { name: "enp7s1", ip: "DHCP (WAN)", gw: "DHCP", desc: "Внешний канал в Интернет" },
                { name: "enp7s2", ip: "172.16.1.1/28", gw: "—", desc: "Линк в сторону HQ-RTR" },
                { name: "enp7s3", ip: "172.16.2.1/28", gw: "—", desc: "Линк в сторону BR-RTR" }
            ],
            services: ["NAT (MASQUERADE на enp7s1)", "ip_forward = 1"],
            configs: [
                "/etc/net/ifaces/enp7s1/options",
                "/etc/net/ifaces/enp7s2/options",
                "/etc/net/ifaces/enp7s2/ipv4address",
                "/etc/net/ifaces/enp7s3/options",
                "/etc/net/ifaces/enp7s3/ipv4address",
                "/etc/net/sysctl.conf",
                "/root/iptables_rules"
            ]
        },
        {
            id: "hq-rtr",
            vmid: 10602,
            name: "HQ-RTR",
            fqdn: "hq-rtr.au-team.irpo",
            role: "Маршрутизатор главного офиса (HQ)",
            color: "#10b981",
            interfaces: [
                { name: "enp7s1", ip: "172.16.1.2/28", gw: "172.16.1.1", desc: "Линк к ISP" },
                { name: "enp7s2.100", ip: "192.168.1.1/27", gw: "—", desc: "VLAN 100 (Серверный сегмент HQ)" },
                { name: "enp7s2.200", ip: "192.168.2.1/28", gw: "—", desc: "VLAN 200 (Клиентский сегмент HQ)" },
                { name: "enp7s2.999", ip: "192.168.99.1/29", gw: "—", desc: "VLAN 999 (Сегмент управления)" },
                { name: "gre1", ip: "10.0.0.1/30", gw: "—", desc: "GRE-туннель к BR-RTR (MTU 1476)" }
            ],
            services: [
                "NAT (MASQUERADE на enp7s1)",
                "ip_forward = 1",
                "DHCP dnsmasq (VLAN 200: 192.168.2.2–2.14, opt 3, opt 6)",
                "OSPF FRR (Area 0, MD5 на gre1)"
            ],
            configs: [
                "/etc/net/ifaces/gre1/options",
                "/etc/dnsmasq.conf",
                "/etc/frr/daemons",
                "/root/iptables_rules"
            ]
        },
        {
            id: "hq-srv",
            vmid: 10603,
            name: "HQ-SRV",
            fqdn: "hq-srv.au-team.irpo",
            role: "Сервер главного офиса (DNS, SSH)",
            color: "#8b5cf6",
            interfaces: [
                { name: "enp7s1.100 (enp0s3.100)", ip: "192.168.1.2/27", gw: "192.168.1.1", desc: "VLAN 100" }
            ],
            services: [
                "DNS dnsmasq (порт 53, зона au-team.irpo + PTR, fwd 77.88.8.8)",
                "SSH (порт 2026, пользователь sshuser UID 2026)"
            ],
            configs: [
                "/etc/dnsmasq.conf",
                "/etc/openssh/sshd_config",
                "/etc/net/ifaces/enp0s3.100/resolv.conf"
            ]
        },
        {
            id: "hq-cli",
            vmid: 10604,
            name: "HQ-CLI",
            fqdn: "hq-cli.au-team.irpo",
            role: "Клиентская машина главного офиса",
            color: "#06b6d4",
            interfaces: [
                { name: "enp7s1.200 (enp0s3.200)", ip: "DHCP (192.168.2.2–2.14, факт .12)", gw: "192.168.2.1", desc: "VLAN 200 (BOOTPROTO=dhcp)" }
            ],
            services: ["dhclient", "SSH-клиент для проверки"],
            configs: [
                "/etc/net/ifaces/enp0s3.200/options",
                "/etc/resolv.conf"
            ]
        },
        {
            id: "br-rtr",
            vmid: 10605,
            name: "BR-RTR",
            fqdn: "br-rtr.au-team.irpo",
            role: "Маршрутизатор филиала (Branch)",
            color: "#f59e0b",
            interfaces: [
                { name: "enp7s1", ip: "172.16.2.2/28", gw: "172.16.2.1", desc: "Линк к ISP" },
                { name: "enp7s2", ip: "192.168.3.1/28", gw: "—", desc: "Локальный сегмент филиала BR" },
                { name: "gre1", ip: "10.0.0.2/30", gw: "—", desc: "GRE-туннель к HQ-RTR (MTU 1476)" }
            ],
            services: [
                "NAT (MASQUERADE на enp7s1)",
                "ip_forward = 1",
                "OSPF FRR (Area 0, MD5 на gre1)"
            ],
            configs: [
                "/etc/net/ifaces/gre1/options",
                "/etc/frr/daemons",
                "/root/iptables_rules"
            ]
        },
        {
            id: "br-srv",
            vmid: 10606,
            name: "BR-SRV",
            fqdn: "br-srv.au-team.irpo",
            role: "Сервер филиала (Branch)",
            color: "#ec4899",
            interfaces: [
                { name: "enp7s1 (enp0s3)", ip: "192.168.3.2/28", gw: "192.168.3.1", desc: "Локальная сеть BR" }
            ],
            services: ["Тестовый хост связности сквозь OSPF/GRE"],
            configs: [
                "/etc/net/ifaces/enp0s3/ipv4address",
                "/etc/net/ifaces/enp0s3/ipv4route",
                "/etc/net/ifaces/enp0s3/resolv.conf"
            ]
        }
    ],

    // 2. Сети и подсети стенда
    subnets: [
        { net: "172.16.1.0/28", mask: "255.255.255.240", fromTo: "ISP (172.16.1.1) ↔ HQ-RTR (172.16.1.2)", purpose: "Транзитный линк ISP — Головной офис" },
        { net: "172.16.2.0/28", mask: "255.255.255.240", fromTo: "ISP (172.16.2.1) ↔ BR-RTR (172.16.2.2)", purpose: "Транзитный линк ISP — Филиал" },
        { net: "10.0.0.0/30", mask: "255.255.255.252", fromTo: "HQ-RTR (10.0.0.1) ↔ BR-RTR (10.0.0.2)", purpose: "GRE-туннель gre1 между офисами" },
        { net: "192.168.1.0/27", mask: "255.255.255.224", fromTo: "HQ-RTR (.1) ↔ HQ-SRV (.2)", purpose: "VLAN 100 — Серверный сегмент HQ" },
        { net: "192.168.2.0/28", mask: "255.255.255.240", fromTo: "HQ-RTR (.1) ↔ HQ-CLI (DHCP .2–.14)", purpose: "VLAN 200 — Клиентский сегмент HQ" },
        { net: "192.168.99.0/29", mask: "255.255.255.248", fromTo: "HQ-RTR (.1)", purpose: "VLAN 999 — Сегмент управления (Management)" },
        { net: "192.168.3.0/28", mask: "255.255.255.240", fromTo: "BR-RTR (.1) ↔ BR-SRV (.2)", purpose: "Локальная сеть филиала BR" }
    ],

    // 3. DNS-записи
    dnsRecords: [
        { name: "hq-rtr.au-team.irpo", ip: "192.168.1.1", ptr: "1.1.168.192.in-addr.arpa" },
        { name: "hq-srv.au-team.irpo", ip: "192.168.1.2", ptr: "2.1.168.192.in-addr.arpa" },
        { name: "hq-cli.au-team.irpo", ip: "192.168.2.2", ptr: "2.2.168.192.in-addr.arpa" },
        { name: "br-rtr.au-team.irpo", ip: "192.168.3.1", ptr: "1.3.168.192.in-addr.arpa" },
        { name: "br-srv.au-team.irpo", ip: "192.168.3.2", ptr: "2.3.168.192.in-addr.arpa" },
        { name: "docker.au-team.irpo", ip: "172.16.1.1", ptr: "—" },
        { name: "web.au-team.irpo", ip: "172.16.2.1", ptr: "—" }
    ],

    // 4. Темы практик
    topics: [
        { id: 2, name: "Практика 2: FQDN и Часовой пояс", badge: "FQDN & Time" },
        { id: 3, name: "Практика 3: Сеть в ОС «Альт» (/etc/net)", badge: "/etc/net" },
        { id: 4, name: "Практика 4: VLAN 100 / 200 / 999", badge: "802.1Q VLAN" },
        { id: 5, name: "Практика 5: NAT, iptables и sysctl", badge: "NAT & Firewall" },
        { id: 6, name: "Практика 6: GRE-туннель и OSPF (FRR)", badge: "GRE & OSPF" },
        { id: 7, name: "Практика 7: DHCP-сервер (dnsmasq)", badge: "DHCP" },
        { id: 8, name: "Практика 8: DNS-сервер и SSH (порт 2026)", badge: "DNS & SSH" }
    ],

    // 5. Задания тренажёра команд (для интерактивной консоли)
    commandTasks: [
        {
                "id": "cmd_2_1",
                "topicId": 2,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Задайте полное доменное имя (FQDN) isp.au-team.irpo на виртуальной машине ISP с перезапуском сессии bash",
                "correctAnswers": [
                        "hostnamectl set-hostname isp.au-team.irpo; exec bash",
                        "hostnamectl set-hostname isp.au-team.irpo && exec bash",
                        "hostnamectl set-hostname isp.au-team.irpo"
                ],
                "hint1": "Подумайте, какая встроенная утилита systemd отвечает за управление статическим сетевым именем хоста в современных дистрибутивах Linux.",
                "hint2": "Шаблон синтаксиса: команда set-hostname <полное_имя_машины.домен>; exec bash",
                "explanation": "hostnamectl set-hostname записывает FQDN в /etc/hostname и применяет его немедленно, а exec bash обновляет переменные оболочки."
        },
        {
                "id": "cmd_2_2",
                "topicId": 2,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Задайте FQDN hq-rtr.au-team.irpo на маршрутизаторе HQ-RTR с перезапуском bash",
                "correctAnswers": [
                        "hostnamectl set-hostname hq-rtr.au-team.irpo; exec bash",
                        "hostnamectl set-hostname hq-rtr.au-team.irpo && exec bash",
                        "hostnamectl set-hostname hq-rtr.au-team.irpo"
                ],
                "hint1": "Используется та же утилита управления именем хоста, что и на ISP, но указывается имя маршрутизатора HQ.",
                "hint2": "Формат вызова: команда set-hostname <имя_маршрутизатора.домен>; exec bash",
                "explanation": "Задаёт FQDN для главного маршрутизатора компании."
        },
        {
                "id": "cmd_2_3",
                "topicId": 2,
                "host": "br-rtr",
                "prompt": "root@br-rtr:~# ",
                "task": "Задайте FQDN br-rtr.au-team.irpo на маршрутизаторе филиала BR-RTR",
                "correctAnswers": [
                        "hostnamectl set-hostname br-rtr.au-team.irpo; exec bash",
                        "hostnamectl set-hostname br-rtr.au-team.irpo && exec bash",
                        "hostnamectl set-hostname br-rtr.au-team.irpo"
                ],
                "hint1": "Укажите доменное имя для маршрутизатора филиала Branch Router.",
                "hint2": "Формат: команда set-hostname <имя_хоста>; exec bash",
                "explanation": "Задаёт FQDN маршрутизатора филиала BR."
        },
        {
                "id": "cmd_2_4",
                "topicId": 2,
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "task": "Задайте FQDN hq-srv.au-team.irpo на сервере HQ-SRV",
                "correctAnswers": [
                        "hostnamectl set-hostname hq-srv.au-team.irpo; exec bash",
                        "hostnamectl set-hostname hq-srv.au-team.irpo && exec bash",
                        "hostnamectl set-hostname hq-srv.au-team.irpo"
                ],
                "hint1": "Используйте ту же команду управления hostname для сервера главного офиса.",
                "hint2": "Формат: команда set-hostname <имя_сервера.домен>; exec bash",
                "explanation": "Задаёт FQDN главного сервера."
        },
        {
                "id": "cmd_2_5",
                "topicId": 2,
                "host": "br-srv",
                "prompt": "root@br-srv:~# ",
                "task": "Задайте FQDN br-srv.au-team.irpo на сервере филиала BR-SRV",
                "correctAnswers": [
                        "hostnamectl set-hostname br-srv.au-team.irpo; exec bash",
                        "hostnamectl set-hostname br-srv.au-team.irpo && exec bash",
                        "hostnamectl set-hostname br-srv.au-team.irpo"
                ],
                "hint1": "Укажите доменное имя для сервера филиала.",
                "hint2": "Формат: команда set-hostname <имя_хоста>; exec bash",
                "explanation": "Задаёт FQDN сервера филиала."
        },
        {
                "id": "cmd_2_6",
                "topicId": 2,
                "host": "hq-cli",
                "prompt": "root@hq-cli:~# ",
                "task": "Задайте FQDN hq-cli.au-team.irpo на рабочей станции клиента HQ-CLI",
                "correctAnswers": [
                        "hostnamectl set-hostname hq-cli.au-team.irpo; exec bash",
                        "hostnamectl set-hostname hq-cli.au-team.irpo && exec bash",
                        "hostnamectl set-hostname hq-cli.au-team.irpo"
                ],
                "hint1": "Имя хоста клиента главного офиса в доменной зоне стенда.",
                "hint2": "Формат: команда set-hostname <имя_хоста>; exec bash",
                "explanation": "Задаёт FQDN клиентской машины."
        },
        {
                "id": "cmd_2_7",
                "topicId": 2,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Проверьте текущее полное доменное имя (FQDN) машины с помощью утилиты hostname",
                "correctAnswers": [
                        "hostname -f",
                        "hostname --fqdn"
                ],
                "hint1": "Вспомните специальный короткий ключ утилиты hostname для вывода именно полного имени (full/fqdn).",
                "hint2": "Синтаксис: hostname -<буква_ключа>",
                "explanation": "Флаг -f (или --fqdn) заставляет команду вернуть полное доменное имя вместо короткого."
        },
        {
                "id": "cmd_2_8",
                "topicId": 2,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Обновите кэш списков пакетов в пакетном менеджере ОС «Альт»",
                "correctAnswers": [
                        "apt-get update"
                ],
                "hint1": "В ОС «Альт» используется классический пакетный менеджер из семейства APT.",
                "hint2": "Синтаксис: apt-... update",
                "explanation": "apt-get update синхронизирует локальные индексные файлы с удалёнными репозиториями пакетов."
        },
        {
                "id": "cmd_2_9",
                "topicId": 2,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Установите пакет данных о часовых поясах (tzdata) с автоподтверждением (-y)",
                "correctAnswers": [
                        "apt-get install tzdata -y",
                        "apt-get install -y tzdata"
                ],
                "hint1": "В минимальных сборках Альт JeOS базы часовых поясов нет, требуется установить пакет с именем tzdata.",
                "hint2": "Синтаксис: apt-... install <имя_пакета> -y",
                "explanation": "Пакет tzdata содержит файлы зон временных поясов в каталоге /usr/share/zoneinfo/."
        },
        {
                "id": "cmd_2_10",
                "topicId": 2,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Установите часовой пояс Барнаула (Asia/Barnaul) через утилиту timedatectl",
                "correctAnswers": [
                        "timedatectl set-timezone Asia/Barnaul"
                ],
                "hint1": "Вспомните команду управления системными часами и её подкоманду для смены таймзоны.",
                "hint2": "Синтаксис: утилита set-timezone <Регион/Город>",
                "explanation": "timedatectl set-timezone перенаправляет симлинк /etc/localtime на выбранную зону."
        },
        {
                "id": "cmd_2_11",
                "topicId": 2,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Проверьте статус времени, таймзоны и синхронизации часов",
                "correctAnswers": [
                        "timedatectl status",
                        "timedatectl"
                ],
                "hint1": "Используется та же утилита управления временем без параметров или со словом status.",
                "hint2": "Синтаксис: утилита [status]",
                "explanation": "timedatectl выводит детальный отчет: локальное время, время UTC, смещение часового пояса и NTP."
        },
        {
                "id": "cmd_2_12",
                "topicId": 2,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Выполните комбинированную команду для вывода имени хоста и строки Time zone",
                "correctAnswers": [
                        "echo \"=== $(hostname -f) ===\" && timedatectl | grep \"Time zone\"",
                        "echo '=== $(hostname -f) ===' && timedatectl | grep 'Time zone'"
                ],
                "hint1": "Команда состоит из вывода имени машины через echo и фильтрации вывода timedatectl через grep.",
                "hint2": "Шаблон: echo '=== $(команда) ===' && утилита | grep 'искомая_строка'",
                "explanation": "Удобная связка из методички для быстрой проверки всех машин перед сдачей этапа."
        },
        {
                "id": "cmd_3_1",
                "topicId": 3,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Выведите компактный цветной список всех сетевых интерфейсов и назначенных IP-адресов",
                "correctAnswers": [
                        "ip -br -c a",
                        "ip -br -c addr",
                        "ip -br a",
                        "ip a"
                ],
                "hint1": "Подумайте, какие флаги утилиты ip сокращают вывод до краткой сводки (-br = brief) и раскрашивают статусы UP/DOWN (-c = color).",
                "hint2": "Синтаксис: ip -<краткий_флаг> -<цветной_флаг> a",
                "explanation": "ip -br -c a — самая информативная и быстрая команда для диагностики интерфейсов в Linux."
        },
        {
                "id": "cmd_3_2",
                "topicId": 3,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Скопируйте конфигурационный каталог интерфейса enp7s1 в enp7s2 для настройки линка к HQ",
                "correctAnswers": [
                        "cp -r /etc/net/ifaces/enp7s1 /etc/net/ifaces/enp7s2",
                        "cp -r enp7s1 enp7s2"
                ],
                "hint1": "В подсистеме /etc/net новые интерфейсы создаются рекурсивным копированием существующего каталога интерфейса.",
                "hint2": "Синтаксис: cp -r <путь_к_исходной_папке> <путь_к_новой_папке>",
                "explanation": "Копирует базовые файлы options и правила для нового сетевого адаптера."
        },
        {
                "id": "cmd_3_3",
                "topicId": 3,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Назначьте статический IP-адрес 172.16.1.1/28 интерфейсу enp7s2 на ISP через файл ipv4address",
                "correctAnswers": [
                        "echo '172.16.1.1/28' > /etc/net/ifaces/enp7s2/ipv4address",
                        "echo 172.16.1.1/28 > /etc/net/ifaces/enp7s2/ipv4address"
                ],
                "hint1": "В Альте адреса не пишутся в один общий конфиг, а записываются прямо в файл ipv4address внутри каталога нужного интерфейса.",
                "hint2": "Синтаксис: echo '<IP/префикс>' > /etc/net/ifaces/<имя_интерфейса>/ipv4address",
                "explanation": "Записывает адрес интерфейса в сторону главного офиса HQ."
        },
        {
                "id": "cmd_3_4",
                "topicId": 3,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Скопируйте каталог интерфейса enp7s1 в enp7s3 для настройки линка к филиалу BR",
                "correctAnswers": [
                        "cp -r /etc/net/ifaces/enp7s1 /etc/net/ifaces/enp7s3",
                        "cp -r enp7s1 enp7s3"
                ],
                "hint1": "Рекурсивное копирование каталога сетевого интерфейса средствами cp.",
                "hint2": "Синтаксис: cp -r <откуда> <куда>",
                "explanation": "Создает каталог для третьего физического адаптера на ISP."
        },
        {
                "id": "cmd_3_5",
                "topicId": 3,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Назначьте IP-адрес 172.16.2.1/28 интерфейсу enp7s3 на ISP",
                "correctAnswers": [
                        "echo '172.16.2.1/28' > /etc/net/ifaces/enp7s3/ipv4address",
                        "echo 172.16.2.1/28 > /etc/net/ifaces/enp7s3/ipv4address"
                ],
                "hint1": "Запишите IP-адрес интерфейса в сторону филиала в соответствующий файл ipv4address.",
                "hint2": "Синтаксис: echo '<адрес/маска>' > /etc/net/ifaces/<интерфейс>/ipv4address",
                "explanation": "Задает адрес линка в сторону филиала (BR)."
        },
        {
                "id": "cmd_3_6",
                "topicId": 3,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Перезапустите сетевую службу в ОС «Альт» через systemctl",
                "correctAnswers": [
                        "systemctl restart network",
                        "service network restart"
                ],
                "hint1": "Вспомните точное системное имя сетевого демона в ОС «Альт» (обратите внимание: не networking, не systemd-networkd).",
                "hint2": "Синтаксис: systemctl restart <имя_службы>",
                "explanation": "Служба network перезапускает подсистему /etc/net и перечитывает каталоги ifaces."
        },
        {
                "id": "cmd_3_7",
                "topicId": 3,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Назначьте IP-адрес 172.16.1.2/28 интерфейсу enp7s1 на маршрутизаторе HQ-RTR",
                "correctAnswers": [
                        "echo '172.16.1.2/28' > /etc/net/ifaces/enp7s1/ipv4address",
                        "echo 172.16.1.2/28 > /etc/net/ifaces/enp7s1/ipv4address"
                ],
                "hint1": "На стороне HQ-RTR интерфейс смотрит в сторону ISP.",
                "hint2": "Синтаксис: echo '<IP/маска>' > /etc/net/ifaces/enp7s1/ipv4address",
                "explanation": "Задаёт статический адрес внешнего линка HQ-RTR."
        },
        {
                "id": "cmd_3_8",
                "topicId": 3,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Укажите шлюз по умолчанию 172.16.1.1 для интерфейса enp7s1 в файле ipv4route",
                "correctAnswers": [
                        "echo 'default via 172.16.1.1' > /etc/net/ifaces/enp7s1/ipv4route",
                        "echo default via 172.16.1.1 > /etc/net/ifaces/enp7s1/ipv4route"
                ],
                "hint1": "В подсистеме /etc/net маршруты описываются в файле ipv4route синтаксисом ip route (default via IP).",
                "hint2": "Синтаксис: echo 'default via <IP_шлюза>' > /etc/net/ifaces/<интерфейс>/ipv4route",
                "explanation": "Направляет весь нелокальный трафик на провайдерский маршрутизатор ISP."
        },
        {
                "id": "cmd_3_9",
                "topicId": 3,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Пропишите публичный DNS-сервер Яндекса (77.88.8.8) в resolv.conf интерфейса enp7s1 на HQ-RTR",
                "correctAnswers": [
                        "echo 'nameserver 77.88.8.8' > /etc/net/ifaces/enp7s1/resolv.conf",
                        "echo nameserver 77.88.8.8 > /etc/net/ifaces/enp7s1/resolv.conf"
                ],
                "hint1": "В файле resolv.conf адрес DNS указывается после директивы nameserver.",
                "hint2": "Синтаксис: echo 'nameserver <IP_DNS>' > /etc/net/ifaces/<интерфейс>/resolv.conf",
                "explanation": "Необходимо для доступа к репозиториям пакетов до поднятия собственного DNS."
        },
        {
                "id": "cmd_3_10",
                "topicId": 3,
                "host": "br-rtr",
                "prompt": "root@br-rtr:~# ",
                "task": "Назначьте IP-адрес 172.16.2.2/28 интерфейсу enp7s1 на BR-RTR",
                "correctAnswers": [
                        "echo '172.16.2.2/28' > /etc/net/ifaces/enp7s1/ipv4address",
                        "echo 172.16.2.2/28 > /etc/net/ifaces/enp7s1/ipv4address"
                ],
                "hint1": "Задайте IP внешнего интерфейса филиала, смотрящего на ISP.",
                "hint2": "Синтаксис: echo '<IP/маска>' > /etc/net/ifaces/enp7s1/ipv4address",
                "explanation": "Назначает адрес внешнего линка маршрутизатора филиала."
        },
        {
                "id": "cmd_3_11",
                "topicId": 3,
                "host": "br-rtr",
                "prompt": "root@br-rtr:~# ",
                "task": "Укажите шлюз по умолчанию 172.16.2.1 для интерфейса enp7s1 на BR-RTR",
                "correctAnswers": [
                        "echo 'default via 172.16.2.1' > /etc/net/ifaces/enp7s1/ipv4route",
                        "echo default via 172.16.2.1 > /etc/net/ifaces/enp7s1/ipv4route"
                ],
                "hint1": "Шлюзом для филиала выступает IP-адрес интерфейса enp7s3 на ISP.",
                "hint2": "Синтаксис: echo 'default via <IP>' > .../ipv4route",
                "explanation": "Задаёт шлюз выхода во внешнюю сеть для филиала."
        },
        {
                "id": "cmd_3_12",
                "topicId": 3,
                "host": "br-rtr",
                "prompt": "root@br-rtr:~# ",
                "task": "Назначьте локальный IP 192.168.3.1/28 интерфейсу enp7s2 (в сторону BR-SRV) на BR-RTR",
                "correctAnswers": [
                        "echo '192.168.3.1/28' > /etc/net/ifaces/enp7s2/ipv4address",
                        "echo 192.168.3.1/28 > /etc/net/ifaces/enp7s2/ipv4address"
                ],
                "hint1": "Задайте IP внутреннего интерфейса маршрутизатора филиала, к которому подключен сервер BR-SRV.",
                "hint2": "Синтаксис: echo '<адрес/маска>' > /etc/net/ifaces/enp7s2/ipv4address",
                "explanation": "Шлюз локальной сети филиала BR."
        },
        {
                "id": "cmd_3_13",
                "topicId": 3,
                "host": "br-srv",
                "prompt": "root@br-srv:~# ",
                "task": "Назначьте IP-адрес 192.168.3.2/28 интерфейсу enp0s3 на сервере филиала BR-SRV",
                "correctAnswers": [
                        "echo '192.168.3.2/28' > /etc/net/ifaces/enp0s3/ipv4address",
                        "echo 192.168.3.2/28 > /etc/net/ifaces/enp0s3/ipv4address"
                ],
                "hint1": "Обратите внимание на имя сетевой карты сервера: в KVM/QEMU это enp0s3.",
                "hint2": "Синтаксис: echo '<IP/маска>' > /etc/net/ifaces/enp0s3/ipv4address",
                "explanation": "Назначает статический IP серверу филиала."
        },
        {
                "id": "cmd_3_14",
                "topicId": 3,
                "host": "br-srv",
                "prompt": "root@br-srv:~# ",
                "task": "Укажите шлюз по умолчанию 192.168.3.1 на интерфейсе enp0s3 сервера BR-SRV",
                "correctAnswers": [
                        "echo 'default via 192.168.3.1' > /etc/net/ifaces/enp0s3/ipv4route",
                        "echo default via 192.168.3.1 > /etc/net/ifaces/enp0s3/ipv4route"
                ],
                "hint1": "Шлюзом для BR-SRV является локальный интерфейс маршрутизатора BR-RTR.",
                "hint2": "Синтаксис: echo 'default via <IP>' > .../ipv4route",
                "explanation": "Задаёт маршрут к шлюзу филиала."
        },
        {
                "id": "cmd_3_15",
                "topicId": 3,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Проверьте связность от ISP до HQ-RTR (172.16.1.2), отправив ровно 3 пакета",
                "correctAnswers": [
                        "ping -c 3 172.16.1.2"
                ],
                "hint1": "Используйте стандартную утилиту ICMP проверки связности с ограничителем числа пакетов.",
                "hint2": "Синтаксис: ping -c <число> <целевой_IP>",
                "explanation": "Проверяет физическую и L3-связность провайдерского линка к HQ."
        },
        {
                "id": "cmd_3_16",
                "topicId": 3,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Проверьте связность от ISP до BR-RTR (172.16.2.2), отправив ровно 3 пакета",
                "correctAnswers": [
                        "ping -c 3 172.16.2.2"
                ],
                "hint1": "Проверка пинга в сторону маршрутизатора филиала.",
                "hint2": "Синтаксис: ping -c 3 <IP>",
                "explanation": "Проверяет линк провайдера к филиалу."
        },
        {
                "id": "cmd_4_1",
                "topicId": 4,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Создайте директорию сабинтерфейса VLAN 100 (enp7s2.100), скопировав шаблон enp7s1",
                "correctAnswers": [
                        "cp -r /etc/net/ifaces/enp7s1 /etc/net/ifaces/enp7s2.100",
                        "cp -r enp7s1 enp7s2.100"
                ],
                "hint1": "В Альте имя каталога VLAN формируется как <имя_базового_интерфейса>.<номер_vlan>.",
                "hint2": "Синтаксис: cp -r .../enp7s1 .../enp7s2.<номер_vlan>",
                "explanation": "Создает каталог подинтерфейса тегированного трафика VLAN 100."
        },
        {
                "id": "cmd_4_2",
                "topicId": 4,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Создайте директорию сабинтерфейса VLAN 200 (enp7s2.200) для клиентов",
                "correctAnswers": [
                        "cp -r /etc/net/ifaces/enp7s1 /etc/net/ifaces/enp7s2.200",
                        "cp -r enp7s1 enp7s2.200"
                ],
                "hint1": "Копирование каталога сетевого интерфейса для клиентского сегмента VLAN 200.",
                "hint2": "Синтаксис: cp -r .../enp7s1 .../enp7s2.200",
                "explanation": "Создает каталог подинтерфейса VLAN 200 на HQ-RTR."
        },
        {
                "id": "cmd_4_3",
                "topicId": 4,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Создайте директорию сабинтерфейса VLAN 999 (enp7s2.999) для сегмента управления",
                "correctAnswers": [
                        "cp -r /etc/net/ifaces/enp7s1 /etc/net/ifaces/enp7s2.999",
                        "cp -r enp7s1 enp7s2.999"
                ],
                "hint1": "Сегмент управления стендом (Management) согласно таблице адресации вынесен в VLAN 999.",
                "hint2": "Синтаксис: cp -r .../enp7s1 .../enp7s2.999",
                "explanation": "Создает подинтерфейс управления."
        },
        {
                "id": "cmd_4_4",
                "topicId": 4,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Назначьте IP-адрес 192.168.1.1/27 интерфейсу VLAN 100 (enp7s2.100)",
                "correctAnswers": [
                        "echo '192.168.1.1/27' > /etc/net/ifaces/enp7s2.100/ipv4address",
                        "echo 192.168.1.1/27 > /etc/net/ifaces/enp7s2.100/ipv4address"
                ],
                "hint1": "Шлюз серверного сегмента с маской /27 (сеть серверов).",
                "hint2": "Синтаксис: echo '<IP/маска>' > /etc/net/ifaces/enp7s2.100/ipv4address",
                "explanation": "Назначает адрес шлюза для VLAN 100."
        },
        {
                "id": "cmd_4_5",
                "topicId": 4,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Назначьте IP-адрес 192.168.2.1/28 интерфейсу клиентского VLAN 200 (enp7s2.200)",
                "correctAnswers": [
                        "echo '192.168.2.1/28' > /etc/net/ifaces/enp7s2.200/ipv4address",
                        "echo 192.168.2.1/28 > /etc/net/ifaces/enp7s2.200/ipv4address"
                ],
                "hint1": "Шлюз клиентского сегмента с маской /28.",
                "hint2": "Синтаксис: echo '<IP/маска>' > /etc/net/ifaces/enp7s2.200/ipv4address",
                "explanation": "Назначает адрес шлюза для клиентских ПК (VLAN 200)."
        },
        {
                "id": "cmd_4_6",
                "topicId": 4,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Назначьте IP-адрес 192.168.99.1/29 интерфейсу управления VLAN 999 (enp7s2.999)",
                "correctAnswers": [
                        "echo '192.168.99.1/29' > /etc/net/ifaces/enp7s2.999/ipv4address",
                        "echo 192.168.99.1/29 > /etc/net/ifaces/enp7s2.999/ipv4address"
                ],
                "hint1": "Шлюз сегмента управления сетью с маской /29.",
                "hint2": "Синтаксис: echo '<IP/маска>' > /etc/net/ifaces/enp7s2.999/ipv4address",
                "explanation": "Задаёт IP для VLAN управления."
        },
        {
                "id": "cmd_4_7",
                "topicId": 4,
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "task": "На сервере HQ-SRV создайте каталог интерфейса VLAN 100 (enp0s3.100), скопировав enp0s3",
                "correctAnswers": [
                        "cp -r /etc/net/ifaces/enp0s3 /etc/net/ifaces/enp0s3.100",
                        "cp -r enp0s3 enp0s3.100"
                ],
                "hint1": "На виртуальном сервере сетевая карта называется enp0s3. Сформируйте имя сабинтерфейса с тегом 100.",
                "hint2": "Синтаксис: cp -r .../enp0s3 .../enp0s3.100",
                "explanation": "Создает каталог VLAN 100 на сервере."
        },
        {
                "id": "cmd_4_8",
                "topicId": 4,
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "task": "Назначьте статический IP 192.168.1.2/27 интерфейсу enp0s3.100 на сервере HQ-SRV",
                "correctAnswers": [
                        "echo '192.168.1.2/27' > /etc/net/ifaces/enp0s3.100/ipv4address",
                        "echo 192.168.1.2/27 > /etc/net/ifaces/enp0s3.100/ipv4address"
                ],
                "hint1": "Сервер находится в сети 192.168.1.0/27 и получает второй доступный адрес хоста.",
                "hint2": "Синтаксис: echo '<адрес/маска>' > /etc/net/ifaces/enp0s3.100/ipv4address",
                "explanation": "Назначает статический адрес серверу HQ-SRV."
        },
        {
                "id": "cmd_4_9",
                "topicId": 4,
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "task": "Задайте маршрут по умолчанию через шлюз HQ-RTR (192.168.1.1) на интерфейсе enp0s3.100",
                "correctAnswers": [
                        "echo 'default via 192.168.1.1' > /etc/net/ifaces/enp0s3.100/ipv4route",
                        "echo default via 192.168.1.1 > /etc/net/ifaces/enp0s3.100/ipv4route"
                ],
                "hint1": "Весь исходящий трафик сервера должен направляться на IP-адрес подинтерфейса маршрутизатора в этом же VLAN.",
                "hint2": "Синтаксис: echo 'default via <IP_шлюза_VLAN>' > .../ipv4route",
                "explanation": "Направляет пакеты сервера через шлюз HQ-RTR."
        },
        {
                "id": "cmd_4_10",
                "topicId": 4,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Проверьте пинг с маршрутизатора HQ-RTR до сервера HQ-SRV (192.168.1.2), отправив 3 пакета",
                "correctAnswers": [
                        "ping -c 3 192.168.1.2"
                ],
                "hint1": "Проверка сквозной связности внутри VLAN 100.",
                "hint2": "Синтаксис: ping -c 3 <IP_сервера>",
                "explanation": "Подтверждает корректную работу 802.1Q тегирования между RTR и SRV."
        },
        {
                "id": "cmd_5_1",
                "topicId": 5,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Проверьте текущее значение параметра ядра net.ipv4.ip_forward с помощью утилиты sysctl",
                "correctAnswers": [
                        "sysctl net.ipv4.ip_forward",
                        "cat /proc/sys/net/ipv4/ip_forward"
                ],
                "hint1": "Вспомните команду управления динамическими параметрами ядра Linux подсистемы /proc/sys/.",
                "hint2": "Синтаксис: sysctl net.ipv4.<имя_параметра>",
                "explanation": "Значение 1 означает включенный режим программного маршрутизатора."
        },
        {
                "id": "cmd_5_2",
                "topicId": 5,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Включите форвардинг IPv4-пакетов немедленно в работающем ядре через sysctl -w",
                "correctAnswers": [
                        "sysctl -w net.ipv4.ip_forward=1",
                        "sysctl -w net.ipv4.ip_forward = 1",
                        "echo 1 > /proc/sys/net/ipv4/ip_forward"
                ],
                "hint1": "Ключ -w утилиты sysctl производит запись (write) нового значения параметра в память ядра.",
                "hint2": "Синтаксис: sysctl -w net.ipv4.ip_forward=<значение>",
                "explanation": "Немедленно разрешает транзит пакетов между интерфейсами без перезагрузки."
        },
        {
                "id": "cmd_5_3",
                "topicId": 5,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Установите утилиту управления межсетевым экраном iptables",
                "correctAnswers": [
                        "apt-get install iptables -y",
                        "apt-get install -y iptables"
                ],
                "hint1": "В минимальном дистрибутиве Альт JeOS пакет iptables по умолчанию отсутствует.",
                "hint2": "Синтаксис: apt-get install <имя_пакета> -y",
                "explanation": "Устанавливает утилиту для настройки правил таблиц фильтрации и трансляции адресов."
        },
        {
                "id": "cmd_5_4",
                "topicId": 5,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Добавьте правило MASQUERADE для NAT на внешнем интерфейсе enp7s1 на ISP",
                "correctAnswers": [
                        "iptables -t nat -A POSTROUTING -o enp7s1 -j MASQUERADE"
                ],
                "hint1": "Подумайте: какая таблица отвечает за трансляцию адресов (-t), в какую цепочку попадают исходящие пакеты (-A), и какое действие (-j) подменяет адрес.",
                "hint2": "Синтаксис: iptables -t nat -A POSTROUTING -o <внешний_интерфейс> -j MASQUERADE",
                "explanation": "Включает динамический SNAT (маскировку) для всех исходящих во внешнюю сеть пакетов."
        },
        {
                "id": "cmd_5_5",
                "topicId": 5,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Выведите список всех правил таблицы NAT утилитой iptables",
                "correctAnswers": [
                        "iptables -t nat -L",
                        "iptables -t nat -vnL",
                        "iptables -t nat -S"
                ],
                "hint1": "Для вывода списка правил используется ключ -L (list) с явным указанием таблицы nat.",
                "hint2": "Синтаксис: iptables -t nat -<ключ_вывода>",
                "explanation": "Показывает правила в цепочках PREROUTING, INPUT, OUTPUT, POSTROUTING."
        },
        {
                "id": "cmd_5_6",
                "topicId": 5,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Сохраните текущие правила iptables в файл /root/iptables_rules",
                "correctAnswers": [
                        "iptables-save > /root/iptables_rules"
                ],
                "hint1": "Вспомните штатную утилиту дампа правил iptables и перенаправление вывода в файл.",
                "hint2": "Синтаксис: утилита-save > <путь_к_файлу>",
                "explanation": "Создает текстовый дамп всех активных правил файрвола."
        },
        {
                "id": "cmd_5_7",
                "topicId": 5,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "На маршрутизаторе HQ-RTR добавьте правило MASQUERADE для внешнего интерфейса enp7s1",
                "correctAnswers": [
                        "iptables -t nat -A POSTROUTING -o enp7s1 -j MASQUERADE"
                ],
                "hint1": "Правило аналогично провайдерскому, транслирует трафик локальных сетей головного офиса наружу.",
                "hint2": "Синтаксис: iptables -t nat -A POSTROUTING -o enp7s1 -j ...",
                "explanation": "Позволяет внутренним VLAN выходить в интернет через шлюз HQ."
        },
        {
                "id": "cmd_5_8",
                "topicId": 5,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Проверьте выход в глобальный Интернет, отправив 3 пинга на ya.ru с HQ-RTR",
                "correctAnswers": [
                        "ping -c 3 ya.ru",
                        "ping -c 3 yandex.ru"
                ],
                "hint1": "Проверка сквозного прохождения пакетов через NAT маршрутизатора ISP в реальную сеть.",
                "hint2": "Синтаксис: ping -c 3 <доменное_имя>",
                "explanation": "Подтверждает корректную работу NAT и форвардинга."
        },
        {
                "id": "cmd_6_1",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Создайте директорию интерфейса для GRE-туннеля gre1 в подсистеме /etc/net",
                "correctAnswers": [
                        "mkdir /etc/net/ifaces/gre1",
                        "mkdir -p /etc/net/ifaces/gre1"
                ],
                "hint1": "Для туннелей в /etc/net создаётся отдельный каталог точно так же, как для физических интерфейсов.",
                "hint2": "Синтаксис: mkdir /etc/net/ifaces/<имя_туннеля>",
                "explanation": "Создает каталог для параметров туннельного адаптера gre1."
        },
        {
                "id": "cmd_6_2",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Назначьте IP-адрес 10.0.0.1/30 туннельному интерфейсу gre1 на HQ-RTR",
                "correctAnswers": [
                        "echo '10.0.0.1/30' > /etc/net/ifaces/gre1/ipv4address",
                        "echo 10.0.0.1/30 > /etc/net/ifaces/gre1/ipv4address"
                ],
                "hint1": "Запишите адрес туннельной подсети point-to-point /30 в файл ipv4address туннеля.",
                "hint2": "Синтаксис: echo '<IP/маска>' > /etc/net/ifaces/gre1/ipv4address",
                "explanation": "Назначает адрес локальной стороны туннеля."
        },
        {
                "id": "cmd_6_3",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Поднимите созданный туннельный интерфейс gre1 с помощью утилиты ifup",
                "correctAnswers": [
                        "ifup gre1"
                ],
                "hint1": "Вспомните команду для немедленной активации сетевого интерфейса в Альте без перезапуска всей сети.",
                "hint2": "Синтаксис: if... <имя_интерфейса>",
                "explanation": "Инициализирует ядром виртуальный туннель gre1."
        },
        {
                "id": "cmd_6_4",
                "topicId": 6,
                "host": "br-rtr",
                "prompt": "root@br-rtr:~# ",
                "task": "Назначьте IP-адрес 10.0.0.2/30 интерфейсу gre1 на маршрутизаторе филиала BR-RTR",
                "correctAnswers": [
                        "echo '10.0.0.2/30' > /etc/net/ifaces/gre1/ipv4address",
                        "echo 10.0.0.2/30 > /etc/net/ifaces/gre1/ipv4address"
                ],
                "hint1": "Удалённая сторона туннеля в подсети 10.0.0.0/30 получает адрес .2.",
                "hint2": "Синтаксис: echo '<IP/маска>' > /etc/net/ifaces/gre1/ipv4address",
                "explanation": "Задает адрес удалённого конца туннеля."
        },
        {
                "id": "cmd_6_5",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Проверьте связность по туннелю, отправив 3 пинга с HQ-RTR на IP 10.0.0.2 (BR-RTR)",
                "correctAnswers": [
                        "ping -c 3 10.0.0.2"
                ],
                "hint1": "Пинг удалённого внутреннего IP туннеля GRE.",
                "hint2": "Синтаксис: ping -c 3 <IP_туннеля_BR>",
                "explanation": "Проверяет инкапсуляцию и прохождение трафика внутри GRE-туннеля."
        },
        {
                "id": "cmd_6_6",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Установите пакет динамической маршрутизации frr (FRRouting)",
                "correctAnswers": [
                        "apt-get install frr -y",
                        "apt-get install -y frr"
                ],
                "hint1": "Стек протоколов динамической маршрутизации в современных дистрибутивах (замена Quagga).",
                "hint2": "Синтаксис: apt-get install <имя_пакета> -y",
                "explanation": "Устанавливает демоны zebra, ospfd, bgpd и утилиту vtysh."
        },
        {
                "id": "cmd_6_7",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Перезапустите службу маршрутизации frr через systemctl",
                "correctAnswers": [
                        "systemctl restart frr",
                        "service frr restart"
                ],
                "hint1": "После включения демона ospfd=yes в /etc/frr/daemons необходимо перезапустить сервис.",
                "hint2": "Синтаксис: systemctl restart <имя_службы>",
                "explanation": "Запускает процесс ospfd."
        },
        {
                "id": "cmd_6_8",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Войдите в объединенную консоль маршрутизатора FRR (vtysh)",
                "correctAnswers": [
                        "vtysh"
                ],
                "hint1": "Вспомните команду запуска единой CLI-оболочки FRRouting.",
                "hint2": "Синтаксис: vt...",
                "explanation": "Открывает Cisco-подобный командный интерфейс управления протоколами маршрутизации."
        },
        {
                "id": "cmd_6_9",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "hq-rtr# ",
                "task": "Перейдите в режим глобальной конфигурации в консоли vtysh",
                "correctAnswers": [
                        "conf t",
                        "configure terminal"
                ],
                "hint1": "Стандартная команда входа в конфигурационный режим в Cisco IOS и FRR.",
                "hint2": "Синтаксис: conf ... (или configure terminal)",
                "explanation": "Меняет приглашение на hq-rtr(config)#."
        },
        {
                "id": "cmd_6_10",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "hq-rtr(config)# ",
                "task": "Включите режим настройки протокола OSPF в vtysh",
                "correctAnswers": [
                        "router ospf"
                ],
                "hint1": "Команда запуска процесса OSPF маршрутизации.",
                "hint2": "Синтаксис: router <протокол>",
                "explanation": "Переводит терминал в контекст настройки параметров OSPF."
        },
        {
                "id": "cmd_6_11",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "hq-rtr(config-router)# ",
                "task": "Анонсируйте сеть GRE-туннеля 10.0.0.0/30 в магистральную зону area 0",
                "correctAnswers": [
                        "network 10.0.0.0/30 area 0"
                ],
                "hint1": "Директива network объявляет подсеть и привязывает её к номеру зоны.",
                "hint2": "Синтаксис: network <подсеть/маска> area <номер_зоны>",
                "explanation": "Включает рассылку OSPF Hello-пакетов через интерфейс туннеля."
        },
        {
                "id": "cmd_6_12",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "hq-rtr(config-router)# ",
                "task": "Анонсируйте серверную сеть 192.168.1.0/27 в зону area 0",
                "correctAnswers": [
                        "network 192.168.1.0/27 area 0"
                ],
                "hint1": "Анонсирование префикса серверного сегмента VLAN 100.",
                "hint2": "Синтаксис: network <подсеть> area 0",
                "explanation": "Передает маршрут к серверам HQ маршрутизатору филиала."
        },
        {
                "id": "cmd_6_13",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "hq-rtr(config)# ",
                "task": "Перейдите к настройке интерфейса gre1 в vtysh",
                "correctAnswers": [
                        "int gre1",
                        "interface gre1"
                ],
                "hint1": "Команда входа в контекст конкретного интерфейса.",
                "hint2": "Синтаксис: int <имя_интерфейса>",
                "explanation": "Переключает контекст на hq-rtr(config-if)#."
        },
        {
                "id": "cmd_6_14",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "hq-rtr(config-if)# ",
                "task": "Включите аутентификацию сообщений message-digest для OSPF на интерфейсе gre1",
                "correctAnswers": [
                        "ip ospf authentication message-digest"
                ],
                "hint1": "Команда включает криптографическую проверку подлинности OSPF-пакетов вместо открытого текста.",
                "hint2": "Синтаксис: ip ospf authentication <тип_аутентификации>",
                "explanation": "Активирует алгоритм хеширования пакетов OSPF."
        },
        {
                "id": "cmd_6_15",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "hq-rtr(config-if)# ",
                "task": "Задайте MD5 ключ 1 с паролем 123qweR% на интерфейсе туннеля",
                "correctAnswers": [
                        "ip ospf message-digest-key 1 md5 123qweR%"
                ],
                "hint1": "Вспомните команду задания номера ключа, алгоритма md5 и секретной строки.",
                "hint2": "Синтаксис: ip ospf message-digest-key <номер> md5 <пароль>",
                "explanation": "Задает секретный ключ, который должен совпадать на обоих концах туннеля."
        },
        {
                "id": "cmd_6_16",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "hq-rtr(config)# ",
                "task": "Сохраните активную конфигурацию FRR в энергонезависимую память",
                "correctAnswers": [
                        "do wr mem",
                        "write memory",
                        "do write memory",
                        "wr mem"
                ],
                "hint1": "В Cisco/FRR команда сохранения конфигурации — write memory (с приставкой do из режима config).",
                "hint2": "Синтаксис: do wr mem",
                "explanation": "Записывает изменения в файл /etc/frr/frr.conf."
        },
        {
                "id": "cmd_6_17",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Просмотрите таблицу соседей OSPF из bash одной командой через vtysh -c",
                "correctAnswers": [
                        "vtysh -c \"show ip ospf neighbor\"",
                        "vtysh -c 'show ip ospf neighbor'"
                ],
                "hint1": "Используйте ключ -c утилиты vtysh для передачи внутренней команды show ip ospf neighbor.",
                "hint2": "Синтаксис: vtysh -c \"команда_vtysh\"",
                "explanation": "Выводит статус соседа 10.0.0.2 (состояние должно быть Full)."
        },
        {
                "id": "cmd_6_18",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Выведите только OSPF-маршруты из таблицы маршрутизации через vtysh",
                "correctAnswers": [
                        "vtysh -c \"show ip route ospf\"",
                        "vtysh -c 'show ip route ospf'"
                ],
                "hint1": "Команда show ip route с уточнением конкретного протокола маршрутизации ospf.",
                "hint2": "Синтаксис: vtysh -c \"show ip route <протокол>\"",
                "explanation": "Показывает полученный от филиала маршрут к сети 192.168.3.0/28."
        },
        {
                "id": "cmd_6_19",
                "topicId": 6,
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "task": "Проверьте сквозную связность от сервера HQ-SRV до сервера филиала BR-SRV (192.168.3.2)",
                "correctAnswers": [
                        "ping -c 3 192.168.3.2"
                ],
                "hint1": "Пакеты должны пройти через VLAN 100 -> GRE-туннель -> OSPF -> LAN филиала.",
                "hint2": "Синтаксис: ping -c 3 <IP_сервера_филиала>",
                "explanation": "Подтверждает полную сквозную маршрутизацию между главным офисом и филиалом."
        },
        {
                "id": "cmd_7_1",
                "topicId": 7,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Установите комбинированный сервис dnsmasq на маршрутизаторе HQ-RTR",
                "correctAnswers": [
                        "apt-get install dnsmasq -y",
                        "apt-get install -y dnsmasq"
                ],
                "hint1": "dnsmasq сочетает легкий DHCP и кэширующий DNS сервер.",
                "hint2": "Синтаксис: apt-get install <имя_пакета> -y",
                "explanation": "Устанавливает пакет dnsmasq."
        },
        {
                "id": "cmd_7_2",
                "topicId": 7,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Перезапустите службу dnsmasq на HQ-RTR для применения настроек пула DHCP",
                "correctAnswers": [
                        "systemctl restart dnsmasq",
                        "service dnsmasq restart"
                ],
                "hint1": "Вспомните стандартную команду перезапуска сервиса в systemd.",
                "hint2": "Синтаксис: systemctl restart <служба>",
                "explanation": "Применяет параметры из /etc/dnsmasq.conf."
        },
        {
                "id": "cmd_7_3",
                "topicId": 7,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Проверьте статус службы dnsmasq на HQ-RTR",
                "correctAnswers": [
                        "systemctl status dnsmasq",
                        "service dnsmasq status"
                ],
                "hint1": "Команда проверки состояния демона (active / running).",
                "hint2": "Синтаксис: systemctl status <служба>",
                "explanation": "Показывает активность процесса DHCP-сервера."
        },
        {
                "id": "cmd_7_4",
                "topicId": 7,
                "host": "hq-cli",
                "prompt": "root@hq-cli:~# ",
                "task": "На клиенте HQ-CLI освободите текущую аренду IP-адреса с помощью dhclient -r",
                "correctAnswers": [
                        "dhclient -r",
                        "dhclient -r enp0s3.200",
                        "dhclient -r enp7s1.200"
                ],
                "hint1": "Флаг -r (release) утилиты dhclient отправляет серверу пакет освобождения адреса.",
                "hint2": "Синтаксис: dhclient -<флаг_освобождения>",
                "explanation": "Очищает текущие выданные сервером параметры сети."
        },
        {
                "id": "cmd_7_5",
                "topicId": 7,
                "host": "hq-cli",
                "prompt": "root@hq-cli:~# ",
                "task": "Запросите новый IP-адрес по DHCP на интерфейсе enp0s3.200",
                "correctAnswers": [
                        "dhclient enp0s3.200",
                        "dhclient"
                ],
                "hint1": "Вызовите клиент DHCP с указанием целевого сабинтерфейса VLAN 200.",
                "hint2": "Синтаксис: dhclient <имя_интерфейса>",
                "explanation": "Отправляет DHCPDISCOVER и получает IP из пула 192.168.2.2–2.14."
        },
        {
                "id": "cmd_7_6",
                "topicId": 7,
                "host": "hq-cli",
                "prompt": "root@hq-cli:~# ",
                "task": "Проверьте полученный IP-адрес на клиенте компактной командой ip -br -c a",
                "correctAnswers": [
                        "ip -br -c a",
                        "ip -br a",
                        "ip a"
                ],
                "hint1": "Компактный цветной вывод сетевых настроек хоста.",
                "hint2": "Синтаксис: ip -br -c a",
                "explanation": "Убеждаемся, что интерфейс enp0s3.200 получил динамический адрес."
        },
        {
                "id": "cmd_8_1",
                "topicId": 8,
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "task": "Установите пакет dnsmasq на сервере HQ-SRV",
                "correctAnswers": [
                        "apt-get install dnsmasq -y",
                        "apt-get install -y dnsmasq"
                ],
                "hint1": "На HQ-SRV dnsmasq будет выступать в качестве авторитетного DNS-сервера зоны au-team.irpo.",
                "hint2": "Синтаксис: apt-get install <пакет> -y",
                "explanation": "Устанавливает DNS-демон."
        },
        {
                "id": "cmd_8_2",
                "topicId": 8,
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "task": "Укажите локальный адрес 127.0.0.1 в resolv.conf интерфейса enp0s3.100 на сервере",
                "correctAnswers": [
                        "echo 'nameserver 127.0.0.1' > /etc/net/ifaces/enp0s3.100/resolv.conf",
                        "echo nameserver 127.0.0.1 > /etc/net/ifaces/enp0s3.100/resolv.conf"
                ],
                "hint1": "Чтобы сам сервер обращался к собственному локальному DNS-серверу (loopback).",
                "hint2": "Синтаксис: echo 'nameserver <loopback_IP>' > .../resolv.conf",
                "explanation": "Заставляет сервер резолвить имена через собственный dnsmasq."
        },
        {
                "id": "cmd_8_3",
                "topicId": 8,
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "task": "Перезапустите службу dnsmasq на сервере HQ-SRV",
                "correctAnswers": [
                        "systemctl restart dnsmasq",
                        "service dnsmasq restart"
                ],
                "hint1": "Перезапуск сервиса после добавления A и PTR записей в /etc/dnsmasq.conf.",
                "hint2": "Синтаксис: systemctl restart dnsmasq",
                "explanation": "Запускает DNS-сервер с записями корпоративной зоны."
        },
        {
                "id": "cmd_8_4",
                "topicId": 8,
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "task": "Проверьте утилитой ss, слушает ли dnsmasq входящий UDP-порт 53",
                "correctAnswers": [
                        "ss -ulnp | grep dnsmasq",
                        "ss -ulnp | grep 53",
                        "ss -unlp | grep dnsmasq"
                ],
                "hint1": "Вспомните флаги утилиты ss: -u (udp), -l (listening), -n (numeric), -p (processes).",
                "hint2": "Синтаксис: ss -ulnp | grep <имя_демона_или_порт>",
                "explanation": "Показывает прослушивание порта 53 на адресе 192.168.1.2."
        },
        {
                "id": "cmd_8_5",
                "topicId": 8,
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "task": "Проверьте разрешение прямой зоны DNS, отправив 3 пинга на hq-rtr.au-team.irpo",
                "correctAnswers": [
                        "ping -c 3 hq-rtr.au-team.irpo"
                ],
                "hint1": "Пинг узла по его FQDN-имени (A-запись должна разрешиться в 192.168.1.1).",
                "hint2": "Синтаксис: ping -c 3 <FQDN_маршрутизатора>",
                "explanation": "Подтверждает работу прямой зоны DNS на сервере."
        },
        {
                "id": "cmd_8_6",
                "topicId": 8,
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "task": "Проверьте обратную зону DNS (PTR): отправьте пинг на 192.168.1.1 и убедитесь в наличии имени",
                "correctAnswers": [
                        "ping -c 3 192.168.1.1"
                ],
                "hint1": "При пинге IP-адреса утилита ping отправляет PTR-запрос и подставляет доменное имя узла.",
                "hint2": "Синтаксис: ping -c 3 <IP>",
                "explanation": "В выводе ping будет видно resolved имя hq-rtr.au-team.irpo."
        },
        {
                "id": "cmd_8_7",
                "topicId": 8,
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "task": "Проверьте рекурсивное разрешение внешних адресов через forwarder 77.88.8.8 (пинг ya.ru)",
                "correctAnswers": [
                        "ping -c 3 ya.ru",
                        "ping -c 3 yandex.ru"
                ],
                "hint1": "Пинг внешнего домена через локальный DNS-сервер.",
                "hint2": "Синтаксис: ping -c 3 <публичный_домен>",
                "explanation": "Проверяет пересылку внешних запросов на Яндекс DNS."
        },
        {
                "id": "cmd_8_8",
                "topicId": 8,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Укажите IP нашего DNS-сервера (192.168.1.2) в resolv.conf внешнего интерфейса на HQ-RTR",
                "correctAnswers": [
                        "echo 'nameserver 192.168.1.2' > /etc/net/ifaces/enp7s1/resolv.conf",
                        "echo nameserver 192.168.1.2 > /etc/net/ifaces/enp7s1/resolv.conf"
                ],
                "hint1": "Маршрутизатор теперь должен использовать внутренний сервер HQ-SRV в качестве основного резолвера.",
                "hint2": "Синтаксис: echo 'nameserver <IP_DNS_сервера>' > .../resolv.conf",
                "explanation": "Переключает HQ-RTR на использование локального DNS."
        },
        {
                "id": "cmd_8_9",
                "topicId": 8,
                "host": "br-rtr",
                "prompt": "root@br-rtr:~# ",
                "task": "Укажите IP DNS-сервера (192.168.1.2) в resolv.conf на BR-RTR",
                "correctAnswers": [
                        "echo 'nameserver 192.168.1.2' > /etc/net/ifaces/enp7s1/resolv.conf",
                        "echo nameserver 192.168.1.2 > /etc/net/ifaces/enp7s1/resolv.conf"
                ],
                "hint1": "Маршрутизатор филиала обращается к DNS серверу через туннель GRE и OSPF.",
                "hint2": "Синтаксис: echo 'nameserver 192.168.1.2' > .../resolv.conf",
                "explanation": "Настраивает резолвер филиала."
        },
        {
                "id": "cmd_8_10",
                "topicId": 8,
                "host": "hq-cli",
                "prompt": "user@hq-cli:~$ ",
                "task": "На клиенте HQ-CLI проверьте содержимое файла /etc/resolv.conf",
                "correctAnswers": [
                        "cat /etc/resolv.conf",
                        "less /etc/resolv.conf"
                ],
                "hint1": "Проверка, что клиент получил адрес DNS-сервера 192.168.1.2 автоматически по опции 6 DHCP.",
                "hint2": "Синтаксис: cat /etc/resolv.conf",
                "explanation": "В файле должен отображаться nameserver 192.168.1.2."
        },
        {
                "id": "cmd_8_11",
                "topicId": 8,
                "host": "hq-cli",
                "prompt": "user@hq-cli:~$ ",
                "task": "Подключитесь с клиента по SSH к серверу HQ-SRV по домену hq-srv.au-team.irpo на порт 2026 под пользователем sshuser",
                "correctAnswers": [
                        "ssh sshuser@hq-srv.au-team.irpo -p 2026",
                        "ssh -p 2026 sshuser@hq-srv.au-team.irpo"
                ],
                "hint1": "Вспомните синтаксис SSH подключения: пользователь@хост и ключ указания нестандартного порта.",
                "hint2": "Синтаксис: ssh <пользователь>@<FQDN> -p <порт>",
                "explanation": "Финальная проверка связности: доменное имя разрешается через DNS, а SSH слушает на порту 2026."
        }
],

    // 6. Вопросы преподавателя при сдаче (с эталонными ответами)
    examQuestions: [
        {
            id: "q1",
            topicId: 2,
            question: "Что такое FQDN (Fully Qualified Domain Name) и почему в корпоративной сети недостаточно просто короткого имени (hostname)?",
            shortAnswer: "FQDN — это абсолютное доменное имя, включающее имя хоста и всю цепочку доменов до корня (например, hq-rtr.au-team.irpo).",
            fullAnswer: "Короткое имя хоста (hq-rtr) однозначно только внутри изолированного сегмента. В корпоративных сетях и службах каталогов (DNS, Active Directory, FreeIPA, Kerberos, SSL/TLS сертификаты) требуется строгое глобальное разрешение. Без FQDN невозможно однозначно выписать сертификат безопасности, настроить билет Kerberos или маршрутизировать почту. Кроме того, разные филиалы могут иметь одинаковые имена серверов (srv, rtr), и только доменная часть позволяет их различить.",
            tags: ["FQDN", "DNS", "Основы"]
        },
        {
            id: "q2",
            topicId: 2,
            question: "Зачем синхронизировать часовой пояс (Asia/Barnaul) и точное время на всех узлах инфраструктуры?",
            shortAnswer: "Для корректной корреляции журналов (логов), работы протоколов аутентификации (Kerberos) и сроков действия сертификатов.",
            fullAnswer: "1. В протоколе Kerberos рассинхронизация времени более чем на 5 минут приводит к отказу в авторизации.\n2. При расследовании инцидентов системный администратор сопоставляет логи на маршрутизаторах и серверах — разница в таймзонах делает корреляцию логов невозможной.\n3. Сроки действия SSL-сертификатов привязаны к меткам времени UTC.",
            tags: ["NTP", "timedatectl", "Безопасность"]
        },
        {
            id: "q3",
            topicId: 3,
            question: "В чем главное архитектурное отличие настройки сети в ОС «Альт» (/etc/net) от Debian (/etc/network/interfaces) и Ubuntu (Netplan)?",
            shortAnswer: "В ОС «Альт» сеть модульная: каждый интерфейс — это отдельная директория в /etc/net/ifaces/ с набором простых атомарных файлов.",
            fullAnswer: "В традиционном Debian вся конфигурация пишется в один большой файл `/etc/network/interfaces`, а в Ubuntu используется YAML-конфигуратор Netplan.\nВ «Альт» используется подсистема `/etc/net`. Для интерфейса `enp7s1` создается директория `/etc/net/ifaces/enp7s1/`, в которой лежат:\n• `options` — тип интерфейса и протокол (BOOTPROTO=static/dhcp, TYPE=eth/vlan);\n• `ipv4address` — адрес и CIDR-маска;\n• `ipv4route` — шлюз и маршруты;\n• `resolv.conf` — DNS-серверы интерфейса.\nЭто позволяет удобно скриптовать конфигурацию через bash (`echo ... > file`) и легко включать/отключать интерфейсы без риска сломать синтаксис одного огромного файла.",
            tags: ["/etc/net", "Альт Линукс", "Сетевой стек"]
        },
        {
            id: "q4",
            topicId: 3,
            question: "Какая маска подсети используется между ISP и HQ-RTR (172.16.1.0/28) и сколько хостов она вмещает?",
            shortAnswer: "Маска /28 (255.255.255.240). Всего 16 адресов, из них 14 полезных для хостов (.1–.14).",
            fullAnswer: "Длина префикса /28 оставляет на хостовую часть 32 - 28 = 4 бита.\nВсего адресов: 2⁴ = 16.\n• 172.16.1.0 — адрес сети;\n• 172.16.1.15 — широковещательный адрес (broadcast);\n• Доступные для хостов: от 172.16.1.1 до 172.16.1.14 (всего 14 адресов). В нашей схеме .1 занят ISP, .2 занят HQ-RTR.",
            tags: ["IP-адресация", "VLSM", "Подсети"]
        },
        {
            id: "q5",
            topicId: 4,
            question: "Что такое VLAN (802.1Q) и зачем разделять сеть на VLAN 100 (серверы) и VLAN 200 (клиенты)?",
            shortAnswer: "VLAN — это логическое разделение одного физического коммутатора на независимые широковещательные домены для безопасности и изоляции.",
            fullAnswer: "1. **Безопасность:** Клиенты из VLAN 200 не могут перехватывать широковещательный трафик серверов (VLAN 100) и не имеют прямого доступа на канальном уровне (L2).\n2. **Управление трафиком:** Межсетевой трафик между VLAN 100 и 200 проходит через маршрутизатор HQ-RTR, где можно применить правила фильтрации (файрвол).\n3. **Уменьшение широковещательного шторма:** Broadcast-пакеты (ARP, DHCP) локализованы внутри своего VLAN.",
            tags: ["VLAN", "802.1Q", "L2", "Безопасность"]
        },
        {
            id: "q6",
            topicId: 5,
            question: "В чем разница между правилом SNAT и MASQUERADE в iptables?",
            shortAnswer: "SNAT используется для постоянного статического внешнего IP-адреса, а MASQUERADE — для динамического (DHCP).",
            fullAnswer: "• `SNAT --to-source <IP>`: адрес подмены фиксирован и захардкожен. Работает быстрее, так как ядру не нужно опрашивать интерфейс перед каждой трансляцией.\n• `MASQUERADE`: ядро при каждой отправке пакета автоматически считывает текущий IP-адрес интерфейса. Это необходимо при подключении к провайдеру по DHCP, когда адрес может в любой момент измениться. На ISP enp7s1 получает IP по DHCP, поэтому применен именно MASQUERADE.",
            tags: ["NAT", "iptables", "Маршрутизация"]
        },
        {
            id: "q7",
            topicId: 5,
            question: "Зачем нужен параметр ядра Linux net.ipv4.ip_forward = 1?",
            shortAnswer: "Без него ядро Linux отбрасывает любые сетевые пакеты, IP получателя которых не принадлежит самой этой машине.",
            fullAnswer: "По умолчанию в большинстве дистрибутивов Linux сервер работает как конечный узел (End Host). Если пакет пришел на интерфейс enp7s2, а адресован в интернет, ядро посчитает его 'чужим' и уничтожит. Установка `net.ipv4.ip_forward = 1` переводит Linux в режим полнофункционального программного маршрутизатора (Router), разрешая передачу пакетов между интерфейсами.",
            tags: ["sysctl", "ip_forward", "Ядро Linux"]
        },
        {
            id: "q8",
            topicId: 6,
            question: "Что такое туннель GRE и почему в его настройках уменьшают MTU до 1476 (TUNMTU=1476)?",
            shortAnswer: "GRE инкапсулирует пакеты в новый IP-заголовок (+24 байта), поэтому MTU уменьшают с 1500 до 1476 во избежание фрагментации.",
            fullAnswer: "Стандартный размер кадра Ethernet (MTU) равен 1500 байт. GRE (Generic Routing Encapsulation) упаковывает исходный IP-пакет в новый транспортный IP-заголовок (20 байт) и заголовок GRE (4 байта), суммарно добавляя 24 байта служебных данных.\nЕсли не уменьшить MTU до `1500 - 24 = 1476 байт`, пакеты максимального размера превысят 1500 байт и будут фрагментироваться или молча отбрасываться оборудованием с флагом Don't Fragment (DF), вызывая 'зависание' TCP-сессий.",
            tags: ["GRE", "MTU", "Туннелирование"]
        },
        {
            id: "q9",
            topicId: 6,
            question: "Как работает динамическая маршрутизация OSPF и какую роль играет Area 0?",
            shortAnswer: "OSPF — протокол состояния канала (Link-State). Area 0 (Backbone) — центральная магистральная зона, через которую связываются все остальные зоны.",
            fullAnswer: "В отличие от статической маршрутизации, OSPF автоматически обнаруживает соседей, рассылая Hello-пакеты, строит топологическую базу данных графа сети (LSDB) и рассчитывает кратчайшие пути по алгоритму Дейкстры (SPF).\nВ нашей схеме OSPF настроен поверх GRE-туннеля между HQ-RTR и BR-RTR. Это позволяет HQ и филиалу мгновенно обменяться маршрутами ко всем внутренним подсетям (192.168.1.0, 192.168.2.0, 192.168.3.0).",
            tags: ["OSPF", "FRR", "Динамическая маршрутизация"]
        },
        {
            id: "q10",
            topicId: 6,
            question: "Зачем на туннеле GRE включена MD5-аутентификация в OSPF (message-digest-key 1 md5 123qweR%)?",
            shortAnswer: "Для предотвращения атак внедрения ложных маршрутов (Route Poisoning / Man-in-the-Middle).",
            fullAnswer: "Сам протокол GRE передает данные в открытом виде без шифрования. Если злоумышленник подключится к транзитной сети или провайдеру, он сможет отправить фиктивные OSPF LSA-пакеты и перенаправить трафик компании на свой сервер. Аутентификация MD5 гарантирует, что маршрутизаторы принимают маршруты только от доверенного соседа, знающего общий секретный ключ.",
            tags: ["OSPF", "Безопасность", "MD5"]
        },
        {
            id: "q11",
            topicId: 7,
            question: "За что отвечают DHCP-опции 3 и 6, передаваемые сервером dnsmasq клиентам?",
            shortAnswer: "Опция 3 (Router) указывает шлюз по умолчанию, а Опция 6 (Domain Name Server) указывает IP-адрес DNS-сервера.",
            fullAnswer: "Когда клиент HQ-CLI запрашивает параметры сети по DHCP, сервер выдает не только IP и маску, но и набор опций RFC 2132:\n• **Option 3:** Router = 192.168.2.1 (шлюз HQ-RTR);\n• **Option 6:** Domain Name Server = 192.168.1.2 (DNS на сервере HQ-SRV);\nБлагодаря этому клиент 'из коробки' получает выход в Интернет и возможность резолвить корпоративные имена.",
            tags: ["DHCP", "dnsmasq", "Опции DHCP"]
        },
        {
            id: "q12",
            topicId: 8,
            question: "Что такое обратная зона DNS (in-addr.arpa) и как формируется запись типа PTR?",
            shortAnswer: "Обратная зона позволяет по IP-адресу узнать доменное имя узла. Октеты IP записываются в обратном порядке с суффиксом .in-addr.arpa.",
            fullAnswer: "Прямая зона сопоставляет имя с IP (A-запись: `hq-srv.au-team.irpo -> 192.168.1.2`).\nОбратная зона решает задачу наоборот (PTR-запись: `2.1.168.192.in-addr.arpa -> hq-srv.au-team.irpo`).\nОктеты инвертируются, потому что в DNS иерархия строится справа налево (корень -> arpa -> in-addr -> 192 -> 168 -> 1 -> 2). Обратные записи критически важны для систем логирования, SSH (предотвращение задержек при проверке клиента) и почтовых серверов.",
            tags: ["DNS", "PTR", "in-addr.arpa"]
        },
        {
            id: "q13",
            topicId: 8,
            question: "Как работает DNS Forwarder (пересылка запросов) в конфигурации dnsmasq на HQ-SRV?",
            shortAnswer: "Локальные имена зоны au-team.irpo сервер резолвит сам, а неизвестные внешние запросы (например, ya.ru) пересылает на 77.88.8.8.",
            fullAnswer: "Параметр `server=77.88.8.8` указывает апстрим DNS-сервер (Яндекс DNS). Когда узел сети запрашивает внутреннее имя `hq-rtr.au-team.irpo`, dnsmasq берет его из файла конфигурации (`address=/...`). Если же клиент запрашивает публичный домен (`ya.ru`, `google.com`), dnsmasq отправляет рекурсивный запрос на `77.88.8.8`, кэширует ответ и возвращает клиенту.",
            tags: ["DNS", "Рекурсия", "dnsmasq"]
        },
        {
            id: "q14",
            topicId: 8,
            question: "Почему SSH на HQ-SRV перенесен со стандартного 22 порта на порт 2026?",
            shortAnswer: "Для базовой защиты от автоматизированных бот-сканеров и брутфорс-атак (Security through Obscurity + соблюдение ТЗ экзамена).",
            fullAnswer: "Стандартный порт 22 круглосуточно сканируется ботнетами в поисках уязвимостей и слабых паролей. Смена порта на нестандартный (2026) отсекает 99% автоматизированного мусорного трафика в системных логах. Подключение осуществляется с явным указанием флага: `ssh sshuser@hq-srv.au-team.irpo -p 2026`.",
            tags: ["SSH", "Порты", "Безопасность"]
        }
    ],

    // 7. Вопросы для блиц-теста по топологии (Куда что ведёт?)
    topologyQuiz: [
        {
            q: "Какая подсеть связывает ISP и маршрутизатор HQ-RTR?",
            options: ["172.16.1.0/28", "172.16.2.0/28", "192.168.1.0/27", "10.0.0.0/30"],
            answer: 0,
            expl: "Линк ISP (172.16.1.1) ↔ HQ-RTR (172.16.1.2) находится в сети 172.16.1.0/28."
        },
        {
            q: "Какой IP-адрес назначен GRE-интерфейсу (gre1) на стороне HQ-RTR?",
            options: ["10.0.0.1/30", "10.0.0.2/30", "172.16.1.2/28", "192.168.1.1/27"],
            answer: 0,
            expl: "HQ-RTR имеет адрес 10.0.0.1/30, а удалённая сторона BR-RTR — 10.0.0.2/30."
        },
        {
            q: "В каком VLAN находится сервер HQ-SRV и какой у него IP?",
            options: ["VLAN 100, 192.168.1.2/27", "VLAN 200, 192.168.2.1/28", "VLAN 999, 192.168.99.1/29", "VLAN 100, 192.168.1.1/27"],
            answer: 0,
            expl: "HQ-SRV находится в VLAN 100 (серверный сегмент) с адресом 192.168.1.2/27."
        },
        {
            q: "Какой шлюз по умолчанию настроен на сервере филиала BR-SRV?",
            options: ["192.168.3.1", "172.16.2.1", "10.0.0.1", "192.168.1.1"],
            answer: 0,
            expl: "Шлюзом для BR-SRV является интерфейс маршрутизатора BR-RTR с адресом 192.168.3.1."
        },
        {
            q: "Какой диапазон адресов выдает DHCP-сервер на HQ-RTR для клиентов в VLAN 200?",
            options: ["192.168.2.2 – 192.168.2.14", "192.168.2.100 – 192.168.2.200", "192.168.1.2 – 192.168.1.30", "172.16.1.2 – 172.16.1.14"],
            answer: 0,
            expl: "В подсети 192.168.2.0/28 всего 14 адресов хостов (.1-.14). .1 занят шлюзом, поэтому пул DHCP: .2–.14."
        },
        {
            q: "Какие сети объявляет маршрутизатор BR-RTR в протоколе OSPF Area 0?",
            options: ["10.0.0.0/30 и 192.168.3.0/28", "10.0.0.0/30, 192.168.1.0/27 и 192.168.2.0/28", "Только 172.16.2.0/28", "Все сети стенда"],
            answer: 0,
            expl: "BR-RTR анонсирует только туннель (10.0.0.0/30) и свою локальную сеть филиала (192.168.3.0/28)."
        },
        {
            q: "Какой порт и имя пользователя используются для защищённого входа по SSH на HQ-SRV?",
            options: ["Порт 2026, sshuser", "Порт 22, root", "Порт 2222, admin", "Порт 2026, root"],
            answer: 0,
            expl: "Согласно эталонным настройкам: порт 2026, пользователь sshuser (UID 2026)."
        },
        {
            q: "Какое значение MTU необходимо установить для GRE-интерфейса gre1?",
            options: ["1476", "1500", "1492", "9000"],
            answer: 0,
            expl: "1500 - 24 байта служебных заголовков GRE/IP = 1476."
        }
    ]
,

    // 8. Задания для сдачи преподавателю (Живой экзамен)
    teacherTasks: [
        {
                "id": "teach_1",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "Так, покажи мне текущее системное время и какой часовой пояс сейчас выставлен на этом маршрутизаторе.",
                "task": "Показать системное время и часовой пояс на HQ-RTR",
                "correctAnswers": [
                        "timedatectl",
                        "timedatectl status",
                        "timedatectl | grep \"Time zone\"",
                        "timedatectl | grep Time"
                ],
                "hint1": "Преподаватель хмурится: 'Утилита systemd для времени... timedate...'",
                "hint2": "timedatectl status",
                "explanation": "timedatectl status выводит системное время, таймзону (Asia/Barnaul) и статус NTP синхронизации."
        },
        {
                "id": "teach_2",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "Хорошо. А теперь поменяй часовой пояс на московское время (Europe/Moscow). Покажи, как ты это делаешь.",
                "task": "Сменить часовой пояс на Europe/Moscow",
                "correctAnswers": [
                        "timedatectl set-timezone Europe/Moscow"
                ],
                "hint1": "Преподаватель: 'У timedatectl есть опция set-timezone...'",
                "hint2": "timedatectl set-timezone Europe/Moscow",
                "explanation": "Команда меняет симлинк /etc/localtime на зону Europe/Moscow."
        },
        {
                "id": "teach_3",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "Отлично. А теперь верни обратно наш алтайский пояс Asia/Barnaul, как положено по регламенту.",
                "task": "Вернуть часовой пояс Asia/Barnaul",
                "correctAnswers": [
                        "timedatectl set-timezone Asia/Barnaul"
                ],
                "hint1": "Преподаватель: 'Снова set-timezone, но на наш Asia/Barnaul'",
                "hint2": "timedatectl set-timezone Asia/Barnaul",
                "explanation": "Возвращает таймзону Asia/Barnaul (+07)."
        },
        {
                "id": "teach_4",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "Поменяй hostname этой машины с hq-rtr на test-rtr.au-team.irpo, покажи команду.",
                "task": "Сменить FQDN на test-rtr.au-team.irpo",
                "correctAnswers": [
                        "hostnamectl set-hostname test-rtr.au-team.irpo",
                        "hostnamectl set-hostname test-rtr.au-team.irpo; exec bash"
                ],
                "hint1": "Преподаватель: 'Утилита hostnamectl с опцией set-hostname...'",
                "hint2": "hostnamectl set-hostname test-rtr.au-team.irpo",
                "explanation": "Задает новое имя хоста в системе."
        },
        {
                "id": "teach_5",
                "host": "hq-rtr",
                "prompt": "root@test-rtr:~# ",
                "teacherSpeech": "Молодец. А теперь верни правильное имя hq-rtr.au-team.irpo и перезапусти командную оболочку bash, чтобы имя в строке обновилось.",
                "task": "Вернуть имя hq-rtr.au-team.irpo и обновить сессию bash",
                "correctAnswers": [
                        "hostnamectl set-hostname hq-rtr.au-team.irpo; exec bash",
                        "hostnamectl set-hostname hq-rtr.au-team.irpo && exec bash",
                        "hostnamectl set-hostname hq-rtr.au-team.irpo"
                ],
                "hint1": "Преподаватель: 'hostnamectl set-hostname hq-rtr.au-team.irpo; exec bash'",
                "hint2": "hostnamectl set-hostname hq-rtr.au-team.irpo; exec bash",
                "explanation": "exec bash обновляет переменные оболочки и приглашение prompt."
        },
        {
                "id": "teach_6",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "Выведи мне краткий цветной список всех сетевых интерфейсов и их IP-адресов. Хочу увидеть статус линков и адреса.",
                "task": "Вывести компактный цветной список сетевых интерфейсов",
                "correctAnswers": [
                        "ip -br -c a",
                        "ip -br -c addr",
                        "ip -br a",
                        "ip a"
                ],
                "hint1": "Преподаватель: 'Флаги -br (brief) и -c (color) у команды ip a'",
                "hint2": "ip -br -c a",
                "explanation": "ip -br -c a — стандартная быстрая команда проверки интерфейсов в Альте."
        },
        {
                "id": "teach_7",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "Покажи мне таблицу маршрутизации ядра Linux на этой машине. Куда идёт трафик по умолчанию?",
                "task": "Показать таблицу маршрутизации Linux",
                "correctAnswers": [
                        "ip r",
                        "ip route",
                        "ip route show",
                        "route -n"
                ],
                "hint1": "Преподаватель: 'Команда ip r или ip route'",
                "hint2": "ip r",
                "explanation": "Выводит default via 172.16.1.1 dev enp7s1 и подсети."
        },
        {
                "id": "teach_8",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "А где в Альте лежат настройки VLAN 100? Покажи мне содержимое файла options для интерфейса enp7s2.100.",
                "task": "Просмотреть файл /etc/net/ifaces/enp7s2.100/options",
                "correctAnswers": [
                        "cat /etc/net/ifaces/enp7s2.100/options",
                        "less /etc/net/ifaces/enp7s2.100/options"
                ],
                "hint1": "Преподаватель: 'cat /etc/net/ifaces/enp7s2.100/options'",
                "hint2": "cat /etc/net/ifaces/enp7s2.100/options",
                "explanation": "В options заданы BOOTPROTO=static, TYPE=vlan, VID=100, HOST=enp7s2."
        },
        {
                "id": "teach_9",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "Проверь, включен ли форвардинг пакетов IPv4 в ядре. Должна быть единица!",
                "task": "Проверить форвардинг IPv4 в ядре через sysctl",
                "correctAnswers": [
                        "sysctl net.ipv4.ip_forward",
                        "cat /proc/sys/net/ipv4/ip_forward"
                ],
                "hint1": "Преподаватель: 'sysctl net.ipv4...'",
                "hint2": "sysctl net.ipv4.ip_forward",
                "explanation": "net.ipv4.ip_forward = 1 означает, что машина работает как маршрутизатор."
        },
        {
                "id": "teach_10",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "Покажи мне правила NAT в iptables. Где твоё правило MASQUERADE?",
                "task": "Показать правила таблицы NAT в iptables",
                "correctAnswers": [
                        "iptables -t nat -L",
                        "iptables -t nat -vnL",
                        "iptables -t nat -S",
                        "iptables -t nat -L -n"
                ],
                "hint1": "Преподаватель: 'iptables с указанием таблицы -t nat и списка -L'",
                "hint2": "iptables -t nat -L",
                "explanation": "Выводит цепочку POSTROUTING с правилом MASQUERADE."
        },
        {
                "id": "teach_11",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "А как твои правила iptables выживут после перезагрузки? Покажи мне список задач cron.",
                "task": "Показать задачи пользователя root в crontab",
                "correctAnswers": [
                        "crontab -l"
                ],
                "hint1": "Преподаватель: 'Флаг -l (list) у утилиты crontab'",
                "hint2": "crontab -l",
                "explanation": "Показывает строчку @reboot /sbin/iptables-restore < /root/iptables_rules."
        },
        {
                "id": "teach_12",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "Перейдем к туннелю. Покажи мне файл options интерфейса туннеля gre1.",
                "task": "Показать содержимое /etc/net/ifaces/gre1/options",
                "correctAnswers": [
                        "cat /etc/net/ifaces/gre1/options",
                        "less /etc/net/ifaces/gre1/options"
                ],
                "hint1": "Преподаватель: 'cat /etc/net/ifaces/gre1/options'",
                "hint2": "cat /etc/net/ifaces/gre1/options",
                "explanation": "Показывает TUNLOCAL=172.16.1.2, TUNREMOTE=172.16.2.2, TUNMTU=1476."
        },
        {
                "id": "teach_13",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "Пингани удаленный конец GRE-туннеля на филиале (BR-RTR). Ровно 3 пакета.",
                "task": "Пинг туннельного адреса BR-RTR (10.0.0.2)",
                "correctAnswers": [
                        "ping -c 3 10.0.0.2"
                ],
                "hint1": "Преподаватель: 'Адрес gre1 на BR-RTR равен 10.0.0.2, ключ -c 3'",
                "hint2": "ping -c 3 10.0.0.2",
                "explanation": "Проверяет работоспособность GRE-туннеля."
        },
        {
                "id": "teach_14",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "Зайди в виртуальную консоль FRR (vtysh), проверим протокол динамической маршрутизации OSPF.",
                "task": "Войти в консоль vtysh",
                "correctAnswers": [
                        "vtysh"
                ],
                "hint1": "Преподаватель: 'Утилита vtysh'",
                "hint2": "vtysh",
                "explanation": "Запускает общую оболочку FRRouting."
        },
        {
                "id": "teach_15",
                "host": "hq-rtr",
                "prompt": "hq-rtr# ",
                "teacherSpeech": "В vtysh: покажи мне таблицу соседей OSPF (neighbor). В каком состоянии сосед?",
                "task": "Показать соседей OSPF в vtysh",
                "correctAnswers": [
                        "show ip ospf neighbor",
                        "sh ip ospf neighbor",
                        "sh ip ospf nei"
                ],
                "hint1": "Преподаватель: 'Команда show ip ospf neighbor'",
                "hint2": "show ip ospf neighbor",
                "explanation": "Сосед 10.0.0.2 должен быть в состоянии Full."
        },
        {
                "id": "teach_16",
                "host": "hq-rtr",
                "prompt": "hq-rtr# ",
                "teacherSpeech": "В vtysh: покажи мне только маршруты OSPF.",
                "task": "Показать только маршруты OSPF",
                "correctAnswers": [
                        "show ip route ospf",
                        "sh ip ro ospf"
                ],
                "hint1": "Преподаватель: 'show ip route ospf'",
                "hint2": "show ip route ospf",
                "explanation": "Выводит маршруты OSPF (буква O), в частности к сети 192.168.3.0/28."
        },
        {
                "id": "teach_17",
                "host": "hq-rtr",
                "prompt": "hq-rtr# ",
                "teacherSpeech": "Хорошо. Выйди из vtysh обратно в оболочку bash.",
                "task": "Выйти из vtysh в bash",
                "correctAnswers": [
                        "exit",
                        "quit",
                        "q"
                ],
                "hint1": "Преподаватель: 'exit'",
                "hint2": "exit",
                "explanation": "Выход в стандартный root shell."
        },
        {
                "id": "teach_18",
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "teacherSpeech": "Переходим на сервер HQ-SRV. Покажи статус службы dnsmasq. Она работает?",
                "task": "Показать статус службы dnsmasq",
                "correctAnswers": [
                        "systemctl status dnsmasq",
                        "service dnsmasq status"
                ],
                "hint1": "Преподаватель: 'systemctl status dnsmasq'",
                "hint2": "systemctl status dnsmasq",
                "explanation": "Служба должна быть active (running)."
        },
        {
                "id": "teach_19",
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "teacherSpeech": "Проверь утилитой ss, слушает ли dnsmasq UDP-порт 53.",
                "task": "Проверить UDP-порт 53 с помощью утилиты ss",
                "correctAnswers": [
                        "ss -ulnp | grep dnsmasq",
                        "ss -ulnp | grep 53",
                        "ss -ulnp",
                        "ss -unlp | grep dnsmasq"
                ],
                "hint1": "Преподаватель: 'ss -ulnp с фильтром grep dnsmasq'",
                "hint2": "ss -ulnp | grep dnsmasq",
                "explanation": "Показывает сокет на порту 53."
        },
        {
                "id": "teach_20",
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "teacherSpeech": "Пингани внешнее имя ya.ru с сервера (3 пакета). Проверим, работает ли forwarder 77.88.8.8.",
                "task": "Пинг ya.ru (3 пакета)",
                "correctAnswers": [
                        "ping -c 3 ya.ru",
                        "ping -c 3 yandex.ru",
                        "ping ya.ru"
                ],
                "hint1": "Преподаватель: 'ping -c 3 ya.ru'",
                "hint2": "ping -c 3 ya.ru",
                "explanation": "Проверяет рекурсивное разрешение внешних имен."
        },
        {
                "id": "teach_21",
                "host": "hq-cli",
                "prompt": "user@hq-cli:~$ ",
                "teacherSpeech": "Перейди на клиентскую машину HQ-CLI. Сбрось старый адрес DHCP и запроси новый на enp0s3.200.",
                "task": "Сбросить и запросить IP по DHCP на HQ-CLI",
                "correctAnswers": [
                        "dhclient -r && dhclient enp0s3.200",
                        "dhclient -r; dhclient enp0s3.200",
                        "dhclient enp0s3.200",
                        "dhclient -r"
                ],
                "hint1": "Преподаватель: 'dhclient -r для сброса, затем dhclient enp0s3.200'",
                "hint2": "dhclient -r && dhclient enp0s3.200",
                "explanation": "Освобождает и получает IP в диапазоне 192.168.2.2–2.14."
        },
        {
                "id": "teach_22",
                "host": "hq-cli",
                "prompt": "user@hq-cli:~$ ",
                "teacherSpeech": "Покажи мне содержимое файла /etc/resolv.conf на клиенте. Какой там DNS-сервер указан?",
                "task": "Показать файл /etc/resolv.conf на клиенте",
                "correctAnswers": [
                        "cat /etc/resolv.conf",
                        "less /etc/resolv.conf"
                ],
                "hint1": "Преподаватель: 'cat /etc/resolv.conf'",
                "hint2": "cat /etc/resolv.conf",
                "explanation": "Должен быть nameserver 192.168.1.2."
        },
        {
                "id": "teach_23",
                "host": "hq-cli",
                "prompt": "user@hq-cli:~$ ",
                "teacherSpeech": "Финальная проверка: подключись с клиента по SSH к серверу HQ-SRV по доменному имени hq-srv.au-team.irpo на порт 2026 под пользователем sshuser.",
                "task": "SSH подключение к hq-srv.au-team.irpo:2026",
                "correctAnswers": [
                        "ssh sshuser@hq-srv.au-team.irpo -p 2026",
                        "ssh -p 2026 sshuser@hq-srv.au-team.irpo"
                ],
                "hint1": "Преподаватель: 'ssh sshuser@hq-srv.au-team.irpo -p 2026'",
                "hint2": "ssh sshuser@hq-srv.au-team.irpo -p 2026",
                "explanation": "Проверяет разрешение DNS, маршрутизацию между VLAN и порт SSH 2026."
        },
        {
                "id": "teach_24",
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "teacherSpeech": "Отлично! Напоследок перезапусти службу сети systemctl restart network и покажи, что всё поднялось.",
                "task": "Перезапустить службу сети network",
                "correctAnswers": [
                        "systemctl restart network",
                        "service network restart"
                ],
                "hint1": "Преподаватель: 'systemctl restart network'",
                "hint2": "systemctl restart network",
                "explanation": "Перезапуск подсистемы /etc/net в ОС Альт."
        }
]
};
