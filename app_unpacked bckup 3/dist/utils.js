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
                --grain-opacity: 0.024;
                --orb-1-duration: 120s;
                --orb-2-duration: 160s;
                --orb-3-duration: 140s;
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

            /* 3 subtle floating blue orbs */
            html::before, body::before, body::after {
                content: "";
                position: fixed;
                border-radius: 50%;
                pointer-events: none;
                z-index: 1; 
                mix-blend-mode: screen; 
                will-change: transform;
                transform-style: preserve-3d;
                backface-visibility: hidden;
                perspective: 1000px;
            }

            /* Orb 1 Sky Blue */
            html::before {
                width: 75vmax;
                height: 75vmax;
                top: -10%; left: -10%;
                background: radial-gradient(
                    circle at center,
                    rgba(14, 165, 233, var(--orb-1-opacity)) 0%,
                    rgba(14, 165, 233, calc(var(--orb-1-opacity) * 0.812)) 5%,
                    rgba(14, 165, 233, calc(var(--orb-1-opacity) * 0.652)) 10%,
                    rgba(14, 165, 233, calc(var(--orb-1-opacity) * 0.512)) 15%,
                    rgba(14, 165, 233, calc(var(--orb-1-opacity) * 0.394)) 20%,
                    rgba(14, 165, 233, calc(var(--orb-1-opacity) * 0.296)) 25%,
                    rgba(14, 165, 233, calc(var(--orb-1-opacity) * 0.216)) 30%,
                    rgba(14, 165, 233, calc(var(--orb-1-opacity) * 0.151)) 35%,
                    rgba(14, 165, 233, calc(var(--orb-1-opacity) * 0.102)) 40%,
                    rgba(14, 165, 233, calc(var(--orb-1-opacity) * 0.064)) 45%,
                    rgba(14, 165, 233, calc(var(--orb-1-opacity) * 0.037)) 50%,
                    rgba(14, 165, 233, calc(var(--orb-1-opacity) * 0.019)) 55%,
                    rgba(14, 165, 233, calc(var(--orb-1-opacity) * 0.008)) 60%,
                    rgba(14, 165, 233, calc(var(--orb-1-opacity) * 0.002)) 65%,
                    rgba(14, 165, 233, calc(var(--orb-1-opacity) * 0.0003)) 70%,
                    rgba(14, 165, 233, 0) 75%,
                    rgba(14, 165, 233, 0) 100%
                );
                animation: float-orb-1 var(--orb-1-duration) ease-in-out infinite alternate;
            }

            /* Orb 2 Ocean Blue */
            body::before {
                width: 62vmax;
                height: 62vmax;
                bottom: -10%; right: -10%;
                background: radial-gradient(
                    circle at center,
                    rgba(2, 132, 199, var(--orb-2-opacity)) 0%,
                    rgba(2, 132, 199, calc(var(--orb-2-opacity) * 0.812)) 5%,
                    rgba(2, 132, 199, calc(var(--orb-2-opacity) * 0.652)) 10%,
                    rgba(2, 132, 199, calc(var(--orb-2-opacity) * 0.512)) 15%,
                    rgba(2, 132, 199, calc(var(--orb-2-opacity) * 0.394)) 20%,
                    rgba(2, 132, 199, calc(var(--orb-2-opacity) * 0.296)) 25%,
                    rgba(2, 132, 199, calc(var(--orb-2-opacity) * 0.216)) 30%,
                    rgba(2, 132, 199, calc(var(--orb-2-opacity) * 0.151)) 35%,
                    rgba(2, 132, 199, calc(var(--orb-2-opacity) * 0.102)) 40%,
                    rgba(2, 132, 199, calc(var(--orb-2-opacity) * 0.064)) 45%,
                    rgba(2, 132, 199, calc(var(--orb-2-opacity) * 0.037)) 50%,
                    rgba(2, 132, 199, calc(var(--orb-2-opacity) * 0.019)) 55%,
                    rgba(2, 132, 199, calc(var(--orb-2-opacity) * 0.008)) 60%,
                    rgba(2, 132, 199, calc(var(--orb-2-opacity) * 0.002)) 65%,
                    rgba(2, 132, 199, calc(var(--orb-2-opacity) * 0.0003)) 70%,
                    rgba(2, 132, 199, 0) 75%,
                    rgba(2, 132, 199, 0) 100%
                );
                animation: float-orb-2 var(--orb-2-duration) ease-in-out infinite alternate;
            }

            /* Orb 3 Slate Blue */
            body::after {
                width: 68vmax;
                height: 68vmax;
                top: 20%; left: -15%;
                background: radial-gradient(
                    circle at center,
                    rgba(12, 143, 214, var(--orb-3-opacity)) 0%,
                    rgba(12, 143, 214, calc(var(--orb-3-opacity) * 0.812)) 5%,
                    rgba(12, 143, 214, calc(var(--orb-3-opacity) * 0.652)) 10%,
                    rgba(12, 143, 214, calc(var(--orb-3-opacity) * 0.512)) 15%,
                    rgba(12, 143, 214, calc(var(--orb-3-opacity) * 0.394)) 20%,
                    rgba(12, 143, 214, calc(var(--orb-3-opacity) * 0.296)) 25%,
                    rgba(12, 143, 214, calc(var(--orb-3-opacity) * 0.216)) 30%,
                    rgba(12, 143, 214, calc(var(--orb-3-opacity) * 0.151)) 35%,
                    rgba(12, 143, 214, calc(var(--orb-3-opacity) * 0.102)) 40%,
                    rgba(12, 143, 214, calc(var(--orb-3-opacity) * 0.064)) 45%,
                    rgba(12, 143, 214, calc(var(--orb-3-opacity) * 0.037)) 50%,
                    rgba(12, 143, 214, calc(var(--orb-3-opacity) * 0.019)) 55%,
                    rgba(12, 143, 214, calc(var(--orb-3-opacity) * 0.008)) 60%,
                    rgba(12, 143, 214, calc(var(--orb-3-opacity) * 0.002)) 65%,
                    rgba(12, 143, 214, calc(var(--orb-3-opacity) * 0.0003)) 70%,
                    rgba(12, 143, 214, 0) 75%,
                    rgba(12, 143, 214, 0) 100%
                );
                animation: float-orb-3 var(--orb-3-duration) ease-in-out infinite alternate;
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
        `);

        // Inject JS to dynamically find the exact sidebar and topbar elements by content and structure
        win.webContents.executeJavaScript(`
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
                                // If chatBox is removed from DOM, hide SVG
                                svg.style.display = 'none';
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
