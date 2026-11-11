// js/drill.js
// Экспресс-тренажёр и сводка всех уникальных команд практик 2–8
// Без лишних повторов на разных машинах — только чистая практика и мышечная память!

const DRILL_COMMANDS = [
    // --- ТЕМА 2: FQDN И ЧАСОВОЙ ПОЯС ---
    {
        id: "d1",
        topicId: 2,
        topicName: "Практика 2: FQDN и Время",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "1. Установка часового пояса",
        task: "Установите системный часовой пояс Барнаула (Asia/Barnaul)",
        correctAnswers: [
            "timedatectl set-timezone Asia/Barnaul",
            "timedatectl set-timezone Asia/Barnaul;"
        ],
        template: "timedatectl set-timezone Asia/Barnaul",
        hint: "Используйте утилиту timedatectl с подкомандой set-timezone.",
        why: "Регламентное время стенда (+07). Требуется для корреляции логов и протокола Kerberos."
    },
    {
        id: "d2",
        topicId: 2,
        topicName: "Практика 2: FQDN и Время",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "2. Проверка статуса времени",
        task: "Проверьте текущее время, часовой пояс и статус синхронизации NTP",
        correctAnswers: [
            "timedatectl",
            "timedatectl status"
        ],
        template: "timedatectl status",
        hint: "Вызовите timedatectl без параметров или с ключом status.",
        why: "Показывает Local time, Universal time, Time zone (+07) и NTP service: active."
    },
    {
        id: "d3",
        topicId: 2,
        topicName: "Практика 2: FQDN и Время",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "3. Установка FQDN имени хоста",
        task: "Задайте полное доменное имя hq-rtr.au-team.irpo и перезапустите командную оболочку bash",
        correctAnswers: [
            "hostnamectl set-hostname hq-rtr.au-team.irpo; exec bash",
            "hostnamectl set-hostname hq-rtr.au-team.irpo && exec bash",
            "hostnamectl set-hostname hq-rtr.au-team.irpo"
        ],
        template: "hostnamectl set-hostname hq-rtr.au-team.irpo; exec bash",
        hint: "Используйте hostnamectl set-hostname с указанием домена .au-team.irpo.",
        why: "Записывает FQDN в /etc/hostname. Без доменной части Kerberos и SSL сертификаты не работают."
    },
    {
        id: "d4",
        topicId: 2,
        topicName: "Практика 2: FQDN и Время",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "4. Проверка имени хоста",
        task: "Выведите текущее имя хоста через hostnamectl",
        correctAnswers: [
            "hostnamectl",
            "hostnamectl status",
            "hostname -f"
        ],
        template: "hostnamectl",
        hint: "Команда hostnamectl без параметров выводит Static hostname и параметры ОС.",
        why: "Быстрая проверка перед сдачей преподавателю."
    },

    // --- ТЕМА 3: ПОДСИСТЕМА /etc/net (IP И МАРШРУТЫ) ---
    {
        id: "d5",
        topicId: 3,
        topicName: "Практика 3: Сеть /etc/net",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "5. Статический IPv4-адрес",
        task: "Запишите статический IP-адрес 172.16.1.2/28 в файл ipv4address интерфейса enp7s1",
        correctAnswers: [
            "echo '172.16.1.2/28' > /etc/net/ifaces/enp7s1/ipv4address",
            "echo \"172.16.1.2/28\" > /etc/net/ifaces/enp7s1/ipv4address"
        ],
        template: "echo '172.16.1.2/28' > /etc/net/ifaces/enp7s1/ipv4address",
        hint: "В Альт адрес пишется прямо в файл ipv4address с префиксом маски.",
        why: "Маска /28 задаёт подсеть на 14 хостов. Внешний линк роутера к ISP."
    },
    {
        id: "d6",
        topicId: 3,
        topicName: "Практика 3: Сеть /etc/net",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "6. Шлюз по умолчанию (Default Route)",
        task: "Задайте маршрут по умолчанию через шлюз провайдера 172.16.1.1 в файле ipv4route",
        correctAnswers: [
            "echo 'default via 172.16.1.1' > /etc/net/ifaces/enp7s1/ipv4route",
            "echo \"default via 172.16.1.1\" > /etc/net/ifaces/enp7s1/ipv4route"
        ],
        template: "echo 'default via 172.16.1.1' > /etc/net/ifaces/enp7s1/ipv4route",
        hint: "Формат записи маршрута: default via <IP_шлюза>.",
        why: "Без этой строки ни один внешний пакет не сможет покинуть локальную сеть."
    },
    {
        id: "d7",
        topicId: 3,
        topicName: "Практика 3: Сеть /etc/net",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "7. Паспорт интерфейса (options)",
        task: "Укажите параметры BOOTPROTO=static и TYPE=eth в файле options интерфейса enp7s1",
        correctAnswers: [
            "echo -e 'BOOTPROTO=static\\nTYPE=eth' > /etc/net/ifaces/enp7s1/options",
            "echo -e \"BOOTPROTO=static\\nTYPE=eth\" > /etc/net/ifaces/enp7s1/options",
            "printf 'BOOTPROTO=static\\nTYPE=eth\\n' > /etc/net/ifaces/enp7s1/options",
            "nano /etc/net/ifaces/enp7s1/options",
            "vim /etc/net/ifaces/enp7s1/options",
            "mcedit /etc/net/ifaces/enp7s1/options"
        ],
        template: "echo -e 'BOOTPROTO=static\\nTYPE=eth' > /etc/net/ifaces/enp7s1/options",
        hint: "Используйте echo -e с переводом строки \\n между параметрами.",
        why: "Файл options определяет драйвер и протокол работы порта в подсистеме /etc/net."
    },
    {
        id: "d8",
        topicId: 3,
        topicName: "Практика 3: Сеть /etc/net",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "8. Перезапуск сетевой службы",
        task: "Перезапустите сетевую подсистему для применения настроек",
        correctAnswers: [
            "systemctl restart network",
            "service network restart"
        ],
        template: "systemctl restart network",
        hint: "Служба сети в Альт Линуксе называется network.",
        why: "Применяет все файлы из /etc/net/ifaces/ без перезагрузки всей операционной системы."
    },
    {
        id: "d9",
        topicId: 3,
        topicName: "Практика 3: Сеть /etc/net",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "9. Краткая диагностика интерфейсов",
        task: "Проверьте статус UP/DOWN и назначенные IP-адреса на всех портах кратко с цветом",
        correctAnswers: [
            "ip -br -c a",
            "ip -br -c addr",
            "ip -br a",
            "ip a"
        ],
        template: "ip -br -c a",
        hint: "Флаг -br (brief) даёт компактный вывод в 1 строчку на интерфейс, а -c добавляет подсветку.",
        why: "Главная команда демонстрации работоспособности сетевых портов преподавателю."
    },
    {
        id: "d10",
        topicId: 3,
        topicName: "Практика 3: Сеть /etc/net",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "10. Просмотр таблицы маршрутизации",
        task: "Выведите таблицу маршрутов ядра Linux через утилиту ip route",
        correctAnswers: [
            "ip r",
            "ip route",
            "ip route show"
        ],
        template: "ip r",
        hint: "Команда ip r или ip route.",
        why: "Показывает, куда уходит трафик по умолчанию (default via) и прямые линки (proto kernel scope link)."
    },

    // --- ТЕМА 4: VLAN 100 / 200 / 999 ---
    {
        id: "d11",
        topicId: 4,
        topicName: "Практика 4: VLAN",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "11. Создание каталога сабинтерфейса VLAN",
        task: "Создайте директорию для сабинтерфейса VLAN 100 на физическом порту enp7s2",
        correctAnswers: [
            "mkdir -p /etc/net/ifaces/enp7s2.100",
            "mkdir /etc/net/ifaces/enp7s2.100"
        ],
        template: "mkdir -p /etc/net/ifaces/enp7s2.100",
        hint: "Используйте mkdir -p с точкой и номером тега в имени каталога.",
        why: "В Альт каждый сабинтерфейс 802.1Q — это отдельная папка <РОДИТЕЛЬ>.<ТЕГ>."
    },
    {
        id: "d12",
        topicId: 4,
        topicName: "Практика 4: VLAN",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "12. Настройка параметров VLAN в options",
        task: "Задайте TYPE=vlan и HOST=enp7s2 в файле options сабинтерфейса enp7s2.100",
        correctAnswers: [
            "echo -e 'TYPE=vlan\\nHOST=enp7s2' > /etc/net/ifaces/enp7s2.100/options",
            "echo -e \"TYPE=vlan\\nHOST=enp7s2\" > /etc/net/ifaces/enp7s2.100/options"
        ],
        template: "echo -e 'TYPE=vlan\\nHOST=enp7s2' > /etc/net/ifaces/enp7s2.100/options",
        hint: "Параметр HOST указывает, к какому физическому кабелю привязан этот тег VLAN.",
        why: "Драйвер ядра понимает, что нужно тегировать исходящие кадры меткой 100 по стандарту 802.1Q."
    },
    {
        id: "d13",
        topicId: 4,
        topicName: "Практика 4: VLAN",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "13. Назначение IP шлюза для VLAN",
        task: "Задайте адрес шлюза 192.168.1.1/27 для серверного сегмента VLAN 100",
        correctAnswers: [
            "echo '192.168.1.1/27' > /etc/net/ifaces/enp7s2.100/ipv4address",
            "echo \"192.168.1.1/27\" > /etc/net/ifaces/enp7s2.100/ipv4address"
        ],
        template: "echo '192.168.1.1/27' > /etc/net/ifaces/enp7s2.100/ipv4address",
        hint: "Маска /27 для серверной зоны оставляет 30 доступных хостов.",
        why: "Этот IP станет шлюзом по умолчанию для сервера HQ-SRV (192.168.1.2)."
    },

    // --- ТЕМА 5: NAT И ФОРВАРДИНГ ЯДРА ---
    {
        id: "d14",
        topicId: 5,
        topicName: "Практика 5: NAT & Форвардинг",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "14. Включение форвардинга на лету (sysctl)",
        task: "Включите пересылку IPv4-пакетов в ядре Linux через утилиту sysctl",
        correctAnswers: [
            "sysctl -w net.ipv4.ip_forward=1",
            "sysctl -w net.ipv4.ip_forward = 1",
            "sysctl net.ipv4.ip_forward=1"
        ],
        template: "sysctl -w net.ipv4.ip_forward=1",
        hint: "Ключ -w (write) записывает значение 1 в переменную ядра.",
        why: "Без форвардинга ядро считает себя конечным компьютером и сбрасывает все чужие транзитные пакеты."
    },
    {
        id: "d15",
        topicId: 5,
        topicName: "Практика 5: NAT & Форвардинг",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "15. Фиксация форвардинга после reboot",
        task: "Запишите параметр net.ipv4.ip_forward=1 в постоянный файл /etc/net/sysctl.conf",
        correctAnswers: [
            "echo 'net.ipv4.ip_forward=1' > /etc/net/sysctl.conf",
            "echo \"net.ipv4.ip_forward=1\" > /etc/net/sysctl.conf",
            "echo 'net.ipv4.ip_forward = 1' > /etc/net/sysctl.conf"
        ],
        template: "echo 'net.ipv4.ip_forward=1' > /etc/net/sysctl.conf",
        hint: "Файл /etc/net/sysctl.conf считывается сетевой службой при каждом старте системы.",
        why: "Защита от 'Reboot Test' преподавателя — после перезагрузки форвардинг не слетит!"
    },
    {
        id: "d16",
        topicId: 5,
        topicName: "Практика 5: NAT & Форвардинг",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "16. Правило NAT MASQUERADE (iptables)",
        task: "Добавьте в таблицу nat цепочки POSTROUTING правило маскарадинга при выходе через enp7s1",
        correctAnswers: [
            "iptables -t nat -A POSTROUTING -o enp7s1 -j MASQUERADE",
            "iptables -t nat -A POSTROUTING -j MASQUERADE -o enp7s1"
        ],
        template: "iptables -t nat -A POSTROUTING -o enp7s1 -j MASQUERADE",
        hint: "Таблица: -t nat, цепочка: -A POSTROUTING, внешний интерфейс: -o enp7s1, действие: -j MASQUERADE.",
        why: "Подменяет серые адреса 192.168 на внешний IP маршрутизатора для выхода в Интернет."
    },
    {
        id: "d17",
        topicId: 5,
        topicName: "Практика 5: NAT & Форвардинг",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "17. Сохранение правил iptables в файл",
        task: "Сохраните текущие правила iptables в постоянный файл /root/iptables_rules",
        correctAnswers: [
            "iptables-save > /root/iptables_rules",
            "iptables-save >/root/iptables_rules"
        ],
        template: "iptables-save > /root/iptables_rules",
        hint: "Утилита iptables-save выгружает правила в текстовом формате.",
        why: "Правила iptables хранятся в оперативной памяти и теряются при ребуте без автозагрузки из файла."
    },
    {
        id: "d18",
        topicId: 5,
        topicName: "Практика 5: NAT & Форвардинг",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "18. Просмотр счётчиков NAT",
        task: "Проверьте правила цепочки POSTROUTING с показом счетчиков пакетов и байт",
        correctAnswers: [
            "iptables -t nat -vnL POSTROUTING",
            "iptables -t nat -v -n -L POSTROUTING",
            "iptables -t nat -L -v -n",
            "iptables -t nat -S"
        ],
        template: "iptables -t nat -vnL POSTROUTING",
        hint: "Ключи -v (verbose), -n (numeric IP), -L (list).",
        why: "Если счетчик pkts растет при пинге с клиента — значит NAT 100% работает!"
    },

    // --- ТЕМА 6: GRE-ТУННЕЛЬ И OSPF (FRR) ---
    {
        id: "d19",
        topicId: 6,
        topicName: "Практика 6: GRE & OSPF",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "19. Конфигурация параметров GRE-туннеля (MTU 1476)",
        task: "Сконфигурируйте туннель gre1: TUNLOCAL=172.16.1.2, TUNREMOTE=172.16.2.2, TUNTTL=255, TUNMTU=1476",
        correctAnswers: [
            "echo -e 'TYPE=iptun\\nTUNTYPE=gre\\nTUNLOCAL=172.16.1.2\\nTUNREMOTE=172.16.2.2\\nTUNTTL=255\\nTUNMTU=1476' > /etc/net/ifaces/gre1/options",
            "echo -e \"TYPE=iptun\\nTUNTYPE=gre\\nTUNLOCAL=172.16.1.2\\nTUNREMOTE=172.16.2.2\\nTUNTTL=255\\nTUNMTU=1476\" > /etc/net/ifaces/gre1/options"
        ],
        template: "echo -e 'TYPE=iptun\\nTUNTYPE=gre\\nTUNLOCAL=172.16.1.2\\nTUNREMOTE=172.16.2.2\\nTUNTTL=255\\nTUNMTU=1476' > /etc/net/ifaces/gre1/options",
        hint: "MTU строго 1476 байт (1500 минус 24 байта GRE/IP заголовка).",
        why: "Инкапсулирует внутренние корпоративные пакеты в новый конверт сквозь сеть ISP."
    },
    {
        id: "d20",
        topicId: 6,
        topicName: "Практика 6: GRE & OSPF",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "20. IP-адрес туннельного интерфейса /30",
        task: "Задайте IP-адрес 10.0.0.1/30 для туннельного интерфейса gre1 на HQ-RTR",
        correctAnswers: [
            "echo '10.0.0.1/30' > /etc/net/ifaces/gre1/ipv4address",
            "echo \"10.0.0.1/30\" > /etc/net/ifaces/gre1/ipv4address"
        ],
        template: "echo '10.0.0.1/30' > /etc/net/ifaces/gre1/ipv4address",
        hint: "Маска /30 выделяет ровно 2 рабочих адреса (.1 для HQ и .2 для филиала).",
        why: "Точка-точка линк между роутерами офисов поверх публичной сети провайдера."
    },
    {
        id: "d21",
        topicId: 6,
        topicName: "Практика 6: GRE & OSPF",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "21. Запуск демона маршрутизации FRR",
        task: "Включите в автозагрузку и немедленно запустите службу frr",
        correctAnswers: [
            "systemctl enable --now frr",
            "systemctl enable frr && systemctl start frr"
        ],
        template: "systemctl enable --now frr",
        hint: "Флаг enable --now сразу прописывает симлинк автозапуска и стартует сервис.",
        why: "FRR (Free Range Routing) запускает демон ospfd для обмена маршрутами."
    },
    {
        id: "d22",
        topicId: 6,
        topicName: "Практика 6: GRE & OSPF",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "22. Вход в интерактивную консоль vtysh",
        task: "Войдите в командную оболочку FRR (VTY shell)",
        correctAnswers: [
            "vtysh"
        ],
        template: "vtysh",
        hint: "vtysh — единая оболочка в стиле Cisco IOS.",
        why: "Внутри vtysh настраиваются протоколы OSPF, BGP и сохраняется конфигурация (do wr mem)."
    },
    {
        id: "d23",
        topicId: 6,
        topicName: "Практика 6: GRE & OSPF",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "23. Проверка OSPF-соседства",
        task: "Проверьте статус соседей OSPF через vtysh (сосед должен быть в статусе Full)",
        correctAnswers: [
            "vtysh -c 'show ip ospf neighbor'",
            "vtysh -c \"show ip ospf neighbor\"",
            "vtysh -c 'sh ip ospf nei'"
        ],
        template: "vtysh -c 'show ip ospf neighbor'",
        hint: "Ключ -c позволяет выполнить команду vtysh прямо из bash без входа в оболочку.",
        why: "Статус Full/Backup или Full/DROther подтверждает совпадение Area 0, MTU и MD5-пароля."
    },
    {
        id: "d24",
        topicId: 6,
        topicName: "Практика 6: GRE & OSPF",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "24. Проверка OSPF-маршрутов в ядре",
        task: "Посмотрите только те маршруты в таблице ядра, которые получены по протоколу OSPF",
        correctAnswers: [
            "ip route show proto ospf",
            "ip r show proto ospf",
            "ip r s proto ospf"
        ],
        template: "ip route show proto ospf",
        hint: "Параметр proto ospf фильтрует маршруты, переданные демоном zebra в ядро.",
        why: "Доказывает, что сеть филиала 192.168.3.0/28 появилась в ядре автоматически."
    },

    // --- ТЕМА 7: DHCP-СЕРВЕР (dnsmasq) ---
    {
        id: "d25",
        topicId: 7,
        topicName: "Практика 7: DHCP",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "25. Настройка пула и опций DHCP в dnsmasq.conf",
        task: "Настройте пул 192.168.2.2–2.14, шлюз (опция 3: 192.168.2.1) и DNS (опция 6: 192.168.1.2) на порту enp7s2.200",
        correctAnswers: [
            "echo -e 'interface=enp7s2.200\\ndhcp-range=192.168.2.2,192.168.2.14,255.255.255.240,12h\\ndhcp-option=3,192.168.2.1\\ndhcp-option=6,192.168.1.2' >> /etc/dnsmasq.conf",
            "echo -e \"interface=enp7s2.200\\ndhcp-range=192.168.2.2,192.168.2.14,255.255.255.240,12h\\ndhcp-option=3,192.168.2.1\\ndhcp-option=6,192.168.1.2\" >> /etc/dnsmasq.conf"
        ],
        template: "echo -e 'interface=enp7s2.200\\ndhcp-range=192.168.2.2,192.168.2.14,255.255.255.240,12h\\ndhcp-option=3,192.168.2.1\\ndhcp-option=6,192.168.1.2' >> /etc/dnsmasq.conf",
        hint: "Используйте оператор добавления >> чтобы не затереть существующие настройки.",
        why: "Опция 3 сообщает клиенту маршрут по умолчанию, а опция 6 — корпоративный DNS."
    },
    {
        id: "d26",
        topicId: 7,
        topicName: "Практика 7: DHCP",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "26. Перезапуск службы dnsmasq",
        task: "Перезапустите сервис dnsmasq для применения настроек DHCP",
        correctAnswers: [
            "systemctl restart dnsmasq",
            "systemctl restart dnsmasq.service"
        ],
        template: "systemctl restart dnsmasq",
        hint: "systemctl restart dnsmasq применяет изменения в /etc/dnsmasq.conf.",
        why: "Если в конфиге опечатка, systemctl status dnsmasq сразу покажет номер строки с ошибкой."
    },
    {
        id: "d27",
        topicId: 7,
        topicName: "Практика 7: DHCP",
        host: "hq-cli",
        prompt: "root@hq-cli:~# ",
        title: "27. Запрос IP-адреса по DHCP на клиенте",
        task: "Запросите получение IP-адреса по DHCP на интерфейсе enp0s3.200 с подробным выводом (-v)",
        correctAnswers: [
            "dhclient -v enp0s3.200",
            "dhclient -v enp7s1.200",
            "dhclient enp0s3.200"
        ],
        template: "dhclient -v enp0s3.200",
        hint: "Ключ -v выводит этапы DHCPDISCOVER ➔ DHCPOFFER ➔ DHCPREQUEST ➔ DHCPACK.",
        why: "Клиент получает адрес из пула .2–.14 (фактически .12) и правильные шлюз с DNS."
    },

    // --- ТЕМА 8: DNS И SSH ПОРТ 2026 ---
    {
        id: "d28",
        topicId: 8,
        topicName: "Практика 8: DNS & SSH",
        host: "hq-srv",
        prompt: "root@hq-srv:~# ",
        title: "28. Запись DNS зоны и Forwarder 77.88.8.8",
        task: "Добавьте A-запись для hq-srv.au-team.irpo (192.168.1.2) и вышестоящий DNS server=77.88.8.8 в /etc/dnsmasq.conf",
        correctAnswers: [
            "echo -e 'address=/hq-srv.au-team.irpo/192.168.1.2\\nserver=77.88.8.8' >> /etc/dnsmasq.conf",
            "echo -e \"address=/hq-srv.au-team.irpo/192.168.1.2\\nserver=77.88.8.8\" >> /etc/dnsmasq.conf"
        ],
        template: "echo -e 'address=/hq-srv.au-team.irpo/192.168.1.2\\nserver=77.88.8.8' >> /etc/dnsmasq.conf",
        hint: "address=/ДОМЕН/IP задаёт локальное имя, а server=IP указывает форвардер для интернета.",
        why: "Локальные имена резолвятся из памяти, а неизвестные (ya.ru) уходят Яндексу."
    },
    {
        id: "d29",
        topicId: 8,
        topicName: "Практика 8: DNS & SSH",
        host: "hq-srv",
        prompt: "root@hq-srv:~# ",
        title: "29. Направление DNS-запросов на loopback",
        task: "Укажите nameserver 127.0.0.1 в файле resolv.conf интерфейса enp0s3.100",
        correctAnswers: [
            "echo 'nameserver 127.0.0.1' > /etc/net/ifaces/enp0s3.100/resolv.conf",
            "echo \"nameserver 127.0.0.1\" > /etc/net/ifaces/enp0s3.100/resolv.conf",
            "echo 'nameserver 127.0.0.1' > /etc/net/ifaces/enp7s1.100/resolv.conf"
        ],
        template: "echo 'nameserver 127.0.0.1' > /etc/net/ifaces/enp0s3.100/resolv.conf",
        hint: "Loopback 127.0.0.1 заставляет систему опрашивать локальный демон dnsmasq.",
        why: "Если указать внешний DNS, сервер не сможет отрезолвить собственные локальные имена .irpo!"
    },
    {
        id: "d30",
        topicId: 8,
        topicName: "Практика 8: DNS & SSH",
        host: "hq-srv",
        prompt: "root@hq-srv:~# ",
        title: "30. Смена порта SSH на 2026",
        task: "Добавьте директиву Port 2026 в файл конфигурации /etc/openssh/sshd_config",
        correctAnswers: [
            "echo 'Port 2026' >> /etc/openssh/sshd_config",
            "echo \"Port 2026\" >> /etc/openssh/sshd_config"
        ],
        template: "echo 'Port 2026' >> /etc/openssh/sshd_config",
        hint: "Стандартный путь к конфигу OpenSSH в Альт: /etc/openssh/sshd_config.",
        why: "Нестандартный порт защищает от 99% автоматических сканеров и ботнетов."
    },
    {
        id: "d31",
        topicId: 8,
        topicName: "Практика 8: DNS & SSH",
        host: "hq-srv",
        prompt: "root@hq-srv:~# ",
        title: "31. Создание пользователя sshuser (UID 2026)",
        task: "Создайте пользователя sshuser с домашним каталогом и UID 2026, задав пароль 123qweR%",
        correctAnswers: [
            "useradd -m -u 2026 sshuser && echo 'sshuser:123qweR%' | chpasswd",
            "useradd -m -u 2026 sshuser; echo 'sshuser:123qweR%' | chpasswd",
            "useradd -u 2026 sshuser && echo 'sshuser:123qweR%' | chpasswd"
        ],
        template: "useradd -m -u 2026 sshuser && echo 'sshuser:123qweR%' | chpasswd",
        hint: "Флаг -u 2026 задает явный UID, а утилита chpasswd задает пароль в пакетном режиме.",
        why: "Специальный ограниченный пользователь для безопасного подключения по регламенту экзамена."
    },
    {
        id: "d32",
        topicId: 8,
        topicName: "Практика 8: DNS & SSH",
        host: "hq-srv",
        prompt: "root@hq-srv:~# ",
        title: "32. Перезапуск службы SSH",
        task: "Перезапустите службу sshd для применения нового порта 2026",
        correctAnswers: [
            "systemctl restart sshd",
            "systemctl restart sshd.service"
        ],
        template: "systemctl restart sshd",
        hint: "Служба SSH называется sshd.",
        why: "После рестарта порт 22 закрывается, а порт 2026 переходит в состояние LISTEN."
    },

    // --- РАЗДЕЛ 8: КОНТРОЛЬНЫЕ ПРОВЕРКИ (КАК ПРОВЕРЯЕТ ПРЕПОД) ---
    {
        id: "d33",
        topicId: 9,
        topicName: "Контрольные проверки экзаменатора",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "33. Проверка линка к шлюзу ISP",
        task: "Отправьте 2 ICMP-пакета на адрес провайдера 172.16.1.1 для проверки физического кабеля WAN",
        correctAnswers: [
            "ping -c 2 172.16.1.1",
            "ping -c 2 172.16.1.1;"
        ],
        template: "ping -c 2 172.16.1.1",
        hint: "Ключ -c 2 ограничивает число пакетов двумя.",
        why: "Если потерь нет — транзитный линк /28 между HQ и провайдером поднят."
    },
    {
        id: "d34",
        topicId: 11,
        topicName: "Контрольные проверки экзаменатора",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "34. Проверка выхода в глобальный Интернет",
        task: "Проверьте выход в глобальный интернет через пинг ya.ru (2 пакета)",
        correctAnswers: [
            "ping -c 2 ya.ru",
            "ping -c 2 77.88.8.8",
            "ping -c 3 ya.ru"
        ],
        template: "ping -c 2 ya.ru",
        hint: "Пинг ya.ru тестирует всю цепочку: default gateway + forwarding + NAT MASQUERADE + DNS.",
        why: "Главный финальный тест работы сетевого шлюза!"
    },
    {
        id: "d35",
        topicId: 11,
        topicName: "Контрольные проверки экзаменатора",
        host: "hq-cli",
        prompt: "root@hq-cli:~# ",
        title: "35. Сквозная связность между офисами (HQ ➔ BR)",
        task: "С клиентской машины HQ-CLI отправьте 2 пинга на сервер филиала BR-SRV (192.168.3.2)",
        correctAnswers: [
            "ping -c 2 192.168.3.2",
            "ping -c 3 192.168.3.2"
        ],
        template: "ping -c 2 192.168.3.2",
        hint: "Адрес сервера филиала — 192.168.3.2.",
        why: "Доказывает работу GRE-туннеля gre1 и взаимный обмен маршрутами по OSPF между городами!"
    },
    {
        id: "d36",
        topicId: 11,
        topicName: "Контрольные проверки экзаменатора",
        host: "hq-cli",
        prompt: "root@hq-cli:~# ",
        title: "36. Проверка работы корпоративного DNS",
        task: "Проверьте разрешение имени hq-srv.au-team.irpo через DNS-сервер 192.168.1.2 утилитой dig",
        correctAnswers: [
            "dig @192.168.1.2 hq-srv.au-team.irpo +short",
            "dig @192.168.1.2 hq-srv.au-team.irpo",
            "nslookup hq-srv.au-team.irpo 192.168.1.2"
        ],
        template: "dig @192.168.1.2 hq-srv.au-team.irpo +short",
        hint: "Синтаксис: dig @<DNS_сервер> <Имя> +short.",
        why: "Команда должна мгновенно вернуть IP 192.168.1.2."
    },
    {
        id: "d37",
        topicId: 11,
        topicName: "Контрольные проверки экзаменатора",
        host: "hq-cli",
        prompt: "root@hq-cli:~# ",
        title: "37. Проверка SSH на защищённом порту 2026",
        task: "Подключитесь по SSH к серверу 192.168.1.2 пользователем sshuser на порту 2026",
        correctAnswers: [
            "ssh -p 2026 sshuser@192.168.1.2",
            "ssh -p 2026 sshuser@hq-srv.au-team.irpo",
            "ssh sshuser@192.168.1.2 -p 2026"
        ],
        template: "ssh -p 2026 sshuser@192.168.1.2",
        hint: "Флаг порта в клиенте ssh указывается через маленькую -p 2026.",
        why: "Финальная проверка защищённого удалённого доступа к серверу."
    },
    {
        id: "d38",
        topicId: 9,
        topicName: "Практика 9: Active Directory (Samba DC)",
        host: "br-srv",
        prompt: "root@br-srv:~# ",
        title: "38. Установка контроллера домена Samba AD DC",
        task: "Установите пакет контроллера домена task-samba-dc на сервере BR-SRV",
        correctAnswers: [
            "apt-get install task-samba-dc -y",
            "apt-get install task-samba-dc"
        ],
        template: "apt-get install task-samba-dc -y",
        hint: "Используйте менеджер apt-get с ключом -y.",
        why: "Пакет task-samba-dc устанавливает Samba 4 со встроенной службой Active Directory."
    },
    {
        id: "d39",
        topicId: 9,
        topicName: "Практика 9: Active Directory (Samba DC)",
        host: "br-srv",
        prompt: "root@br-srv:~# ",
        title: "39. Проверка статуса домена через samba-tool",
        task: "Выведите информацию о развёрнутом домене Active Directory через samba-tool",
        correctAnswers: [
            "samba-tool domain info 127.0.0.1"
        ],
        template: "samba-tool domain info 127.0.0.1",
        hint: "Команда: samba-tool domain info 127.0.0.1",
        why: "Подтверждает, что контроллер домена Samba DC запущен и отдаёт имя леса и домена au-team.irpo."
    },
    {
        id: "d40",
        topicId: 9,
        topicName: "Практика 9: Active Directory (Samba DC)",
        host: "hq-srv",
        prompt: "root@hq-srv:~# ",
        title: "40. Получение тикета Kerberos администратора",
        task: "Запросите билет аутентификации Kerberos для administrator домена AU-TEAM.IRPO",
        correctAnswers: [
            "kinit administrator",
            "kinit administrator@AU-TEAM.IRPO"
        ],
        template: "kinit administrator",
        hint: "Утилита kinit запрашивает билет TGT (пароль 123qweR%).",
        why: "Подтверждает корректность работы KDC и синхронизацию системного времени."
    },
    {
        id: "d41",
        topicId: 10,
        topicName: "Практика 10: Локальные & Доменные пользователи",
        host: "hq-srv",
        prompt: "root@hq-srv:~# ",
        title: "41. Создание пользователя sshuser с UID 2026",
        task: "Создайте локального пользователя sshuser с числовым UID 2026",
        correctAnswers: [
            "useradd sshuser -u 2026",
            "useradd -u 2026 sshuser"
        ],
        template: "useradd sshuser -u 2026",
        hint: "Флаг -u 2026 задаёт идентификатор пользователя UID.",
        why: "UID 2026 зафиксирован в регламенте для привязки к порту SSH."
    },
    {
        id: "d42",
        topicId: 10,
        topicName: "Практика 10: Локальные & Доменные пользователи",
        host: "hq-rtr",
        prompt: "root@hq-rtr:~# ",
        title: "42. Установка утилиты sudo на маршрутизаторе",
        task: "На маршрутизаторе HQ-RTR (Альт JeOS) установите пакет sudo",
        correctAnswers: [
            "apt-get update && apt-get install sudo -y",
            "apt-get install sudo -y",
            "apt-get install sudo"
        ],
        template: "apt-get install sudo -y",
        hint: "В дистрибутиве Альт JeOS sudo не входит в базовую поставку.",
        why: "Без пакета sudo сетевой администратор net_admin не сможет выполнять команды с привилегиями root."
    },
    {
        id: "d43",
        topicId: 10,
        topicName: "Практика 10: Локальные & Доменные пользователи",
        host: "br-srv",
        prompt: "root@br-srv:~# ",
        title: "43. Создание группы пользователей hq в Samba AD",
        task: "Создайте в Active Directory группу пользователей hq командой samba-tool",
        correctAnswers: [
            "samba-tool group add hq"
        ],
        template: "samba-tool group add hq",
        hint: "Команда: samba-tool group add hq",
        why: "Группа безопасности hq объединяет сотрудников центрального офиса."
    }
];

