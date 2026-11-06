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
        // --- Тема 2 ---
        {
            id: "cmd_2_1",
            topicId: 2,
            host: "isp",
            prompt: "root@isp:~# ",
            task: "Задайте полное доменное имя (FQDN) isp.au-team.irpo на виртуальной машине ISP",
            correctAnswers: [
                "hostnamectl set-hostname isp.au-team.irpo",
                "hostnamectl set-hostname isp.au-team.irpo; exec bash"
            ],
            hint1: "Используйте утилиту hostnamectl со специальным параметром set-hostname",
            hint2: "hostnamectl set-hostname isp.au-team.irpo",
            explanation: "Команда `hostnamectl set-hostname <FQDN>` прописывает статическое доменное имя в `/etc/hostname` и применяет его немедленно."
        },
        {
            id: "cmd_2_2",
            topicId: 2,
            host: "hq-rtr",
            prompt: "root@hq-rtr:~# ",
            task: "Задайте FQDN hq-rtr.au-team.irpo на маршрутизаторе HQ-RTR",
            correctAnswers: [
                "hostnamectl set-hostname hq-rtr.au-team.irpo",
                "hostnamectl set-hostname hq-rtr.au-team.irpo; exec bash"
            ],
            hint1: "Синтаксис: hostnamectl set-hostname <имя>",
            hint2: "hostnamectl set-hostname hq-rtr.au-team.irpo",
            explanation: "Устанавливает FQDN для маршрутизатора главного офиса."
        },
        {
            id: "cmd_2_3",
            topicId: 2,
            host: "isp",
            prompt: "root@isp:~# ",
            task: "Установите часовой пояс Барнаула (Asia/Barnaul) через timedatectl",
            correctAnswers: [
                "timedatectl set-timezone Asia/Barnaul"
            ],
            hint1: "Используйте timedatectl с аргументом set-timezone",
            hint2: "timedatectl set-timezone Asia/Barnaul",
            explanation: "Утилита `timedatectl` настраивает системный часовой пояс, обновляя симлинк `/etc/localtime` на `/usr/share/zoneinfo/Asia/Barnaul`."
        },
        {
            id: "cmd_2_4",
            topicId: 2,
            host: "isp",
            prompt: "root@isp:~# ",
            task: "Проверьте текущее состояние системного времени и часового пояса",
            correctAnswers: [
                "timedatectl status",
                "timedatectl",
                "timedatectl | grep \"Time zone\""
            ],
            hint1: "Команда без параметров или со словом status",
            hint2: "timedatectl status",
            explanation: "`timedatectl status` выводит локальное время, время UTC, RTC и активную таймзону."
        },

        // --- Тема 3 ---
        {
            id: "cmd_3_1",
            topicId: 3,
            host: "isp",
            prompt: "root@isp:~# ",
            task: "Выведите компактный цветной список сетевых интерфейсов и их IP-адресов",
            correctAnswers: [
                "ip -br -c a",
                "ip -br -c addr",
                "ip -br -c addr show",
                "ip -br a",
                "ip a"
            ],
            hint1: "Используйте флаги -br (brief) и -c (color) у команды ip a",
            hint2: "ip -br -c a",
            explanation: "`ip -br -c a` — самая наглядная команда для проверки состояния линков (UP/DOWN) и назначенных IPv4/IPv6."
        },
        {
            id: "cmd_3_2",
            topicId: 3,
            host: "hq-rtr",
            prompt: "root@hq-rtr:~# ",
            task: "Назначьте IP-адрес 172.16.1.2/28 интерфейсу enp7s1 через запись в файл ipv4address подсистемы /etc/net",
            correctAnswers: [
                "echo '172.16.1.2/28' > /etc/net/ifaces/enp7s1/ipv4address",
                "echo 172.16.1.2/28 > /etc/net/ifaces/enp7s1/ipv4address",
                "echo \"172.16.1.2/28\" > /etc/net/ifaces/enp7s1/ipv4address"
            ],
            hint1: "Запишите строку через echo '...' > /etc/net/ifaces/enp7s1/ipv4address",
            hint2: "echo '172.16.1.2/28' > /etc/net/ifaces/enp7s1/ipv4address",
            explanation: "В ОС «Альт» каждый интерфейс имеет свою директорию, а адреса хранятся в файле `ipv4address`."
        },
        {
            id: "cmd_3_3",
            topicId: 3,
            host: "hq-rtr",
            prompt: "root@hq-rtr:~# ",
            task: "Укажите шлюз по умолчанию 172.16.1.1 для интерфейса enp7s1 в файле ipv4route",
            correctAnswers: [
                "echo 'default via 172.16.1.1' > /etc/net/ifaces/enp7s1/ipv4route",
                "echo default via 172.16.1.1 > /etc/net/ifaces/enp7s1/ipv4route",
                "echo \"default via 172.16.1.1\" > /etc/net/ifaces/enp7s1/ipv4route"
            ],
            hint1: "Синтаксис: default via <IP> в файл ipv4route",
            hint2: "echo 'default via 172.16.1.1' > /etc/net/ifaces/enp7s1/ipv4route",
            explanation: "Файл `ipv4route` в папке интерфейса задает маршруты через этот интерфейс (синтаксис `ip route`)."
        },
        {
            id: "cmd_3_4",
            topicId: 3,
            host: "hq-rtr",
            prompt: "root@hq-rtr:~# ",
            task: "Перезапустите сетевую службу в ОС «Альт» для применения настроек",
            correctAnswers: [
                "systemctl restart network",
                "service network restart"
            ],
            hint1: "systemctl restart ...",
            hint2: "systemctl restart network",
            explanation: "В ОС «Альт» служба называется `network` (а не networking или systemd-networkd)."
        },
        {
            id: "cmd_3_5",
            topicId: 3,
            host: "hq-rtr",
            prompt: "root@hq-rtr:~# ",
            task: "Отправьте ровно 3 ICMP-пакета (ping) на шлюз ISP (172.16.1.1)",
            correctAnswers: [
                "ping -c 3 172.16.1.1"
            ],
            hint1: "Используйте ключ -c 3",
            hint2: "ping -c 3 172.16.1.1",
            explanation: "Флаг `-c 3` ограничивает количество эхо-запросов тремя пакетами."
        },

        // --- Тема 4 ---
        {
            id: "cmd_4_1",
            topicId: 4,
            host: "hq-rtr",
            prompt: "root@hq-rtr:~# ",
            task: "Скопируйте конфигурационную папку интерфейса enp7s1 для создания VLAN 100 (enp7s2.100)",
            correctAnswers: [
                "cp -r /etc/net/ifaces/enp7s1 /etc/net/ifaces/enp7s2.100",
                "cp -r enp7s1 enp7s2.100",
                "cp -a /etc/net/ifaces/enp7s1 /etc/net/ifaces/enp7s2.100"
            ],
            hint1: "cp -r /etc/net/ifaces/enp7s1 /etc/net/ifaces/enp7s2.100",
            hint2: "cp -r /etc/net/ifaces/enp7s1 /etc/net/ifaces/enp7s2.100",
            explanation: "Быстрый способ создать интерфейс в `/etc/net` — рекурсивно скопировать шаблонный интерфейс."
        },
        {
            id: "cmd_4_2",
            topicId: 4,
            host: "hq-rtr",
            prompt: "root@hq-rtr:~# ",
            task: "Назначьте IP-адрес 192.168.1.1/27 для VLAN 100 (enp7s2.100) на HQ-RTR",
            correctAnswers: [
                "echo '192.168.1.1/27' > /etc/net/ifaces/enp7s2.100/ipv4address",
                "echo 192.168.1.1/27 > /etc/net/ifaces/enp7s2.100/ipv4address"
            ],
            hint1: "echo '192.168.1.1/27' > ...",
            hint2: "echo '192.168.1.1/27' > /etc/net/ifaces/enp7s2.100/ipv4address",
            explanation: "Шлюз серверного сегмента HQ получает адрес `.1` с маской `/27` (до 30 хостов)."
        },
        {
            id: "cmd_4_3",
            topicId: 4,
            host: "hq-rtr",
            prompt: "root@hq-rtr:~# ",
            task: "Назначьте IP-адрес 192.168.2.1/28 для клиентского VLAN 200 (enp7s2.200) на HQ-RTR",
            correctAnswers: [
                "echo '192.168.2.1/28' > /etc/net/ifaces/enp7s2.200/ipv4address",
                "echo 192.168.2.1/28 > /etc/net/ifaces/enp7s2.200/ipv4address"
            ],
            hint1: "echo '192.168.2.1/28' > /etc/net/ifaces/enp7s2.200/ipv4address",
            hint2: "echo '192.168.2.1/28' > /etc/net/ifaces/enp7s2.200/ipv4address",
            explanation: "Шлюз клиентского сегмента HQ получает адрес `.1` с маской `/28` (до 14 хостов)."
        },
        {
            id: "cmd_4_4",
            topicId: 4,
            host: "hq-srv",
            prompt: "root@hq-srv:~# ",
            task: "Укажите маршрут по умолчанию через HQ-RTR (192.168.1.1) на интерфейсе enp0s3.100",
            correctAnswers: [
                "echo 'default via 192.168.1.1' > /etc/net/ifaces/enp0s3.100/ipv4route",
                "echo default via 192.168.1.1 > /etc/net/ifaces/enp0s3.100/ipv4route"
            ],
            hint1: "Файл ipv4route в папке интерфейса enp0s3.100",
            hint2: "echo 'default via 192.168.1.1' > /etc/net/ifaces/enp0s3.100/ipv4route",
            explanation: "HQ-SRV направляет весь нелокальный трафик на HQ-RTR."
        },

        // --- Тема 5 ---
        {
            id: "cmd_5_1",
            topicId: 5,
            host: "isp",
            prompt: "root@isp:~# ",
            task: "Проверьте статус форвардинга IPv4 пакетов в ядре Linux",
            correctAnswers: [
                "sysctl net.ipv4.ip_forward",
                "cat /proc/sys/net/ipv4/ip_forward"
            ],
            hint1: "sysctl net.ipv4...",
            hint2: "sysctl net.ipv4.ip_forward",
            explanation: "Если значение равно 1 — форвардинг включен, если 0 — ядро отбрасывает транзитные пакеты."
        },
        {
            id: "cmd_5_2",
            topicId: 5,
            host: "isp",
            prompt: "root@isp:~# ",
            task: "Добавьте правило MASQUERADE для NAT на внешнем интерфейсе enp7s1",
            correctAnswers: [
                "iptables -t nat -A POSTROUTING -o enp7s1 -j MASQUERADE"
            ],
            hint1: "iptables -t nat -A POSTROUTING -o enp7s1 ...",
            hint2: "iptables -t nat -A POSTROUTING -o enp7s1 -j MASQUERADE",
            explanation: "Правило подменяет IP источника исходящих пакетов на динамический IP интерфейса enp7s1 при выходе наружу."
        },
        {
            id: "cmd_5_3",
            topicId: 5,
            host: "isp",
            prompt: "root@isp:~# ",
            task: "Сохраните текущие правила iptables в файл /root/iptables_rules",
            correctAnswers: [
                "iptables-save > /root/iptables_rules"
            ],
            hint1: "iptables-save > ...",
            hint2: "iptables-save > /root/iptables_rules",
            explanation: "`iptables-save` делает дамп всех таблиц правил в указанный файл."
        },
        {
            id: "cmd_5_4",
            topicId: 5,
            host: "isp",
            prompt: "root@isp:~# ",
            task: "Просмотрите список правил в таблице NAT",
            correctAnswers: [
                "iptables -t nat -L",
                "iptables -t nat -S",
                "iptables -t nat -vnL"
            ],
            hint1: "iptables -t nat -L",
            hint2: "iptables -t nat -L",
            explanation: "Параметр `-t nat` указывает таблицу Network Address Translation, `-L` выводит цепочки."
        },

        // --- Тема 6 ---
        {
            id: "cmd_6_1",
            topicId: 6,
            host: "hq-rtr",
            prompt: "root@hq-rtr:~# ",
            task: "Создайте папку интерфейса для GRE-туннеля gre1 в /etc/net",
            correctAnswers: [
                "mkdir /etc/net/ifaces/gre1",
                "mkdir -p /etc/net/ifaces/gre1"
            ],
            hint1: "mkdir /etc/net/ifaces/gre1",
            hint2: "mkdir /etc/net/ifaces/gre1",
            explanation: "Для туннеля gre1 в `/etc/net` создается собственная папка конфигурации."
        },
        {
            id: "cmd_6_2",
            topicId: 6,
            host: "hq-rtr",
            prompt: "root@hq-rtr:~# ",
            task: "Назначьте IP-адрес 10.0.0.1/30 интерфейсу gre1 на HQ-RTR",
            correctAnswers: [
                "echo '10.0.0.1/30' > /etc/net/ifaces/gre1/ipv4address",
                "echo 10.0.0.1/30 > /etc/net/ifaces/gre1/ipv4address"
            ],
            hint1: "echo '10.0.0.1/30' > ...",
            hint2: "echo '10.0.0.1/30' > /etc/net/ifaces/gre1/ipv4address",
            explanation: "Адрес `10.0.0.1/30` — первый хост в туннельной подсети `10.0.0.0/30`."
        },
        {
            id: "cmd_6_3",
            topicId: 6,
            host: "hq-rtr",
            prompt: "root@hq-rtr:~# ",
            task: "Поднимите интерфейс gre1 с помощью утилиты ifup",
            correctAnswers: [
                "ifup gre1"
            ],
            hint1: "ifup <имя>",
            hint2: "ifup gre1",
            explanation: "`ifup` активирует сетевой интерфейс средствами `/etc/net`."
        },
        {
            id: "cmd_6_4",
            topicId: 6,
            host: "hq-rtr",
            prompt: "root@hq-rtr:~# ",
            task: "Войдите в интерактивную оболочку маршрутизации FRR (vtysh)",
            correctAnswers: [
                "vtysh"
            ],
            hint1: "vtysh",
            hint2: "vtysh",
            explanation: "`vtysh` предоставляет единый Cisco-подобный CLI для всех демонов FRR (zebra, ospfd, bgpd)."
        },
        {
            id: "cmd_6_5",
            topicId: 6,
            host: "hq-rtr",
            prompt: "hq-rtr# ",
            task: "Перейдите в режим глобальной конфигурации в vtysh",
            correctAnswers: [
                "conf t",
                "configure terminal"
            ],
            hint1: "conf t",
            hint2: "conf t",
            explanation: "Команда переводит CLI в режим настройки (prompt сменится на `hq-rtr(config)#`)."
        },
        {
            id: "cmd_6_6",
            topicId: 6,
            host: "hq-rtr",
            prompt: "hq-rtr(config)# ",
            task: "Анонсируйте сеть туннеля 10.0.0.0/30 в зону OSPF Area 0",
            correctAnswers: [
                "network 10.0.0.0/30 area 0"
            ],
            hint1: "network 10.0.0.0/30 area 0",
            hint2: "network 10.0.0.0/30 area 0",
            explanation: "Включает OSPF на интерфейсах, чьи IP попадают в подсеть `10.0.0.0/30`, и связывает их с магистральной зоной (backbone Area 0)."
        },
        {
            id: "cmd_6_7",
            topicId: 6,
            host: "hq-rtr",
            prompt: "hq-rtr(config-if)# ",
            task: "Задайте MD5 ключ 1 с паролем 123qweR% на интерфейсе gre1 в vtysh",
            correctAnswers: [
                "ip ospf message-digest-key 1 md5 123qweR%"
            ],
            hint1: "ip ospf message-digest-key 1 md5 ...",
            hint2: "ip ospf message-digest-key 1 md5 123qweR%",
            explanation: "Настраивает хеширование OSPF-пакетов для защиты от подделки маршрутов злоумышленником."
        },
        {
            id: "cmd_6_8",
            topicId: 6,
            host: "hq-rtr",
            prompt: "root@hq-rtr:~# ",
            task: "Выведите таблицу соседей OSPF через vtysh одной командой",
            correctAnswers: [
                "vtysh -c \"show ip ospf neighbor\"",
                "vtysh -c 'show ip ospf neighbor'"
            ],
            hint1: "vtysh -c \"show ip ospf neighbor\"",
            hint2: "vtysh -c \"show ip ospf neighbor\"",
            explanation: "Флаг `-c` позволяет выполнить команду vtysh прямо из bash. Сосед должен быть в состоянии `Full`."
        },

        // --- Тема 7 ---
        {
            id: "cmd_7_1",
            topicId: 7,
            host: "hq-cli",
            prompt: "root@hq-cli:~# ",
            task: "Освободите текущий IP-адрес DHCP на интерфейсе с помощью dhclient",
            correctAnswers: [
                "dhclient -r",
                "dhclient -r enp0s3.200",
                "dhclient -r enp7s1.200"
            ],
            hint1: "dhclient -r",
            hint2: "dhclient -r",
            explanation: "Ключ `-r` отправляет DHCPRELEASE серверу, освобождая арендованный IP-адрес."
        },
        {
            id: "cmd_7_2",
            topicId: 7,
            host: "hq-cli",
            prompt: "root@hq-cli:~# ",
            task: "Запросите новый IP-адрес по DHCP на интерфейсе enp0s3.200",
            correctAnswers: [
                "dhclient enp0s3.200",
                "dhclient"
            ],
            hint1: "dhclient enp0s3.200",
            hint2: "dhclient enp0s3.200",
            explanation: "`dhclient` отправляет DHCPDISCOVER и получает сетевую конфигурацию от `dnsmasq`."
        },

        // --- Тема 8 ---
        {
            id: "cmd_8_1",
            topicId: 8,
            host: "hq-srv",
            prompt: "root@hq-srv:~# ",
            task: "Проверьте, слушает ли dnsmasq UDP-порт 53 с помощью утилиты ss",
            correctAnswers: [
                "ss -ulnp | grep dnsmasq",
                "ss -unlp | grep dnsmasq",
                "ss -uln | grep 53"
            ],
            hint1: "ss -ulnp | grep dnsmasq",
            hint2: "ss -ulnp | grep dnsmasq",
            explanation: "`ss -ulnp` показывает все открытые UDP-сокеты (`-u` UDP, `-l` listening, `-n` numeric, `-p` processes)."
        },
        {
            id: "cmd_8_2",
            topicId: 8,
            host: "hq-cli",
            prompt: "user@hq-cli:~$ ",
            task: "Подключитесь по SSH к HQ-SRV по доменному имени hq-srv.au-team.irpo на порт 2026 под пользователем sshuser",
            correctAnswers: [
                "ssh sshuser@hq-srv.au-team.irpo -p 2026",
                "ssh -p 2026 sshuser@hq-srv.au-team.irpo"
            ],
            hint1: "ssh sshuser@<FQDN> -p <порт>",
            hint2: "ssh sshuser@hq-srv.au-team.irpo -p 2026",
            explanation: "Флаг `-p 2026` указывает нестандартный порт SSH, а имя хоста разрешается через наш локальный DNS-сервер."
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
};
