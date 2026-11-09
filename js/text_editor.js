// js/text_editor.js
// Полнофункциональный интерактивный текстовый редактор для консоли (GNU nano, mcedit, vim / vi)
// Позволяет открывать, редактировать и сохранять документы прямо внутри терминала стенда!

class TerminalTextEditor {
    getTemplateForFile(filepath) {
        const fp = filepath || '';
        if (fp.includes('/gre1/options')) {
            const curTask = window.terminalTrainer?.filteredTasks?.[window.terminalTrainer?.currentTaskIndex];
            const host = curTask?.host || 'hq-rtr';
            if (host === 'br-rtr') {
                return 'TYPE=iptun\nTUNTYPE=gre\nTUNLOCAL=172.16.2.2\nTUNREMOTE=172.16.1.2\nTUNTTL=255\nTUNMTU=1476\n';
            }
            return 'TYPE=iptun\nTUNTYPE=gre\nTUNLOCAL=172.16.1.2\nTUNREMOTE=172.16.2.2\nTUNTTL=255\nTUNMTU=1476\n';
        }
        if (fp.includes('/ipv4address')) {
            const cur = window.terminalTrainer?.filteredTasks?.[window.terminalTrainer?.currentTaskIndex];
            if (cur && cur.correctAnswers) {
                for (const a of cur.correctAnswers) {
                    const m = a.match(/echo\s+['"]?([^'">]+)['"]?\s*>/);
                    if (m) return m[1].trim() + '\n';
                }
            }
        }
        if (fp.includes('/hostname')) {
            const cur = window.terminalTrainer?.filteredTasks?.[window.terminalTrainer?.currentTaskIndex];
            if (cur && cur.correctAnswers) {
                for (const a of cur.correctAnswers) {
                    const m = a.match(/set-hostname\s+([^\s;]+)/);
                    if (m) return m[1].trim() + '\n';
                }
            }
        }
        return null;
    }

    constructor() {
        this.isOpen = false;
        this.editorType = 'nano'; // 'nano' | 'mcedit' | 'vim' | 'vi'
        this.filepath = '';
        this.displayPath = '';
        this.container = null;
        this.element = null;
        this.textarea = null;
        this.statusEl = null;
        this.initialContent = '';
        this.currentContent = '';
        this.isModified = false;
        this.wasSaved = false;
        this.onSaveCallback = null;
        this.onExitCallback = null;

        // Состояние для Vim
        this.vimMode = 'normal'; // 'normal' | 'insert' | 'command'
        this.vimCmdBuffer = '';
    }

    /**
     * Открыть текстовый редактор
     * @param {Object} options
     * @param {HTMLElement} options.container - родительский элемент (например #terminal-window)
     * @param {string} options.type - 'nano' | 'mcedit' | 'vim' | 'vi'
     * @param {string} options.filepath - абсолютный путь файла (/etc/net/ifaces/...)
     * @param {string} [options.displayPath] - отображаемый путь
     * @param {string} [options.initialContent] - начальное содержимое
     * @param {Function} options.onSave - callback(filepath, content)
     * @param {Function} options.onExit - callback(filepath, content, wasSaved)
     */
    open(options) {
        if (this.isOpen) return;

        this.container = options.container;
        this.editorType = (options.type || 'nano').toLowerCase();
        this.filepath = options.filepath || '/root/untitled';
        this.displayPath = options.displayPath || this.filepath;
        this.initialContent = options.initialContent || '';
        this.currentContent = this.initialContent;
        this.isModified = false;
        this.wasSaved = false;
        this.onSaveCallback = options.onSave;
        this.onExitCallback = options.onExit;

        // Если это vi, приравниваем к vim
        if (this.editorType === 'vi') this.editorType = 'vim';

        this.vimMode = 'normal';
        this.vimCmdBuffer = '';

        this.render();
        this.bindEvents();
        this.isOpen = true;
    }