// Класс менеджера быстрого повторения
class DrillTrainer {
    constructor() {
        this.allTasks = DRILL_COMMANDS;
        this.completedTasks = new Set(JSON.parse(localStorage.getItem('alt_drill_completed') || '[]'));
        this.currentTopic = 'all';
        this.currentMode = 'interactive'; // 'interactive' | 'list'
        this.filteredTasks = [...this.allTasks];
        this.currentIndex = 0;
        this.streak = 0;

        this.initDOMElements();
        this.bindEvents();
        this.filterTasks();
        this.renderPills();
        this.loadCurrentTask();
        this.renderCheatList();
        this.updateStats();
    }

    initDOMElements() {
        this.topicSelect = document.getElementById('drill-topic-filter');
        this.btnModeInteractive = document.getElementById('drill-mode-term');
        this.btnModeList = document.getElementById('drill-mode-list');
        this.paneInteractive = document.getElementById('drill-pane-term');
        this.paneList = document.getElementById('drill-pane-list');

        this.statCompleted = document.getElementById('stat-drill-completed');
        this.statStreak = document.getElementById('stat-drill-streak');
        this.btnReset = document.getElementById('btn-reset-drill-progress');

        this.navPills = document.getElementById('drill-task-nav');
        this.taskBadge = document.getElementById('drill-task-badge');
        this.taskCounter = document.getElementById('drill-task-counter');
        this.taskTitle = document.getElementById('drill-task-title');
        this.taskDesc = document.getElementById('drill-task-desc');

        this.btnHint = document.getElementById('drill-btn-hint');
        this.btnTemplate = document.getElementById('drill-btn-template');
        this.btnAnswer = document.getElementById('drill-btn-answer');
        this.btnNext = document.getElementById('drill-btn-next');
        this.hintBox = document.getElementById('drill-hint-box');

        this.termOutput = document.getElementById('drill-term-output');
        this.termInput = document.getElementById('drill-term-input');
        this.termPrompt = document.getElementById('drill-term-prompt');
        this.btnRun = document.getElementById('drill-btn-run');

        this.cheatListContainer = document.getElementById('drill-cheat-list-container');
    }

