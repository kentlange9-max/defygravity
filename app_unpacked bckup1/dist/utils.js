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
                color: backgroundColor,
                symbolColor: foregroundColor,
                height: 30,
            },
        backgroundColor,
        trafficLightPosition: { x: 12, y: 12 },
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path_1.default.join(__dirname, 'preload.js'),
            devTools: !electron_1.app.isPackaged,
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
        win.webContents.insertCSS(`
            :root {
                --background: transparent !important;
            }
            html, body, #root, #app, main, .bg-background {
                background-color: transparent !important;
            }
            
            /* Root setup with base dark grayish-black */
            html {
                background-color: #121212 !important;
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

            /* 3 subtle floating blue orbs */
            html::before, body::before, body::after {
                content: "";
                position: fixed;
                border-radius: 50%;
                pointer-events: none;
                z-index: -2; 
                mix-blend-mode: screen; 
                will-change: transform;
            }

            /* Orb 1 Sky Blue */
            html::before {
                width: 75vmax;
                height: 75vmax;
                top: -10%; left: -10%;
                background: radial-gradient(
                    circle at center,
                    rgba(14, 165, 233, 0.450) 0%,
                    rgba(14, 165, 233, 0.365) 5%,
                    rgba(14, 165, 233, 0.293) 10%,
                    rgba(14, 165, 233, 0.230) 15%,
                    rgba(14, 165, 233, 0.177) 20%,
                    rgba(14, 165, 233, 0.133) 25%,
                    rgba(14, 165, 233, 0.097) 30%,
                    rgba(14, 165, 233, 0.068) 35%,
                    rgba(14, 165, 233, 0.046) 40%,
                    rgba(14, 165, 233, 0.029) 45%,
                    rgba(14, 165, 233, 0.017) 50%,
                    rgba(14, 165, 233, 0.009) 55%,
                    rgba(14, 165, 233, 0.004) 60%,
                    rgba(14, 165, 233, 0.001) 65%,
                    rgba(14, 165, 233, 0.000) 70%,
                    rgba(14, 165, 233, 0) 75%,
                    rgba(14, 165, 233, 0) 100%
                );
                animation: float-orb-1 120s ease-in-out infinite alternate;
            }

            /* Orb 2 Ocean Blue */
            body::before {
                width: 62vmax;
                height: 62vmax;
                bottom: -10%; right: -10%;
                background: radial-gradient(
                    circle at center,
                    rgba(2, 132, 199, 0.380) 0%,
                    rgba(2, 132, 199, 0.309) 5%,
                    rgba(2, 132, 199, 0.248) 10%,
                    rgba(2, 132, 199, 0.195) 15%,
                    rgba(2, 132, 199, 0.150) 20%,
                    rgba(2, 132, 199, 0.112) 25%,
                    rgba(2, 132, 199, 0.082) 30%,
                    rgba(2, 132, 199, 0.057) 35%,
                    rgba(2, 132, 199, 0.039) 40%,
                    rgba(2, 132, 199, 0.024) 45%,
                    rgba(2, 132, 199, 0.014) 50%,
                    rgba(2, 132, 199, 0.007) 55%,
                    rgba(2, 132, 199, 0.003) 60%,
                    rgba(2, 132, 199, 0.001) 65%,
                    rgba(2, 132, 199, 0.000) 70%,
                    rgba(2, 132, 199, 0) 75%,
                    rgba(2, 132, 199, 0) 100%
                );
                animation: float-orb-2 160s ease-in-out infinite alternate;
            }

            /* Orb 3 Slate Blue */
            body::after {
                width: 68vmax;
                height: 68vmax;
                top: 20%; left: -15%;
                background: radial-gradient(
                    circle at center,
                    rgba(12, 143, 214, 0.340) 0%,
                    rgba(12, 143, 214, 0.276) 5%,
                    rgba(12, 143, 214, 0.222) 10%,
                    rgba(12, 143, 214, 0.174) 15%,
                    rgba(12, 143, 214, 0.134) 20%,
                    rgba(12, 143, 214, 0.101) 25%,
                    rgba(12, 143, 214, 0.073) 30%,
                    rgba(12, 143, 214, 0.051) 35%,
                    rgba(12, 143, 214, 0.035) 40%,
                    rgba(12, 143, 214, 0.022) 45%,
                    rgba(12, 143, 214, 0.013) 50%,
                    rgba(12, 143, 214, 0.006) 55%,
                    rgba(12, 143, 214, 0.003) 60%,
                    rgba(12, 143, 214, 0.001) 65%,
                    rgba(12, 143, 214, 0.000) 70%,
                    rgba(12, 143, 214, 0) 75%,
                    rgba(12, 143, 214, 0) 100%
                );
                animation: float-orb-3 140s ease-in-out infinite alternate;
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
                z-index: 9999;
                background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
                opacity: 0.024;
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

            /* Make sidebars and modal content glassmorphic but opaque enough to read */
            aside, nav, header, footer, [role="dialog"], .bg-card, .bg-popover {
                background-color: rgba(24, 24, 27, 0.75) !important; 
                backdrop-filter: blur(24px) !important;
                border-color: rgba(255, 255, 255, 0.1) !important;
            }
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