    render() {
        if (!this.container) return;

        const wrapper = document.createElement('div');
        wrapper.className = `terminal-text-editor editor-${this.editorType}`;
        wrapper.id = 'active-terminal-text-editor';

        if (this.editorType === 'nano') {
            wrapper.innerHTML = this.renderNanoHtml();
        } else if (this.editorType === 'mcedit') {
            wrapper.innerHTML = this.renderMceditHtml();
        } else if (this.editorType === 'vim') {
            wrapper.innerHTML = this.renderVimHtml();
        }

        this.container.appendChild(wrapper);
        this.element = wrapper;
        this.textarea = wrapper.querySelector('.editor-textarea');
        this.statusEl = wrapper.querySelector('.editor-status-text');

        if (this.textarea) {
            this.textarea.value = this.initialContent;

            // Защита от потери фокуса: клики внутри редактора не должны улетать в терминал
            wrapper.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            this.textarea.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.editorType === 'vim' && this.vimMode !== 'insert') {
                    this.setVimMode('insert');
                }
            });

            // Фокус в редактор
            setTimeout(() => {
                this.textarea.focus();
                if (this.editorType === 'vim') {
                    // В vim сразу включаем режим вставки, чтобы можно было писать без блокировок!
                    this.setVimMode('insert');
                }
            }, 50);
        }
    }

    renderNanoHtml() {
        return `
            <div class="nano-header">
                <div class="nano-header-title">
                    <span class="text-white font-bold">GNU nano 7.2</span>
                    <span class="text-muted">|</span>
                    <span class="nano-file-badge">Файл: <code>${this.escapeHtml(this.displayPath)}</code></span>
                    <span id="nano-mod-badge" class="nano-modified-tag hidden">[ Изменен ]</span>
                </div>
                <div class="nano-quick-bar">
                    <button id="editor-btn-save" class="btn btn-xs btn-success font-bold" title="Сохранить файл (Ctrl+O)">
                        💾 Записать (Ctrl+O)
                    </button>
                    <button id="editor-btn-template" class="btn btn-xs btn-warning font-bold" title="Вставить готовый шаблон для этого файла">⚡ Шаблон</button>
                    <button id="editor-btn-paste" class="btn btn-xs btn-outline text-cyan" title="Вставить из буфера">
                        📋 Вставить
                    </button>
                    <button id="editor-btn-exit" class="btn btn-xs btn-danger font-bold" title="Выйти из редактора (Ctrl+X)">
                        ✕ Выход (Ctrl+X)
                    </button>
                </div>
            </div>

            <div class="nano-body">
                <textarea class="editor-textarea" spellcheck="false" autocapitalize="none" autocomplete="off" placeholder="Введите текст конфигурации..."></textarea>
            </div>

            <div class="nano-footer">
                <div class="editor-status-text nano-status-msg">
                    [ Подсказка: введите текст и нажмите «Записать (Ctrl+O)», затем «Выход (Ctrl+X)» ]
                </div>
                <div class="nano-shortcuts-grid">
                    <div class="nano-key-item" data-action="save"><b>^O</b> Записать</div>
                    <div class="nano-key-item" data-action="exit"><b>^X</b> Выход</div>
                    <div class="nano-key-item" data-action="paste"><b>^U</b> Вставить</div>
                    <div class="nano-key-item" data-action="cut"><b>^K</b> Вырезать</div>
                </div>
            </div>
        `;
    }

    renderMceditHtml() {
        return `
            <div class="mcedit-header">
                <div class="d-flex align-center gap-2">
                    <span class="font-bold">[ ]</span>
                    <span class="font-bold">${this.escapeHtml(this.displayPath)}</span>
                    <span id="mcedit-mod-badge" class="badge-mini hidden">[*]</span>
                </div>
                <div class="d-flex gap-2">
                    <button id="editor-btn-save" class="btn btn-xs btn-success font-bold" title="F2 Сохранить">
                        💾 F2 Сохранить
                    </button>
                    <button id="editor-btn-template" class="btn btn-xs btn-warning font-bold" title="Вставить готовый шаблон для этого файла">⚡ Шаблон</button>
                    <button id="editor-btn-paste" class="btn btn-xs btn-outline text-cyan">
                        📋 Вставить
                    </button>
                    <button id="editor-btn-exit" class="btn btn-xs btn-danger font-bold" title="F10 Выход">
                        ✕ F10 Выход
                    </button>
                </div>
            </div>

            <div class="nano-body" style="background: #000088;">
                <textarea class="editor-textarea" spellcheck="false" autocapitalize="none" autocomplete="off" style="background:#000088; color:#fff;" placeholder="# Midnight Commander Editor&#10;# Введите текст конфигурации..."></textarea>
            </div>

            <div class="editor-status-text text-yellow px-2 py-1 text-xs" style="background: #000044;">
                F2 Сохранить  |  F10 или Esc Выход  |  F3 Блок  |  F7 Поиск
            </div>
            <div class="mcedit-footer">
                <div class="mcedit-fkey" data-action="help">1 Помощь</div>
                <div class="mcedit-fkey" data-action="save">2 Сохран</div>
                <div class="mcedit-fkey" data-action="block">3 Блок</div>
                <div class="mcedit-fkey" data-action="replace">4 Замена</div>
                <div class="mcedit-fkey" data-action="copy">5 Копия</div>
                <div class="mcedit-fkey" data-action="move">6 Перенос</div>
                <div class="mcedit-fkey" data-action="search">7 Поиск</div>
                <div class="mcedit-fkey" data-action="del">8 Удал</div>
                <div class="mcedit-fkey" data-action="menu">9 Меню</div>
                <div class="mcedit-fkey" data-action="exit">10 Выход</div>
            </div>
        `;
    }

    renderVimHtml() {
        return `
            <div class="vim-header">
                <div class="d-flex align-center gap-2">
                    <span class="text-green font-bold">VIM - Vi IMproved 9.0</span>
                    <span class="text-muted">|</span>
                    <span><code>${this.escapeHtml(this.displayPath)}</code></span>
                </div>
                <div class="d-flex gap-2">
                    <button id="vim-btn-mode-toggle" class="btn btn-xs btn-outline text-yellow font-bold">
                        ✏️ Режим вставки (i)
                    </button>
                    <button id="editor-btn-save" class="btn btn-xs btn-success font-bold" title=":wq Сохранить и выйти">
                        💾 Сохранить и выйти (:wq)
                    </button>
                    <button id="editor-btn-paste" class="btn btn-xs btn-outline text-cyan">
                        📋 Вставить
                    </button>
                    <button id="editor-btn-exit" class="btn btn-xs btn-danger font-bold" title=":q! Выйти без сохранения">
                        ✕ Выйти (:q!)
                    </button>
                </div>
            </div>

            <div class="nano-body" style="background: #050508;">
                <textarea class="editor-textarea" spellcheck="false" autocapitalize="none" autocomplete="off" style="background:#050508; color:#22c55e;" placeholder="~&#10;~ Нажмите клавишу 'i' или кнопку 'Режим вставки', чтобы начать ввод текста.&#10;~ Для сохранения введите ':wq' или нажмите кнопку вверху."></textarea>
            </div>

            <div class="vim-footer">
                <div class="d-flex align-center gap-2">
                    <span id="vim-mode-badge" class="vim-mode-badge vim-mode-normal">КОМАНДНЫЙ</span>
                    <span class="editor-status-text text-muted text-xs">"${this.escapeHtml(this.displayPath)}" [New File]</span>
                </div>
                <div class="text-xs text-muted">
                    Клавиши: <b>i</b> (вставка), <b>Esc</b> (команды), <b>:wq</b> (сохранить и выйти), <b>:q!</b> (отмена)
                </div>
            </div>
        `;
    }

    bindEvents() {
        if (!this.element || !this.textarea) return;

        // Отслеживание изменений текста
        this.textarea.addEventListener('input', () => {
            this.currentContent = this.textarea.value;
            this.isModified = this.currentContent !== this.initialContent;
            this.updateModifiedIndicator();
        });

        // Кнопки панели
        const btnSave = this.element.querySelector('#editor-btn-save');
        const btnExit = this.element.querySelector('#editor-btn-exit');
        const btnPaste = this.element.querySelector('#editor-btn-paste');
        const btnVimToggle = this.element.querySelector('#vim-btn-mode-toggle');

        btnSave?.addEventListener('click', () => this.save());
        btnExit?.addEventListener('click', () => this.exit());
        btnPaste?.addEventListener('click', () => this.pasteClipboard());

        const btnTemplate = this.element.querySelector('#editor-btn-template');
        btnTemplate?.addEventListener('click', () => {
            const tpl = this.getTemplateForFile(this.filepath);
            if (tpl) {
                this.textarea.value = tpl;
                this.currentContent = tpl;
                this.isModified = true;
                this.updateModifiedIndicator();
                this.textarea.focus();
                if (this.editorType === 'vim') this.setVimMode('insert');
                if (this.statusEl) {
                    this.statusEl.innerHTML = `<span class="text-yellow font-bold">⚡ Шаблон вставлен! Проверьте и нажмите «Сохранить».</span>`;
                }
            } else {
                alert('Для данного файла нет готового шаблона. Введите текст вручную.');
            }
        });


        if (btnVimToggle) {
            btnVimToggle.addEventListener('click', () => {
                if (this.vimMode === 'normal') {
                    this.setVimMode('insert');
                } else {
                    this.setVimMode('normal');
                }
            });
        }

        // Клик по функциональным клавишам внизу
        this.element.querySelectorAll('.nano-key-item, .mcedit-fkey').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.getAttribute('data-action');
                if (action === 'save') this.save();
                else if (action === 'exit') this.exit();
                else if (action === 'paste') this.pasteClipboard();
                else if (action === 'cut') this.cutLine();
            });
        });

        // Обработка клавиатурных сочетаний
        this.element.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
    }

    handleKeyDown(e) {
        // Перехват Tab: вставляем 4 пробела, не теряя фокус
        if (e.key === 'Tab') {
            e.preventDefault();
            this.insertTextAtCursor('    ');
            return;
        }

        // NANO
        if (this.editorType === 'nano') {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
                e.preventDefault();
                this.save();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
                e.preventDefault();
                this.exit();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                this.cutLine();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
                e.preventDefault();
                this.pasteClipboard();
                return;
            }
        }

        // MCEDIT
        if (this.editorType === 'mcedit') {
            if (e.key === 'F2') {
                e.preventDefault();
                this.save();
                return;
            }
            if (e.key === 'F10' || e.key === 'Escape') {
                e.preventDefault();
                this.exit();
                return;
            }
        }

        // VIM
        if (this.editorType === 'vim') {
            if (this.vimMode === 'normal') {
                if (e.key === 'i' || e.key === 'a' || e.key === 'Insert') {
                    e.preventDefault();
                    this.setVimMode('insert');
                    return;
                }
                if (e.key === ':') {
                    e.preventDefault();
                    this.promptVimCommand();
                    return;
                }
            } else if (this.vimMode === 'insert') {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    this.setVimMode('normal');
                    return;
                }
            }
        }
    }

    setVimMode(mode) {
        this.vimMode = mode;
        const badge = this.element.querySelector('#vim-mode-badge');
        const btnToggle = this.element.querySelector('#vim-btn-mode-toggle');

        if (mode === 'insert') {
            this.textarea.readOnly = false;
            this.textarea.focus();
            if (badge) {
                badge.textContent = '-- ВСТАВКА --';
                badge.className = 'vim-mode-badge vim-mode-insert';
            }
            if (btnToggle) {
                btnToggle.textContent = '🔒 Командный режим (Esc)';
                btnToggle.className = 'btn btn-xs btn-outline text-cyan font-bold';
            }
        } else {
            this.textarea.readOnly = true;
            if (badge) {
                badge.textContent = 'КОМАНДНЫЙ';
                badge.className = 'vim-mode-badge vim-mode-normal';
            }
            if (btnToggle) {
                btnToggle.textContent = '✏️ Режим вставки (i)';
                btnToggle.className = 'btn btn-xs btn-outline text-yellow font-bold';
            }
        }
    }

    promptVimCommand() {
        const cmd = prompt("VIM command (:w - сохранить, :wq - сохранить и выйти, :q! - выйти без сохранения):", ":wq");
        if (!cmd) return;
        const clean = cmd.trim().replace(/^:/, '');

        if (clean === 'w') {
            this.save();
        } else if (clean === 'wq' || clean === 'x') {
            this.save();
            this.exit();
        } else if (clean === 'q!' || clean === 'q') {
            this.close(false);
        } else {
            alert(`VIM: неизвестная команда :${clean}`);
        }
    }

    save() {
        this.currentContent = this.textarea.value;
        this.wasSaved = true;
        this.isModified = false;
        this.updateModifiedIndicator();

        const lines = this.currentContent.split('\n').length;
        const msg = `[ Записано ${lines} строк в ${this.filepath} ]`;

        if (this.statusEl) {
            this.statusEl.innerHTML = `<span class="text-green font-bold">${this.escapeHtml(msg)}</span>`;
        }

        if (typeof this.onSaveCallback === 'function') {
            this.onSaveCallback(this.filepath, this.currentContent);
        }
    }

    exit() {
        // Если были изменения, но не сохранено — сохраняем автоматически для удобства
        if (this.isModified && !this.wasSaved) {
            this.save();
        }
        this.close(this.wasSaved);
    }

    close(wasSaved) {
        if (!this.isOpen) return;

        const content = this.textarea ? this.textarea.value : this.currentContent;
        const filepath = this.filepath;

        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        this.isOpen = false;
        this.element = null;
        this.textarea = null;

        if (typeof this.onExitCallback === 'function') {
            this.onExitCallback(filepath, content, wasSaved);
        }
    }

    updateModifiedIndicator() {
        const nanoBadge = this.element?.querySelector('#nano-mod-badge');
        const mcBadge = this.element?.querySelector('#mcedit-mod-badge');

        if (nanoBadge) {
            if (this.isModified) nanoBadge.classList.remove('hidden');
            else nanoBadge.classList.add('hidden');
        }
        if (mcBadge) {
            if (this.isModified) mcBadge.classList.remove('hidden');
            else mcBadge.classList.add('hidden');
        }
    }

    async pasteClipboard() {
        try {
            if (navigator.clipboard && navigator.clipboard.readText) {
                const text = await navigator.clipboard.readText();
                if (text && this.textarea) {
                    this.insertTextAtCursor(text);
                    return;
                }
            }
        } catch (err) {
            console.warn('Clipboard read error, fallback to prompt:', err);
        }

        const fallback = prompt('Вставьте текст из буфера обмена:');
        if (fallback !== null && this.textarea) {
            this.insertTextAtCursor(fallback);
        }
    }

    insertTextAtCursor(text) {
        if (!this.textarea) return;
        const start = this.textarea.selectionStart || 0;
        const end = this.textarea.selectionEnd || 0;
        const val = this.textarea.value;
        this.textarea.value = val.substring(0, start) + text + val.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + text.length;
        this.textarea.dispatchEvent(new Event('input'));
        this.textarea.focus();
    }

    cutLine() {
        if (!this.textarea) return;
        const val = this.textarea.value;
        const pos = this.textarea.selectionStart || 0;
        const lines = val.split('\n');
        let count = 0;
        let lineIdx = 0;

        for (let i = 0; i < lines.length; i++) {
            if (pos >= count && pos <= count + lines[i].length) {
                lineIdx = i;
                break;
            }
            count += lines[i].length + 1;
        }

        const cutText = lines.splice(lineIdx, 1)[0];
        this.textarea.value = lines.join('\n');
        this.textarea.dispatchEvent(new Event('input'));

        if (this.statusEl) {
            this.statusEl.textContent = `[ Вырезана строка: "${cutText.substring(0, 30)}..." ]`;
        }
    }

    escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

// Глобальный синглтон редактора
window.terminalEditor = new TerminalTextEditor();
