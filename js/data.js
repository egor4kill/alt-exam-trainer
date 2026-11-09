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
            role: "Клиентская машина (DHCP). Реальный IP: 192.168.2.12/28 (выдан из пула .2–.14). В таблице DNS методички записан .2 как эталон.",
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
                { name: "enp7s1", ip: "192.168.3.2/28", gw: "192.168.3.1", desc: "Локальная сеть BR" }
            ],
            services: ["Тестовый хост связности сквозь OSPF/GRE"],
            configs: [
                "/etc/net/ifaces/enp7s1/ipv4address",
                "/etc/net/ifaces/enp7s1/ipv4route",
                "/etc/net/ifaces/enp7s1/resolv.conf"
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
                "task": "Задайте полное доменное имя (FQDN) isp.au-team.irpo на виртуальной машине ISP",
                "correctAnswers": [
                        "hostnamectl set-hostname isp.au-team.irpo; exec bash",
                        "hostnamectl set-hostname isp.au-team.irpo && exec bash",
                        "hostnamectl set-hostname isp.au-team.irpo"
                ],
                "hint1": "Вспомните стандартную утилиту systemd для управления сетевым именем узла.",
                "hint2": "Шаблон: утилита set-hostname <имя_машины.домен>; exec bash",
                "explanation": "hostnamectl set-hostname прописывает FQDN в /etc/hostname, а exec bash перезапускает командную оболочку с обновленным prompt."
        },
        {
                "id": "cmd_2_2",
                "topicId": 2,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Задайте FQDN hq-rtr.au-team.irpo на маршрутизаторе HQ-RTR",
                "correctAnswers": [
                        "hostnamectl set-hostname hq-rtr.au-team.irpo; exec bash",
                        "hostnamectl set-hostname hq-rtr.au-team.irpo && exec bash",
                        "hostnamectl set-hostname hq-rtr.au-team.irpo"
                ],
                "hint1": "Используйте ту же утилиту управления hostname для пограничного маршрутизатора HQ.",
                "hint2": "Шаблон: утилита set-hostname <имя_узла>; exec bash",
                "explanation": "Устанавливает доменное имя маршрутизатора центрального офиса."
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
                "hint1": "Имя для маршрутизатора филиала (Branch Router) в корпоративной зоне.",
                "hint2": "Шаблон: утилита set-hostname <имя_узла>; exec bash",
                "explanation": "Задает FQDN маршрутизатора филиала."
        },
        {
                "id": "cmd_2_4",
                "topicId": 2,
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "task": "Задайте FQDN hq-srv.au-team.irpo на главном сервере HQ-SRV",
                "correctAnswers": [
                        "hostnamectl set-hostname hq-srv.au-team.irpo; exec bash",
                        "hostnamectl set-hostname hq-srv.au-team.irpo && exec bash",
                        "hostnamectl set-hostname hq-srv.au-team.irpo"
                ],
                "hint1": "Имя для главного сервера центрального офиса.",
                "hint2": "Шаблон: утилита set-hostname <имя_узла>; exec bash",
                "explanation": "Задает FQDN сервера HQ."
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
                "hint1": "Имя для сервера филиала.",
                "hint2": "Шаблон: утилита set-hostname <имя_узла>; exec bash",
                "explanation": "Задает FQDN сервера BR."
        },
        {
                "id": "cmd_2_6",
                "topicId": 2,
                "host": "hq-cli",
                "prompt": "root@hq-cli:~# ",
                "task": "Задайте FQDN hq-cli.au-team.irpo на клиентской машине HQ-CLI",
                "correctAnswers": [
                        "hostnamectl set-hostname hq-cli.au-team.irpo; exec bash",
                        "hostnamectl set-hostname hq-cli.au-team.irpo && exec bash",
                        "hostnamectl set-hostname hq-cli.au-team.irpo"
                ],
                "hint1": "Имя для рабочей станции клиента в головном офисе.",
                "hint2": "Шаблон: утилита set-hostname <имя_узла>; exec bash",
                "explanation": "Задает FQDN клиента HQ."
        },
        {
                "id": "cmd_2_7",
                "topicId": 2,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Проверьте установленное полное доменное имя (FQDN) хоста",
                "correctAnswers": [
                        "hostname -f",
                        "hostname --fqdn"
                ],
                "hint1": "Вспомните флаг утилиты hostname для вывода полного (full / fqdn) имени.",
                "hint2": "Синтаксис: hostname -<флаг>",
                "explanation": "Возвращает полное имя хоста вместе с доменом (например, isp.au-team.irpo)."
        },
        {
                "id": "cmd_2_8",
                "topicId": 2,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Обновите кэш списков пакетов в репозиториях APT",
                "correctAnswers": [
                        "apt-get update"
                ],
                "hint1": "Стандартная команда обновления метаданных пакетов в дистрибутивах на базе APT.",
                "hint2": "Синтаксис: apt-... update",
                "explanation": "Синхронизирует локальный кэш пакетов с зеркалами."
        },
        {
                "id": "cmd_2_9",
                "topicId": 2,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Установите пакет данных о часовых поясах tzdata с ключом -y",
                "correctAnswers": [
                        "apt-get install tzdata -y",
                        "apt-get install -y tzdata"
                ],
                "hint1": "В дистрибутиве Альт JeOS базы часовых поясов нет по умолчанию, установите пакет tzdata.",
                "hint2": "Синтаксис: apt-... install <пакет> -y",
                "explanation": "Пакет tzdata предоставляет файлы каталога /usr/share/zoneinfo/."
        },
        {
                "id": "cmd_2_10",
                "topicId": 2,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Установите часовой пояс Барнаула (Asia/Barnaul) для системы",
                "correctAnswers": [
                        "timedatectl set-timezone Asia/Barnaul"
                ],
                "hint1": "Вспомните команду управления системными часами и её опцию для выбора таймзоны.",
                "hint2": "Синтаксис: утилита set-timezone <Регион/Город>",
                "explanation": "Настраивает симлинк /etc/localtime на Asia/Barnaul (+07)."
        },
        {
                "id": "cmd_2_11",
                "topicId": 2,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Проверьте статус системного времени, таймзоны и синхронизации NTP",
                "correctAnswers": [
                        "timedatectl status",
                        "timedatectl"
                ],
                "hint1": "Вызовите команду управления временем для инспекции текущего состояния.",
                "hint2": "Шаблон: <утилита_времени_systemd> [status]",
                "explanation": "Выводит Local time, Universal time, RTC time и строку Time zone."
        },
        {
                "id": "cmd_2_12",
                "topicId": 2,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Выполните комбинированную команду экспресс-проверки имени хоста и часового пояса",
                "correctAnswers": [
                        "echo \"=== $(hostname -f) ===\" && timedatectl | grep \"Time zone\"",
                        "echo '=== $(hostname -f) ===' && timedatectl | grep 'Time zone'"
                ],
                "hint1": "Связка из методички: вывод hostname -f внутри echo и фильтрация timedatectl через grep.",
                "hint2": "Шаблон: echo '=== $(команда) ===' && утилита | grep 'Time zone'",
                "explanation": "Позволяет за секунду убедиться в правильности FQDN и таймзоны на машине."
        },
        {
                "id": "cmd_3_1",
                "topicId": 3,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Выведите компактный цветной список всех сетевых интерфейсов и их IP-адресов",
                "correctAnswers": [
                        "ip -br -c a",
                        "ip -br -c addr",
                        "ip -br a",
                        "ip a"
                ],
                "hint1": "Используйте флаги brief (-br) и color (-c) у команды ip address.",
                "hint2": "Синтаксис: ip -<краткий_флаг> -<цветной_флаг> a",
                "explanation": "Показывает имя интерфейса, статус линка (UP/DOWN) и назначенные адреса."
        },
        {
                "id": "cmd_3_2",
                "topicId": 3,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Скопируйте каталог интерфейса enp7s1 в enp7s2 для настройки линка к HQ-RTR",
                "correctAnswers": [
                        "cp -r /etc/net/ifaces/enp7s1 /etc/net/ifaces/enp7s2",
                        "cp -r enp7s1 enp7s2"
                ],
                "hint1": "В подсистеме /etc/net новые интерфейсы создаются копированием существующего каталога интерфейса.",
                "hint2": "Синтаксис: cp -r <путь_источник> <путь_назначение>",
                "explanation": "Создает структуру каталога для второго интерфейса ISP."
        },
        {
                "id": "cmd_3_3",
                "topicId": 3,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Назначьте статический IP 172.16.1.1/28 интерфейсу enp7s2 в подсистеме /etc/net",
                "correctAnswers": [
                        "echo '172.16.1.1/28' > /etc/net/ifaces/enp7s2/ipv4address",
                        "echo 172.16.1.1/28 > /etc/net/ifaces/enp7s2/ipv4address"
                ],
                "hint1": "Запишите IP-адрес с префиксом маски в файл ipv4address внутри каталога интерфейса.",
                "hint2": "Синтаксис: echo '<IP/префикс>' > /etc/net/ifaces/<интерфейс>/ipv4address",
                "explanation": "Назначает статический адрес линка в сторону HQ-RTR."
        },
        {
                "id": "cmd_3_4",
                "topicId": 3,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Скопируйте каталог интерфейса enp7s1 в enp7s3 для линка к филиалу BR-RTR",
                "correctAnswers": [
                        "cp -r /etc/net/ifaces/enp7s1 /etc/net/ifaces/enp7s3",
                        "cp -r enp7s1 enp7s3"
                ],
                "hint1": "Создайте каталог третьего физического адаптера ISP копированием enp7s1.",
                "hint2": "Синтаксис: cp -r <откуда> <куда>",
                "explanation": "Создает каталог для третьего интерфейса enp7s3."
        },
        {
                "id": "cmd_3_5",
                "topicId": 3,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Назначьте статический IP 172.16.2.1/28 интерфейсу enp7s3 на ISP",
                "correctAnswers": [
                        "echo '172.16.2.1/28' > /etc/net/ifaces/enp7s3/ipv4address",
                        "echo 172.16.2.1/28 > /etc/net/ifaces/enp7s3/ipv4address"
                ],
                "hint1": "Запишите адрес линка к филиалу в файл ipv4address интерфейса enp7s3.",
                "hint2": "Синтаксис: echo '<адрес/маска>' > /etc/net/ifaces/<интерфейс>/ipv4address",
                "explanation": "Назначает IP интерфейсу enp7s3 на стороне провайдера."
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
                "hint1": "Вспомните точное системное имя демона сети в Альте.",
                "hint2": "Синтаксис: systemctl restart <служба>",
                "explanation": "Применяет конфигурацию всех каталогов /etc/net/ifaces."
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
                "hint1": "Внешний интерфейс HQ-RTR смотрит на ISP и получает второй адрес подсети 172.16.1.0/28.",
                "hint2": "Синтаксис: echo '<IP/маска>' > /etc/net/ifaces/enp7s1/ipv4address",
                "explanation": "Назначает IP-адрес внешнего интерфейса HQ-RTR."
        },
        {
                "id": "cmd_3_8",
                "topicId": 3,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Укажите шлюз по умолчанию 172.16.1.1 для интерфейса enp7s1",
                "correctAnswers": [
                        "echo 'default via 172.16.1.1' > /etc/net/ifaces/enp7s1/ipv4route",
                        "echo default via 172.16.1.1 > /etc/net/ifaces/enp7s1/ipv4route"
                ],
                "hint1": "В подсистеме /etc/net маршруты описываются конструкцией default via IP.",
                "hint2": "Синтаксис: echo 'default via <IP>' > .../ipv4route",
                "explanation": "Направляет весь внешний трафик на провайдерский шлюз ISP."
        },
        {
                "id": "cmd_3_9",
                "topicId": 3,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Пропишите временный DNS 77.88.8.8 в resolv.conf интерфейса enp7s1 на HQ-RTR",
                "correctAnswers": [
                        "echo 'nameserver 77.88.8.8' > /etc/net/ifaces/enp7s1/resolv.conf",
                        "echo nameserver 77.88.8.8 > /etc/net/ifaces/enp7s1/resolv.conf"
                ],
                "hint1": "В resolv.conf адрес DNS указывается после директивы nameserver.",
                "hint2": "Синтаксис: echo 'nameserver <IP_DNS>' > .../resolv.conf",
                "explanation": "Позволяет резолвить репозитории до поднятия собственного DNS-сервера."
        },
        {
                "id": "cmd_3_10",
                "topicId": 3,
                "host": "br-rtr",
                "prompt": "root@br-rtr:~# ",
                "task": "Назначьте IP-адрес 172.16.2.2/28 интерфейсу enp7s1 на маршрутизаторе BR-RTR",
                "correctAnswers": [
                        "echo '172.16.2.2/28' > /etc/net/ifaces/enp7s1/ipv4address",
                        "echo 172.16.2.2/28 > /etc/net/ifaces/enp7s1/ipv4address"
                ],
                "hint1": "Интерфейс в сторону ISP на маршрутизаторе филиала.",
                "hint2": "Синтаксис: echo '<IP/маска>' > /etc/net/ifaces/enp7s1/ipv4address",
                "explanation": "Назначает внешний статический адрес для BR-RTR."
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
                "hint1": "Шлюзом филиала является адрес ISP enp7s3.",
                "hint2": "Синтаксис: echo 'default via <IP>' > .../ipv4route",
                "explanation": "Задает маршрут по умолчанию для филиала."
        },
        {
                "id": "cmd_3_12",
                "topicId": 3,
                "host": "br-rtr",
                "prompt": "root@br-rtr:~# ",
                "task": "Назначьте локальный IP 192.168.3.1/28 интерфейсу enp7s2 на BR-RTR",
                "correctAnswers": [
                        "echo '192.168.3.1/28' > /etc/net/ifaces/enp7s2/ipv4address",
                        "echo 192.168.3.1/28 > /etc/net/ifaces/enp7s2/ipv4address"
                ],
                "hint1": "Интерфейс enp7s2 на BR-RTR обслуживает локальную сеть филиала, где находится сервер BR-SRV.",
                "hint2": "Синтаксис: echo '<адрес/маска>' > /etc/net/ifaces/enp7s2/ipv4address",
                "explanation": "Задает адрес локального шлюза филиала."
        },
        {
                "id": "cmd_3_13",
                "topicId": 3,
                "host": "br-srv",
                "prompt": "root@br-srv:~# ",
                "task": "Назначьте статический IP 192.168.3.2/28 интерфейсу enp0s3 (или enp7s1) на сервере BR-SRV",
                "correctAnswers": [
                        "echo '192.168.3.2/28' > /etc/net/ifaces/enp0s3/ipv4address",
                        "echo 192.168.3.2/28 > /etc/net/ifaces/enp0s3/ipv4address",
                        "echo '192.168.3.2/28' > /etc/net/ifaces/enp7s1/ipv4address",
                        "echo 192.168.3.2/28 > /etc/net/ifaces/enp7s1/ipv4address"
                ],
                "hint1": "Сервер филиала получает второй адрес локальной подсети 192.168.3.0/28.",
                "hint2": "Синтаксис: echo '<IP/маска>' > /etc/net/ifaces/enp0s3/ipv4address (или enp7s1)",
                "explanation": "Назначает статический IP серверу филиала."
        },
        {
                "id": "cmd_3_14",
                "topicId": 3,
                "host": "br-srv",
                "prompt": "root@br-srv:~# ",
                "task": "Укажите шлюз по умолчанию 192.168.3.1 на сервере BR-SRV",
                "correctAnswers": [
                        "echo 'default via 192.168.3.1' > /etc/net/ifaces/enp0s3/ipv4route",
                        "echo default via 192.168.3.1 > /etc/net/ifaces/enp0s3/ipv4route",
                        "echo 'default via 192.168.3.1' > /etc/net/ifaces/enp7s1/ipv4route",
                        "echo default via 192.168.3.1 > /etc/net/ifaces/enp7s1/ipv4route"
                ],
                "hint1": "Шлюзом для BR-SRV является локальный порт маршрутизатора BR-RTR.",
                "hint2": "Синтаксис: echo 'default via <IP>' > /etc/net/ifaces/enp0s3/ipv4route (или enp7s1)",
                "explanation": "Задает маршрут к шлюзу филиала."
        },
        {
                "id": "cmd_3_15",
                "topicId": 3,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Проверьте связность от ISP до HQ-RTR (172.16.1.2), отправив 3 пинга",
                "correctAnswers": [
                        "ping -c 3 172.16.1.2"
                ],
                "hint1": "Используйте утилиту ping с ограничителем числа пакетов.",
                "hint2": "Синтаксис: ping -c <число> <целевой_IP>",
                "explanation": "Проверяет L3-связность линка ISP <-> HQ-RTR."
        },
        {
                "id": "cmd_3_16",
                "topicId": 3,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Проверьте связность от ISP до BR-RTR (172.16.2.2), отправив 3 пинга",
                "correctAnswers": [
                        "ping -c 3 172.16.2.2"
                ],
                "hint1": "Проверка пинга в сторону маршрутизатора филиала.",
                "hint2": "Синтаксис: ping -c 3 <IP>",
                "explanation": "Проверяет L3-связность линка ISP <-> BR-RTR."
        },
        {
                "id": "cmd_4_1",
                "topicId": 4,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Создайте каталог интерфейса для VLAN 100 (enp7s2.100), скопировав enp7s1",
                "correctAnswers": [
                        "cp -r /etc/net/ifaces/enp7s1 /etc/net/ifaces/enp7s2.100",
                        "cp -r enp7s1 enp7s2.100"
                ],
                "hint1": "Имя каталога подинтерфейса формируется как <базовый_интерфейс>.<vlan_id>.",
                "hint2": "Синтаксис: cp -r .../enp7s1 .../enp7s2.100",
                "explanation": "Создает каталог для подинтерфейса VLAN 100 на HQ-RTR."
        },
        {
                "id": "cmd_4_2",
                "topicId": 4,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Создайте каталог интерфейса для VLAN 200 (enp7s2.200) для клиентского сегмента",
                "correctAnswers": [
                        "cp -r /etc/net/ifaces/enp7s1 /etc/net/ifaces/enp7s2.200",
                        "cp -r enp7s1 enp7s2.200"
                ],
                "hint1": "Каталог подинтерфейса для клиентских рабочих станций.",
                "hint2": "Синтаксис: cp -r .../enp7s1 .../enp7s2.200",
                "explanation": "Создает каталог VLAN 200."
        },
        {
                "id": "cmd_4_3",
                "topicId": 4,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Создайте каталог интерфейса для VLAN 999 (enp7s2.999) для сегмента управления",
                "correctAnswers": [
                        "cp -r /etc/net/ifaces/enp7s1 /etc/net/ifaces/enp7s2.999",
                        "cp -r enp7s1 enp7s2.999"
                ],
                "hint1": "Каталог подинтерфейса управления (Management).",
                "hint2": "Синтаксис: cp -r .../enp7s1 .../enp7s2.999",
                "explanation": "Создает каталог VLAN 999."
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
                "hint1": "Шлюз серверного сегмента с маской /27.",
                "hint2": "Синтаксис: echo '<IP/маска>' > .../ipv4address",
                "explanation": "Назначает адрес шлюза серверов HQ."
        },
        {
                "id": "cmd_4_5",
                "topicId": 4,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Назначьте IP-адрес 192.168.2.1/28 интерфейсу VLAN 200 (enp7s2.200)",
                "correctAnswers": [
                        "echo '192.168.2.1/28' > /etc/net/ifaces/enp7s2.200/ipv4address",
                        "echo 192.168.2.1/28 > /etc/net/ifaces/enp7s2.200/ipv4address"
                ],
                "hint1": "Шлюз клиентского сегмента с маской /28.",
                "hint2": "Синтаксис: echo '<IP/маска>' > .../ipv4address",
                "explanation": "Назначает адрес шлюза клиентов HQ."
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
                "hint1": "Шлюз сегмента управления с маской /29.",
                "hint2": "Синтаксис: echo '<IP/маска>' > .../ipv4address",
                "explanation": "Назначает IP интерфейсу управления."
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
                "hint1": "На виртуальном сервере сетевая карта enp0s3 тегируется для VLAN 100.",
                "hint2": "Синтаксис: cp -r .../enp0s3 .../enp0s3.100",
                "explanation": "Создает каталог тегированного адаптера на сервере."
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
                "hint1": "Сервер получает адрес .2 в серверной подсети.",
                "hint2": "Синтаксис: echo '<IP/маска>' > .../ipv4address",
                "explanation": "Задает статический адрес серверу HQ-SRV."
        },
        {
                "id": "cmd_4_9",
                "topicId": 4,
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "task": "Укажите маршрут по умолчанию через шлюз HQ-RTR (192.168.1.1) на интерфейсе enp0s3.100",
                "correctAnswers": [
                        "echo 'default via 192.168.1.1' > /etc/net/ifaces/enp0s3.100/ipv4route",
                        "echo default via 192.168.1.1 > /etc/net/ifaces/enp0s3.100/ipv4route"
                ],
                "hint1": "Шлюзом сервера является интерфейс маршрутизатора в этом же VLAN 100.",
                "hint2": "Синтаксис: echo 'default via <IP>' > .../ipv4route",
                "explanation": "Направляет трафик сервера через пограничный маршрутизатор."
        },
        {
                "id": "cmd_4_10",
                "topicId": 4,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Проверьте пинг с маршрутизатора HQ-RTR до сервера HQ-SRV (192.168.1.2)",
                "correctAnswers": [
                        "ping -c 3 192.168.1.2"
                ],
                "hint1": "Проверка связи между маршрутизатором и сервером внутри VLAN 100.",
                "hint2": "Синтаксис: ping -c 3 <IP>",
                "explanation": "Подтверждает корректную работу 802.1Q тегирования на линке."
        },
        {
                "id": "cmd_5_1",
                "topicId": 5,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Проверьте, разрешена ли в ядре пересылка пакетов IPv4 (параметр net.ipv4.ip_forward)",
                "correctAnswers": [
                        "sysctl net.ipv4.ip_forward",
                        "cat /proc/sys/net/ipv4/ip_forward"
                ],
                "hint1": "Команда инспекции состояния форвардинга пакетов в ядре.",
                "hint2": "Синтаксис: sysctl net.ipv4.<параметр>",
                "explanation": "Значение 1 разрешает ядру пересылать транзитные сетевые пакеты."
        },
        {
                "id": "cmd_5_2",
                "topicId": 5,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Включите форвардинг IPv4 в работающем ядре без перезагрузки системы",
                "correctAnswers": [
                        "sysctl -w net.ipv4.ip_forward=1",
                        "sysctl -w net.ipv4.ip_forward = 1",
                        "echo 1 > /proc/sys/net/ipv4/ip_forward"
                ],
                "hint1": "Флаг -w производит немедленную запись нового значения в ядро Linux.",
                "hint2": "Синтаксис: sysctl -w net.ipv4.ip_forward=<1>",
                "explanation": "Активирует режим маршрутизатора без перезагрузки системы."
        },
        {
                "id": "cmd_5_3",
                "topicId": 5,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Установите утилиту iptables с автоподтверждением (-y)",
                "correctAnswers": [
                        "apt-get install iptables -y",
                        "apt-get install -y iptables"
                ],
                "hint1": "Установка пакета для управления таблицами пакетного фильтра.",
                "hint2": "Синтаксис: apt-get install <пакет> -y",
                "explanation": "Устанавливает iptables в минимальный образ системы."
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
                "hint1": "Вспомните таблицу nat, цепочку исходящих пакетов POSTROUTING и действие MASQUERADE.",
                "hint2": "Синтаксис: iptables -t nat -A POSTROUTING -o <интерфейс> -j MASQUERADE",
                "explanation": "Включает динамическую подмену IP источника при выходе в интернет."
        },
        {
                "id": "cmd_5_5",
                "topicId": 5,
                "host": "isp",
                "prompt": "root@isp:~# ",
                "task": "Выведите текущие активные правила и цепочки в таблице NAT",
                "correctAnswers": [
                        "iptables -t nat -L",
                        "iptables -t nat -vnL",
                        "iptables -t nat -S"
                ],
                "hint1": "Ключ -L выводит список правил указанной таблицы.",
                "hint2": "Синтаксис: iptables -t nat -<ключ_списка>",
                "explanation": "Показывает цепочки таблицы NAT и созданные правила трансляции."
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
                "hint1": "Утилита дампа всех активных правил iptables в файл.",
                "hint2": "Синтаксис: <утилита-save> > <путь_к_файлу>",
                "explanation": "Создает постоянную копию правил для автозагрузки."
        },
        {
                "id": "cmd_5_7",
                "topicId": 5,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "На HQ-RTR добавьте правило MASQUERADE для внешнего интерфейса enp7s1",
                "correctAnswers": [
                        "iptables -t nat -A POSTROUTING -o enp7s1 -j MASQUERADE"
                ],
                "hint1": "Аналогичное правило маскировки для локальных сетей головного офиса.",
                "hint2": "Синтаксис: iptables -t nat -A POSTROUTING -o enp7s1 -j ...",
                "explanation": "Позволяет внутренним VLAN выходить через шлюз HQ во внешнюю сеть."
        },
        {
                "id": "cmd_5_8",
                "topicId": 5,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "На HQ-RTR сохраните правила iptables в файл /root/iptables_rules",
                "correctAnswers": [
                        "iptables-save > /root/iptables_rules"
                ],
                "hint1": "Сохранение правил на маршрутизаторе главного офиса.",
                "hint2": "Шаблон: <команда_дампа_iptables> > <путь_к_файлу>",
                "explanation": "Сохраняет правила NAT на HQ-RTR."
        },
        {
                "id": "cmd_5_9",
                "topicId": 5,
                "host": "br-rtr",
                "prompt": "root@br-rtr:~# ",
                "task": "На BR-RTR добавьте правило MASQUERADE для внешнего интерфейса enp7s1",
                "correctAnswers": [
                        "iptables -t nat -A POSTROUTING -o enp7s1 -j MASQUERADE"
                ],
                "hint1": "Правило маскировки для локальной сети филиала.",
                "hint2": "Шаблон: iptables -t <таблица> -A <цепочка> -o <интерфейс> -j <действие>",
                "explanation": "Включает NAT для сегмента филиала."
        },
        {
                "id": "cmd_5_10",
                "topicId": 5,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Проверьте доступ в глобальный интернет, отправив 3 пинга на ya.ru с HQ-RTR",
                "correctAnswers": [
                        "ping -c 3 ya.ru",
                        "ping -c 3 yandex.ru"
                ],
                "hint1": "Проверка прохождения пакетов сквозь цепочку NAT на ISP.",
                "hint2": "Синтаксис: ping -c 3 <внешний_домен>",
                "explanation": "Подтверждает работоспособность NAT и форвардинга."
        },
        {
                "id": "cmd_6_1",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Создайте каталог интерфейса для туннеля gre1 в подсистеме /etc/net",
                "correctAnswers": [
                        "mkdir /etc/net/ifaces/gre1",
                        "mkdir -p /etc/net/ifaces/gre1"
                ],
                "hint1": "В /etc/net для туннелей создается каталог с именем интерфейса.",
                "hint2": "Синтаксис: mkdir /etc/net/ifaces/<имя_туннеля>",
                "explanation": "Создает каталог настроек туннеля gre1."
        },
        {
                "id": "cmd_6_1b",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Настройте параметры туннеля gre1 (TYPE=iptun, TUNTYPE=gre, TUNLOCAL=172.16.1.2, TUNREMOTE=172.16.2.2, TUNMTU=1476) в /etc/net/ifaces/gre1/options",
                "correctAnswers": [
                        "echo -e 'TYPE=iptun\\nTUNTYPE=gre\\nTUNLOCAL=172.16.1.2\\nTUNREMOTE=172.16.2.2\\nTUNTTL=255\\nTUNMTU=1476' > /etc/net/ifaces/gre1/options",
                        "echo -e \"TYPE=iptun\\nTUNTYPE=gre\\nTUNLOCAL=172.16.1.2\\nTUNREMOTE=172.16.2.2\\nTUNTTL=255\\nTUNMTU=1476\" > /etc/net/ifaces/gre1/options",
                        "nano /etc/net/ifaces/gre1/options",
                        "mcedit /etc/net/ifaces/gre1/options",
                        "vim /etc/net/ifaces/gre1/options",
                        "cat << 'EOF' > /etc/net/ifaces/gre1/options",
                        "cat << EOF > /etc/net/ifaces/gre1/options",
                        "echo 'TYPE=iptun' > /etc/net/ifaces/gre1/options",
                        "echo 'TUNREMOTE=172.16.2.2' >> /etc/net/ifaces/gre1/options"
                ],
                "hint1": "Параметры GRE в Альте: TYPE=iptun, TUNTYPE=gre, TUNLOCAL (свой IP 172.16.1.2), TUNREMOTE (удаленный IP 172.16.2.2), TUNMTU=1476.",
                "hint2": "Используйте nano /etc/net/ifaces/gre1/options или: echo -e 'TYPE=iptun\\nTUNTYPE=gre\\nTUNLOCAL=172.16.1.2\\nTUNREMOTE=172.16.2.2\\nTUNTTL=255\\nTUNMTU=1476' > /etc/net/ifaces/gre1/options",
                "explanation": "Задает тип туннеля, внешние точки подключения и MTU 1476 (1500 минус 24 байта заголовка GRE)."
        },
        {
                "id": "cmd_6_2",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Назначьте IP-адрес 10.0.0.1/30 интерфейсу gre1 на HQ-RTR",
                "correctAnswers": [
                        "echo '10.0.0.1/30' > /etc/net/ifaces/gre1/ipv4address",
                        "echo 10.0.0.1/30 > /etc/net/ifaces/gre1/ipv4address"
                ],
                "hint1": "Локальный конец туннельной подсети point-to-point /30.",
                "hint2": "Синтаксис: echo '<IP/маска>' > /etc/net/ifaces/gre1/ipv4address",
                "explanation": "Назначает туннельный IP на стороне HQ."
        },
        {
                "id": "cmd_6_3",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Активируйте интерфейс туннеля gre1 с помощью утилиты ifup",
                "correctAnswers": [
                        "ifup gre1"
                ],
                "hint1": "Утилита подъема конкретного сетевого интерфейса в Альте.",
                "hint2": "Синтаксис: ifup <имя_интерфейса>",
                "explanation": "Поднимает виртуальный интерфейс gre1."
        },
        {
                "id": "cmd_6_3b",
                "topicId": 6,
                "host": "br-rtr",
                "prompt": "root@br-rtr:~# ",
                "task": "Перейдите на маршрутизатор филиала BR-RTR и создайте каталог интерфейса gre1 (/etc/net/ifaces/gre1)",
                "correctAnswers": [
                        "mkdir /etc/net/ifaces/gre1",
                        "mkdir -p /etc/net/ifaces/gre1"
                ],
                "hint1": "На стороне филиала также требуется создать каталог интерфейса gre1.",
                "hint2": "Синтаксис: mkdir -p /etc/net/ifaces/gre1",
                "explanation": "Создает каталог конфигурации туннеля gre1 на BR-RTR."
        },
        {
                "id": "cmd_6_3c",
                "topicId": 6,
                "host": "br-rtr",
                "prompt": "root@br-rtr:~# ",
                "task": "На BR-RTR настройте параметры туннеля gre1 (TUNLOCAL=172.16.2.2, TUNREMOTE=172.16.1.2, TUNMTU=1476) в /etc/net/ifaces/gre1/options",
                "correctAnswers": [
                        "echo -e 'TYPE=iptun\\nTUNTYPE=gre\\nTUNLOCAL=172.16.2.2\\nTUNREMOTE=172.16.1.2\\nTUNTTL=255\\nTUNMTU=1476' > /etc/net/ifaces/gre1/options",
                        "echo -e \"TYPE=iptun\\nTUNTYPE=gre\\nTUNLOCAL=172.16.2.2\\nTUNREMOTE=172.16.1.2\\nTUNTTL=255\\nTUNMTU=1476\" > /etc/net/ifaces/gre1/options",
                        "nano /etc/net/ifaces/gre1/options",
                        "mcedit /etc/net/ifaces/gre1/options",
                        "vim /etc/net/ifaces/gre1/options",
                        "cat << 'EOF' > /etc/net/ifaces/gre1/options",
                        "cat << EOF > /etc/net/ifaces/gre1/options",
                        "echo 'TYPE=iptun' > /etc/net/ifaces/gre1/options",
                        "echo 'TUNREMOTE=172.16.1.2' >> /etc/net/ifaces/gre1/options"
                ],
                "hint1": "На BR-RTR параметры зеркальные: TUNLOCAL=172.16.2.2, TUNREMOTE=172.16.1.2, TUNMTU=1476.",
                "hint2": "Используйте nano /etc/net/ifaces/gre1/options или: echo -e 'TYPE=iptun\\nTUNTYPE=gre\\nTUNLOCAL=172.16.2.2\\nTUNREMOTE=172.16.1.2\\nTUNTTL=255\\nTUNMTU=1476' > /etc/net/ifaces/gre1/options",
                "explanation": "Настраивает параметры туннеля со стороны филиала."
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
                "hint1": "Удаленная сторона туннеля в подсети 10.0.0.0/30.",
                "hint2": "Синтаксис: echo '<IP/маска>' > /etc/net/ifaces/gre1/ipv4address",
                "explanation": "Назначает туннельный IP на стороне филиала."
        },
        {
                "id": "cmd_6_5",
                "topicId": 6,
                "host": "br-rtr",
                "prompt": "root@br-rtr:~# ",
                "task": "Активируйте интерфейс туннеля gre1 на BR-RTR через ifup",
                "correctAnswers": [
                        "ifup gre1"
                ],
                "hint1": "Подъем туннельного адаптера на стороне филиала.",
                "hint2": "Шаблон: <утилита_поднятия_интерфейса> <имя_туннеля>",
                "explanation": "Инициализирует интерфейс туннеля на BR-RTR."
        },
        {
                "id": "cmd_6_6",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Проверьте связность по туннелю: отправьте 3 пинга с HQ-RTR на 10.0.0.2",
                "correctAnswers": [
                        "ping -c 3 10.0.0.2"
                ],
                "hint1": "Пинг удаленного туннельного адреса BR-RTR.",
                "hint2": "Синтаксис: ping -c 3 <IP_туннеля_BR>",
                "explanation": "Проверяет GRE-инкапсуляцию между маршрутизаторами."
        },
        {
                "id": "cmd_6_6b",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Проверьте MTU туннеля без фрагментации: отправьте с HQ-RTR 3 пакета размером 1448 байт с DF-битом на 10.0.0.2",
                "correctAnswers": [
                        "ping -c 3 -M do -s 1448 10.0.0.2",
                        "ping -M do -s 1448 -c 3 10.0.0.2",
                        "ping -c 3 -s 1448 -M do 10.0.0.2",
                        "ping -s 1448 -M do -c 3 10.0.0.2",
                        "ping -M do -c 3 -s 1448 10.0.0.2",
                        "ping -s 1448 -c 3 -M do 10.0.0.2"
                ],
                "hint1": "Ключ -M do запрещает фрагментацию (DF=1), а -s 1448 задает размер данных ICMP (1448 + 28 = 1476 байт MTU).",
                "hint2": "Синтаксис: ping -c 3 -M do -s 1448 10.0.0.2",
                "explanation": "Подтверждает, что пакеты максимального размера 1476 проходят через GRE-туннель без фрагментации."
        },
        {
                "id": "cmd_6_7",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Установите пакет динамической маршрутизации frr (FRRouting)",
                "correctAnswers": [
                        "apt-get install frr -y",
                        "apt-get install -y frr"
                ],
                "hint1": "Современный стек протоколов динамической маршрутизации в Linux.",
                "hint2": "Синтаксис: apt-get install <пакет> -y",
                "explanation": "Устанавливает демоны маршрутизации и консоль vtysh."
        },
        {
                "id": "cmd_6_8",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Перезапустите службу маршрутизации frr через systemctl",
                "correctAnswers": [
                        "systemctl restart frr",
                        "service frr restart"
                ],
                "hint1": "Перезапуск службы после включения ospfd=yes в /etc/frr/daemons.",
                "hint2": "Шаблон: systemctl <действие> <служба>",
                "explanation": "Запускает процесс ospfd."
        },
        {
                "id": "cmd_6_9",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Проверьте статус службы frr через systemctl status",
                "correctAnswers": [
                        "systemctl status frr",
                        "service frr status"
                ],
                "hint1": "Проверка активности сервиса маршрутизации.",
                "hint2": "Синтаксис: systemctl status <служба>",
                "explanation": "Подтверждает состояние active (running)."
        },
        {
                "id": "cmd_6_10",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Войдите в командную оболочку демона маршрутизации FRRouting",
                "correctAnswers": [
                        "vtysh"
                ],
                "hint1": "Единая консоль управления протоколами в FRRouting.",
                "hint2": "Синтаксис: vt...",
                "explanation": "Открывает оболочку со спецприглашением hq-rtr#."
        },
        {
                "id": "cmd_6_11",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "hq-rtr# ",
                "task": "Перейдите в режим глобальной конфигурации в консоли vtysh",
                "correctAnswers": [
                        "conf t",
                        "configure terminal"
                ],
                "hint1": "Команда перехода в глобальный конфигурационный режим.",
                "hint2": "Шаблон: <сокращение_configure_terminal>",
                "explanation": "Переводит CLI в режим hq-rtr(config)#."
        },
        {
                "id": "cmd_6_12",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "hq-rtr(config)# ",
                "task": "Включите контекст процесса маршрутизации OSPF",
                "correctAnswers": [
                        "router ospf"
                ],
                "hint1": "Запуск контекста OSPF.",
                "hint2": "Синтаксис: router <протокол>",
                "explanation": "Открывает контекст hq-rtr(config-router)#."
        },
        {
                "id": "cmd_6_13",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "hq-rtr(config-router)# ",
                "task": "Анонсируйте сеть туннеля 10.0.0.0/30 в зону area 0",
                "correctAnswers": [
                        "network 10.0.0.0/30 area 0"
                ],
                "hint1": "Директива network объявляет подсеть туннеля в магистральную зону.",
                "hint2": "Синтаксис: network <подсеть> area <зона>",
                "explanation": "Включает рассылку OSPF Hello поверх туннеля."
        },
        {
                "id": "cmd_6_14",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "hq-rtr(config-router)# ",
                "task": "Анонсируйте серверную сеть 192.168.1.0/27 в зону area 0",
                "correctAnswers": [
                        "network 192.168.1.0/27 area 0"
                ],
                "hint1": "Объявление серверного сегмента VLAN 100.",
                "hint2": "Синтаксис: network <подсеть> area 0",
                "explanation": "Передает маршрут к серверам в таблицу маршрутизации филиала."
        },
        {
                "id": "cmd_6_15",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "hq-rtr(config-if)# ",
                "task": "Включите аутентификацию message-digest на интерфейсе gre1 в vtysh",
                "correctAnswers": [
                        "ip ospf authentication message-digest"
                ],
                "hint1": "Включение криптографической аутентификации вместо открытого текста.",
                "hint2": "Синтаксис: ip ospf authentication <тип>",
                "explanation": "Активирует режим хеширования пакетов OSPF."
        },
        {
                "id": "cmd_6_16",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "hq-rtr(config-if)# ",
                "task": "Задайте MD5 ключ 1 с паролем 123qweR% на интерфейсе gre1",
                "correctAnswers": [
                        "ip ospf message-digest-key 1 md5 123qweR%"
                ],
                "hint1": "Указание номера ключа, алгоритма md5 и секретной строки.",
                "hint2": "Синтаксис: ip ospf message-digest-key <номер> md5 <пароль>",
                "explanation": "Защищает маршруты от подделки в транзитной сети."
        },
        {
                "id": "cmd_6_17",
                "topicId": 6,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Проверьте таблицу соседей OSPF однострочной командой из командной строки bash",
                "correctAnswers": [
                        "vtysh -c \"show ip ospf neighbor\"",
                        "vtysh -c 'show ip ospf neighbor'"
                ],
                "hint1": "Ключ -c утилиты vtysh для выполнения команды show ip ospf neighbor.",
                "hint2": "Синтаксис: vtysh -c \"команда_vtysh\"",
                "explanation": "Выводит состояние соседа 10.0.0.2 (Full)."
        },
        {
                "id": "cmd_6_18",
                "topicId": 6,
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "task": "Проверьте сквозную связность от HQ-SRV до сервера филиала BR-SRV (192.168.3.2)",
                "correctAnswers": [
                        "ping -c 3 192.168.3.2"
                ],
                "hint1": "Пакеты идут через VLAN 100 -> GRE -> OSPF -> LAN филиала.",
                "hint2": "Синтаксис: ping -c 3 <IP_сервера_филиала>",
                "explanation": "Подтверждает полную работоспособность маршрутизации между офисами."
        },
        {
                "id": "cmd_7_1",
                "topicId": 7,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "На HQ-RTR обновите кэш пакетов APT",
                "correctAnswers": [
                        "apt-get update"
                ],
                "hint1": "Синхронизация списков пакетов перед установкой службы.",
                "hint2": "Шаблон: <менеджер_пакетов> update",
                "explanation": "Обновляет метаданные репозиториев."
        },
        {
                "id": "cmd_7_2",
                "topicId": 7,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Установите пакет dnsmasq на маршрутизаторе HQ-RTR",
                "correctAnswers": [
                        "apt-get install dnsmasq -y",
                        "apt-get install -y dnsmasq"
                ],
                "hint1": "Легковесный DHCP и DNS-сервер.",
                "hint2": "Синтаксис: apt-get install <пакет> -y",
                "explanation": "Устанавливает пакет dnsmasq."
        },
        {
                "id": "cmd_7_3",
                "topicId": 7,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Проверьте установку dnsmasq с помощью утилиты which",
                "correctAnswers": [
                        "which dnsmasq"
                ],
                "hint1": "Команда поиска пути к исполняемому файлу в переменной PATH.",
                "hint2": "Шаблон: <утилита_поиска_в_PATH> <программа>",
                "explanation": "Выведет путь /usr/sbin/dnsmasq."
        },
        {
                "id": "cmd_7_4",
                "topicId": 7,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Перезапустите службу dnsmasq на HQ-RTR через systemctl",
                "correctAnswers": [
                        "systemctl restart dnsmasq",
                        "service dnsmasq restart"
                ],
                "hint1": "Перезапуск службы после внесения настроек пула в /etc/dnsmasq.conf.",
                "hint2": "Синтаксис: systemctl restart <демон>",
                "explanation": "Применяет конфигурацию DHCP-сервера."
        },
        {
                "id": "cmd_7_5",
                "topicId": 7,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Проверьте статус службы dnsmasq на HQ-RTR",
                "correctAnswers": [
                        "systemctl status dnsmasq",
                        "service dnsmasq status"
                ],
                "hint1": "Проверка статуса демона.",
                "hint2": "Синтаксис: systemctl status <демон>",
                "explanation": "Показывает active (running)."
        },
        {
                "id": "cmd_7_6",
                "topicId": 7,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "Проверьте, слушает ли dnsmasq порт DHCP (порт 67) утилитой ss",
                "correctAnswers": [
                        "ss -ulnp | grep dnsmasq",
                        "ss -ulnp | grep 67",
                        "ss -unlp | grep dnsmasq"
                ],
                "hint1": "Флаги ss: -u (udp), -l (listening), -n (numeric), -p (processes).",
                "hint2": "Синтаксис: ss -ulnp | grep <имя_или_порт>",
                "explanation": "Подтверждает, что dnsmasq ожидает DHCP-запросы на порту 67."
        },
        {
                "id": "cmd_7_7",
                "topicId": 7,
                "host": "hq-cli",
                "prompt": "root@hq-cli:~# ",
                "task": "На клиенте HQ-CLI проверьте состояние и адреса сетевых интерфейсов",
                "correctAnswers": [
                        "ip -br -c a",
                        "ip -br a",
                        "ip a"
                ],
                "hint1": "Компактный вывод сетевых адресов хоста.",
                "hint2": "Шаблон: ip <флаг_кратко> <флаг_цвет> a",
                "explanation": "Показывает статус интерфейса enp0s3.200."
        },
        {
                "id": "cmd_7_8",
                "topicId": 7,
                "host": "hq-cli",
                "prompt": "root@hq-cli:~# ",
                "task": "Освободите текущий полученный по DHCP сетевой адрес (release)",
                "correctAnswers": [
                        "dhclient -r",
                        "dhclient -r enp0s3.200",
                        "dhclient -r enp7s1.200"
                ],
                "hint1": "Флаг -r (release) отсылает DHCPRELEASE серверу.",
                "hint2": "Синтаксис: dhclient -<флаг_освобождения>",
                "explanation": "Сбрасывает текущую аренду адреса."
        },
        {
                "id": "cmd_7_9",
                "topicId": 7,
                "host": "hq-cli",
                "prompt": "root@hq-cli:~# ",
                "task": "Запросите новый IP-адрес по DHCP на интерфейсе enp0s3.200",
                "correctAnswers": [
                        "dhclient enp0s3.200",
                        "dhclient"
                ],
                "hint1": "Запуск процесса получения адреса клиентом.",
                "hint2": "Синтаксис: dhclient <имя_интерфейса>",
                "explanation": "Отправляет запрос серверу dnsmasq."
        },
        {
                "id": "cmd_7_10",
                "topicId": 7,
                "host": "hq-cli",
                "prompt": "root@hq-cli:~# ",
                "task": "Проверьте полученный шлюз по умолчанию на клиенте через таблицу маршрутизации",
                "correctAnswers": [
                        "ip route",
                        "ip r"
                ],
                "hint1": "Просмотр таблицы маршрутов для проверки опции 3 (Router).",
                "hint2": "Шаблон: ip <подсистема_маршрутизации>",
                "explanation": "Должна появиться строка default via 192.168.2.1."
        },
        {
                "id": "cmd_7_11",
                "topicId": 7,
                "host": "hq-cli",
                "prompt": "root@hq-cli:~# ",
                "task": "Проверьте текущий файл /etc/resolv.conf на клиенте",
                "correctAnswers": [
                        "cat /etc/resolv.conf",
                        "less /etc/resolv.conf"
                ],
                "hint1": "Просмотр адресов DNS-серверов в системе.",
                "hint2": "Шаблон: <утилита_вывода_файла> /etc/resolv.conf",
                "explanation": "Показывает текущие резолверы."
        },
        {
                "id": "cmd_7_12",
                "topicId": 7,
                "host": "hq-cli",
                "prompt": "root@hq-cli:~# ",
                "task": "Проверьте пинг до шлюза HQ-RTR (192.168.2.1), отправив 3 пакета",
                "correctAnswers": [
                        "ping -c 3 192.168.2.1"
                ],
                "hint1": "Проверка связи клиента с локальным шлюзом.",
                "hint2": "Синтаксис: ping -c 3 <IP_шлюза>",
                "explanation": "Подтверждает доступность маршрутизатора из VLAN 200."
        },
        {
                "id": "cmd_7_13",
                "topicId": 7,
                "host": "hq-cli",
                "prompt": "root@hq-cli:~# ",
                "task": "Проверьте доступ к сети филиала: отправьте 3 пинга на BR-SRV (192.168.3.2)",
                "correctAnswers": [
                        "ping -c 3 192.168.3.2"
                ],
                "hint1": "Проверка маршрутизации от клиента через GRE-туннель.",
                "hint2": "Синтаксис: ping -c 3 <IP_сервера_филиала>",
                "explanation": "Подтверждает сквозную связность от клиента до сервера филиала."
        },
        {
                "id": "cmd_7_14",
                "topicId": 7,
                "host": "hq-cli",
                "prompt": "root@hq-cli:~# ",
                "task": "Проверьте доступ в интернет с клиента, отправив 3 пинга на ya.ru",
                "correctAnswers": [
                        "ping -c 3 ya.ru",
                        "ping -c 3 yandex.ru"
                ],
                "hint1": "Проверка работы NAT для клиентов VLAN 200.",
                "hint2": "Шаблон: ping -c <число_пакетов> <домен>",
                "explanation": "Подтверждает, что клиенты имеют выход в глобальную сеть."
        },
        {
                "id": "cmd_8_1",
                "topicId": 8,
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "task": "На сервере HQ-SRV обновите кэш пакетов APT",
                "correctAnswers": [
                        "apt-get update"
                ],
                "hint1": "Обновление индексов пакетов перед установкой DNS.",
                "hint2": "Шаблон: <менеджер_пакетов> update",
                "explanation": "Синхронизирует репозитории на сервере."
        },
        {
                "id": "cmd_8_2",
                "topicId": 8,
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "task": "Установите пакет dnsmasq на сервере HQ-SRV",
                "correctAnswers": [
                        "apt-get install dnsmasq -y",
                        "apt-get install -y dnsmasq"
                ],
                "hint1": "Установка демона, который будет авторитетным DNS для зоны au-team.irpo.",
                "hint2": "Синтаксис: apt-get install <пакет> -y",
                "explanation": "Устанавливает dnsmasq на сервер."
        },
        {
                "id": "cmd_8_3",
                "topicId": 8,
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "task": "Проверьте наличие исполняемого файла dnsmasq через which",
                "correctAnswers": [
                        "which dnsmasq"
                ],
                "hint1": "Поиск пути к бинарному файлу.",
                "hint2": "Шаблон: <утилита_поиска_в_PATH> <демон>",
                "explanation": "Показывает путь /usr/sbin/dnsmasq."
        },
        {
                "id": "cmd_8_4",
                "topicId": 8,
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "task": "Укажите loopback 127.0.0.1 в resolv.conf интерфейса enp0s3.100 на сервере",
                "correctAnswers": [
                        "echo 'nameserver 127.0.0.1' > /etc/net/ifaces/enp0s3.100/resolv.conf",
                        "echo nameserver 127.0.0.1 > /etc/net/ifaces/enp0s3.100/resolv.conf"
                ],
                "hint1": "Чтобы сервер использовал собственный DNS-демон для разрешения имен.",
                "hint2": "Синтаксис: echo 'nameserver <IP_loopback>' > .../resolv.conf",
                "explanation": "Перенаправляет системные запросы сервера на локальный dnsmasq."
        },
        {
                "id": "cmd_8_5",
                "topicId": 8,
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "task": "Перезапустите службу dnsmasq на сервере HQ-SRV",
                "correctAnswers": [
                        "systemctl restart dnsmasq",
                        "service dnsmasq restart"
                ],
                "hint1": "Перезапуск службы после добавления прямых (A) и обратных (PTR) записей.",
                "hint2": "Шаблон: systemctl <действие> <демон>",
                "explanation": "Активирует корпоративную зону DNS."
        },
        {
                "id": "cmd_8_6",
                "topicId": 8,
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "task": "Проверьте статус службы dnsmasq на сервере HQ-SRV",
                "correctAnswers": [
                        "systemctl status dnsmasq",
                        "service dnsmasq status"
                ],
                "hint1": "Проверка активности службы.",
                "hint2": "Шаблон: systemctl <действие> <демон>",
                "explanation": "Показывает active (running)."
        },
        {
                "id": "cmd_8_7",
                "topicId": 8,
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "task": "Проверьте утилитой ss, слушает ли dnsmasq UDP-порт 53",
                "correctAnswers": [
                        "ss -ulnp | grep dnsmasq",
                        "ss -ulnp | grep 53",
                        "ss -unlp | grep dnsmasq"
                ],
                "hint1": "Флаги: -u (udp), -l (listening), -n (numeric), -p (processes).",
                "hint2": "Синтаксис: ss -ulnp | grep <имя_или_порт>",
                "explanation": "Подтверждает готовность DNS принимать запросы на 192.168.1.2:53."
        },
        {
                "id": "cmd_8_8",
                "topicId": 8,
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "task": "Проверьте разрешение прямой зоны: отправьте 3 пинга на hq-rtr.au-team.irpo",
                "correctAnswers": [
                        "ping -c 3 hq-rtr.au-team.irpo"
                ],
                "hint1": "Имя маршрутизатора должно разрешиться в IP 192.168.1.1.",
                "hint2": "Синтаксис: ping -c 3 <FQDN>",
                "explanation": "Подтверждает корректную работу A-записей зоны."
        },
        {
                "id": "cmd_8_9",
                "topicId": 8,
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "task": "Проверьте разрешение узла филиала br-rtr.au-team.irpo (3 пинга)",
                "correctAnswers": [
                        "ping -c 3 br-rtr.au-team.irpo"
                ],
                "hint1": "Имя маршрутизатора филиала должно разрешиться в IP 192.168.3.1.",
                "hint2": "Синтаксис: ping -c 3 <FQDN_филиала>",
                "explanation": "Подтверждает работу DNS вместе с OSPF и туннелем."
        },
        {
                "id": "cmd_8_10",
                "topicId": 8,
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "task": "Проверьте обратную зону PTR: отправьте пинг на IP 192.168.1.1",
                "correctAnswers": [
                        "ping -c 3 192.168.1.1"
                ],
                "hint1": "В выводе ping должно отображаться доменное имя узла hq-rtr.au-team.irpo.",
                "hint2": "Синтаксис: ping -c 3 <IP>",
                "explanation": "Подтверждает корректность PTR-записей in-addr.arpa."
        },
        {
                "id": "cmd_8_11",
                "topicId": 8,
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "task": "Проверьте рекурсивную пересылку внешних запросов на forwarder 77.88.8.8 (пинг ya.ru)",
                "correctAnswers": [
                        "ping -c 3 ya.ru",
                        "ping -c 3 yandex.ru"
                ],
                "hint1": "Локальный DNS должен запросить внешний адрес у Яндекса и вернуть клиенту.",
                "hint2": "Синтаксис: ping -c 3 <внешнее_имя>",
                "explanation": "Подтверждает работу директивы server=77.88.8.8."
        },
        {
                "id": "cmd_8_12",
                "topicId": 8,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "На HQ-RTR перезапустите dnsmasq после добавления опции 6 (DNS-сервер)",
                "correctAnswers": [
                        "systemctl restart dnsmasq",
                        "service dnsmasq restart"
                ],
                "hint1": "Применение строки dhcp-option=6,192.168.1.2 в файле /etc/dnsmasq.conf.",
                "hint2": "Шаблон: systemctl <действие> <демон>",
                "explanation": "Теперь DHCP выдает клиентам адрес нашего DNS-сервера."
        },
        {
                "id": "cmd_8_13",
                "topicId": 8,
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "task": "На HQ-RTR укажите корпоративный DNS 192.168.1.2 в resolv.conf интерфейса enp7s1",
                "correctAnswers": [
                        "echo 'nameserver 192.168.1.2' > /etc/net/ifaces/enp7s1/resolv.conf",
                        "echo nameserver 192.168.1.2 > /etc/net/ifaces/enp7s1/resolv.conf"
                ],
                "hint1": "Маршрутизатор HQ переключается на использование сервера HQ-SRV.",
                "hint2": "Синтаксис: echo 'nameserver <IP_HQ_SRV>' > .../resolv.conf",
                "explanation": "Направляет запросы маршрутизатора на внутренний DNS."
        },
        {
                "id": "cmd_8_14",
                "topicId": 8,
                "host": "br-rtr",
                "prompt": "root@br-rtr:~# ",
                "task": "На BR-RTR укажите корпоративный DNS 192.168.1.2 в resolv.conf интерфейса enp7s1",
                "correctAnswers": [
                        "echo 'nameserver 192.168.1.2' > /etc/net/ifaces/enp7s1/resolv.conf",
                        "echo nameserver 192.168.1.2 > /etc/net/ifaces/enp7s1/resolv.conf"
                ],
                "hint1": "Маршрутизатор филиала обращается к DNS серверу через туннель GRE.",
                "hint2": "Синтаксис: echo 'nameserver <IP_HQ_SRV>' > .../resolv.conf",
                "explanation": "Настраивает резолвер филиала."
        },
        {
                "id": "cmd_8_15",
                "topicId": 8,
                "host": "br-srv",
                "prompt": "root@br-srv:~# ",
                "task": "На BR-SRV укажите корпоративный DNS 192.168.1.2 в resolv.conf интерфейса enp0s3 (или enp7s1)",
                "correctAnswers": [
                        "echo 'nameserver 192.168.1.2' > /etc/net/ifaces/enp0s3/resolv.conf",
                        "echo nameserver 192.168.1.2 > /etc/net/ifaces/enp0s3/resolv.conf",
                        "echo 'nameserver 192.168.1.2' > /etc/net/ifaces/enp7s1/resolv.conf",
                        "echo nameserver 192.168.1.2 > /etc/net/ifaces/enp7s1/resolv.conf"
                ],
                "hint1": "Сервер филиала переключается на корпоративный DNS.",
                "hint2": "Синтаксис: echo 'nameserver <IP_HQ_SRV>' > /etc/net/ifaces/enp0s3/resolv.conf (или enp7s1)",
                "explanation": "Настраивает DNS на сервере филиала."
        },
        {
                "id": "cmd_8_16",
                "topicId": 8,
                "host": "hq-cli",
                "prompt": "user@hq-cli:~$ ",
                "task": "На HQ-CLI выведите текущие назначенные DNS-серверы хоста",
                "correctAnswers": [
                        "cat /etc/resolv.conf",
                        "less /etc/resolv.conf"
                ],
                "hint1": "Проверка, что DHCP автоматически передал nameserver 192.168.1.2.",
                "hint2": "Шаблон: <утилита_вывода_файла> /etc/resolv.conf",
                "explanation": "Подтверждает получение опции 6 клиентом."
        },
        {
                "id": "cmd_8_17",
                "topicId": 8,
                "host": "hq-cli",
                "prompt": "user@hq-cli:~$ ",
                "task": "Подключитесь с клиента по SSH к серверу HQ-SRV по домену hq-srv.au-team.irpo на порт 2026",
                "correctAnswers": [
                        "ssh sshuser@hq-srv.au-team.irpo -p 2026",
                        "ssh -p 2026 sshuser@hq-srv.au-team.irpo"
                ],
                "hint1": "Подключение пользователем sshuser на защищенный порт 2026 с использованием доменного имени.",
                "hint2": "Синтаксис: ssh <пользователь>@<FQDN> -p <порт>",
                "explanation": "Финальная точка демонстрации стенда: DNS, OSPF, VLAN и SSH работают безупречно!"
        }
],

    // 8. Задания для сдачи преподавателю (Живой экзамен)
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

    teacherTasks: [
        {
                "id": "teach_1",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "Так, покажи мне, какое системное время и какой часовой пояс сейчас выставлены на этом маршрутизаторе.",
                "task": "Показать системное время и текущий часовой пояс",
                "correctAnswers": [
                        "timedatectl",
                        "timedatectl status",
                        "timedatectl | head -n 5"
                ],
                "hint1": "Вспомните стандартную утилиту systemd для проверки времени и таймзоны.",
                "hint2": "Шаблон: <утилита_времени_systemd>",
                "explanation": "timedatectl выводит Local time, Time zone (Asia/Barnaul, +07) и статус синхронизации NTP."
        },
        {
                "id": "teach_2",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "Хорошо. А теперь переключи часовой пояс на московское время (Europe/Moscow).",
                "task": "Сменить часовой пояс на Europe/Moscow",
                "correctAnswers": [
                        "timedatectl set-timezone Europe/Moscow"
                ],
                "hint1": "Используйте подкоманду set-timezone утилиты timedatectl.",
                "hint2": "Шаблон: timedatectl set-timezone <Регион/Город>",
                "explanation": "Переключает системную таймзону на московское время (MSK, +03)."
        },
        {
                "id": "teach_3",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "Отлично. А теперь верни регламентный часовой пояс нашего стенда — Asia/Barnaul.",
                "task": "Вернуть часовой пояс стенда (Asia/Barnaul)",
                "correctAnswers": [
                        "timedatectl set-timezone Asia/Barnaul"
                ],
                "hint1": "Та же утилита с часовым поясом Asia/Barnaul.",
                "hint2": "Шаблон: timedatectl set-timezone Asia/Barnaul",
                "explanation": "Возвращает таймзону Алтайского края (+07) по регламенту практических работ."
        },
        {
                "id": "teach_4",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "Смени сетевое имя этого хоста на test-rtr.au-team.irpo.",
                "task": "Задать FQDN test-rtr.au-team.irpo",
                "correctAnswers": [
                        "hostnamectl set-hostname test-rtr.au-team.irpo",
                        "hostnamectl set-hostname test-rtr.au-team.irpo; exec bash",
                        "hostnamectl set-hostname test-rtr.au-team.irpo && exec bash"
                ],
                "hint1": "Утилита systemd для изменения hostname хоста.",
                "hint2": "Шаблон: hostnamectl set-hostname <FQDN>",
                "explanation": "Записывает новое имя в /etc/hostname."
        },
        {
                "id": "teach_5",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "Верни правильное доменное имя маршрутизатора hq-rtr.au-team.irpo и обнови командную оболочку bash.",
                "task": "Вернуть FQDN hq-rtr.au-team.irpo и обновить сессию bash",
                "correctAnswers": [
                        "hostnamectl set-hostname hq-rtr.au-team.irpo; exec bash",
                        "hostnamectl set-hostname hq-rtr.au-team.irpo && exec bash",
                        "hostnamectl set-hostname hq-rtr.au-team.irpo"
                ],
                "hint1": "Смените имя и перезапустите оболочку через exec bash.",
                "hint2": "Шаблон: hostnamectl set-hostname <FQDN>; exec bash",
                "explanation": "Возвращает регламентный FQDN и обновляет строку root@hq-rtr в prompt."
        },
        {
                "id": "teach_6",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "Покажи мне все сетевые интерфейсы, их статус и IP-адреса. Желательно кратко и наглядно.",
                "task": "Вывести список сетевых интерфейсов и их IP-адресов",
                "correctAnswers": [
                        "ip -br -c a",
                        "ip -br -c addr",
                        "ip -br a",
                        "ip a"
                ],
                "hint1": "Используйте утилиту ip address с ключами краткого вывода (-br) и цвета (-c).",
                "hint2": "Шаблон: ip -br -c a",
                "explanation": "Показывает состояние UP/DOWN и назначенные IP-адреса на всех сетевых адаптерах."
        },
        {
                "id": "teach_7",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "Покажи таблицу маршрутизации на этом маршрутизаторе. Куда у тебя уходит дефолтный маршрут?",
                "task": "Показать таблицу маршрутизации ядра Linux",
                "correctAnswers": [
                        "ip r",
                        "ip route",
                        "ip route show"
                ],
                "hint1": "Команда просмотра таблицы маршрутов в подсистеме iproute2.",
                "hint2": "Шаблон: ip r[oute]",
                "explanation": "Выводит таблицу маршрутов ядра, включая default via 172.16.1.1 dev enp7s1."
        },
        {
                "id": "teach_8",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "Покажи мне настройки интерфейса VLAN 100 на этом маршрутизаторе.",
                "task": "Показать конфигурацию интерфейса VLAN 100",
                "correctAnswers": [
                        "cat /etc/net/ifaces/enp7s2.100/options",
                        "less /etc/net/ifaces/enp7s2.100/options",
                        "cat /etc/net/ifaces/enp7s2.100/ipv4address",
                        "cat /etc/net/ifaces/enp7s2.100/*",
                        "head /etc/net/ifaces/enp7s2.100/options"
                ],
                "hint1": "В ОС «Альт» настройки интерфейсов хранятся в каталоге /etc/net/ifaces/<интерфейс>/",
                "hint2": "Шаблон: cat /etc/net/ifaces/<имя_интерфейса>/options",
                "explanation": "Файл options содержит HOST=enp7s2 и TYPE=vlan, а ipv4address содержит 192.168.1.1/27."
        },
        {
                "id": "teach_9",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "Маршрутизация между сетями работает? Покажи, включена ли пересылка IPv4-пакетов в ядре.",
                "task": "Проверить состояние форвардинга IPv4 в ядре",
                "correctAnswers": [
                        "sysctl net.ipv4.ip_forward",
                        "cat /proc/sys/net/ipv4/ip_forward",
                        "sysctl -a | grep ip_forward"
                ],
                "hint1": "Параметр ядра проверяется утилитой sysctl net.ipv4.ip_forward или через файловую систему /proc.",
                "hint2": "Шаблон: sysctl net.ipv4.ip_forward",
                "explanation": "Вывод net.ipv4.ip_forward = 1 подтверждает, что маршрутизация пакетов между интерфейсами активна."
        },
        {
                "id": "teach_10",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "Покажи настройки NAT на внешнем интерфейсе. Где у тебя маскировка?",
                "task": "Показать правила трансляции адресов (NAT)",
                "correctAnswers": [
                        "iptables -t nat -L",
                        "iptables -t nat -nvL",
                        "iptables -t nat -S",
                        "iptables -t nat -L -v -n",
                        "iptables -t nat -L POSTROUTING"
                ],
                "hint1": "Утилита iptables с указанием таблицы nat и ключом вывода списка правил (-L или -S).",
                "hint2": "Шаблон: iptables -t nat -L",
                "explanation": "Отображает цепочку POSTROUTING с правилом MASQUERADE для исходящих пакетов через интерфейс enp7s1."
        },
        {
                "id": "teach_11",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "А как правила NAT восстанавливаются после перезагрузки маршрутизатора? Покажи, где у тебя автозагрузка.",
                "task": "Показать задачи автозагрузки в планировщике cron",
                "correctAnswers": [
                        "crontab -l",
                        "cat /var/spool/cron/root",
                        "cat /etc/crontab"
                ],
                "hint1": "В методичке правила восстанавливаются через планировщик cron при старте системы (@reboot).",
                "hint2": "Шаблон: crontab -l",
                "explanation": "crontab -l выводит строку @reboot /sbin/iptables-restore < /root/iptables_rules."
        },
        {
                "id": "teach_12",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "Перейдем к GRE-туннелю. Покажи настройки туннельного интерфейса gre1 — какой там MTU и удалённый IP.",
                "task": "Показать параметры конфигурации туннеля gre1",
                "correctAnswers": [
                        "cat /etc/net/ifaces/gre1/options",
                        "less /etc/net/ifaces/gre1/options",
                        "cat /etc/net/ifaces/gre1/ipv4address"
                ],
                "hint1": "В Альт Линукс параметры туннеля записаны в каталоге интерфейса gre1 в файле options.",
                "hint2": "Шаблон: cat /etc/net/ifaces/gre1/options",
                "explanation": "Содержит TUNLOCAL=172.16.1.2, TUNREMOTE=172.16.2.2, TUNMTU=1476 и TUNTTL=255."
        },
        {
                "id": "teach_13",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "Проверь связность по туннелю: пингани маршрутизатор филиала по туннельному IP (3 пакета).",
                "task": "Проверить доступность удаленного конца туннеля (10.0.0.2)",
                "correctAnswers": [
                        "ping -c 3 10.0.0.2"
                ],
                "hint1": "IP-адрес филиала внутри туннельной подсети 10.0.0.0/30 — это 10.0.0.2.",
                "hint2": "Шаблон: ping -c 3 10.0.0.2",
                "explanation": "Подтверждает корректную инкапсуляцию GRE между головным офисом и филиалом."
        },
        {
                "id": "teach_14",
                "host": "hq-rtr",
                "prompt": "root@hq-rtr:~# ",
                "teacherSpeech": "Зайди в консоль управления маршрутизатором FRR, проверим OSPF.",
                "task": "Войти в интерактивную оболочку FRRouting",
                "correctAnswers": [
                        "vtysh"
                ],
                "hint1": "Единая командная оболочка пакета FRRouting.",
                "hint2": "Шаблон: vt...",
                "explanation": "vtysh открывает консоль со специальным шеллом hq-rtr# для настройки протоколов маршрутизации."
        },
        {
                "id": "teach_15",
                "host": "hq-rtr",
                "prompt": "hq-rtr# ",
                "teacherSpeech": "Покажи состояние соседства по OSPF с филиалом. В каком статусе adjacency?",
                "task": "Показать таблицу соседей OSPF в vtysh",
                "correctAnswers": [
                        "show ip ospf neighbor",
                        "sh ip ospf neighbor",
                        "sh ip ospf nei"
                ],
                "hint1": "Cisco-подобная команда инспекции соседства в OSPF.",
                "hint2": "Шаблон: show ip ospf neighbor",
                "explanation": "Выводит соседа 10.0.0.2 в состоянии Full/Backup или Full/DROther."
        },
        {
                "id": "teach_16",
                "host": "hq-rtr",
                "prompt": "hq-rtr# ",
                "teacherSpeech": "Покажи мне таблицу маршрутов, полученных именно по протоколу OSPF.",
                "task": "Вывести OSPF-маршруты в vtysh",
                "correctAnswers": [
                        "show ip route ospf",
                        "sh ip ro ospf",
                        "sh ip route ospf"
                ],
                "hint1": "Команда show ip route с фильтром по протоколу ospf.",
                "hint2": "Шаблон: show ip route <протокол>",
                "explanation": "Показывает динамический маршрут к сети филиала 192.168.3.0/28 через туннельный шлюз 10.0.0.2."
        },
        {
                "id": "teach_17",
                "host": "hq-rtr",
                "prompt": "hq-rtr# ",
                "teacherSpeech": "Хорошо. Выходи из консоли FRR обратно в bash.",
                "task": "Выйти из vtysh в оболочку Linux",
                "correctAnswers": [
                        "exit",
                        "quit"
                ],
                "hint1": "Стандартная команда выхода из шелла.",
                "hint2": "Шаблон: exit",
                "explanation": "Возвращает пользователя в терминал bash: root@hq-rtr:~#."
        },
        {
                "id": "teach_18",
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "teacherSpeech": "Переходим на сервер HQ-SRV. Покажи, что служба DNS запущена и работает в системе.",
                "task": "Проверить статус службы dnsmasq на HQ-SRV",
                "correctAnswers": [
                        "systemctl status dnsmasq",
                        "service dnsmasq status"
                ],
                "hint1": "Команда проверки статуса службы в systemd.",
                "hint2": "Шаблон: systemctl status <демон>",
                "explanation": "Подтверждает состояние active (running) для службы dnsmasq."
        },
        {
                "id": "teach_19",
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "teacherSpeech": "Покажи, что твой DNS-сервер реально слушает стандартный DNS-порт по UDP.",
                "task": "Проверить прослушивание UDP-порта 53 (DNS)",
                "correctAnswers": [
                        "ss -ulnp | grep dnsmasq",
                        "ss -ulnp | grep 53",
                        "ss -unlp | grep dnsmasq",
                        "ss -unlp | grep 53",
                        "ss -ulnp"
                ],
                "hint1": "Утилита просмотра сокетов ss с ключами udp (-u), listening (-l), numeric (-n), process (-p).",
                "hint2": "Шаблон: ss -ulnp | grep <имя_или_порт>",
                "explanation": "Выводит строку UNCONN 0 0 192.168.1.2:53 и 127.0.0.1:53 процесс dnsmasq."
        },
        {
                "id": "teach_20",
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "teacherSpeech": "Проверь разрешение внешних доменных имён и выход в интернет с сервера (3 пакета на ya.ru).",
                "task": "Проверить резолвинг и пинг ya.ru",
                "correctAnswers": [
                        "ping -c 3 ya.ru",
                        "ping -c 3 yandex.ru"
                ],
                "hint1": "Команда ping с флагом -c 3 до внешнего домена ya.ru.",
                "hint2": "Шаблон: ping -c 3 ya.ru",
                "explanation": "Подтверждает корректную работу форвардера server=77.88.8.8 и шлюза 192.168.1.1."
        },
        {
                "id": "teach_21",
                "host": "hq-cli",
                "prompt": "root@hq-cli:~# ",
                "teacherSpeech": "Перейди на клиентскую машину HQ-CLI. Обнови аренду адреса по DHCP на пользовательском интерфейсе.",
                "task": "Освободить старый IP и получить новый по DHCP на HQ-CLI",
                "correctAnswers": [
                        "dhclient -r && dhclient enp0s3.200",
                        "dhclient -r; dhclient enp0s3.200",
                        "dhclient -r && dhclient",
                        "dhclient -r"
                ],
                "hint1": "Утилита dhclient: сначала освобождение (-r), затем запрос адреса на интерфейсе VLAN 200.",
                "hint2": "Шаблон: dhclient -r && dhclient <интерфейс>",
                "explanation": "dhclient -r отправляет DHCPRELEASE, а dhclient enp0s3.200 запрашивает новый адрес из пула 192.168.2.2-14."
        },
        {
                "id": "teach_22",
                "host": "hq-cli",
                "prompt": "user@hq-cli:~$ ",
                "teacherSpeech": "Покажи, какой DNS-сервер получил клиент от нашего DHCP-сервера.",
                "task": "Проверить адреса DNS-серверов в системе клиента",
                "correctAnswers": [
                        "cat /etc/resolv.conf",
                        "less /etc/resolv.conf",
                        "cat /etc/resolv.conf | grep nameserver"
                ],
                "hint1": "Текущие резолверы хоста записаны в системном файле /etc/resolv.conf.",
                "hint2": "Шаблон: cat /etc/resolv.conf",
                "explanation": "В файле должна присутствовать строка nameserver 192.168.1.2, полученная по DHCP-опции 6."
        },
        {
                "id": "teach_23",
                "host": "hq-cli",
                "prompt": "user@hq-cli:~$ ",
                "teacherSpeech": "Финальная проверка стенда: подключись с клиента по SSH к серверу HQ-SRV по его доменному имени. Порт нестандартный — 2026, пользователь sshuser.",
                "task": "Подключиться по SSH к hq-srv.au-team.irpo на порт 2026",
                "correctAnswers": [
                        "ssh sshuser@hq-srv.au-team.irpo -p 2026",
                        "ssh -p 2026 sshuser@hq-srv.au-team.irpo"
                ],
                "hint1": "Команда ssh с указанием имени пользователя, FQDN сервера и флага порта -p 2026.",
                "hint2": "Шаблон: ssh <пользователь>@<FQDN> -p <порт>",
                "explanation": "Успешный вход подтверждает корректную работу всей связки: VLAN 200, маршрутизации, DNS-резолвинга и SSH на порту 2026."
        },
        {
                "id": "teach_24",
                "host": "hq-srv",
                "prompt": "root@hq-srv:~# ",
                "teacherSpeech": "Отлично! Напоследок перезапусти службу сети на сервере, чтобы подтвердить сохранение настроек.",
                "task": "Перезапустить сетевую службу network",
                "correctAnswers": [
                        "systemctl restart network",
                        "service network restart"
                ],
                "hint1": "Перезапуск сетевого демона network через systemctl.",
                "hint2": "Шаблон: systemctl restart network",
                "explanation": "Перезапускает подсистему /etc/net и применяет все профили интерфейсов."
        }
],

    // Новые модули: Аварии, Чтение вывода, Путь пакета, Устный опрос
    incidents: [
        {
                "id": "inc_1",
                "title": "Авария #1: Пропал доступ в интернет у клиентов (ping ya.ru не идёт)",
                "symptom": "Клиент HQ-CLI не может открыть ya.ru. Пинг с маршрутизатора HQ-RTR на ya.ru даёт 100% потерю пакетов.",
                "host": "hq-rtr",
                "steps": [
                        {
                                "prompt": "root@hq-rtr:~# ",
                                "goal": "Шаг 1: Проверьте статус внешнего интерфейса enp7s1 и наличие IP-адреса",
                                "validCommands": [
                                        "ip -br -c a",
                                        "ip a",
                                        "ip -br a",
                                        "ip addr"
                                ],
                                "output": "enp7s1           UP             172.16.1.2/28\n[i] Внешний линк маршрутизатора поднят, IP 172.16.1.2/28 на месте.",
                                "explanation": "Физика и IP-адрес в порядке. Проверяем связь со следующим узлом."
                        },
                        {
                                "prompt": "root@hq-rtr:~# ",
                                "goal": "Шаг 2: Проверьте доступность шлюза провайдера ISP (172.16.1.1)",
                                "validCommands": [
                                        "ping -c 2 172.16.1.1",
                                        "ping -c 3 172.16.1.1",
                                        "ping 172.16.1.1"
                                ],
                                "output": "2 packets transmitted, 2 received, 0% packet loss, time 1002ms\nrtt min/avg/max/mdev = 0.384/0.412/0.440/0.028 ms\n[i] Провайдер ISP отвечает мгновенно.",
                                "explanation": "Линк до ISP работает. Проблема локализована на самом роутере HQ-RTR."
                        },
                        {
                                "prompt": "root@hq-rtr:~# ",
                                "goal": "Шаг 3: Проверьте, включена ли пересылка пакетов (forwarding) в ядре Linux",
                                "validCommands": [
                                        "sysctl net.ipv4.ip_forward",
                                        "cat /proc/sys/net/ipv4/ip_forward"
                                ],
                                "output": "net.ipv4.ip_forward = 1\n[i] Ядро Linux разрешает маршрутизацию пакетов между интерфейсами.",
                                "explanation": "Форвардинг включен. Теперь проверяем правила трансляции сетевых адресов (NAT)."
                        },
                        {
                                "prompt": "root@hq-rtr:~# ",
                                "goal": "Шаг 4: Проверьте активные правила трансляции адресов NAT в iptables",
                                "validCommands": [
                                        "iptables -t nat -L",
                                        "iptables -t nat -nvL",
                                        "iptables -t nat -S",
                                        "iptables -t nat -L -v -n",
                                        "iptables -t nat -L POSTROUTING"
                                ],
                                "output": "Chain PREROUTING (policy ACCEPT)\nChain INPUT (policy ACCEPT)\nChain POSTROUTING (policy ACCEPT)\n[!] ВНИМАНИЕ: Цепочка POSTROUTING абсолютно пуста! Правило MASQUERADE отсутствует!",
                                "explanation": "ПРИЧИНА НАЙДЕНА: Пакеты из локальной сети уходят к ISP со своими серыми адресами 192.168.0.0 и отбрасываются провайдером."
                        },
                        {
                                "prompt": "root@hq-rtr:~# ",
                                "goal": "Шаг 5 (Устранение): Добавьте правило MASQUERADE для внешнего интерфейса enp7s1 в таблицу nat",
                                "validCommands": [
                                        "iptables -t nat -A POSTROUTING -o enp7s1 -j MASQUERADE"
                                ],
                                "output": "[OK] Правило NAT успешно добавлено в цепочку POSTROUTING.",
                                "explanation": "Теперь роутер будет подменять адрес источника на свой внешний IP 172.16.1.2."
                        },
                        {
                                "prompt": "root@hq-rtr:~# ",
                                "goal": "Шаг 6 (Контроль): Проверьте пинг внешнего хоста ya.ru (3 пакета)",
                                "validCommands": [
                                        "ping -c 3 ya.ru",
                                        "ping -c 2 ya.ru",
                                        "ping ya.ru"
                                ],
                                "output": "3 packets transmitted, 3 received, 0% packet loss, time 2003ms\nrtt min/avg/max = 14.120/14.850/15.340 ms\n🎉 АВАРИЯ УСТРАНЕНА! Доступ в интернет восстановлен для всего офиса.",
                                "explanation": "Стенд полностью восстановил работоспособность. NAT работает!"
                        }
                ]
        },
        {
                "id": "inc_2",
                "title": "Авария #2: OSPF не видит соседа филиала (show ip ospf neighbor пустой)",
                "symptom": "Маршруты в сеть филиала 192.168.3.0/28 пропали из таблицы маршрутизации. Вывод show ip ospf neighbor пуст.",
                "host": "hq-rtr",
                "steps": [
                        {
                                "prompt": "root@hq-rtr:~# ",
                                "goal": "Шаг 1: Проверьте статус соседей OSPF через vtysh",
                                "validCommands": [
                                        "vtysh -c 'show ip ospf neighbor'",
                                        "vtysh -c \"show ip ospf neighbor\"",
                                        "vtysh"
                                ],
                                "output": "hq-rtr# show ip ospf neighbor\n(пустой вывод — соседей нет!)\n[!] OSPF Hello-пакеты не доходят до соседа 10.0.0.2.",
                                "explanation": "Соседство разорвано. Первым делом проверяем канал передачи — интерфейс туннеля gre1."
                        },
                        {
                                "prompt": "root@hq-rtr:~# ",
                                "goal": "Шаг 2: Проверьте состояние всех интерфейсов утилитой ip -br -c a",
                                "validCommands": [
                                        "ip -br -c a",
                                        "ip -br a",
                                        "ip a"
                                ],
                                "output": "lo               UNKNOWN        127.0.0.1/8\nenp7s1           UP             172.16.1.2/28\nenp7s2           UP\nenp7s2.100       UP             192.168.1.1/27\nenp7s2.200       UP             192.168.2.1/28\ngre1@NONE        DOWN           10.0.0.1/30\n[!] НАЙДЕНА ПРОБЛЕМА: Интерфейс gre1 находится в состоянии DOWN!",
                                "explanation": "Туннель выключен административно. OSPF не может передавать пакеты через выключенный интерфейс."
                        },
                        {
                                "prompt": "root@hq-rtr:~# ",
                                "goal": "Шаг 3 (Устранение): Активируйте интерфейс туннеля gre1 командой ifup",
                                "validCommands": [
                                        "ifup gre1",
                                        "ip link set gre1 up"
                                ],
                                "output": "[OK] Interface gre1 is UP.",
                                "explanation": "Туннельный адаптер переведён в рабочее состояние."
                        },
                        {
                                "prompt": "root@hq-rtr:~# ",
                                "goal": "Шаг 4: Проверьте доступность удаленного конца туннеля (10.0.0.2)",
                                "validCommands": [
                                        "ping -c 2 10.0.0.2",
                                        "ping -c 3 10.0.0.2",
                                        "ping 10.0.0.2"
                                ],
                                "output": "2 packets transmitted, 2 received, 0% packet loss\n[i] Пинг туннельного IP филиала 10.0.0.2 прошел успешно!",
                                "explanation": "GRE-инкапсуляция работает. Теперь OSPF должен восстановить соседство."
                        },
                        {
                                "prompt": "root@hq-rtr:~# ",
                                "goal": "Шаг 5 (Контроль): Проверьте таблицу соседей OSPF в vtysh",
                                "validCommands": [
                                        "vtysh -c 'show ip ospf neighbor'",
                                        "vtysh -c \"show ip ospf neighbor\"",
                                        "show ip ospf neighbor"
                                ],
                                "output": "Neighbor ID     Pri State           Dead Time Address         Interface\n10.0.0.2          1 Full/Backup       33.120s 10.0.0.2        gre1:10.0.0.1\n🎉 АВАРИЯ УСТРАНЕНА! Сосед OSPF перешел в состояние FULL. Маршруты синхронизированы.",
                                "explanation": "OSPF восстановил соседство и обменялся LSA через поднятый GRE-туннель."
                        }
                ]
        },
        {
                "id": "inc_3",
                "title": "Авария #3: Клиент HQ-CLI не получает IP-адрес по DHCP",
                "symptom": "Клиент HQ-CLI не может подключиться к сети: dhclient enp0s3.200 завершается ошибкой No DHCPOFFERS received.",
                "host": "hq-rtr",
                "steps": [
                        {
                                "prompt": "root@hq-rtr:~# ",
                                "goal": "Шаг 1: На маршрутизаторе HQ-RTR проверьте статус службы dnsmasq",
                                "validCommands": [
                                        "systemctl status dnsmasq",
                                        "service dnsmasq status"
                                ],
                                "output": "● dnsmasq.service - DNS and DHCP server\n     Loaded: loaded (/lib/systemd/system/dnsmasq.service)\n     Active: active (running) since Sun 2026-11-08 10:14:02 MSK; 12min ago\n[i] Демон запущен и работает.",
                                "explanation": "Служба активна, значит проблема в конфигурации интерфейса или пула."
                        },
                        {
                                "prompt": "root@hq-rtr:~# ",
                                "goal": "Шаг 2: Проверьте файл конфигурации /etc/dnsmasq.conf на HQ-RTR",
                                "validCommands": [
                                        "cat /etc/dnsmasq.conf",
                                        "less /etc/dnsmasq.conf"
                                ],
                                "output": "dhcp-range=192.168.2.2,192.168.2.14,72h\ndhcp-option=3,192.168.2.1\ndhcp-option=6,192.168.1.2\ninterface=enp7s2\n[!] ОШИБКА В КОНФИГЕ: Указан interface=enp7s2 (физический линк без тега), а клиенты находятся в сабинтерфейсе VLAN 200 (enp7s2.200)!",
                                "explanation": "dnsmasq слушал нетегированный порт enp7s2 и игнорировал широковещательные DHCP-запросы из VLAN 200."
                        },
                        {
                                "prompt": "root@hq-rtr:~# ",
                                "goal": "Шаг 3 (Устранение): Перезапустите dnsmasq после исправления интерфейса на enp7s2.200",
                                "validCommands": [
                                        "systemctl restart dnsmasq",
                                        "service dnsmasq restart"
                                ],
                                "output": "[OK] Служба dnsmasq перезапущена с interface=enp7s2.200.",
                                "explanation": "Конфигурация обновлена, теперь dnsmasq слушает порт 67 на сабинтерфейсе enp7s2.200."
                        },
                        {
                                "prompt": "root@hq-rtr:~# ",
                                "goal": "Шаг 4 (Контроль): Проверьте утилитой ss, слушает ли dnsmasq UDP-порт 67 (DHCP)",
                                "validCommands": [
                                        "ss -ulnp | grep dnsmasq",
                                        "ss -ulnp | grep 67",
                                        "ss -unlp | grep dnsmasq"
                                ],
                                "output": "UNCONN 0 0 0.0.0.0:67 0.0.0.0:* users:((\"dnsmasq\",pid=1420,fd=4))\n🎉 АВАРИЯ УСТРАНЕНА! DHCP-сервер готов раздавать адреса клиентам в VLAN 200.",
                                "explanation": "Клиент теперь успешно выполнит dhclient и получит адрес 192.168.2.12."
                        }
                ]
        },
        {
                "id": "inc_4",
                "title": "Авария #4: Ошибка SSH «Connection refused» при входе на HQ-SRV",
                "symptom": "При попытке подключиться с клиента к серверу HQ-SRV команда ssh sshuser@192.168.1.2 выдаёт ошибку: connect to host 192.168.1.2 port 22: Connection refused.",
                "host": "hq-srv",
                "steps": [
                        {
                                "prompt": "root@hq-srv:~# ",
                                "goal": "Шаг 1: На сервере HQ-SRV проверьте статус службы sshd",
                                "validCommands": [
                                        "systemctl status sshd",
                                        "service sshd status",
                                        "systemctl status ssh"
                                ],
                                "output": "● sshd.service - OpenSSH server daemon\n     Loaded: loaded (/lib/systemd/system/sshd.service)\n     Active: active (running)\n[i] Служба SSH активна и работает.",
                                "explanation": "Демон SSH запущен, но соединение на порт 22 сбрасывается."
                        },
                        {
                                "prompt": "root@hq-srv:~# ",
                                "goal": "Шаг 2: Проверьте, какие TCP-порты реально слушает sshd утилитой ss",
                                "validCommands": [
                                        "ss -tlnp | grep sshd",
                                        "ss -tlnp | grep 2026",
                                        "ss -tlnp",
                                        "ss -tnlp | grep sshd"
                                ],
                                "output": "LISTEN 0 128 0.0.0.0:2026 0.0.0.0:* users:((\"sshd\",pid=890,fd=3))\n[!] ПРИЧИНА НАЙДЕНА: sshd настроен на регламентный нестандартный порт 2026, а клиент стучится на дефолтный 22!",
                                "explanation": "В файле /etc/openssh/sshd_config задан Port 2026 для безопасности."
                        },
                        {
                                "prompt": "user@hq-cli:~$ ",
                                "goal": "Шаг 3 (Устранение): Подключитесь с клиента с явным указанием порта 2026 по доменному имени",
                                "validCommands": [
                                        "ssh sshuser@hq-srv.au-team.irpo -p 2026",
                                        "ssh -p 2026 sshuser@hq-srv.au-team.irpo",
                                        "ssh sshuser@192.168.1.2 -p 2026"
                                ],
                                "output": "sshuser@hq-srv.au-team.irpo's password: [OK]\nLinux hq-srv 5.10.0 #1 SMP ALT Linux\n[sshuser@hq-srv ~]$\n🎉 АВАРИЯ УСТРАНЕНА! Успешный вход в защищенную консоль сервера.",
                                "explanation": "Указание ключа -p 2026 решило проблему подключения к нестандартному порту."
                        }
                ]
        },
        {
                "id": "inc_5",
                "title": "Авария #5: Служба FRRouting не запускает OSPF (Failed to start)",
                "symptom": "После перезапуска маршрутизатора служба динамической маршрутизации frr не поднимает протокол OSPF. Маршруты не передаются.",
                "host": "hq-rtr",
                "steps": [
                        {
                                "prompt": "root@hq-rtr:~# ",
                                "goal": "Шаг 1: Проверьте статус службы frr через systemctl",
                                "validCommands": [
                                        "systemctl status frr",
                                        "service frr status"
                                ],
                                "output": "● frr.service - FRRouting\n     Active: active (running)\n[i] Сервис запущен, но OSPF не отвечает в vtysh.",
                                "explanation": "Проверяем файл конфигурации демонов /etc/frr/daemons."
                        },
                        {
                                "prompt": "root@hq-rtr:~# ",
                                "goal": "Шаг 2: Просмотрите файл /etc/frr/daemons на HQ-RTR",
                                "validCommands": [
                                        "cat /etc/frr/daemons",
                                        "less /etc/frr/daemons"
                                ],
                                "output": "zebra=yes\nbgpd=no\nospfd=no\nospf6d=no\n[!] ОШИБКА: В файле daemons указано ospfd=no! Демон OSPF выключен!",
                                "explanation": "По умолчанию в пакете FRR все демоны отключены, ospfd нужно явно активировать."
                        },
                        {
                                "prompt": "root@hq-rtr:~# ",
                                "goal": "Шаг 3 (Устранение): Перезапустите службу frr после включения ospfd=yes",
                                "validCommands": [
                                        "systemctl restart frr",
                                        "service frr restart"
                                ],
                                "output": "[OK] FRRouting перезапущен. Демон ospfd активен.",
                                "explanation": "Теперь процесс ospfd запущен и слушает сокеты маршрутизации."
                        },
                        {
                                "prompt": "root@hq-rtr:~# ",
                                "goal": "Шаг 4 (Контроль): Проверьте статус демона OSPF внутри консоли vtysh",
                                "validCommands": [
                                        "vtysh -c 'show ip ospf'",
                                        "vtysh -c \"show ip ospf\"",
                                        "show ip ospf",
                                        "vtysh"
                                ],
                                "output": "Routing Process \"ospf 0\" with ID 10.0.0.1\nArea 0 (Backbone)\n🎉 АВАРИЯ УСТРАНЕНА! Демон OSPF активен и участвует в маршрутизации.",
                                "explanation": "OSPF успешно запущен в магистральной зоне Area 0."
                        }
                ]
        }
],

    outputReading: [
        {
                "id": "out_1",
                "title": "OSPF Neighbor: Пустой вывод",
                "command": "hq-rtr# show ip ospf neighbor",
                "consoleSnippet": "hq-rtr# show ip ospf neighbor\n\nhq-rtr#",
                "question": "Преподаватель спрашивает: «Что означает абсолютно пустой вывод команды show ip ospf neighbor?»",
                "options": [
                        "Соседство OSPF не установлено: интерфейс туннеля gre1 выключен, не совпадает Area (магистральная зона 0) или различается MD5-ключ аутентификации.",
                        "Всё работает штатно, просто в сети нет широковещательного трафика.",
                        "Служба vtysh выключена администратором.",
                        "На маршрутизаторе филиала закончилась оперативная память."
                ],
                "correctIndex": 0,
                "explanation": "В штатном режиме команда обязана вывести соседа 10.0.0.2 со статусом Full/Backup или Full/DROther. Если вывод пуст — пакеты OSPF Hello не доходят или отбрасываются из-за несовпадения параметров."
        },
        {
                "id": "out_2",
                "title": "DNS: Ошибка «Name or service not known»",
                "command": "root@hq-cli:~# ping -c 2 hq-srv.au-team.irpo",
                "consoleSnippet": "root@hq-cli:~# ping -c 2 hq-srv.au-team.irpo\nping: hq-srv.au-team.irpo: Name or service not known",
                "question": "Преподаватель спрашивает: «В чём причина ошибки Name or service not known?»",
                "options": [
                        "DNS-резолвер не смог преобразовать доменное имя в IP-адрес: в файле /etc/resolv.conf не указан DNS-сервер 192.168.1.2 или служба dnsmasq не отвечает.",
                        "Сервер HQ-SRV физически сгорел или отключен от питания.",
                        "Протокол ICMP заблокирован файрволом iptables.",
                        "Неверно настроен шлюз по умолчанию."
                ],
                "correctIndex": 0,
                "explanation": "Ошибка генерируется до отправки пакетов: сетевой стек ОС попытался разрешить имя через локальный резолвер (/etc/resolv.conf), но не получил ответа от DNS-сервера."
        },
        {
                "id": "out_3",
                "title": "SSH: Ошибка «Connection refused» на порту 22",
                "command": "user@hq-cli:~$ ssh sshuser@192.168.1.2",
                "consoleSnippet": "user@hq-cli:~$ ssh sshuser@192.168.1.2\nssh: connect to host 192.168.1.2 port 22: Connection refused",
                "question": "Преподаватель спрашивает: «О чём говорит статус Connection refused на 22 порту?»",
                "options": [
                        "Сервер доступен в сети и прислал TCP RST-пакет: порт 22 закрыт, так как по регламенту sshd перенесён на защищённый порт 2026.",
                        "Введён неправильный пароль пользователя sshuser.",
                        "У клиента нет маршрута до сервера 192.168.1.2.",
                        "Сетевой провод физически отсоединён."
                ],
                "correctIndex": 0,
                "explanation": "Connection refused означает, что узел в сети и ответил отказом: демон sshd не слушает стандартный 22-й порт. Для входа необходимо явно передать ключ -p 2026."
        },
        {
                "id": "out_4",
                "title": "SSH: Ошибка «Permission denied (publickey,password)»",
                "command": "user@hq-cli:~$ ssh sshuser@hq-srv.au-team.irpo -p 2026",
                "consoleSnippet": "user@hq-cli:~$ ssh sshuser@hq-srv.au-team.irpo -p 2026\nsshuser@hq-srv.au-team.irpo's password:\nPermission denied, please try again.\nPermission denied (publickey,password).",
                "question": "Преподаватель спрашивает: «Что означает ошибка Permission denied при подключении по SSH?»",
                "options": [
                        "Порт 2026 открыт и демон отвечает, но введен неверный пароль либо пользователю sshuser заблокирован парольный вход.",
                        "Служба SSH на сервере аварийно завершила работу.",
                        "DNS-сервер не смог разрешить доменное имя сервера.",
                        "Размер MTU туннеля слишком маленький для передачи SSH."
                ],
                "correctIndex": 0,
                "explanation": "Сервер успешно принял TCP-соединение на порту 2026 и запросил аутентификацию, но пароль не подошел. Сеть, маршрутизация и DNS работают идеально, ошибка на уровне учетных данных."
        },
        {
                "id": "out_5",
                "title": "ip address: Статус «gre1@NONE DOWN»",
                "command": "root@hq-rtr:~# ip -br -c a",
                "consoleSnippet": "root@hq-rtr:~# ip -br -c a\nlo               UNKNOWN        127.0.0.1/8\nenp7s1           UP             172.16.1.2/28\nenp7s2           UP\nenp7s2.100       UP             192.168.1.1/27\nenp7s2.200       UP             192.168.2.1/28\ngre1@NONE        DOWN           10.0.0.1/30",
                "question": "Преподаватель спрашивает: «Что означает статус gre1@NONE DOWN и как его исправить?»",
                "options": [
                        "Интерфейс туннеля сконфигурирован в системе, но административно выключен. Требуется выполнить команду `ifup gre1`.",
                        "Сломался физический сетевой кабель между офисами.",
                        "Пакет FRRouting повреждён и требует переустановки.",
                        "На интерфейсе назначен неверный IP-адрес."
                ],
                "correctIndex": 0,
                "explanation": "В ОС Альт после создания профиля интерфейс находится в состоянии DOWN до тех пор, пока не будет поднят скриптом ifup gre1 (или командой ip link set gre1 up)."
        },
        {
                "id": "out_6",
                "title": "DHCP: Сообщение «No DHCPOFFERS received»",
                "command": "root@hq-cli:~# dhclient enp0s3.200",
                "consoleSnippet": "root@hq-cli:~# dhclient enp0s3.200\nDHCPDISCOVER on enp0s3.200 to 255.255.255.255 port 67 interval 3\nDHCPDISCOVER on enp0s3.200 to 255.255.255.255 port 67 interval 7\nDHCPDISCOVER on enp0s3.200 to 255.255.255.255 port 67 interval 14\nNo DHCPOFFERS received.\nNo working leases in persistent database - sleeping.",
                "question": "Преподаватель спрашивает: «Почему клиент отправляет DHCPDISCOVER, но не получает DHCPOFFER?»",
                "options": [
                        "Сервер dnsmasq на HQ-RTR выключен, либо в /etc/dnsmasq.conf не указан интерфейс enp7s2.200, либо нет связности в VLAN 200.",
                        "Клиент отправляет запросы на неправильный UDP-порт.",
                        "В локальной сети закончились IP-адреса.",
                        "На клиенте блокирует запросы встроенный брандмауэр."
                ],
                "correctIndex": 0,
                "explanation": "Клиент рассылает широковещательные запросы на 67 порт, но ни один DHCP-сервер в этом широковещательном домене (VLAN 200) не ответил предложением адреса (DHCPOFFER)."
        }
],

    packetJourney: [
        {
                "hop": 1,
                "node": "HQ-CLI (Клиент)",
                "ip": "192.168.2.12/28",
                "title": "Шаг 1: Проверка локального IP и шлюза на клиенте",
                "checkCmd": "ip -br -c a && ip r",
                "expected": "Интерфейс enp0s3.200 имеет IP 192.168.2.12/28, шлюз по умолчанию: default via 192.168.2.1.",
                "theory": "Клиент получил адрес по DHCP (опция 3 передала адрес шлюза HQ-RTR 192.168.2.1)."
        },
        {
                "hop": 2,
                "node": "Канал VLAN 200 (L2/802.1Q)",
                "ip": "Тэг 200",
                "title": "Шаг 2: Проверка связности клиента с локальным шлюзом",
                "checkCmd": "ping -c 2 192.168.2.1",
                "expected": "0% packet loss. Кадр с тегом VLAN 200 успешно доходит до сабинтерфейса enp7s2.200 на HQ-RTR.",
                "theory": "Тегированный трафик 802.1Q изолирован от серверов (VLAN 100) на канальном уровне L2."
        },
        {
                "hop": 3,
                "node": "Ядро маршрутизатора HQ-RTR",
                "ip": "net.ipv4.ip_forward",
                "title": "Шаг 3: Пересылка пакетов между интерфейсами (Routing)",
                "checkCmd": "sysctl net.ipv4.ip_forward",
                "expected": "net.ipv4.ip_forward = 1. Ядро Linux пересылает входящий пакет из VLAN 200 во внешний интерфейс enp7s1.",
                "theory": "Без включенного ip_forward Linux отбрасывает любые пакеты, адресованные не ему самому."
        },
        {
                "hop": 4,
                "node": "NAT / Netfilter на HQ-RTR",
                "ip": "enp7s1: 172.16.1.2",
                "title": "Шаг 4: Трансляция адреса источника (SNAT / MASQUERADE)",
                "checkCmd": "iptables -t nat -L POSTROUTING -nv",
                "expected": "Правило MASQUERADE активно. Исходный серый IP 192.168.2.12 подменяется на внешний IP 172.16.1.2.",
                "theory": "Пакеты с частными адресами RFC1918 не маршрутизируются в интернете, поэтому маскировка обязательна."
        },
        {
                "hop": 5,
                "node": "Транзитный линк ISP (Провайдер)",
                "ip": "172.16.1.1 ↔ 172.16.1.2",
                "title": "Шаг 5: Доставка пакета до оборудования провайдера",
                "checkCmd": "ping -c 2 172.16.1.1",
                "expected": "Шлюз провайдера ISP отвечает с задержкой < 0.5 мс.",
                "theory": "Трафик выходит из корпоративного сегмента во внешнюю транзитную сеть провайдера."
        },
        {
                "hop": 6,
                "node": "DNS-резолвинг (HQ-SRV)",
                "ip": "192.168.1.2:53 → 77.88.8.8",
                "title": "Шаг 6: Разрешение доменного имени ya.ru в IP-адрес",
                "checkCmd": "cat /etc/resolv.conf",
                "expected": "Клиент отправляет DNS-запрос на 192.168.1.2:53. Сервер опрашивает внешний forwarder 77.88.8.8.",
                "theory": "dnsmasq на HQ-SRV возвращает клиенту реальный публичный IP Яндекса (например, 77.88.55.242)."
        },
        {
                "hop": 7,
                "node": "Глобальный интернет (ya.ru)",
                "ip": "Целевой хост ya.ru",
                "title": "Шаг 7: Получение ответа ICMP Echo Reply",
                "checkCmd": "ping -c 3 ya.ru",
                "expected": "3 packets transmitted, 3 received, 0% packet loss. Полный цикл пройден!",
                "theory": "Пакет успешно прошел путь: VLAN 200 → Маршрутизация → NAT → ISP → Резолвинг DNS → Ответ из интернета."
        }
],

    freeTextQuestions: [
        {
                "id": "ft_1",
                "question": "Объясните своими словами: Что такое NAT и зачем на HQ-RTR настраивается правило MASQUERADE?",
                "keywords": [
                        [
                                "подмен",
                                "трансляц",
                                "замен",
                                "перевод"
                        ],
                        [
                                "локальн",
                                "частн",
                                "серы",
                                "внутренн",
                                "192.168"
                        ],
                        [
                                "внешн",
                                "публичн",
                                "интернет",
                                "wan",
                                "isp",
                                "провайдер"
                        ],
                        [
                                "не маршрутизир",
                                "нельзя",
                                "rfc1918",
                                "один ip"
                        ]
                ],
                "criteria": [
                        "Упомянута подмена (трансляция) сетевых адресов",
                        "Указано, что локальные/серые адреса заменяются на внешний IP",
                        "Объяснено, что частные IP не могут напрямую ходить в интернете"
                ],
                "idealAnswer": "NAT (MASQUERADE) — это механизм трансляции сетевых адресов. Он подменяет внутренние частные IP-адреса локальной сети (192.168.0.0), которые не маршрутизируются в интернете, на публичный IP-адрес внешнего интерфейса маршрутизатора enp7s1 для обеспечения выхода в глобальную сеть."
        },
        {
                "id": "ft_2",
                "question": "Объясните своими словами: Что такое VLAN (802.1Q) и зачем сеть разбита на VLAN 100 и VLAN 200?",
                "keywords": [
                        [
                                "виртуальн",
                                "vlan",
                                "802.1q",
                                "тег",
                                "метк"
                        ],
                        [
                                "изоляц",
                                "раздел",
                                "безопасн",
                                "трафик",
                                "домен"
                        ],
                        [
                                "сервер",
                                "клиент",
                                "пользовател",
                                "100",
                                "200"
                        ]
                ],
                "criteria": [
                        "Упомянуто логическое разделение физической сети с помощью тегов 802.1Q",
                        "Указана цель: изоляция и безопасность широковещательного трафика",
                        "Описано назначение: VLAN 100 для серверов, VLAN 200 для рабочих станций"
                ],
                "idealAnswer": "VLAN (802.1Q) — это технология логического разделения одной физической сети на изолированные широковещательные сегменты с помощью тегов. На стенде VLAN 100 выделен под серверную зону (HQ-SRV), а VLAN 200 — под рабочие станции пользователей (HQ-CLI), чтобы изолировать клиентский трафик от серверов."
        },
        {
                "id": "ft_3",
                "question": "Объясните своими словами: Зачем нужен GRE-туннель и почему его MTU равен 1476?",
                "keywords": [
                        [
                                "туннел",
                                "инкапсуляц",
                                "поверх",
                                "gre"
                        ],
                        [
                                "филиал",
                                "офис",
                                "br",
                                "hq",
                                "провайдер",
                                "интернет"
                        ],
                        [
                                "1476",
                                "24",
                                "1500",
                                "заголовок",
                                "оверхед",
                                "минус"
                        ]
                ],
                "criteria": [
                        "Упомянута инкапсуляция корпоративных пакетов через публичную сеть ISP",
                        "Объяснена связь центрального офиса и филиала",
                        "Обоснован MTU 1476: стандартный 1500 минус 24 байта заголовков (20 байт IPv4 + 4 байта GRE)"
                ],
                "idealAnswer": "GRE-туннель инкапсулирует пакеты корпоративных сетей и протокола OSPF для передачи между офисом и филиалом через транзитную сеть провайдера. MTU равен 1476, потому что стандартный Ethernet MTU 1500 уменьшается на 24 байта дополнительных заголовков (20 байт внешнего IPv4 + 4 байта GRE)."
        },
        {
                "id": "ft_4",
                "question": "Объясните своими словами: Как OSPF строит маршруты и зачем нужен MD5-ключ на gre1?",
                "keywords": [
                        [
                                "динамическ",
                                "маршрутизац",
                                "hello",
                                "сосед",
                                "обмен"
                        ],
                        [
                                "area 0",
                                "магистрал",
                                "зон",
                                "0"
                        ],
                        [
                                "md5",
                                "безопасн",
                                "защит",
                                "поддел",
                                "парол",
                                "хэш"
                        ]
                ],
                "criteria": [
                        "Упомянут автоматический обмен маршрутами через Hello-пакеты в магистральной зоне Area 0",
                        "Описано соседство (neighbor/adjacency) поверх туннеля",
                        "Объяснена аутентификация MD5: защита от внедрения ложных маршрутов"
                ],
                "idealAnswer": "OSPF динамически строит таблицу маршрутизации, обмениваясь Hello-пакетами и LSA через туннель gre1 в магистральной зоне Area 0. Аутентификация MD5 с общим ключом (123qweR%) необходима для защиты от подделки маршрутов и несанкционированного подключения чужих роутеров в транзитной сети."
        },
        {
                "id": "ft_5",
                "question": "Объясните своими словами: Что передают опции DHCP 3 и 6 клиенту в dnsmasq.conf?",
                "keywords": [
                        [
                                "3",
                                "шлюз",
                                "default gateway",
                                "маршрут"
                        ],
                        [
                                "6",
                                "dns",
                                "имен",
                                "резолв"
                        ],
                        [
                                "автоматическ",
                                "клиент",
                                "выда",
                                "переда"
                        ]
                ],
                "criteria": [
                        "Опция 3 определена как шлюз по умолчанию (Default Gateway 192.168.2.1)",
                        "Опция 6 определена как корпоративный DNS-сервер (192.168.1.2)",
                        "Понятна роль автоматической настройки клиента при загрузке"
                ],
                "idealAnswer": "Опция 3 сообщает клиенту адрес шлюза по умолчанию (192.168.2.1), чтобы он знал, куда слать трафик вне своей сети. Опция 6 передает адрес DNS-сервера (192.168.1.2) для автоматического разрешения доменных имён без ручной настройки resolv.conf."
        },
        {
                "id": "ft_6",
                "question": "Объясните своими словами: Почему на HQ-SRV в resolv.conf указан loopback 127.0.0.1?",
                "keywords": [
                        [
                                "127.0.0.1",
                                "loopback",
                                "петл",
                                "сам себя",
                                "локальн"
                        ],
                        [
                                "dnsmasq",
                                "демон",
                                "служба",
                                "сервер"
                        ],
                        [
                                "внутренн",
                                "зона",
                                "au-team",
                                "свои имена",
                                "forwarder",
                                "77.88.8.8"
                        ]
                ],
                "criteria": [
                        "Указан опрос локальной службы на самом сервере (loopback)",
                        "Объяснено, что сервер должен знать свои доменные имена зоны au-team.irpo",
                        "Упомянута пересылка внешних запросов на вышестоящий DNS (forwarder 77.88.8.8)"
                ],
                "idealAnswer": "Адрес 127.0.0.1 заставляет систему опрашивать собственный локальный демон dnsmasq. Это необходимо, чтобы сервер разрешал имена внутренней корпоративной зоны au-team.irpo из своих файлов, а запросы к внешним сайтам пересылал на вышестоящий DNS-сервер 77.88.8.8."
        }
]
};
