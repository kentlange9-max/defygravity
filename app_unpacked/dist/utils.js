"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SleepBlocker = exports.showOrCreateWindow = exports.showQuitConfirmation = void 0;
exports.setShowQuitConfirmation = setShowQuitConfirmation;
exports.isMacOS = isMacOS;
exports.createWindow = createWindow;
exports.getNodeWrapperPaths = getNodeWrapperPaths;
exports.setupNodeWrapper = setupNodeWrapper;
const electron_1 = require("electron");
const constants_1 = require("./constants");
const keybindings_1 = require("./keybindings");
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs"));
const paths_1 = require("./paths");
const loadingOverlay_1 = require("./loadingOverlay");
exports.showQuitConfirmation = false;
function setShowQuitConfirmation(value) {
    exports.showQuitConfirmation = value;
}
function isMacOS() {
    return process.platform === 'darwin';
}
/**
 * Reads the user's theme preference from the settings file.
 */
function getThemeMode() {
    try {
        const filePath = (0, paths_1.getSettingsPbPath)();
        if (!fs.existsSync(filePath)) {
            return 'DARK';
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        const config = JSON.parse(content);
        const themeMode = config?.userSettings?.themeMode;
        if (themeMode && themeMode.includes('INHERIT')) {
            return electron_1.nativeTheme.shouldUseDarkColors ? 'DARK' : 'LIGHT';
        }
        if (themeMode && themeMode.includes('LIGHT')) {
            return 'LIGHT';
        }
        return 'DARK';
    }
    catch (e) {
        console.error('Error reading theme mode:', e);
        return 'DARK';
    }
}
/**
 * Ensures the app is visible in the dock for MacOS with the icon set.
 * When refocusing the app after being hidden in the dock, the icon is sometimes lost.
 * This ensures the icon is always visible.
 */
function ensureAppIsInDock() {
    void electron_1.app.dock?.show();
    if (isMacOS() && electron_1.app.dock) {
        const iconPath = path_1.default.join(__dirname, '..', 'icon.png');
        electron_1.app.dock.setIcon(electron_1.nativeImage.createFromPath(iconPath));
    }
}
// ---------------------------------------------------------------------------
// Window Management
// ---------------------------------------------------------------------------
/**
 * Creates and returns a new BrowserWindow pointed at `url`.
 * Uses a hidden title bar with native traffic lights on macOS.
 * Node integration is disabled and context isolation is enabled for security.
 */
function createWindow(url) {
    ensureAppIsInDock();
    const theme = getThemeMode().toUpperCase();
    const isLight = theme.includes('LIGHT');
    const backgroundColor = isLight ? '#FAFAFA' : '#131313';
    const foregroundColor = isLight ? '#383A42' : '#FAFAFA';
    const win = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 500,
        minHeight: 400,
        title: electron_1.app.getName(),
        icon: path_1.default.join(__dirname, '..', 'icon.png'),
        titleBarStyle: 'hidden',
        titleBarOverlay: isMacOS()
            ? false
            : {
                color: '#00000000',
                symbolColor: foregroundColor,
                height: 30,
            },
        backgroundColor: '#121212',
        trafficLightPosition: { x: 12, y: 12 },
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path_1.default.join(__dirname, 'preload.js'),
            devTools: true,
        },
    });
    // Prevent the menu dropdown from being very wide due to long page titles
    win.on('page-title-updated', (event, title) => {
        const maxLength = 25;
        if (title.length > maxLength) {
            event.preventDefault();
            win.setTitle(title.substring(0, maxLength) + '...');
        }
    });
    win.webContents.setWindowOpenHandler((details) => {
        void electron_1.shell.openExternal(details.url);
        return { action: 'deny' };
    });
    (0, loadingOverlay_1.attachLoadingOverlay)(win, foregroundColor, backgroundColor);
    (0, keybindings_1.registerKeybindings)(win, {
        createNewWindow: () => {
            void createWindow(url);
        },
        onQuitRequested: () => {
            exports.showQuitConfirmation = true;
            electron_1.app.quit();
        },
    });

    win.webContents.on('did-finish-load', () => {
        win.webContents.openDevTools({ mode: 'right' });
        win.webContents.insertCSS(`
            :root {
                --base-bg: #121212;
                --orb-1-opacity: 0.45;
                --orb-2-opacity: 0.38;
                --orb-3-opacity: 0.34;
                --orb-1-r: 14; --orb-1-g: 165; --orb-1-b: 233;
                --orb-2-r: 2; --orb-2-g: 132; --orb-2-b: 199;
                --orb-3-r: 12; --orb-3-g: 143; --orb-3-b: 214;
                --orb-1-display: block;
                --orb-2-display: block;
                --orb-3-display: block;
                --grain-opacity: 0.024;
                --orb-1-duration: 120s;
                --orb-2-duration: 160s;
                --orb-3-duration: 140s;
                --scrobble-display: block;
                --scrobble-color: #3b82f6;
                --beam-display: block;
            }

            html {
                background-color: var(--base-bg) !important;
                margin: 0;
                padding: 0;
                min-height: 100vh;
                width: 100vw;
                overflow: hidden;
                position: relative;
            }

            body {
                background-color: transparent !important;
                margin: 0;
                padding: 0;
                min-height: 100vh;
                width: 100vw;
                overflow: hidden;
                position: relative;
                color: #f4f4f5 !important;
            }

            /* Absolute Nuke on all scroll fades, gradients, and masks that block the orbs */
            [class*="bg-gradient-to"],
            [class*="from-"],
            [class*="to-transparent"],
            [style*="linear-gradient"]:not(.chat-beam),
            [style*="mask-image"],
            .overflow-y-auto, .flex-1, main, .scroll-y, footer, section, header {
                background-image: none !important;
                mask-image: none !important;
                -webkit-mask-image: none !important;
            }
            
            /* Nuke pseudo element fades and shadows */
            main::after, main::before, .flex-1::after, .flex-1::before, .overflow-y-auto::after, .overflow-y-auto::before, footer::before, footer::after {
                background: transparent !important;
                background-image: none !important;
                box-shadow: none !important;
            }

            /* Aggressively strip backgrounds from common structural containers */
            footer, .bg-background, .bg-card, .bg-popover, .dark, .monaco-workbench, .part {
                background-color: transparent !important;
                background-image: none !important;
                box-shadow: none !important;
            }

            /* Make sure the React app is positioned above the orbs */
            #root, #app {
                position: relative;
                z-index: 10;
            }

            /* Dynamic DOM Orbs */
            #dg-orb-container {
                position: fixed;
                top: 0; left: 0; width: 100vw; height: 100vh;
                pointer-events: none;
                z-index: 1;
                overflow: hidden;
            }
            .dg-orb {
                position: absolute;
                border-radius: 50%;
                pointer-events: none;
                mix-blend-mode: screen; 
                will-change: transform, opacity;
                transform-style: preserve-3d;
                backface-visibility: hidden;
                perspective: 1000px;
            }

            @keyframes float-orb-1 {
                0% { transform: translate3d(0, 0, 0) scale(1); }
                33% { transform: translate3d(12vw, 8vh, 0) scale(1.02); }
                66% { transform: translate3d(-3vw, 15vh, 0) scale(0.98); }
                100% { transform: translate3d(8vw, -2vh, 0) scale(1.01); }
            }

            @keyframes float-orb-2 {
                0% { transform: translate3d(0, 0, 0) scale(1); }
                25% { transform: translate3d(-12vw, -8vh, 0) scale(0.98); }
                50% { transform: translate3d(-4vw, -20vh, 0) scale(1.02); }
                75% { transform: translate3d(-15vw, -6vh, 0) scale(1); }
                100% { transform: translate3d(-2vw, -12vh, 0) scale(1.04); }
            }

            @keyframes float-orb-3 {
                0% { transform: translate3d(0, 0, 0) scale(1); }
                50% { transform: translate3d(20vw, 12vh, 0) scale(1.05); }
                100% { transform: translate3d(10vw, -4vh, 0) scale(0.95); }
            }

            /* Global Anti-Banding & Texture Overlay */
            html::after {
                content: "";
                position: fixed;
                top: 0; left: 0; width: 100vw; height: 100vh;
                pointer-events: none;
                z-index: 2; /* Below the app (z-index 10) so text stays crisp! */
                background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
                opacity: var(--grain-opacity);
                mix-blend-mode: overlay;
            }

            /* Agent Response Bubble */
            .prose, .markdown-body, [class*="prose"], 
            [data-role="assistant"] > div, 
            [data-message-author="assistant"] > div,
            .agent-message,
            div:has(> p):has(> ul):not(:has(div)),
            div:has(> p):has(> pre):not(:has(div)) {
                background-color: rgba(255, 255, 255, 0.05) !important; /* Adaptive semi-translucent grayish */
                backdrop-filter: blur(12px) !important; /* Adds a beautiful glass effect to the bubble itself */
                padding: 1.25rem !important;
                border-radius: 1rem !important;
                border: 1px solid rgba(255, 255, 255, 0.05) !important;
                box-shadow: none !important;
                margin-top: 0.5rem;
                margin-bottom: 0.5rem;
                max-width: 90% !important; /* Made a tad wider */
            }

            /* Fix Settings Modal Text Overlap */
            /* Blur the dark overlay behind the modal so chat text disappears */
            div[class*="fixed inset-0"] {
                backdrop-filter: blur(12px) !important;
                background-color: rgba(0, 0, 0, 0.6) !important;
            }

            /* Dynamically assigned glass classes */
            .glass-panel, .glass-sidebar, .glass-topbar, aside, nav, header, [role="dialog"] {
                background-color: rgba(255, 255, 255, 0.05) !important; 
                backdrop-filter: blur(12px) !important;
                border-color: rgba(255, 255, 255, 0.05) !important;
                box-shadow: none !important;
            }


            svg path[stroke-dasharray] { stroke: var(--scrobble-color) !important; display: var(--scrobble-display) !important; }
            .scrobble-line, .scrobble-ring, [class*="scrobble"] { display: var(--scrobble-display) !important; }
            
            @keyframes shoot-up-beam {
                0% { transform: translate(-50%, 0) scaleY(0.1); opacity: 0; }
                10% { opacity: 1; }
                100% { transform: translate(-50%, -800px) scaleY(5); opacity: 0; }
            }

            @keyframes svg-scrobble {
                0% { stroke-dashoffset: 100; }
                45% { stroke-dashoffset: 60; }
                50% { stroke-dashoffset: 50; }
                95% { stroke-dashoffset: 10; }
                100% { stroke-dashoffset: 0; }
            }

            .chat-beam {
                position: absolute;
                top: -10px;
                left: 50%;
                width: 4px;
                height: 80px;
                background: linear-gradient(to top, transparent, #1e40af 50%, #60a5fa 100%);
                box-shadow: 0 0 20px 5px rgba(30, 64, 175, 0.6);
                border-radius: 4px;
                z-index: 9999;
                pointer-events: none;
                animation: shoot-up-beam 0.8s cubic-bezier(0.1, 0.9, 0.2, 1) forwards;
            }
            @keyframes float-orb {
                0% { transform: translate(0, 0) scale(1); }
                33% { transform: translate(15vw, 10vh) scale(1.1); }
                66% { transform: translate(-10vw, 20vh) scale(0.9); }
                100% { transform: translate(0, 0) scale(1); }
            }

        `);

        const dgConfigRaw = (() => {
            try {
                const p = path_1.default.join(electron_1.app.getPath('userData'), 'defygravity_config.json');
                return fs.readFileSync(p, 'utf8');
            } catch(e) { return '{}'; }
        })();

        // Inject JS to dynamically find the exact sidebar and topbar elements by content and structure
        win.webContents.executeJavaScript(`
            try {
                const dgConfig = ${dgConfigRaw || '{}'};
                for(let k in dgConfig) {
                    // Always seed localStorage if it's missing (e.g. fresh origin/port)
                    if (localStorage.getItem('dg_'+k) === null) {
                        localStorage.setItem('dg_'+k, dgConfig[k]);
                    }
                }
            } catch(e) {}

            // Initialize stored CSS variables
            const getLInit = (k, d) => localStorage.getItem('dg_'+k) || d;
            
            // ---- DEFYGRAVITY ORB ENGINE INIT ----
            if (!document.getElementById('dg-orb-container')) {
                const container = document.createElement('div');
                container.id = 'dg-orb-container';
                container.style.cssText = 'position: fixed; inset: 0; pointer-events: none; z-index: 9998; mix-blend-mode: screen; overflow: hidden;';
                if (document.body.firstChild) {
                    document.body.insertBefore(container, document.body.firstChild);
                } else {
                    document.body.appendChild(container);
                }

                const grain = document.createElement('div');
                grain.id = 'dg-grain-container';
                grain.style.cssText = \`position: fixed; inset: 0; pointer-events: none; z-index: 9999; mix-blend-mode: overlay; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");\`;
                if (document.body.firstChild) {
                    document.body.insertBefore(grain, document.body.firstChild);
                } else {
                    document.body.appendChild(grain);
                }
                
                const updateOrbStylesInit = () => {
                    const c = document.getElementById('dg-orb-container');
                    const gc = document.getElementById('dg-grain-container');
                    if(!c) return;
                    const enabled = getLInit('orbs-enabled', 'true') === 'true';
                    c.style.display = enabled ? 'block' : 'none';
                    if (gc) {
                        gc.style.display = enabled ? 'block' : 'none';
                        gc.style.opacity = getLInit('grain-opacity', '0.024');
                    }
                    
                    const count = parseInt(getLInit('orb-count', '3'));
                    c.innerHTML = '';
                    for(let i=1; i<=count; i++) {
                        const r = getLInit('orb-'+i+'-r', '14');
                        const g = getLInit('orb-'+i+'-g', '165');
                        const b = getLInit('orb-'+i+'-b', '233');
                        const opacity = getLInit('orb-'+i+'-opacity', '0.4');
                        const size = getLInit('orb-'+i+'-size', '60');
                        const duration = getLInit('orb-'+i+'-duration', '120');

                        // Constrain start positions so they remain entirely visible inside the window
                        const spread = parseInt(getLInit('orb-spread', '60')) || 1;
                        const top = 50 - (spread/2) + ((i * 37) % spread);
                        const left = 50 - (spread/2) + ((i * 71) % spread);
                        const delay = -((i * 13) % 100);

                        const div = document.createElement('div');
                        div.className = 'dg-orb';
                        div.id = 'dg-orb-' + i;
                        div.style.position = 'absolute';
                        div.style.borderRadius = '50%';
                        div.style.width = size + 'vmax';
                        div.style.height = size + 'vmax';
                        div.style.top = \`calc(\${top}% - \${size/2}vmax)\`;
                        div.style.left = \`calc(\${left}% - \${size/2}vmax)\`;
                        div.style.animation = \`float-orb \${duration}s ease-in-out \${delay}s infinite alternate\`;
                        
                        div.style.background = \`radial-gradient(
                            circle at center,
                            rgba(\${r}, \${g}, \${b}, \${opacity}) 0%,
                            rgba(\${r}, \${g}, \${b}, \${opacity * 0.812}) 5%,
                            rgba(\${r}, \${g}, \${b}, \${opacity * 0.652}) 10%,
                            rgba(\${r}, \${g}, \${b}, \${opacity * 0.512}) 15%,
                            rgba(\${r}, \${g}, \${b}, \${opacity * 0.394}) 20%,
                            rgba(\${r}, \${g}, \${b}, \${opacity * 0.296}) 25%,
                            rgba(\${r}, \${g}, \${b}, \${opacity * 0.216}) 30%,
                            rgba(\${r}, \${g}, \${b}, \${opacity * 0.151}) 35%,
                            rgba(\${r}, \${g}, \${b}, \${opacity * 0.102}) 40%,
                            rgba(\${r}, \${g}, \${b}, \${opacity * 0.064}) 45%,
                            rgba(\${r}, \${g}, \${b}, \${opacity * 0.037}) 50%,
                            rgba(\${r}, \${g}, \${b}, \${opacity * 0.019}) 55%,
                            rgba(\${r}, \${g}, \${b}, \${opacity * 0.008}) 60%,
                            rgba(\${r}, \${g}, \${b}, \${opacity * 0.002}) 65%,
                            rgba(\${r}, \${g}, \${b}, \${opacity * 0.0003}) 70%,
                            rgba(\${r}, \${g}, \${b}, 0) 75%,
                            rgba(\${r}, \${g}, \${b}, 0) 100%
                        )\`;
                        c.appendChild(div);
                    }
                };
                updateOrbStylesInit();
            }
            if (!window.__defygravity_initialized) {
                window.__defygravity_initialized = true;
                try {
                    const getL = (k, def) => localStorage.getItem('dg_'+k) || def;
                                    const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
                                        const hex = parseInt(x).toString(16);
                                        return hex.length === 1 ? '0' + hex : hex;
                                    }).join('');

                    const r = document.documentElement;
                    r.style.setProperty('--orb-1-opacity', getL('orb-1-opacity', '0.45'));
                    r.style.setProperty('--orb-2-opacity', getL('orb-2-opacity', '0.38'));
                    r.style.setProperty('--orb-3-opacity', getL('orb-3-opacity', '0.34'));
                    r.style.setProperty('--orb-1-duration', getL('orb-1-duration', '120') + 's');
                    r.style.setProperty('--orb-2-duration', getL('orb-2-duration', '160') + 's');
                    r.style.setProperty('--orb-3-duration', getL('orb-3-duration', '140') + 's');
                    r.style.setProperty('--orb-1-r', getL('orb-1-r', '14'));
                    r.style.setProperty('--orb-1-g', getL('orb-1-g', '165'));
                    r.style.setProperty('--orb-1-b', getL('orb-1-b', '233'));
                    r.style.setProperty('--orb-2-r', getL('orb-2-r', '2'));
                    r.style.setProperty('--orb-2-g', getL('orb-2-g', '132'));
                    r.style.setProperty('--orb-2-b', getL('orb-2-b', '199'));
                    r.style.setProperty('--orb-3-r', getL('orb-3-r', '12'));
                    r.style.setProperty('--orb-3-g', getL('orb-3-g', '143'));
                    r.style.setProperty('--orb-3-b', getL('orb-3-b', '214'));
                    r.style.setProperty('--orb-1-display', getL('orb-1-display', 'block'));
                    r.style.setProperty('--orb-2-display', getL('orb-2-display', 'block'));
                    r.style.setProperty('--orb-3-display', getL('orb-3-display', 'block'));
                    r.style.setProperty('--grain-opacity', getL('grain-opacity', '0.024'));
                    r.style.setProperty('--scrobble-display', getL('scrobble-display', 'block'));
                    r.style.setProperty('--scrobble-color', getL('scrobble-color', '#3b82f6'));
                    r.style.setProperty('--beam-display', getL('beam-display', 'block'));
                } catch(e) {}
            }

            // Powerful MutationObserver to constantly enforce glassmorphism
            const enforceGlass = () => {
                try {
                    // 1. Sidebar: Find by "New Conversation" or generic sidebars
                    const elements = Array.from(document.querySelectorAll('*'));
                    const newConvEl = elements.find(el => el.textContent && el.textContent.trim() === 'New Conversation');
                    let sidebar = null;
                    if (newConvEl) {
                        let current = newConvEl;
                        for (let i = 0; i < 10; i++) {
                            if (!current) break;
                            const style = window.getComputedStyle(current);
                            if (current.tagName === 'ASIDE' || current.tagName === 'NAV' || 
                               (style.display === 'flex' && style.flexDirection === 'column' && parseInt(style.width) > 150 && parseInt(style.width) < 400)) {
                                sidebar = current;
                            }
                            current = current.parentElement;
                        }
                    }
                    if (!sidebar) sidebar = document.querySelector('aside, nav, .w-64, .w-72');
                    if (sidebar) {
                        // Flat glass panel instead of a fade
                        sidebar.style.setProperty('background', 'rgba(255,255,255,0.03)', 'important');
                        sidebar.style.setProperty('backdrop-filter', 'blur(16px)', 'important');
                        sidebar.style.setProperty('border-right', '1px solid rgba(255,255,255,0.02)', 'important');
                        sidebar.style.setProperty('box-shadow', 'none', 'important');
                    }

                    // 2. Topbar: Find the absolute top menu bar safely without spamming getBoundingClientRect
                    let topbar = null;
                    const dragElements = Array.from(document.querySelectorAll('div, header, nav')).filter(el => {
                        return window.getComputedStyle(el).webkitAppRegion === 'drag';
                    });
                    if (dragElements.length > 0) {
                        topbar = dragElements[0];
                    } else {
                        // Fallback: look for File/View menu text
                        const menuItems = Array.from(document.querySelectorAll('span, p, div, button, a, div')).filter(el => 
                            el.children.length === 0 && (el.textContent === 'File' || el.textContent === 'View' || el.textContent === 'Window')
                        );
                        if (menuItems.length > 0) {
                            let curr = menuItems[0];
                            while (curr && curr.tagName !== 'HEADER' && curr.tagName !== 'DIV' && curr.tagName !== 'NAV') {
                                curr = curr.parentElement;
                            }
                            topbar = curr ? curr.closest('header') || curr.parentElement : null;
                        }
                    }

                    const applyHeaderGlass = (el) => {
                        if (el) {
                            // Strip backgrounds from ALL children to prevent nested opaque divs from blocking the glass
                            const children = el.querySelectorAll('*');
                            children.forEach(c => {
                                c.style.setProperty('background', 'transparent', 'important');
                                c.style.setProperty('background-color', 'transparent', 'important');
                                c.style.setProperty('background-image', 'none', 'important');
                            });
                            
                            el.style.setProperty('background', 'rgba(255,255,255,0.03)', 'important');
                            el.style.setProperty('backdrop-filter', 'blur(16px)', 'important');
                            el.style.setProperty('border-bottom', '1px solid rgba(255,255,255,0.04)', 'important');
                            el.style.setProperty('box-shadow', '0 4px 12px rgba(0,0,0,0.1)', 'important');
                        }
                    };

                    applyHeaderGlass(topbar);

                    // 3. Force completely transparent backgrounds on everything above the workspace
                    const roots = document.querySelectorAll('body, #root, #root > div, #root > div > div, main, aside, header, nav, footer, .bg-background, .bg-zinc-950, .monaco-workbench, .part, .titlebar');
                    roots.forEach(r => {
                        if (r !== sidebar && r !== topbar) {
                            // Strip backgrounds from structural elements so the orbs show through
                            r.style.setProperty('background-color', 'transparent', 'important');
                            r.style.setProperty('background-image', 'none', 'important');
                        }
                    });

                    // 4. Chat input scrobble and beam animation - EXPLICIT ID METHOD
                    const chatBox = document.getElementById('antigravity.agentSidePanelInputBox');
                    
                    if (chatBox && !chatBox.dataset.animBound) {
                        chatBox.dataset.animBound = 'true';

                        // Strip background from parent containers to absolutely guarantee transparency
                        let curr = chatBox.parentElement;
                        for (let i = 0; i < 8; i++) {
                            if (curr && curr.tagName !== 'MAIN' && curr.tagName !== 'BODY' && curr.tagName !== 'HTML') {
                                curr.style.setProperty('background-color', 'transparent', 'important');
                                curr.style.setProperty('background-image', 'none', 'important');
                                curr.style.setProperty('box-shadow', 'none', 'important');
                                curr.style.setProperty('mask-image', 'none', 'important');
                                curr.style.setProperty('-webkit-mask-image', 'none', 'important');
                                curr = curr.parentElement;
                            }
                        }
                        
                        // Create a completely detached SVG overlay that sits on top of everything
                        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                        svg.setAttribute('class', 'scrobble-svg');
                        svg.style.cssText = 'position: fixed; pointer-events: none; z-index: 2147483647; overflow: visible;';
                        
                        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                        rect.setAttribute('fill', 'none');
                        rect.setAttribute('stroke', '#1e40af');
                        rect.setAttribute('stroke-width', '1.5');
                        rect.setAttribute('stroke-linecap', 'round');
                        rect.setAttribute('pathLength', '100');
                        rect.style.strokeDasharray = '5 95';
                        rect.style.animation = 'svg-scrobble 10s linear infinite';
                        rect.style.filter = 'drop-shadow(0 0 8px #1e40af)';
                        
                        svg.appendChild(rect);
                        document.body.appendChild(svg);
                        
                        // Constantly glue the SVG exactly over the chat box's screen coordinates
                        const syncPosition = () => {
                            if (chatBox && document.body.contains(chatBox)) {
                                const r = chatBox.getBoundingClientRect();
                                svg.style.top = r.top + 'px';
                                svg.style.left = r.left + 'px';
                                svg.style.width = r.width + 'px';
                                svg.style.height = r.height + 'px';
                                
                                rect.setAttribute('width', r.width);
                                rect.setAttribute('height', r.height);
                                
                                const style = window.getComputedStyle(chatBox);
                                let rad = parseInt(style.borderRadius);
                                if (isNaN(rad) || rad === 0) rad = 16; // The bg-card-border usually is rounded-2xl (16px)
                                rect.setAttribute('rx', rad);
                                rect.setAttribute('ry', rad);
                            } else {
                                // If chatBox is removed from DOM, destroy the SVG and stop the loop
                                svg.remove();
                                return;
                            }
                            requestAnimationFrame(syncPosition);
                        };
                        requestAnimationFrame(syncPosition);
                        
                        // Beam animation
                        const triggerBeam = () => {
                            const beam = document.createElement('div');
                            beam.className = 'chat-beam';
                            document.body.appendChild(beam);
                            
                            const r = chatBox.getBoundingClientRect();
                            beam.style.top = r.top + 'px';
                            beam.style.left = (r.left + r.width / 2) + 'px';
                            
                            setTimeout(() => beam.remove(), 1000);
                        };

                        const inputEl = chatBox.querySelector('[contenteditable="true"], textarea, input');
                        if (inputEl) {
                            inputEl.addEventListener('keydown', (e) => {
                                if (e.key === 'Enter' && !e.shiftKey) triggerBeam();
                            });
                        }
                        
                        chatBox.addEventListener('click', (e) => {
                            // Only trigger on the send button (the button with a path/svg inside that isn't the file upload)
                            if (e.target.closest('button[data-testid="send-button"]') || e.target.closest('button[aria-label="Send message"]')) {
                                triggerBeam();
                            }
                        });
                        
                        // Nuke sibling fades (sometimes absolute/fixed divs over the chat box are used for fades)
                        let fadeCurr = chatBox;
                        for (let i = 0; i < 8; i++) {
                            if (!fadeCurr || fadeCurr.tagName === 'BODY') break;
                            if (fadeCurr.parentElement) {
                                Array.from(fadeCurr.parentElement.children).forEach(sibling => {
                                    if (sibling !== fadeCurr) {
                                        const style = window.getComputedStyle(sibling);
                                        if (style.position === 'absolute' || style.position === 'fixed') {
                                            if (style.backgroundImage.includes('gradient') || 
                                                style.maskImage !== 'none' || 
                                                style.boxShadow !== 'none' || 
                                                style.background.includes('gradient') ||
                                                sibling.className.includes('from-') || 
                                                sibling.className.includes('bg-gradient')) {
                                                sibling.style.setProperty('display', 'none', 'important');
                                                sibling.style.setProperty('opacity', '0', 'important');
                                            }
                                        }
                                    }
                                });
                            }
                            fadeCurr = fadeCurr.parentElement;
                        }
                    }

                    // 5. Add defygravity Settings Tab
                    const spans = Array.from(document.querySelectorAll('span, div, p'));
                    const appSpan = spans.find(el => {
                        return el.childNodes.length === 1 && 
                               el.childNodes[0].nodeType === Node.TEXT_NODE && 
                               el.textContent.trim() === 'App';
                    });
                    
                    if (appSpan && !document.getElementById('defygravity-settings-tab')) {
                        // Climb up to the flex row container
                        let appTab = appSpan.parentElement;
                        for(let i=0; i<4; i++) {
                            if (!appTab || appTab.tagName === 'BODY') break;
                            const style = window.getComputedStyle(appTab);
                            if (style.display.includes('flex') && style.cursor === 'pointer') {
                                break;
                            }
                            // if it has a hover effect or looks like a tab
                            if (appTab.className.includes('cursor-pointer') || appTab.className.includes('hover:')) {
                                break;
                            }
                            appTab = appTab.parentElement;
                        }

                        if (appTab && !document.getElementById('defygravity-settings-tab')) {
                            const newTab = appTab.cloneNode(true);
                            newTab.id = 'defygravity-settings-tab';
                            
                            // Find the text node inside newTab and replace "App" with "defygravity (Custom)"
                            const textNodes = Array.from(newTab.querySelectorAll('*')).filter(el => {
                                return el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE;
                            });
                            const textSpan = textNodes.find(s => s.textContent.trim() === 'App') || newTab.querySelector('span');
                            if (textSpan) {
                                textSpan.textContent = 'DefyGravity';
                            }
                            
                            appTab.insertAdjacentElement('afterend', newTab);
                                                        // Add a click handler for when it's clicked to show our custom settings panel
                            newTab.addEventListener('click', (e) => {
                                e.stopPropagation();
                                const settingsSidebar = appTab.parentElement;
                                
                                // Deactivate others in our group
                                Array.from(settingsSidebar.children).forEach(btn => {
                                    if (btn.tagName === 'DIV' || btn.tagName === 'A' || btn.tagName === 'BUTTON') {
                                        btn.classList.remove('bg-sidebar-muted');
                                        btn.style.backgroundColor = 'transparent';
                                        btn.style.color = '#a1a1aa';
                                    }
                                });
                                newTab.style.backgroundColor = 'rgba(255,255,255,0.1)';
                                newTab.style.color = '#ffffff';
                                
                                // Find the main split layout (sidebar vs content area)
                                let layoutSidebar = appTab;
                                for(let i=0; i<10; i++) {
                                    if (!layoutSidebar || layoutSidebar.tagName === 'BODY') break;
                                    if (layoutSidebar.nextElementSibling) {
                                        const nextWidth = layoutSidebar.nextElementSibling.clientWidth;
                                        if (nextWidth > layoutSidebar.clientWidth * 1.5) {
                                            // Found the split! sidebar is smaller, next element is much wider
                                            break;
                                        }
                                    }
                                    layoutSidebar = layoutSidebar.parentElement;
                                }
                                
                                const contentArea = layoutSidebar ? layoutSidebar.nextElementSibling : null;
                                if (contentArea) {
                                    // Hide existing content (except maybe the close button if it's absolute positioned)
                                    Array.from(contentArea.children).forEach(child => {
                                        if (window.getComputedStyle(child).position !== 'absolute') {
                                            child.dataset.dgOriginalDisplay = child.style.display || '';
                                            child.style.setProperty('display', 'none', 'important');
                                            child.classList.add('dg-hidden');
                                        }
                                    });
                                    
                                    const oldPanel = document.getElementById('defygravity-panel');
                                    if (oldPanel) oldPanel.remove();
                                    
                                    const panel = document.createElement('div');
                                    panel.id = 'defygravity-panel';
                                    
                                    // Helpers
                                    const getL = (k, d) => localStorage.getItem('dg_'+k) || d;
                                    const setL = (k, v) => localStorage.setItem('dg_'+k, v);
                                    const hexToRgb = hex => {
                                        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                                        return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
                                    };
                                    const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => { const hex = parseInt(x).toString(16); return hex.length === 1 ? '0' + hex : hex; }).join('');

                                    const renderToggle = (id, isChecked) => \`
                                        <div id="\${id}" class="dg-toggle" data-checked="\${isChecked}" style="width: 28px; height: 16px; border-radius: 8px; background: \${isChecked ? '#3b82f6' : 'rgba(255,255,255,0.1)'}; position: relative; cursor: pointer; transition: background 0.2s; flex-shrink: 0;">
                                            <div class="dg-toggle-knob" style="width: 12px; height: 12px; border-radius: 50%; background: white; position: absolute; top: 2px; left: \${isChecked ? '14px' : '2px'}; transition: left 0.2s;"></div>
                                        </div>
                                    \`;

                                    // Render dynamic orb settings
                                    const orbCount = parseInt(getL('orb-count', '3'));
                                    let orbSettingsHtml = '';
                                    for(let i=1; i<=10; i++) {
                                        const r = getL(\'orb-\'+i+\'-r\', (i*10)%255);
                                        const g = getL(\'orb-\'+i+\'-g\', (i*40)%255);
                                        const b = getL(\'orb-\'+i+\'-b\', (i*80)%255);
                                        const hex = rgbToHex(r,g,b);
                                        const size = getL(\'orb-\'+i+\'-size\', '60');
                                        const duration = getL(\'orb-\'+i+\'-duration\', '120');
                                        const opacity = getL(\'orb-\'+i+\'-opacity\', '0.4');

                                        orbSettingsHtml += \`
                                        <div class="dg-orb-setting-group" id="dg_orb_group_\${i}" style="\${i <= orbCount ? '' : 'display:none;'} border-top: 1px solid rgba(255,255,255,0.05); padding: 0.75rem;">
                                            <div style="color: white; font-size: 0.8rem; font-weight: 500; margin-bottom: 0.5rem;">Orb \${i}</div>
                                            
                                            <!-- Color -->
                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                                <div style="color: #9ca3af; font-size: 0.75rem;">Color</div>
                                                <div style="display: flex; align-items: center; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 2px 6px 2px 2px;">
                                                    <input type="color" id="dg_orb_\${i}_color" value="\${hex}" style="background: transparent; border: none; cursor: pointer; padding: 0; width: 16px; height: 16px; border-radius: 2px;" />
                                                </div>
                                            </div>

                                            <!-- Size -->
                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                                <div style="color: #9ca3af; font-size: 0.75rem;">Size (vmax)</div>
                                                <input type="range" id="dg_orb_\${i}_size" min="10" max="150" value="\${size}" style="width: 100px;">
                                            </div>

                                            <!-- Duration -->
                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                                <div style="color: #9ca3af; font-size: 0.75rem;">Speed (sec)</div>
                                                <input type="range" id="dg_orb_\${i}_duration" min="10" max="300" value="\${duration}" style="width: 100px;">
                                            </div>

                                            <!-- Opacity -->
                                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                                <div style="color: #9ca3af; font-size: 0.75rem;">Opacity</div>
                                                <input type="range" id="dg_orb_\${i}_opacity" min="0" max="1" step="0.05" value="\${opacity}" style="width: 100px;">
                                            </div>
                                        </div>
                                        \`;
                                    }
                                    
                                    panel.innerHTML = \`
                                        <style>
                                            #dg_orb_count_sel option { background-color: #1e1e1e; color: white; }
                                            input[type=range] { accent-color: #3b82f6; }
                                        </style>
                                        <div style="padding-bottom: 1.25rem;">
                                            <h1 style="font-size: 1.15rem; font-weight: 500; color: white; margin: 0;">DefyGravity</h1>
                                            <p style="color: #9ca3af; font-size: 0.75rem; margin-top: 4px;">Configure custom visual themes, orbs, glassmorphism, and scrobble aesthetics.</p>
                                        </div>

                                        <!-- Global Settings Group -->
                                        <div style="margin-bottom: 1.25rem;">
                                            <div style="color: white; font-weight: 600; font-size: 0.85rem; margin-bottom: 0.5rem;">Global Settings</div>
                                            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 0.375rem; overflow: hidden;">
                                                
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.03);">
                                                    <div><div style="color: white; font-size: 0.8rem; font-weight: 500;">Base Background</div></div>
                                                    <div style="display: flex; align-items: center; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 2px 6px 2px 2px;">
                                                        <input type="color" id="dg_base_bg" value="\${getL('base-bg', '#121212')}" style="background: transparent; border: none; cursor: pointer; padding: 0; width: 16px; height: 16px; border-radius: 2px;" />
                                                    </div>
                                                </div>

                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.03);">
                                                    <div><div style="color: white; font-size: 0.8rem; font-weight: 500;">Grain Opacity</div></div>
                                                    <input type="range" id="dg_grain_opacity" min="0" max="0.1" step="0.005" value="\${getL('grain-opacity', '0.024')}" style="width: 100px;">
                                                </div>

                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.03);">
                                                    <div><div style="color: white; font-size: 0.8rem; font-weight: 500;">Orb Spread</div></div>
                                                    <input type="range" id="dg_orb_spread" min="10" max="150" step="5" value="\${getL('orb-spread', '60')}" style="width: 100px;">
                                                </div>

                                            </div>
                                        </div>

                                        <!-- Orbs Group -->
                                        <div style="margin-bottom: 1.25rem;">
                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                                <div style="color: white; font-weight: 600; font-size: 0.85rem;">Orb Settings</div>
                                                <select id="dg_orb_count_sel" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 0.1rem 0.3rem; border-radius: 0.25rem; outline: none; cursor: pointer; font-size: 0.7rem;">
                                                    \${Array.from({length: 10}, (_, i) => \`<option value="\${i+1}" \${orbCount === i+1 ? 'selected' : ''}>\${i+1} Orbs</option>\`).join('')}
                                                </select>
                                            </div>
                                            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 0.375rem; overflow: hidden;">
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.03);">
                                                    <div><div style="color: white; font-size: 0.8rem; font-weight: 500;">Enable Orbs</div></div>
                                                    \${renderToggle('dg_orbs_toggle', getL('orbs-enabled', 'true') === 'true')}
                                                </div>
                                                \${orbSettingsHtml}
                                            </div>
                                        </div>

                                        <!-- Scrobble Group -->
                                        <div style="margin-bottom: 1.5rem;">
                                            <div style="color: white; font-weight: 600; font-size: 0.85rem; margin-bottom: 0.5rem;">Scrobble Settings</div>
                                            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 0.375rem; overflow: hidden;">
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.03);">
                                                    <div><div style="color: white; font-size: 0.8rem; font-weight: 500;">Scrobble Ring</div></div>
                                                    \${renderToggle('dg_scrobble_toggle', getL('scrobble-display', 'block') === 'block')}
                                                </div>
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem;">
                                                    <div><div style="color: white; font-size: 0.8rem; font-weight: 500;">Scrobble Ring Color</div></div>
                                                    <div style="display: flex; align-items: center; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 2px 6px 2px 2px;">
                                                        <input type="color" id="dg_scrobble_color" value="\${getL('scrobble-color', '#3b82f6')}" style="background: transparent; border: none; cursor: pointer; padding: 0; width: 16px; height: 16px; border-radius: 2px;" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div style="height: 4rem;"></div>
                                    \`;
                                    contentArea.appendChild(panel);
                                    
                                    // DOM Logic and Handlers
                                    const updateOrbStyles = () => {
                                        const container = document.getElementById('dg-orb-container');
                                        const gc = document.getElementById('dg-grain-container');
                                        if(!container) return;
                                        const enabled = getL('orbs-enabled', 'true') === 'true';
                                        container.style.display = enabled ? 'block' : 'none';
                                        if (gc) {
                                            gc.style.display = enabled ? 'block' : 'none';
                                            gc.style.opacity = getL('grain-opacity', '0.024');
                                        }
                                        
                                        const count = parseInt(getL('orb-count', '3'));
                                        container.innerHTML = '';
                                        for(let i=1; i<=count; i++) {
                                            const r = getL('orb-'+i+'-r', '14');
                                            const g = getL('orb-'+i+'-g', '165');
                                            const b = getL('orb-'+i+'-b', '233');
                                            const opacity = getL('orb-'+i+'-opacity', '0.4');
                                            const size = getL('orb-'+i+'-size', '60');
                                            const duration = getL('orb-'+i+'-duration', '120');

                                            // Constrain start positions so they remain entirely visible inside the window
                                            const spread = parseInt(getL('orb-spread', '60')) || 1;
                                            const top = 50 - (spread/2) + ((i * 37) % spread);
                                            const left = 50 - (spread/2) + ((i * 71) % spread);
                                            const delay = -((i * 13) % 100);

                                            const div = document.createElement('div');
                                            div.className = 'dg-orb';
                                            div.id = 'dg-orb-' + i;
                                            div.style.position = 'absolute';
                                            div.style.borderRadius = '50%';
                                            div.style.zIndex = '999999';
                                            div.style.width = size + 'vmax';
                                            div.style.height = size + 'vmax';
                                            div.style.top = \`calc(\${top}% - \${size/2}vmax)\`;
                                            div.style.left = \`calc(\${left}% - \${size/2}vmax)\`;
                                            div.style.animation = \`float-orb \${duration}s ease-in-out \${delay}s infinite alternate\`;
                                            
                                            // The complex radial gradient
                                            div.style.background = \`radial-gradient(
                                                circle at center,
                                                rgba(\${r}, \${g}, \${b}, \${opacity}) 0%,
                                                rgba(\${r}, \${g}, \${b}, \${opacity * 0.812}) 5%,
                                                rgba(\${r}, \${g}, \${b}, \${opacity * 0.652}) 10%,
                                                rgba(\${r}, \${g}, \${b}, \${opacity * 0.512}) 15%,
                                                rgba(\${r}, \${g}, \${b}, \${opacity * 0.394}) 20%,
                                                rgba(\${r}, \${g}, \${b}, \${opacity * 0.296}) 25%,
                                                rgba(\${r}, \${g}, \${b}, \${opacity * 0.216}) 30%,
                                                rgba(\${r}, \${g}, \${b}, \${opacity * 0.151}) 35%,
                                                rgba(\${r}, \${g}, \${b}, \${opacity * 0.102}) 40%,
                                                rgba(\${r}, \${g}, \${b}, \${opacity * 0.064}) 45%,
                                                rgba(\${r}, \${g}, \${b}, \${opacity * 0.037}) 50%,
                                                rgba(\${r}, \${g}, \${b}, \${opacity * 0.019}) 55%,
                                                rgba(\${r}, \${g}, \${b}, \${opacity * 0.008}) 60%,
                                                rgba(\${r}, \${g}, \${b}, \${opacity * 0.002}) 65%,
                                                rgba(\${r}, \${g}, \${b}, \${opacity * 0.0003}) 70%,
                                                rgba(\${r}, \${g}, \${b}, 0) 75%,
                                                rgba(\${r}, \${g}, \${b}, 0) 100%
                                            )\`;
                                            container.appendChild(div);
                                        }
                                    };

                                    // Toggle Switch Handler
                                    const bindToggle = (id, localStorageKey, callback) => {
                                        const el = document.getElementById(id);
                                        if(!el) return;
                                        el.addEventListener('click', () => {
                                            const isChecked = el.dataset.checked === 'true';
                                            const newState = !isChecked;
                                            el.dataset.checked = newState.toString();
                                            el.style.background = newState ? '#3b82f6' : 'rgba(255,255,255,0.1)';
                                            el.querySelector('.dg-toggle-knob').style.left = newState ? '14px' : '2px';
                                            setL(localStorageKey, newState.toString());
                                            if(callback) callback(newState);
                                        });
                                    };

                                    bindToggle('dg_orbs_toggle', 'orbs-enabled', updateOrbStyles);
                                    bindToggle('dg_scrobble_toggle', 'scrobble-display', (s) => {
                                        document.documentElement.style.setProperty('--scrobble-display', s ? 'block' : 'none', 'important');
                                        setL('scrobble-display', s ? 'block' : 'none');
                                    });

                                    // Orb Count
                                    const countSel = document.getElementById('dg_orb_count_sel');
                                    if(countSel) {
                                        countSel.addEventListener('change', e => {
                                            const c = parseInt(e.target.value);
                                            setL('orb-count', c.toString());
                                            // Show/hide groups
                                            for(let i=1; i<=10; i++) {
                                                const grp = document.getElementById('dg_orb_group_'+i);
                                                if(grp) grp.style.display = i <= c ? 'block' : 'none';
                                            }
                                            updateOrbStyles();
                                        });
                                    }

                                    // Global Bindings
                                    const bindGlobalColor = (id, prop) => {
                                        const el = document.getElementById(id);
                                        if(!el) return;
                                        el.addEventListener('input', e => {
                                            const val = e.target.value;
                                            document.documentElement.style.setProperty(prop, val, 'important');
                                            setL(prop.replace('--',''), val);
                                        });
                                    };
                                    bindGlobalColor('dg_base_bg', '--base-bg');
                                    bindGlobalColor('dg_scrobble_color', '--scrobble-color');

                                    const bindGlobalRange = (id, prop) => {
                                        const el = document.getElementById(id);
                                        if(!el) return;
                                        el.addEventListener('input', e => {
                                            const val = e.target.value;
                                            document.documentElement.style.setProperty(prop, val, 'important');
                                            setL(prop.replace('--',''), val);
                                        });
                                    };
                                    bindGlobalRange('dg_grain_opacity', '--grain-opacity');

                                    const spreadSlider = document.getElementById('dg_orb_spread');
                                    if(spreadSlider) {
                                        spreadSlider.addEventListener('input', e => {
                                            setL('orb-spread', e.target.value);
                                            updateOrbStyles();
                                        });
                                    }

                                    // Per-orb Bindings
                                    for(let i=1; i<=10; i++) {
                                        const col = document.getElementById('dg_orb_'+i+'_color');
                                        if(col) col.addEventListener('input', e => {
                                            const rgb = hexToRgb(e.target.value);
                                            if(rgb) {
                                                setL('orb-'+i+'-r', rgb.r);
                                                setL('orb-'+i+'-g', rgb.g);
                                                setL('orb-'+i+'-b', rgb.b);
                                                updateOrbStyles();
                                            }
                                        });

                                        ['size', 'duration', 'opacity'].forEach(type => {
                                            const inp = document.getElementById(\`dg_orb_\${i}_\${type}\`);
                                            if(inp) inp.addEventListener('input', e => {
                                                setL(\`orb-\${i}-\${type}\`, e.target.value);
                                                updateOrbStyles();
                                            });
                                        });
                                    }

                                    // Restore layout when another tab is clicked
                                    const restoreLayout = (evt) => {
                                        if (evt.target.closest('#defygravity-settings-tab')) return; 
                                        const pnl = document.getElementById('defygravity-panel');
                                        if (pnl) pnl.remove();
                                        
                                        Array.from(contentArea.children).forEach(child => {
                                            if (child.classList.contains('dg-hidden')) {
                                                child.style.display = child.dataset.dgOriginalDisplay || '';
                                                child.style.removeProperty('display');
                                                child.classList.remove('dg-hidden');
                                            }
                                        });
                                        settingsSidebar.removeEventListener('click', restoreLayout, true);
                                    };
                                    settingsSidebar.addEventListener('click', restoreLayout, true);
                                }

                            });
                        }
                    }

                } catch(e) {
                    console.error("Glass effect error:", e);
                }
            };

            let observer;
            const observerCallback = () => {
                if (observer) observer.disconnect();
                enforceGlass();
                if (observer) observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
            };
            observer = new MutationObserver(observerCallback);
            observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
            
            setInterval(observerCallback, 500);
            enforceGlass();
        `);
        
        if (!win.__dg_polling) {
            win.__dg_polling = true;
            const dgConfigPath = path_1.default.join(electron_1.app.getPath('userData'), 'defygravity_config.json');
            setInterval(() => {
                if (win.isDestroyed()) return;
                win.webContents.executeJavaScript(`
                    (() => {
                        let res = {};
                        for(let i=0; i<localStorage.length; i++) {
                            let k = localStorage.key(i);
                            if(k && k.startsWith('dg_')) res[k.substring(3)] = localStorage.getItem(k);
                        }
                        return JSON.stringify(res);
                    })();
                `).then(str => {
                    if (str) fs.writeFileSync(dgConfigPath, str);
                }).catch(e => {});
            }, 3000);
        }
    });

    void win.loadURL(url);
    return win;
}
/**
 * Focuses a window if it exists, or creates a new one.
 */
