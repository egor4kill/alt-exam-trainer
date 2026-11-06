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
                "task": "Проверьте установленный FQDN с помощью команды hostname -f",
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
                "task": "Обновите кэш списков пакетов в репозиториях (apt-get update)",
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
                "task": "Установите часовой пояс Барнаула (Asia/Barnaul) через timedatectl",
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
                "task": "Проверьте статус системного времени и таймзоны через timedatectl status",
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
                "task": "Назначьте статический IP 172.16.1.1/28 интерфейсу enp7s2 через файл ipv4address",
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
                "task": "Укажите шлюз по умолчанию 172.16.1.1 для интерфейса enp7s1 в файле ipv4route",
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
                "task": "Укажите шлюз по умолчанию 172.16.2.1 в файле ipv4route интерфейса enp7s1 на BR-RTR",
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
                "task": "Назначьте статический IP 192.168.3.2/28 интерфейсу enp0s3 на сервере BR-SRV",
                "correctAnswers": [
                        "echo '192.168.3.2/28' > /etc/net/ifaces/enp0s3/ipv4address",
                        "echo 192.168.3.2/28 > /etc/net/ifaces/enp0s3/ipv4address"
                ],
                "hint1": "Сервер филиала получает второй адрес локальной подсети 192.168.3.0/28.",
                "hint2": "Синтаксис: echo '<IP/маска>' > /etc/net/ifaces/enp0s3/ipv4address",
                "explanation": "Назначает статический IP серверу филиала."
        },
        {
                "id": "cmd_3_14",
                "topicId": 3,
                "host": "br-srv",
                "prompt": "root@br-srv:~# ",
                "task": "Укажите шлюз по умолчанию 192.168.3.1 на сервере BR-SRV в файле ipv4route",
                "correctAnswers": [
                        "echo 'default via 192.168.3.1' > /etc/net/ifaces/enp0s3/ipv4route",
                        "echo default via 192.168.3.1 > /etc/net/ifaces/enp0s3/ipv4route"
                ],
                "hint1": "Шлюзом для BR-SRV является локальный порт маршрутизатора BR-RTR.",
                "hint2": "Синтаксис: echo 'default via <IP>' > .../ipv4route",
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
                "task": "Проверьте статус параметра ядра net.ipv4.ip_forward через sysctl",
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
                "task": "Включите форвардинг IPv4 в работающем ядре командой sysctl -w",
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
                "task": "Выведите правила таблицы NAT утилитой iptables -t nat -L",
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
                "task": "Войдите в интерактивную консоль маршрутизатора FRR (vtysh)",
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
                "task": "Перейдите в режим конфигурации в консоли vtysh (conf t)",
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
                "task": "Включите процесс маршрутизации OSPF (router ospf)",
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
                "task": "Проверьте таблицу соседей OSPF из bash через vtysh -c",
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
                "task": "На HQ-RTR обновите кэш списков пакетов (apt-get update)",
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
                "task": "На клиенте HQ-CLI проверьте состояние сетевых интерфейсов через ip -br -c a",
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
                "task": "Освободите текущий полученный IP-адрес с помощью dhclient -r",
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
                "task": "Проверьте полученный шлюз по умолчанию командой ip route",
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
                "task": "На сервере HQ-SRV обновите список пакетов через apt-get update",
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
                "task": "На BR-SRV укажите корпоративный DNS 192.168.1.2 в resolv.conf интерфейса enp0s3",
                "correctAnswers": [
                        "echo 'nameserver 192.168.1.2' > /etc/net/ifaces/enp0s3/resolv.conf",
                        "echo nameserver 192.168.1.2 > /etc/net/ifaces/enp0s3/resolv.conf"
                ],
                "hint1": "Сервер филиала переключается на корпоративный DNS.",
                "hint2": "Синтаксис: echo 'nameserver <IP_HQ_SRV>' > .../resolv.conf",
                "explanation": "Настраивает DNS на сервере филиала."
        },
        {
                "id": "cmd_8_16",
                "topicId": 8,
                "host": "hq-cli",
                "prompt": "user@hq-cli:~$ ",
                "task": "На HQ-CLI проверьте полученный DNS-сервер в файле /etc/resolv.conf",
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
