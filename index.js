// index.js - Bot WhatsApp Modular (Versión Anti-Conflicto 2026)
const { makeWASocket, DisconnectReason, useMultiFileAuthState, Browsers, fetchLatestWaWebVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const OWNER_NUMBER = '3218950565';
const ONLY_OWNER = true;

const commands = {};
const commandsPath = path.join(__dirname, 'comandos');

if (!fs.existsSync(commandsPath)) fs.mkdirSync(commandsPath);

fs.readdirSync(commandsPath).forEach(file => {
    if (file.endsWith('.js')) {
        try {
            const cmd = require(path.join(commandsPath, file));
            if (cmd.command && typeof cmd.handler === 'function') {
                commands[cmd.command.toLowerCase()] = cmd.handler;
                console.log(`✅ Comando cargado: .${cmd.command}`);
            }
        } catch (err) {
            console.error(`❌ Error cargando ${file}`);
        }
    }
});

let reconnectAttempts = 0;
const MAX_RECONNECTS = 3;

async function connectToWhatsApp() {
    if (reconnectAttempts >= MAX_RECONNECTS) {
        console.log('❌ Demasiados intentos de reconexión. Borra la carpeta auth_info_baileys manualmente y ejecuta de nuevo.');
        return;
    }

    reconnectAttempts++;

    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestWaWebVersion().catch(() => ({ version: [2, 3000, 1036203775] }));

    console.log(`\n📡 Intento ${reconnectAttempts} - Usando WhatsApp Web v${version.join('.')}`);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.macOS('Chrome'),
        version,
        markOnlineOnConnect: true,
        // Opciones anti-conflicto
        retryRequestDelayMs: 500,
        connectTimeoutMs: 60000,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n🔗 ESCANEA ESTE QR CON WHATSAPP:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
            console.log('\n🎉 ¡BOT CONECTADO CORRECTAMENTE Y EN LÍNEA!');
            console.log('📱 Ahora abre WhatsApp → Chat contigo mismo y envía: .ping');
            reconnectAttempts = 0; // Resetear contador
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log(`❌ Conexión cerrada (código: ${statusCode || 'desconocido'})`);

            if (statusCode === 401 || statusCode === 440 || statusCode === 515) {
                console.log('⚠️ Error de conflicto. Esperando 8 segundos antes de reconectar...');
                setTimeout(connectToWhatsApp, 8000);
            } else if (statusCode !== DisconnectReason.loggedOut) {
                console.log('🔄 Reconectando en 5 segundos...');
                setTimeout(connectToWhatsApp, 5000);
            } else {
                console.log('⚠️ Sesión cerrada permanentemente.');
            }
        }
    });

    // Procesador de mensajes
    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            if (msg.key.fromMe || !msg.message) continue;

            const from = msg.key.remoteJid;
            let text = '';

            const m = msg.message;
            if (m.conversation) text = m.conversation;
            else if (m.extendedTextMessage?.text) text = m.extendedTextMessage.text;
            else if (m.imageMessage?.caption) text = m.imageMessage.caption;

            if (!text || !text.startsWith('.')) continue;

            console.log(`\n📨 MENSAJE RECIBIDO → "${text}" desde ${from}`);

            if (ONLY_OWNER && !from.includes(OWNER_NUMBER)) {
                console.log('   🚫 Ignorado (solo owner)');
                continue;
            }

            const args = text.slice(1).trim().split(/\s+/);
            const cmdName = args.shift().toLowerCase();

            const handler = commands[cmdName];
            if (handler) {
                console.log(`   🔥 Ejecutando .${cmdName}`);
                try {
                    await handler(sock, msg, args);
                    console.log(`   ✅ .${cmdName} ejecutado correctamente`);
                } catch (err) {
                    console.error(`   ❌ Error:`, err.message);
                }
            } else {
                console.log(`   ❓ Comando ".${cmdName}" no encontrado`);
            }
        }
    });
}

connectToWhatsApp().catch(err => {
    console.error('❌ Error fatal:', err);
});