const showOrCreateWindow = (port) => {
    const wins = electron_1.BrowserWindow.getAllWindows();
    if (wins.length > 0) {
        wins[0].show();
        wins[0].focus();
    }
    else {
        createWindow(`${constants_1.WINDOW_ORIGIN}:${port}/`);
    }
};
exports.showOrCreateWindow = showOrCreateWindow;
/**
 * Manages the power save blocker to keep the computer awake.
 */
class SleepBlocker {
    constructor() {
        this.currentBlockerId = null;
    }
    static getInstance() {
        if (!SleepBlocker.instance) {
            SleepBlocker.instance = new SleepBlocker();
        }
        return SleepBlocker.instance;
    }
    shouldKeepComputerAwake(keep) {
        if (keep) {
            if (this.currentBlockerId === null) {
                this.currentBlockerId = electron_1.powerSaveBlocker.start('prevent-display-sleep');
                console.log('Power save blocker started:', this.currentBlockerId);
            }
        }
        else {
            if (this.currentBlockerId !== null) {
                electron_1.powerSaveBlocker.stop(this.currentBlockerId);
                console.log('Power save blocker stopped:', this.currentBlockerId);
                this.currentBlockerId = null;
            }
        }
    }
}
exports.SleepBlocker = SleepBlocker;
function getNodeWrapperPaths(envPath, os, isPackaged, userDataPath, baseDir) {
    const delimiter = os === 'win32' ? ';' : ':';
    if (!isPackaged) {
        const devBinPath = path_1.default.join(baseDir, '..', 'node_modules', '.bin');
        return {
            newEnvPath: `${devBinPath}${delimiter}${envPath || ''}`,
            nodeWrapperPath: undefined,
            binPath: undefined,
        };
    }
    const binPath = path_1.default.join(userDataPath, 'bin');
    const nodeWrapperPath = path_1.default.join(binPath, os === 'win32' ? 'agy-node.cmd' : 'agy-node');
    return {
        newEnvPath: `${binPath}${delimiter}${envPath || ''}`,
        nodeWrapperPath,
        binPath,
    };
}
/**
 * Sets up a wrapper script for Node.js that runs Electron as Node.
 * This allows running standard Node scripts using the Electron binary.
 */