    bindEvents() {
        this.topicSelect?.addEventListener('change', (e) => {
            this.currentTopic = e.target.value;
            this.filterTasks();
            this.currentIndex = 0;
            this.renderPills();
            this.loadCurrentTask();
            this.renderCheatList();
        });

        this.btnModeInteractive?.addEventListener('click', () => this.switchMode('interactive'));
        this.btnModeList?.addEventListener('click', () => this.switchMode('list'));

        this.btnReset?.addEventListener('click', () => {
            if (confirm("Сбросить прогресс выученных команд?")) {
                this.completedTasks.clear();
                localStorage.removeItem('alt_drill_completed');
                this.streak = 0;
                this.renderPills();
                this.updateStats();
                this.renderCheatList();
                this.loadCurrentTask();
            }
        });

        this.btnHint?.addEventListener('click', () => this.toggleHint('hint'));
        this.btnTemplate?.addEventListener('click', () => this.toggleHint('template'));
        this.btnAnswer?.addEventListener('click', () => this.toggleHint('answer'));
        this.btnNext?.addEventListener('click', () => this.nextTask());

        // Ввод в терминале
        this.termInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleCommand(this.termInput.value);
            }
        });

        this.btnRun?.addEventListener('click', () => {
            this.handleCommand(this.termInput?.value || '');
        });

        // Tab completion
        if (window.altTabCompleter && this.termInput) {
            window.altTabCompleter.attachToInput(
                this.termInput,
                this.termOutput,
                () => this.termPrompt?.textContent || 'root@hq-rtr:~# '
            );
        }

        // Мобильные быстрые клавиши-чипы
        document.querySelectorAll('#sec-drill .key-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.preventDefault();
                const key = chip.getAttribute('data-key');
                const action = chip.getAttribute('data-action');

                // Если открыт текстовый редактор (nano, vim, mcedit) — направляем ввод в него!
                if (window.terminalEditor && window.terminalEditor.isOpen && window.terminalEditor.textarea) {
                    const ed = window.terminalEditor;
                    if (ed.editorType === 'vim' && ed.vimMode !== 'insert') {
                        ed.setVimMode('insert');
                    }
                    if (action === 'tab') {
                        ed.insertTextAtCursor('    ');
                    } else if (action === 'clear') {
                        const ta = ed.textarea;
                        const start = ta.selectionStart || 0;
                        if (start > 0) {
                            ta.value = ta.value.substring(0, start - 1) + ta.value.substring(start);
                            ta.selectionStart = ta.selectionEnd = start - 1;
                            ta.dispatchEvent(new Event('input'));
                        }
                    } else if (key) {
                        ed.insertTextAtCursor(key);
                    }
                    return;
                }

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

    switchMode(mode) {
        this.currentMode = mode;
        if (mode === 'interactive') {
            this.btnModeInteractive?.classList.add('active');
            this.btnModeList?.classList.remove('active');
            this.paneInteractive?.classList.remove('hidden');
            this.paneList?.classList.add('hidden');
            setTimeout(() => this.termInput?.focus(), 50);
        } else {
            this.btnModeInteractive?.classList.remove('active');
            this.btnModeList?.classList.add('active');
            this.paneInteractive?.classList.add('hidden');
            this.paneList?.classList.remove('hidden');
            this.renderCheatList();
        }
    }

    filterTasks() {
        if (this.currentTopic === 'all') {
            this.filteredTasks = [...this.allTasks];
        } else {
            const tid = parseInt(this.currentTopic, 10);
            this.filteredTasks = this.allTasks.filter(t => t.topicId === tid);
        }
    }

    renderPills() {
        if (!this.navPills) return;
        this.navPills.innerHTML = this.filteredTasks.map((t, idx) => {
            const isDone = this.completedTasks.has(t.id);
            const isCur = idx === this.currentIndex;
            const cls = ['task-pill'];
            if (isCur) cls.push('active');
            if (isDone) cls.push('completed');
            return `<button class="${cls.join(' ')}" onclick="window.drillTrainer.selectIndex(${idx})">${isDone ? '✓ ' : ''}${idx + 1}</button>`;
        }).join('');
    }

    selectIndex(idx) {
        if (idx >= 0 && idx < this.filteredTasks.length) {
            this.currentIndex = idx;
            this.renderPills();
            this.loadCurrentTask();
        }
    }

    loadCurrentTask() {
        const task = this.filteredTasks[this.currentIndex];
        if (!task) return;

        if (this.taskBadge) this.taskBadge.textContent = task.topicName;
        if (this.taskCounter) this.taskCounter.textContent = `${this.currentIndex + 1} / ${this.filteredTasks.length}`;
        if (this.taskTitle) this.taskTitle.textContent = task.title;
        if (this.taskDesc) this.taskDesc.textContent = task.task;
        if (this.termPrompt) this.termPrompt.textContent = task.prompt;

        if (this.hintBox) {
            this.hintBox.classList.add('hidden');
            this.hintBox.innerHTML = '';
        }

        if (this.termOutput) {
            this.termOutput.innerHTML = `
                <div class="term-line text-muted">[Терминал быстрого повторения — Команда #${this.currentIndex + 1}]</div>
                <div class="term-line text-yellow font-bold">🎯 Цель: ${this.escapeHtml(task.task)}</div>
                <div class="term-line text-muted">Введите команду и нажмите Enter для проверки.</div>
            `;
        }

        if (this.termInput) {
            this.termInput.value = '';
            this.termInput.focus();
        }
    }

    toggleHint(type) {
        const task = this.filteredTasks[this.currentIndex];
        if (!task || !this.hintBox) return;

        let content = '';
        if (type === 'hint') {
            content = `💡 <b>Подсказка:</b> ${task.hint}`;
        } else if (type === 'template') {
            content = `⚡ <b>Шаблон синтаксиса:</b> <code>${this.escapeHtml(task.template)}</code>`;
        } else if (type === 'answer') {
            content = `👁 <b>Эталонный ответ:</b> <code>${this.escapeHtml(task.correctAnswers[0])}</code>`;
        }

        this.hintBox.innerHTML = `
            <div class="d-flex justify-between align-center">
                <div>${content}</div>
                <button class="btn btn-xs btn-outline text-muted" onclick="document.getElementById('drill-hint-box').classList.add('hidden')">✕</button>
            </div>
        `;
        this.hintBox.classList.remove('hidden');
    }

    handleCommand(rawCmd) {
        const cmd = (rawCmd || '').trim();
        if (!cmd) return;

        const task = this.filteredTasks[this.currentIndex];
        if (!task) return;

        // Если пользователь вводит текстовый редактор (nano, vim, vi, mcedit) — открываем документ в редакторе!
        const editorMatch = cmd.match(/^(nano|vim|vi|mcedit)(\s+.*)?$/i);
        if (editorMatch && window.terminalEditor) {
            const edType = editorMatch[1].toLowerCase();
            const edTarget = (editorMatch[2] || '').trim();
            this.handleEditorCommand(edType, edTarget, task);
            if (this.termInput) this.termInput.value = '';
            return;
        }

        // Нормализация для проверки
        const norm = (str) => str.toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/['"]/g, "'")
            .replace(/\\n/g, '\n')
            .trim();

        const cleanInput = norm(cmd);
        let isMatch = task.correctAnswers.some(ans => norm(ans) === cleanInput);

        const prompt = task.prompt;
        const lineEcho = `<div class="term-line"><span class="prompt">${prompt}</span><span class="text-white">${this.escapeHtml(cmd)}</span></div>`;

        if (isMatch) {
            this.completedTasks.add(task.id);
            localStorage.setItem('alt_drill_completed', JSON.stringify([...this.completedTasks]));
            this.streak++;
            this.updateStats();

            this.termOutput.innerHTML += `
                ${lineEcho}
                <div class="term-line text-green font-bold">✓ ВЕРНО! [ОТЛИЧНО]</div>
                <div class="term-line text-cyan text-sm mt-1">🧠 <b>Зачем на экзамене:</b> ${this.escapeHtml(task.why)}</div>
                <div class="term-line mt-2">
                    <button class="btn btn-sm btn-success" onclick="window.drillTrainer.nextTask()">Следующая команда [Enter] →</button>
                </div>
            `;
            this.termOutput.scrollTop = this.termOutput.scrollHeight;
            this.renderPills();

            if (this.termInput) {
                this.termInput.value = '';
                this.termInput.focus();
            }
        } else {
            this.streak = 0;
            this.updateStats();

            this.termOutput.innerHTML += `
                ${lineEcho}
                <div class="term-line text-danger font-bold">✗ Ошибка в синтаксисе или параметрах команды.</div>
                <div class="term-line text-muted text-sm">💡 Попробуйте ещё раз, откройте файл через <code>nano &lt;файл&gt;</code> или изучите «Шаблон синтаксиса» выше.</div>
            `;
            this.termOutput.scrollTop = this.termOutput.scrollHeight;
        }
    }

    handleEditorCommand(editorType, fileArg, task) {
        if (!window.terminalEditor) return;

        // Извлекаем целевой файл из правильных ответов задачи
        let targetFile = '';
        for (const ans of task.correctAnswers) {
            const fileMatch = ans.match(/>>\s*([^\s;]+)|>\s*([^\s;]+)/);
            if (fileMatch) {
                targetFile = (fileMatch[1] || fileMatch[2] || '').trim();
                break;
            }
            const edMatch = ans.match(/^(?:nano|vim|vi|mcedit|cat|touch)\s+([^\s;]+)/i);
            if (edMatch) {
                targetFile = edMatch[1].trim();
                break;
            }
        }
        if (!targetFile && task.template) {
            const fileMatch = task.template.match(/>>\s*([^\s;]+)|>\s*([^\s;]+)/);
            if (fileMatch) {
                targetFile = (fileMatch[1] || fileMatch[2] || '').trim();
            }
        }

        let resolvedPath = fileArg || targetFile || '/etc/net/ifaces/enp7s1/options';
        let typoNotice = '';

        // Проверка типичных опечаток
        if (resolvedPath.endsWith('/option') && targetFile.endsWith('/options')) {
            typoNotice = '⚠️ Замечена опечатка: вы указали <b>option</b> без буквы "s". В ОС «Альт» файл называется строго <b>options</b>! Открываем правильный документ options...';
            resolvedPath = targetFile;
        } else if (resolvedPath.includes('ipv4address') && targetFile.includes('options')) {
            typoNotice = '⚠️ Внимание: <b>ipv4address</b> предназначен для IP-адреса, а в задании требуется настроить паспорт параметров <b>options</b>! Открываем документ options...';
            resolvedPath = targetFile;
        } else if (resolvedPath.includes('ipv4route') && targetFile.includes('options')) {
            typoNotice = '⚠️ Внимание: <b>ipv4route</b> предназначен для маршрутов, а в задании требуется настроить файл <b>options</b>! Открываем документ options...';
            resolvedPath = targetFile;
        }

        const prompt = task.prompt || 'root@node:~# ';
        let outHtml = `<div class="term-line"><span class="prompt">${prompt}</span><span class="text-white">${this.escapeHtml(editorType + ' ' + (fileArg || resolvedPath))}</span></div>`;
        if (typoNotice) {
            outHtml += `<div class="term-line text-yellow text-sm">${typoNotice}</div>`;
        }
        this.termOutput.innerHTML += outHtml;
        this.termOutput.scrollTop = this.termOutput.scrollHeight;

        const container = document.querySelector('#sec-drill .terminal-window') || this.termOutput.parentElement;

        // Начальное содержимое документа
        let initialContent = window.standSimulator?.state[task.host]?.files[resolvedPath] || '';
        if (!initialContent) {
            const tpl = window.terminalEditor.getTemplateForFile(resolvedPath);
            if (tpl) initialContent = tpl;
        }

        window.terminalEditor.open({
            container: container,
            type: editorType,
            filepath: resolvedPath,
            displayPath: fileArg || resolvedPath,
            initialContent: initialContent,
            onSave: (fp, content) => {
                if (window.standSimulator && task.host) {
                    if (!window.standSimulator.state[task.host]) window.standSimulator.state[task.host] = { files: {} };
                    window.standSimulator.state[task.host].files[fp] = content;
                    window.standSimulator.applyEtcNetConfigurations?.(window.standSimulator.state[task.host]);
                    window.standSimulator.saveState();
                }
            },
            onExit: (fp, content, wasSaved) => {
                this.termInput?.focus();
                if (wasSaved) {
                    this.termOutput.innerHTML += `
                        <div class="term-line sys-msg">
                            <span class="text-cyan">[ Записано в файл ${this.escapeHtml(fp)} через ${editorType} ]</span>
                        </div>
                    `;
                    const isSolved = this.checkTaskCompletionByContent(task, fp, content);
                    if (isSolved) {
                        this.completedTasks.add(task.id);
                        localStorage.setItem('alt_drill_completed', JSON.stringify([...this.completedTasks]));
                        this.streak++;
                        this.updateStats();

                        this.termOutput.innerHTML += `
                            <div class="term-line text-green font-bold">✓ ВЕРНО! [ОТЛИЧНО] Документ успешно настроен и сохранён в ${this.escapeHtml(fp)}</div>
                            <div class="term-line text-cyan text-sm mt-1">🧠 <b>Зачем на экзамене:</b> ${this.escapeHtml(task.why)}</div>
                            <div class="term-line mt-2">
                                <button class="btn btn-sm btn-success" onclick="window.drillTrainer.nextTask()">Следующая команда [Enter] →</button>
                            </div>
                        `;
                        this.renderPills();
                    } else {
                        this.streak = 0;
                        this.updateStats();
                        this.termOutput.innerHTML += `
                            <div class="term-line text-warning">⚠️ Файл сохранён, но требуемые параметры не обнаружены. Проверьте правильность строк в файле или используйте кнопку «⚡ Шаблон» внутри редактора.</div>
                        `;
                    }
                    this.termOutput.scrollTop = this.termOutput.scrollHeight;
                }
            }
        });
    }

    checkTaskCompletionByContent(task, filepath, content) {
        if (!task) return false;
        const normFp = (filepath || '').toLowerCase().replace(/\/+$/, '');
        const cleanContent = (content || '').toLowerCase();

        // 1. Проверяем соответствие файла
        let targetFile = '';
        for (const ans of task.correctAnswers) {
            const m = ans.match(/>>\s*([^\s;]+)|>\s*([^\s;]+)/);
            if (m) {
                targetFile = (m[1] || m[2] || '').trim().toLowerCase();
                break;
            }
            const edMatch = ans.match(/^(?:nano|vim|vi|mcedit|cat|touch)\s+([^\s;]+)/i);
            if (edMatch) {
                targetFile = edMatch[1].trim().toLowerCase();
                break;
            }
        }
        if (!targetFile && task.template) {
            const m = task.template.match(/>>\s*([^\s;]+)|>\s*([^\s;]+)/);
            if (m) {
                targetFile = (m[1] || m[2] || '').trim().toLowerCase();
            }
        }

        if (targetFile) {
            const targetBase = targetFile.split('/').pop();
            const fpBase = normFp.split('/').pop();
            if (normFp !== targetFile && fpBase !== targetBase) {
                return false;
            }
        }

        // 2. Проверяем ключевые параметры задачи
        if (cleanContent.includes('bootproto=static') && cleanContent.includes('type=eth')) {
            return true;
        }
        if (cleanContent.includes('vid=100') && cleanContent.includes('type=vlan')) {
            return true;
        }
        if (cleanContent.includes('type=iptun') && cleanContent.includes('tuntype=gre')) {
            return true;
        }
        if (normFp.includes('resolv.conf') && cleanContent.includes('nameserver') && cleanContent.includes('127.0.0.1')) {
            return true;
        }

        for (const ans of task.correctAnswers) {
            const echoM = ans.match(/echo\s+(?:-e\s+)?['"]([^'"]+)['"]/);
            if (echoM) {
                const lines = echoM[1].toLowerCase().split(/\\n|\n/).map(l => l.trim().replace(/['"]/g, '')).filter(Boolean);
                const allPresent = lines.every(l => cleanContent.includes(l));
                if (allPresent) return true;
            }
        }

        return false;
    }

    nextTask() {
        if (this.currentIndex < this.filteredTasks.length - 1) {
            this.currentIndex++;
            this.renderPills();
            this.loadCurrentTask();
        } else {
            alert("🎉 Поздравляем! Все команды данного раздела успешно пройдены!");
        }
    }

    renderCheatList() {
        if (!this.cheatListContainer) return;

        const grouped = {};
        this.filteredTasks.forEach(t => {
            if (!grouped[t.topicName]) grouped[t.topicName] = [];
            grouped[t.topicName].push(t);
        });

        let html = '';
        for (const [topicName, tasks] of Object.entries(grouped)) {
            html += `
                <div class="drill-group-card mb-4" style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; padding: 1rem;">
                    <h3 class="text-cyan mb-3" style="font-size: 1.1rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.5rem;">
                        📁 ${topicName} <span class="badge badge-topic text-xs ml-2">${tasks.length} команд</span>
                    </h3>
                    <div class="drill-items-grid" style="display: flex; flex-direction: column; gap: 0.75rem;">
            `;

            tasks.forEach(t => {
                const isDone = this.completedTasks.has(t.id);
                html += `
                    <div class="drill-cheat-item" style="background: #090e18; border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 0.75rem;">
                        <div class="d-flex justify-between align-center flex-wrap gap-2 mb-1">
                            <span class="font-bold text-white text-sm">${isDone ? '✓ ' : ''}${t.title}</span>
                            <span class="badge" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; font-size: 0.72rem;">${t.host.toUpperCase()}</span>
                        </div>
                        <p class="text-xs text-muted mb-2">${t.task}</p>
                        <div class="d-flex align-center gap-2 flex-wrap" style="background: #020617; padding: 0.45rem 0.65rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.04);">
                            <code style="color: #22c55e; font-size: 0.85rem; flex: 1; word-break: break-all;">${this.escapeHtml(t.correctAnswers[0])}</code>
                            <button class="btn btn-xs btn-outline copy-btn" data-copy="${this.escapeHtml(t.correctAnswers[0])}" style="font-size: 0.72rem; padding: 0.25rem 0.5rem;">
                                📋 Копировать
                            </button>
                        </div>
                        <div class="text-xs text-yellow mt-1">💡 <b>Зачем:</b> ${t.why}</div>
                    </div>
                `;
            });

            html += `</div></div>`;
        }

        this.cheatListContainer.innerHTML = html;

        // Привязываем кнопки копирования
        this.cheatListContainer.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const text = btn.getAttribute('data-copy');
                if (text && navigator.clipboard) {
                    navigator.clipboard.writeText(text).then(() => {
                        const orig = btn.textContent;
                        btn.textContent = '✓ Скопировано!';
                        btn.classList.add('text-green');
                        setTimeout(() => {
                            btn.textContent = orig;
                            btn.classList.remove('text-green');
                        }, 1500);
                    });
                }
            });
        });
    }

    updateStats() {
        if (this.statCompleted) {
            this.statCompleted.textContent = `${this.completedTasks.size} / ${this.allTasks.length}`;
        }
        if (this.statStreak) {
            this.statStreak.textContent = `${this.streak} 🔥`;
        }
    }

    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

window.DrillTrainer = DrillTrainer;
window.DRILL_COMMANDS = DRILL_COMMANDS;
