// Главный контроллер приложения

document.addEventListener('DOMContentLoaded', () => {
    // Инициализация вкладок
    initTabs();

    // Инициализация модулей
    window.terminalTrainer = new TerminalTrainer();
    window.teacherTrainer = new TeacherExamTrainer();
    window.topologyManager = new TopologyManager();
    window.examQAManager = new ExamQAManager();

    // Рендер шпаргалки конфигураций
    renderReferenceTables();
    renderCopyableSnippets();

    // Быстрое копирование в буфер
    initCopyButtons();
});

function initTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    const sections = document.querySelectorAll('.app-section');

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

            // Фокус в инпут при открытии консоли
            if (targetSection === 'sec-terminal') {
                document.getElementById('terminal-input')?.focus();
            } else if (targetSection === 'sec-teacher') {
                document.getElementById('teacher-term-input')?.focus();
            }
        });
    });
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

    // Таблица ВМ
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
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeForAttr(str) {
    return str.replace(/"/g, '&quot;');
}