function setupNodeWrapper(env) {
    const userDataPath = electron_1.app.isPackaged ? electron_1.app.getPath('userData') : '';
    // Windows environment variables are case-insensitive, but when copying process.env
    // into a plain object, we might get 'Path' instead of 'PATH'. We need to find
    // the actual key used to avoid creating case-duplicate keys (e.g. 'Path' and 'PATH')
    // which can confuse child_process.spawn on Windows.
    const isWindows = process.platform === 'win32';
    const pathKey = isWindows
        ? Object.keys(env).find((k) => k.toUpperCase() === 'PATH') || 'PATH'
        : 'PATH';
    const { newEnvPath, nodeWrapperPath, binPath } = getNodeWrapperPaths(env[pathKey], process.platform, electron_1.app.isPackaged, userDataPath, __dirname);
    env[pathKey] = newEnvPath;
    // In non-packaged dev mode, we don't create a wrapper and it'll just use machine node
    if (!nodeWrapperPath || !binPath) {
        return;
    }
    if (!fs.existsSync(binPath)) {
        fs.mkdirSync(binPath, { recursive: true });
    }
    let nodeWrapperContent = '';
    switch (process.platform) {
        case 'win32':
            nodeWrapperContent = `@echo off\nset ELECTRON_RUN_AS_NODE=1\n"${process.execPath}" %*\n`;
            break;
        case 'darwin': {
            // Use the Helper app instead of the main executable to prevent macOS
            // from bouncing a new Dock icon when this script is executed. The Helper
            // has LSUIElement=true in its Info.plist, running it invisibly.
            const appName = path_1.default.basename(process.execPath);
            let electronBinary = process.execPath;
            const helperPath = path_1.default.join(path_1.default.dirname(process.execPath), '..', 'Frameworks', `${appName} Helper.app`, 'Contents', 'MacOS', `${appName} Helper`);
            if (fs.existsSync(helperPath)) {
                electronBinary = helperPath;
            }
            nodeWrapperContent = `#!/bin/sh\nELECTRON_RUN_AS_NODE=1 exec "${electronBinary}" "$@"\n`;
            break;
        }
        default: // linux, etc.
            nodeWrapperContent = `#!/bin/sh\nELECTRON_RUN_AS_NODE=1 exec "${process.execPath}" "$@"\n`;
            break;
    }
    try {
        const existingContent = fs.existsSync(nodeWrapperPath)
            ? fs.readFileSync(nodeWrapperPath, 'utf-8')
            : '';
        if (existingContent !== nodeWrapperContent) {
            fs.writeFileSync(nodeWrapperPath, nodeWrapperContent);
            if (process.platform !== 'win32') {
                fs.chmodSync(nodeWrapperPath, 0o755);
            }
        }
    }
    catch (err) {
        console.error(`Failed to create node wrapper: ${err}`);
    }
}
