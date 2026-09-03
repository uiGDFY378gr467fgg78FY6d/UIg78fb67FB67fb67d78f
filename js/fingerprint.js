// fingerprint.js - Снятие аппаратного отпечатка устройства (Canvas, WebGL, AudioContext, Screen, LocalStorage)
async function getDeviceFingerprint() {
    const components = {};

    // 1. Скрытый локальный токен в LocalStorage
    let localToken = localStorage.getItem("_carmone_did");
    if (!localToken) {
        localToken = "did_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem("_carmone_did", localToken);
    }
    components.localToken = localToken;

    // 2. Данные экрана и среды
    components.screen = {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        pixelRatio: window.devicePixelRatio || 1
    };
    components.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    components.language = navigator.language || navigator.userLanguage;
    components.platform = navigator.platform;
    components.hardwareConcurrency = navigator.hardwareConcurrency || "unknown";

    // 3. Canvas Fingerprint
    try {
        const canvas = document.createElement("canvas");
        canvas.width = 200;
        canvas.height = 50;
        const ctx = canvas.getContext("2d");
        ctx.textBaseline = "top";
        ctx.font = "14px 'Arial'";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("CarMone_ModStore_v2", 2, 15);
        ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
        ctx.fillText("CarMone_ModStore_v2", 4, 17);
        components.canvas = canvas.toDataURL();
    } catch (e) {
        components.canvas = "unsupported";
    }

    // 4. WebGL Fingerprint (Параметры GPU)
    try {
        const glCanvas = document.createElement("canvas");
        const gl = glCanvas.getContext("webgl") || glCanvas.getContext("experimental-webgl");
        if (gl) {
            const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
            components.webglVendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : "unknown";
            components.webglRenderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "unknown";
        }
    } catch (e) {
        components.webglRenderer = "unsupported";
    }

    // 5. AudioContext Fingerprint
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            const audioCtx = new AudioContext();
            components.audioSampleRate = audioCtx.sampleRate;
            audioCtx.close();
        }
    } catch (e) {
        components.audioSampleRate = "unsupported";
    }

    // Генерация SHA-256 хеша от собранных компонентов
    const rawString = JSON.stringify(components);
    const msgBuffer = new TextEncoder().encode(rawString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fingerprintHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    return {
        fingerprint: fingerprintHash,
        components: components
    };
}

window.getDeviceFingerprint = getDeviceFingerprint;
