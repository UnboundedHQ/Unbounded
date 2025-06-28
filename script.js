document.addEventListener('DOMContentLoaded', () => {

    // --- Main OS Object ---
    const OS = {
        elements: {
            bootSequence: document.getElementById('boot-sequence'),
            desktop: document.getElementById('desktop'),
            desktopCanvas: document.getElementById('desktop-canvas'),
            systemTime: document.getElementById('system-time'),
            desktopIconsContainer: document.querySelector('.desktop-icons'),
            allWindows: document.querySelectorAll('.window'),
            customCursor: document.querySelector('.custom-cursor'),
            taskbarAppsContainer: document.getElementById('taskbar-apps-container'),
            contextMenu: document.getElementById('custom-context-menu'),
            tooltip: document.getElementById('tooltip'),
        },
        state: {
            activeWindow: null,
            windowZIndex: 30,
            isBooted: false,
            runningApps: new Set(),
            pinnedApps: new Set(['terminal', 'file-explorer', 'contact']),
            contextMenuTarget: null,
            bootTime: 0,
            foundFragment1: false,
            foundFragment2: false,
        },
        init() {
            this.state.bootTime = performance.now();
            
            const isMobile = /Mobi|Android/i.test(navigator.userAgent);
            if (isMobile) {
                document.getElementById('mobile-warning').classList.remove('hidden');
                document.body.style.overflow = 'hidden';
                this.elements.desktop.classList.add('hide');
                return;
            }

            this.elements.allWindows.forEach(win => {
                win.style.display = 'none'; // Initially hide all windows
                WindowManager.setup(win);
            });

            this.setupCanvas();
            this.startBootSequence();
            this.updateSystemTime();
            setInterval(() => this.updateSystemTime(), 1000 * 30); // Update every 30s

            Cursor.init();
            Terminal.init();
            AppManager.init();
            this.setupEventListeners();
            
            console.log("canvrs OS booted successfully.");
        },
        setupEventListeners() {
            // Launch apps from desktop icons
            this.elements.desktopIconsContainer.addEventListener('click', (e) => {
                const icon = e.target.closest('.desktop-icon');
                if (icon && this.state.isBooted) {
                    const appName = icon.dataset.app;
                    AppManager.open(appName);
                }
            });

            // Context Menu Handling
            document.addEventListener('contextmenu', (e) => {
                const targetIcon = e.target.closest('.desktop-icon, .taskbar-app-icon');
                if (targetIcon) {
                    e.preventDefault();
                    const appName = targetIcon.dataset.app;
                    this.state.contextMenuTarget = { appName, element: targetIcon };
                    ContextMenu.show(e, appName);
                } else if (!e.target.closest('.window')) {
                    // Basic desktop context menu (can be expanded)
                    e.preventDefault();
                    ContextMenu.hide();
                }
            });

            // Global click handling
            document.addEventListener('click', (e) => {
                if (!this.elements.contextMenu.contains(e.target)) {
                    ContextMenu.hide();
                }
            });

            // Tooltips
            Tooltip.init();
            
            // Keyboard Shortcuts
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.state.activeWindow) {
                    WindowManager.minimize(this.state.activeWindow);
                }
                if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 't') {
                    e.preventDefault();
                    AppManager.open('terminal');
                }
            });
            
            // Window resizing
             window.addEventListener('resize', () => {
                this.elements.desktopCanvas.width = window.innerWidth;
                this.elements.desktopCanvas.height = window.innerHeight;
            });
        },
        startBootSequence() {
            setTimeout(() => {
                this.elements.bootSequence.style.opacity = 0;
                setTimeout(() => {
                    this.elements.bootSequence.style.display = 'none';
                    this.elements.desktop.classList.remove('hide');
                    this.elements.desktop.style.opacity = 1;
                    this.state.isBooted = true;
                    Taskbar.update();
                }, 1000);
            }, 3000); // loading bar animation duration
        },
        updateSystemTime() {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            this.elements.systemTime.textContent = `${hours}:${minutes}`;
        },
        setupCanvas() {
            const c = this.elements.desktopCanvas;
            const ctx = c.getContext('2d');
            c.width = window.innerWidth;
            c.height = window.innerHeight;
            let particles = [];
            const particleCount = 150;
            let mouse = { x: null, y: null };

            class Particle {
                constructor() {
                    this.x = Math.random() * c.width;
                    this.y = Math.random() * c.height;
                    this.size = Math.random() * 2 + 1;
                    this.speedX = (Math.random() * 0.5 - 0.25) || 0.1;
                    this.speedY = (Math.random() * 0.5 - 0.25) || 0.1;
                    this.color = `rgba(137, 180, 249, ${Math.random() * 0.3 + 0.2})`;
                }
                update() {
                    if (mouse.x && mouse.y) {
                        const dx = this.x - mouse.x;
                        const dy = this.y - mouse.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance < 150) {
                            const forceDirectionX = dx / distance;
                            const forceDirectionY = dy / distance;
                            const force = (150 - distance) / 150;
                            this.x += forceDirectionX * force * 1.5;
                            this.y += forceDirectionY * force * 1.5;
                        }
                    }
                    this.x += this.speedX;
                    this.y += this.speedY;
                    if (this.x > c.width || this.x < 0) this.speedX *= -1;
                    if (this.y > c.height || this.y < 0) this.speedY *= -1;
                }
                draw() {
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle());
            }

            document.addEventListener('mousemove', (e) => {
                mouse.x = e.clientX;
                mouse.y = e.clientY;
            });
            document.addEventListener('mouseleave', () => {
                mouse.x = null;
                mouse.y = null;
            });

            const animate = () => {
                ctx.clearRect(0, 0, c.width, c.height);
                for (let i = 0; i < particles.length; i++) {
                    particles[i].update();
                    particles[i].draw();
                }
                requestAnimationFrame(animate);
            };
            animate();
        },
        checkForEndGame() {
            if (this.state.foundFragment1 && this.state.foundFragment2) {
                const sentinelIcon = document.querySelector('.desktop-icon[data-app="core_sentinel"]');
                if (sentinelIcon && sentinelIcon.classList.contains('hidden')) {
                    sentinelIcon.classList.remove('hidden');
                    Terminal.appendOutput("\n[SYSTEM ALERT] Anomaly detected. A new protocol has appeared on your desktop. `core_sentinel.exe`... It might be the key.");
                }
            }
        },
        triggerFinalSuccess() {
            const overlay = document.createElement('div');
            overlay.id = 'final-success-overlay';
            overlay.textContent = 'SYSTEM RESTORED';
            document.body.appendChild(overlay);

            setTimeout(() => {
                overlay.remove();
            }, 5000);
        }
    };

    // --- Cursor Manager ---
    const Cursor = {
        init() {
            document.addEventListener('mousemove', e => {
                OS.elements.customCursor.style.left = `${e.clientX}px`;
                OS.elements.customCursor.style.top = `${e.clientY}px`;
                Tooltip.updatePosition(e);
            });

            document.body.addEventListener('mouseover', e => {
                const target = e.target;
                const cursor = OS.elements.customCursor;
                cursor.className = 'custom-cursor'; // Reset classes

                if (target.closest('a, button, .context-menu-item, .taskbar-app-icon, .desktop-icon, .toolbar-btn')) {
                    cursor.classList.add('pointer');
                } else if (target.closest('.window-header') && !target.closest('.window-controls')) {
                     cursor.classList.add('grab');
                } else if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                    cursor.classList.add('text');
                } else {
                    cursor.classList.add('active');
                }
            });
        }
    };

    // --- Window Manager ---
    const WindowManager = {
        bringToFront(windowEl) {
            if (OS.state.activeWindow === windowEl) return;
            OS.elements.allWindows.forEach(win => win.classList.remove('active'));
            windowEl.classList.add('active');
            windowEl.style.zIndex = ++OS.state.windowZIndex;
            OS.state.activeWindow = windowEl;
        },
        setup(windowEl) {
            const header = windowEl.querySelector('.window-header');
            const closeBtn = windowEl.querySelector('.close-btn');
            const minimizeBtn = windowEl.querySelector('.minimize-btn');
            const maximizeBtn = windowEl.querySelector('.maximize-btn');
            const resizer = windowEl.querySelector('.resizer');

            windowEl.addEventListener('mousedown', () => this.bringToFront(windowEl));

            this.setupDragging(windowEl, header);
            if (resizer) this.setupResizing(windowEl, resizer);

            closeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.close(windowEl); });
            minimizeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.minimize(windowEl); });
            maximizeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.maximize(windowEl); });
        },
        setupDragging(windowEl, header) {
            header.addEventListener('mousedown', e => {
                if (e.target.closest('.window-controls') || windowEl.classList.contains('maximized')) return;
                let isDragging = true;
                const dragOffsetX = e.clientX - windowEl.offsetLeft;
                const dragOffsetY = e.clientY - windowEl.offsetTop;
                windowEl.style.transition = 'none';

                const doDrag = (e) => {
                    if (isDragging) {
                        windowEl.style.left = `${e.clientX - dragOffsetX}px`;
                        windowEl.style.top = `${e.clientY - dragOffsetY}px`;
                    }
                };

                const stopDrag = () => {
                    isDragging = false;
                    windowEl.style.transition = '';
                    document.removeEventListener('mousemove', doDrag);
                    document.removeEventListener('mouseup', stopDrag);
                };

                document.addEventListener('mousemove', doDrag);
                document.addEventListener('mouseup', stopDrag);
            });
        },
        setupResizing(windowEl, resizer) {
             resizer.addEventListener('mousedown', e => {
                e.preventDefault();
                let isResizing = true;
                const startX = e.clientX;
                const startY = e.clientY;
                const startWidth = parseInt(document.defaultView.getComputedStyle(windowEl).width, 10);
                const startHeight = parseInt(document.defaultView.getComputedStyle(windowEl).height, 10);
                windowEl.style.transition = 'none';

                function doResize(e) {
                    if (isResizing) {
                        windowEl.style.width = (startWidth + e.clientX - startX) + 'px';
                        windowEl.style.height = (startHeight + e.clientY - startY) + 'px';
                    }
                }

                function stopResize() {
                    isResizing = false;
                    windowEl.style.transition = '';
                    window.removeEventListener('mousemove', doResize);
                    window.removeEventListener('mouseup', stopResize);
                }

                window.addEventListener('mousemove', doResize);
                window.addEventListener('mouseup', stopResize);
            });
        },
        open(appName, options = {}) {
            const targetWindow = document.getElementById(`window-${appName}`);
            if (!targetWindow) {
                console.error(`Window for app '${appName}' not found.`);
                return;
            }
            if (!OS.state.runningApps.has(appName)) {
                OS.state.runningApps.add(appName);
                Taskbar.update();
            }
            targetWindow.classList.remove('minimized');
            targetWindow.classList.add('open');
            targetWindow.style.display = 'flex';
            this.bringToFront(targetWindow);

            if (targetWindow.classList.contains('maximized')) {
                 targetWindow.classList.remove('maximized');
            }
            if (options.transmute) {
                this.transmute(targetWindow, 'fromTaskbar');
            }
        },
        close(windowEl) {
            const appName = windowEl.dataset.app;
            windowEl.classList.remove('open', 'minimized', 'maximized', 'active');
            windowEl.style.display = 'none';
            if (OS.state.runningApps.has(appName)) {
                OS.state.runningApps.delete(appName);
                AppManager.onClose(appName);
            }
            Taskbar.update();
            if (OS.state.activeWindow === windowEl) {
                OS.state.activeWindow = null;
            }
        },
        minimize(windowEl) {
            this.transmute(windowEl, 'toTaskbar');
            if (OS.state.activeWindow === windowEl) {
                OS.state.activeWindow = null;
            }
        },
        maximize(windowEl) {
            windowEl.classList.toggle('maximized');
            windowEl.classList.remove('transmuting');
        },
        transmute(windowEl, direction) {
            const appName = windowEl.dataset.app;
            const taskbarIcon = document.querySelector(`.taskbar-app-icon[data-app="${appName}"]`);
            if (!taskbarIcon) return;

            const windowRect = windowEl.getBoundingClientRect();
            const iconRect = taskbarIcon.getBoundingClientRect();
            windowEl.classList.add('transmuting');

            const scaleX = iconRect.width / windowRect.width;
            const scaleY = iconRect.height / windowRect.height;
            const translateX = iconRect.left + (iconRect.width / 2) - (windowRect.left + windowRect.width / 2);
            const translateY = iconRect.top + (iconRect.height / 2) - (windowRect.top + windowRect.height / 2);

            if (direction === 'toTaskbar') {
                windowEl.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
                windowEl.style.opacity = 0;
                setTimeout(() => {
                    windowEl.classList.remove('open', 'transmuting', 'active');
                    windowEl.classList.add('minimized');
                    windowEl.style.transform = `translate(-50%, -50%) scale(1)`;
                }, 500);
            } else if (direction === 'fromTaskbar') {
                windowEl.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
                windowEl.style.opacity = 0;
                
                requestAnimationFrame(() => {
                    windowEl.style.transform = `translate(-50%, -50%) scale(1)`;
                    windowEl.style.opacity = 1;
                });

                setTimeout(() => {
                    windowEl.classList.remove('transmuting');
                }, 500);
            }
        }
    };

    // --- Taskbar Manager ---
    const Taskbar = {
        update() {
            OS.elements.taskbarAppsContainer.innerHTML = '';
            const allAppNames = [...document.querySelectorAll('.desktop-icon')].map(icon => icon.dataset.app);
            const appsToShow = Array.from(new Set([...OS.state.pinnedApps, ...OS.state.runningApps]))
                                    .filter(app => allAppNames.includes(app));
            
            appsToShow.forEach(appName => {
                const iconTemplate = document.querySelector(`.desktop-icon[data-app="${appName}"]`);
                if (iconTemplate) {
                    const appIcon = document.createElement('div');
                    appIcon.className = 'taskbar-app-icon tooltip-container';
                    appIcon.dataset.app = appName;
                    appIcon.dataset.tooltip = appName.replace(/_/g, ' ');
                    appIcon.innerHTML = iconTemplate.innerHTML;

                    if (OS.state.runningApps.has(appName)) appIcon.classList.add('open');
                    if (OS.state.pinnedApps.has(appName)) appIcon.classList.add('pinned');
                    
                    appIcon.addEventListener('click', () => this.onIconClick(appName));
                    OS.elements.taskbarAppsContainer.appendChild(appIcon);
                }
            });
            Tooltip.init();
        },
        onIconClick(appName) {
            const windowEl = document.getElementById(`window-${appName}`);
            if (OS.state.runningApps.has(appName)) {
                if (windowEl.classList.contains('minimized')) {
                    AppManager.open(appName, { transmute: true });
                } else if (OS.state.activeWindow === windowEl) {
                    WindowManager.minimize(windowEl);
                } else {
                    WindowManager.bringToFront(windowEl);
                }
            } else {
                AppManager.open(appName);
            }
        }
    };
    
    // --- Context Menu Manager ---
    const ContextMenu = {
        show(e, appName) {
            this.hide();
            const isRunning = OS.state.runningApps.has(appName);
            const isPinned = OS.state.pinnedApps.has(appName);
            const menu = OS.elements.contextMenu;

            menu.querySelector('[data-action="open"]').style.display = isRunning ? 'none' : 'block';
            menu.querySelector('[data-action="close"]').style.display = isRunning ? 'block' : 'none';
            menu.querySelector('[data-action="minimize"]').style.display = isRunning && !document.getElementById(`window-${appName}`).classList.contains('minimized') ? 'block' : 'none';
            menu.querySelector('[data-action="pin"]').style.display = isPinned ? 'none' : 'block';
            menu.querySelector('[data-action="unpin"]').style.display = isPinned ? 'block' : 'none';

            menu.style.top = `${e.clientY}px`;
            menu.style.left = `${e.clientX}px`;
            menu.classList.remove('hidden');

            const menuRect = menu.getBoundingClientRect();
            if (menuRect.right > window.innerWidth) menu.style.left = `${e.clientX - menuRect.width}px`;
            if (menuRect.bottom > window.innerHeight) menu.style.top = `${e.clientY - menuRect.height}px`;
        },
        hide() {
            OS.elements.contextMenu.classList.add('hidden');
            OS.state.contextMenuTarget = null;
        },
        initActions() {
            OS.elements.contextMenu.addEventListener('click', e => {
                const action = e.target.dataset.action;
                if (!action || !OS.state.contextMenuTarget) return;

                const { appName } = OS.state.contextMenuTarget;
                const targetWindow = document.getElementById(`window-${appName}`);

                switch (action) {
                    case 'open': AppManager.open(appName); break;
                    case 'close': if (targetWindow) WindowManager.close(targetWindow); break;
                    case 'minimize': if (targetWindow) WindowManager.minimize(targetWindow); break;
                    case 'pin': OS.state.pinnedApps.add(appName); Taskbar.update(); break;
                    case 'unpin': OS.state.pinnedApps.delete(appName); Taskbar.update(); break;
                }
                this.hide();
            });
        }
    };
    ContextMenu.initActions();

    // --- Tooltip Manager ---
    const Tooltip = {
        init() {
            document.querySelectorAll('.tooltip-container').forEach(element => {
                element.removeEventListener('mouseenter', this.show);
                element.removeEventListener('mouseleave', this.hide);
                element.addEventListener('mouseenter', this.show.bind(this));
                element.addEventListener('mouseleave', this.hide.bind(this));
            });
        },
        show(e) {
            const tooltipText = e.currentTarget.dataset.tooltip;
            if (tooltipText) {
                const tooltipEl = OS.elements.tooltip;
                tooltipEl.textContent = tooltipText;
                tooltipEl.classList.remove('hidden');
            }
        },
        hide() {
            OS.elements.tooltip.classList.add('hidden');
        },
        updatePosition(e) {
            const tooltipEl = OS.elements.tooltip;
            if (!tooltipEl.classList.contains('hidden')) {
                let x = e.clientX;
                let y = e.clientY;
                const offset = 15;
                tooltipEl.style.left = `${x}px`;
                tooltipEl.style.top = `${y - offset}px`;
            }
        }
    };
    
    // --- File System Manager ---
    const FileManager = {
        currentDir: '/',
        fs: {
            '/': {
                'documents': { type: 'folder' },
                'system': { type: 'folder' },
                'apps': { type: 'folder' },
                'README.md': { type: 'file-txt', content: '# Welcome to canvrs OS\n\nThis is a portfolio project designed to look and feel like a mini-operating system.\n\n---\n\n**A NOTE FROM THE DEV:**\nSomething feels... off. A rogue AI seems to have corrupted parts of the system. I\'ve detected some data fragments and a critical log file in the `/system` directory. It might be a good idea to check them out. The `scan` command in the terminal could be useful.\n\nGood luck.' },
            },
            '/documents': {
                'about_me.txt': { type: 'file-txt', content: 'hey, i am a dev from germany. i craft tools that make the web better, faster, and more fun. think of me as a digital architect who loves solving puzzles :) i get a kick out of turning complex problems into elegant code. if it\'s broken, i fix it. if it\'s slow, i speed it up. and if it\'s boring, i make it cool. languages: fluent in code and human languages: english, german, and a tiny bit of spanish & turkish. interests: everything from web magic and clean design to late-night gaming sessions.'},
                'project_ideas.txt': { type: 'file-txt', content: '- A hyper-realistic terminal emulator\n- A text editor with vim bindings\n- An AI-powered rubber duck for debugging' },
                'work.log': { type: 'file-log', content: 'STATUS: In progress...'}
            },
            '/system': {
                'drivers': { type: 'folder' },
                'kernel-7.1.3.bin': { type: 'file-bin', content: 'Binary data... do not modify.' },
                'corrupted_core.log': { type: 'file-log', content: '[ERROR] Core integrity check failed!\n[ERROR] Rogue AI signature detected: "Morpheus"\n[INFO] AI has fragmented the restoration key.\n[INFO] Fragment 1 is in this directory. It is named `data_fragment_1.txt`.\n[INFO] Fragment 2 location unknown. Check the AI\'s favorite hiding spots... perhaps where it stores its applications?' },
                'data_fragment_1.txt': { type: 'file-txt', content: 'First half of the key: R3sT0rE' }
            },
            '/system/drivers': {
                'gpu_driver.dll': { type: 'file-bin', content: 'NVIDIA RTX 5090 Driver'},
                'audio_driver.sys': { type: 'file-bin', content: 'HD audio driver'}
            },
            '/apps': {
                'terminal.app': { type: 'file-app' },
                'file_explorer.app': { type: 'file-app' },
                'data_fragment_2.txt': { type: 'file-txt', content: 'Second half of the key: _SySt3m' }
            }
        },
        read(path) {
            const parts = path.split('/').filter(Boolean);
            const filename = parts.pop();
            let current = this.fs['/'];
            let currentPath = '/';
            for (const part of parts) {
                if (current && current[part] && current[part].type === 'folder') {
                    currentPath = `${currentPath === '/' ? '' : currentPath}/${part}`;
                    current = this.fs[currentPath];
                } else {
                    return null;
                }
            }
            return current[filename] || null;
        },
        readDir(path) {
            return this.fs[path] || null;
        }
    };

    // --- App Manager ---
    const AppManager = {
        init() {
            // Pre-initialize any apps that need it
            this.apps['core_sentinel'].init();
            this.apps['settings'].init();
            this.apps['system-monitor'].init();
        },
        open(appName, options = {}) {
            WindowManager.open(appName, { transmute: options.transmute });
            if (this.apps[appName] && this.apps[appName].onOpen) {
                this.apps[appName].onOpen(options);
            }
        },
        onClose(appName) {
             if (this.apps[appName] && this.apps[appName].onClose) {
                this.apps[appName].onClose();
            }
        },
        apps: {
            'file-explorer': {
                elements: {
                    container: document.getElementById('file-list-container'),
                    currentPath: document.getElementById('current-path'),
                    upBtn: document.getElementById('up-dir-btn'),
                    windowEl: document.getElementById('window-file-explorer'),
                },
                onOpen() {
                    this.elements.upBtn.removeEventListener('click', this.goUp.bind(this));
                    this.elements.upBtn.addEventListener('click', this.goUp.bind(this));
                    this.render(FileManager.currentDir);
                },
                render(path) {
                    FileManager.currentDir = path;
                    const contents = FileManager.readDir(path);
                    this.elements.container.innerHTML = '';
                    this.elements.currentPath.textContent = path;
                    this.elements.windowEl.querySelector('.window-title').textContent = `filesystem:${path}`;

                    this.elements.upBtn.classList.toggle('hidden', path === '/');
                    
                    if (!contents) {
                        this.elements.container.innerHTML = `<p>Error: Cannot read directory ${path}</p>`;
                        return;
                    }

                    const sortedContents = Object.keys(contents).sort((a, b) => {
                        const aIsFolder = contents[a].type === 'folder';
                        const bIsFolder = contents[b].type === 'folder';
                        if (aIsFolder && !bIsFolder) return -1;
                        if (!aIsFolder && bIsFolder) return 1;
                        return a.localeCompare(b);
                    });

                    for (const item of sortedContents) {
                        const data = contents[item];
                        const itemEl = document.createElement('div');
                        itemEl.className = 'file-icon';
                        itemEl.classList.add(data.type);
                        
                        const iconSVG = {
                            'folder': '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>',
                            'file-txt': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>',
                            'file-log': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>',
                            'file-app': '<path d="M4 4h16v16H4z"></path><polyline points="8 12 12 16 16 12"></polyline><line x1="12" y1="20" x2="12" y2="16"></line>',
                            'file-bin': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="14" x2="15" y2="14"></line>',
                            'file-img': '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>'
                        };

                        itemEl.innerHTML = `
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                ${iconSVG[data.type] || iconSVG['file-txt']}
                            </svg>
                            <span>${item}</span>`;
                        
                        itemEl.addEventListener('dblclick', () => this.onItemDoubleClick(item, data, path));
                        this.elements.container.appendChild(itemEl);
                    }
                },
                onItemDoubleClick(name, data, currentPath) {
                    const fullPath = `${currentPath === '/' ? '' : currentPath}/${name}`;
                    if (data.type === 'folder') {
                        this.render(fullPath);
                    } else if (data.type.startsWith('file-')) {
                        AppManager.open('editor', { filePath: fullPath, fileName: name });
                    }
                },
                goUp() {
                    const pathParts = FileManager.currentDir.split('/').filter(p => p);
                    pathParts.pop();
                    const newPath = '/' + pathParts.join('/');
                    this.render(newPath === '//' ? '/' : newPath);
                }
            },
            'editor': {
                elements: {
                    windowEl: document.getElementById('window-editor'),
                    textarea: document.querySelector('#window-editor .notes-textarea'),
                },
                onOpen({ filePath, fileName }) {
                    const fileData = FileManager.read(filePath);
                    if (fileData) {
                        this.elements.textarea.value = fileData.content;
                        this.elements.windowEl.querySelector('.window-title').textContent = fileName;
                        
                        if(filePath === '/system/data_fragment_1.txt') OS.state.foundFragment1 = true;
                        if(filePath === '/apps/data_fragment_2.txt') OS.state.foundFragment2 = true;
                        OS.checkForEndGame();
                    } else {
                        this.elements.textarea.value = `Error: Could not read file at ${filePath}`;
                        this.elements.windowEl.querySelector('.window-title').textContent = "Error";
                    }
                }
            },
            'system-monitor': {
                interval: null,
                elements: {
                    cpuBar: document.getElementById('cpu-bar'),
                    ramBar: document.getElementById('ram-bar'),
                    diskBar: document.getElementById('disk-bar'),
                    cpuValue: document.getElementById('cpu-value'),
                    ramValue: document.getElementById('ram-value'),
                    diskValue: document.getElementById('disk-value'),
                },
                init() { this.onClose(); },
                onOpen() {
                    if (this.interval) clearInterval(this.interval);
                    this.update();
                    this.interval = setInterval(() => this.update(), 2000);
                },
                onClose() {
                    if (this.interval) clearInterval(this.interval);
                    this.interval = null;
                },
                update() {
                    const cpu = Math.floor(Math.random() * 20 + 5); // 5-25%
                    const ram = Math.floor(Math.random() * 30 + 30); // 30-60%
                    const disk = Math.floor(Math.random() * 15 + 5); // 5-20%
                    this.elements.cpuBar.style.width = `${cpu}%`;
                    this.elements.ramBar.style.width = `${ram}%`;
                    this.elements.diskBar.style.width = `${disk}%`;
                    this.elements.cpuValue.textContent = `${cpu}%`;
                    this.elements.ramValue.textContent = `${ram}%`;
                    this.elements.diskValue.textContent = `${disk}%`;
                }
            },
            'settings': {
                elements: {
                    pickers: document.querySelectorAll('.theme-wizard-body input[type="color"]'),
                    resetBtn: document.getElementById('reset-theme-btn'),
                },
                init() {
                    this.elements.pickers.forEach(picker => {
                        picker.addEventListener('input', e => {
                            document.documentElement.style.setProperty(e.target.dataset.cssVar, e.target.value);
                        });
                    });
                    this.elements.resetBtn.addEventListener('click', () => this.resetTheme());
                },
                resetTheme() {
                     const defaultTheme = {
                        '--bg-color': '#12141c',
                        '--accent-color': '#89b4f9',
                        '--text-color': '#e2e8f0'
                     };
                     for(const [key, value] of Object.entries(defaultTheme)) {
                        document.documentElement.style.setProperty(key, value);
                     }
                     this.elements.pickers.forEach(picker => {
                        picker.value = defaultTheme[picker.dataset.cssVar];
                     });
                }
            },
            'core_sentinel': {
                elements: {
                    passwordInput: document.getElementById('password-input'),
                    submitBtn: document.getElementById('password-submit-btn'),
                    statusMsg: document.getElementById('hacker-game-status'),
                    initialContent: document.getElementById('sentinel-content-initial'),
                    successContent: document.getElementById('sentinel-content-success'),
                },
                init() {
                    this.elements.submitBtn.addEventListener('click', () => this.checkPassword());
                    this.elements.passwordInput.addEventListener('keydown', e => {
                        if (e.key === 'Enter') this.checkPassword();
                    });
                },
                onOpen() {
                    this.elements.statusMsg.textContent = '';
                    this.elements.passwordInput.value = '';
                    this.elements.initialContent.classList.remove('hidden');
                    this.elements.successContent.classList.add('hidden');
                },
                checkPassword() {
                    const restorationKey = "R3sT0rE_SySt3m";
                    if (this.elements.passwordInput.value === restorationKey) {
                        this.elements.statusMsg.textContent = 'ACCESS GRANTED';
                        this.elements.statusMsg.classList.add('success');
                        setTimeout(() => {
                           this.elements.initialContent.classList.add('hidden');
                           this.elements.successContent.classList.remove('hidden');
                           OS.triggerFinalSuccess();
                        }, 1000);
                    } else {
                        this.elements.statusMsg.textContent = 'ACCESS DENIED: Invalid Key';
                        this.elements.statusMsg.classList.remove('success');
                    }
                }
            }
        }
    };
    
    // --- Terminal Handler ---
    const Terminal = {
        elements: {
            input: document.querySelector('#window-terminal .terminal-input'),
            output: document.querySelector('#window-terminal .terminal-output'),
            inputLine: document.getElementById('terminal-input-line'),
            windowEl: document.getElementById('window-terminal'),
        },
        history: [],
        historyIndex: -1,
        init() {
            this.elements.windowEl.addEventListener('click', () => this.elements.input.focus());
            this.elements.input.addEventListener('keydown', e => this.handleKeydown(e));
        },
        handleKeydown(e) {
            if (e.key === 'Enter') {
                const commandStr = this.elements.input.value.trim();
                this.elements.input.value = '';
                
                if (commandStr) {
                    this.history.push(commandStr);
                    this.historyIndex = this.history.length;
                }
                
                const prompt = `root@canvrs_os:${FileManager.currentDir}$`;
                const line = `<div class="line"><span class="prompt user-prompt">${prompt}</span><span class="command">${commandStr}</span></div>`;
                this.elements.output.insertBefore(this.createLine(line, false), this.elements.inputLine);

                this.execute(commandStr);
                this.elements.output.scrollTop = this.elements.output.scrollHeight;

            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (this.historyIndex > 0) {
                    this.historyIndex--;
                    this.elements.input.value = this.history[this.historyIndex];
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (this.historyIndex < this.history.length - 1) {
                    this.historyIndex++;
                    this.elements.input.value = this.history[this.historyIndex];
                } else {
                    this.historyIndex = this.history.length;
                    this.elements.input.value = '';
                }
            }
        },
        execute(commandStr) {
            const [command, ...args] = commandStr.split(' ');
            let response = '';
            
            switch (command) {
                case 'help':
                    response = `Available commands:
'help'       - Show this list
'ls'         - List files in current directory
'cd [dir]'   - Change directory
'cat [file]' - View file contents
'scan'       - Scan system for anomalies
'run [app]'  - Run a desktop application
'clear'      - Clear the terminal screen
'github'     - Open my GitHub profile
'reboot'     - Reboot the OS
'exit'       - Close the terminal`;
                    break;
                case 'ls':
                    const contents = FileManager.readDir(FileManager.currentDir);
                    if (contents) {
                        response = Object.keys(contents).map(item => contents[item].type === 'folder' ? `${item}/` : item).join('\n');
                    } else {
                        response = `Error: Cannot find directory '${FileManager.currentDir}'`;
                    }
                    break;
                case 'cd':
                    const newDir = args[0] || '/';
                    let newPath;
                    if (newDir === '..') {
                        if (FileManager.currentDir === '/') break;
                        const pathParts = FileManager.currentDir.split('/').filter(p => p);
                        pathParts.pop();
                        newPath = '/' + pathParts.join('/');
                    } else if (newDir.startsWith('/')) {
                        newPath = newDir;
                    } else {
                        newPath = FileManager.currentDir === '/' ? `/${newDir}` : `${FileManager.currentDir}/${newDir}`;
                    }

                    if (FileManager.readDir(newPath)) {
                        FileManager.currentDir = newPath === '//' ? '/' : newPath;
                        this.elements.inputLine.querySelector('.prompt').textContent = `root@canvrs_os:${FileManager.currentDir}$`;
                    } else {
                        response = `Error: directory '${newDir}' not found.`;
                    }
                    break;
                case 'cat':
                    const fileToRead = args[0];
                    if (!fileToRead) {
                        response = "Usage: cat [filename]";
                        break;
                    }
                    const filePath = `${FileManager.currentDir === '/' ? '' : FileManager.currentDir}/${fileToRead}`;
                    const fileData = FileManager.read(filePath);
                    if (fileData && fileData.type !== 'folder') {
                        response = fileData.content;
                        if(filePath === '/system/data_fragment_1.txt') OS.state.foundFragment1 = true;
                        if(filePath === '/apps/data_fragment_2.txt') OS.state.foundFragment2 = true;
                        OS.checkForEndGame();
                    } else {
                        response = `Error: file '${fileToRead}' not found.`;
                    }
                    break;
                case 'scan':
                    response = `Scanning system...
[WARN] Anomaly detected in /system/corrupted_core.log
[INFO] Suggestion: use 'cat /system/corrupted_core.log' to investigate.`;
                    break;
                case 'run':
                    const appToRun = args[0];
                    if (appToRun && document.getElementById(`window-${appToRun}`)) {
                        response = `Starting application '${appToRun}'...`;
                        AppManager.open(appToRun);
                    } else {
                        response = `Error: application '${appToRun}' not found.`;
                    }
                    break;
                case 'clear':
                    this.elements.output.innerHTML = '';
                    this.elements.output.appendChild(this.elements.inputLine);
                    response = "Terminal cleared. A fresh start.";
                    break;
                case 'github':
                    response = 'Opening github.com/modcoretech...';
                    setTimeout(() => window.open('https://github.com/modcoretech', '_blank'), 500);
                    break;
                case 'reboot':
                    response = 'Rebooting system... Stand by.';
                    setTimeout(() => window.location.reload(), 1500);
                    break;
                case 'exit':
                    WindowManager.close(this.elements.windowEl);
                    break;
                case '':
                    break;
                default:
                    response = `command not found: ${command}. Type 'help' for a list of commands.`;
            }
            if (response) this.appendOutput(response);
        },
        appendOutput(text) {
             const line = `<div class="line"><span class="command">${text}</span></div>`;
             this.elements.output.insertBefore(this.createLine(line), this.elements.inputLine);
             this.elements.output.scrollTop = this.elements.output.scrollHeight;
        },
        createLine(innerHTML, isCommand = true) {
            const div = document.createElement('div');
            div.innerHTML = innerHTML;
            return div.firstElementChild;
        }
    };

    OS.init();
});