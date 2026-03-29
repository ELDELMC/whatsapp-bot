// index.js - Bot WhatsApp (Versión Corregida - Permisos + IA en Privado)
const { makeWASocket, DisconnectReason, useMultiFileAuthState, Browsers, fetchLatestWaWebVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const OWNER_NUMBER = '3218950565';
const SPECIAL_ADMIN = '573052274793';
const OWNER_LID = '244954936958986';   // Tu LID

let currentPersonality = "Eres un bot amigable, útil y con sentido del humor llamado Grok. Responde siempre en español de forma natural y clara.";

const commands = {};
const commandsPath = path.join(__dirname, 'comandos');

if (!fs.existsSync(commandsPath)) fs.mkdirSync(commandsPath);

// Carga de comandos
fs.readdirSync(commandsPath).forEach(file => {
    if (file.endsWith('.js')) {
        try {
            const cmdModule = require(path.join(commandsPath, file));

            if (file === 'admin.js' && typeof cmdModule.handler === 'function') {
                const adminCommands = ['admin', 'promote', 'ban', 'kick', 'demote', 'mute', 'unmute', 'del', 'delete', 'tagall', 'link', 'revoke', 'info', 'add'];
                adminCommands.forEach(cmdName => {
                    commands[cmdName] = cmdModule.handler;
                    console.log(`✅ Comando cargado: .${cmdName}`);
                });
            } else if (cmdModule.command && typeof cmdModule.handler === 'function') {
                const cmdName = cmdModule.command.toLowerCase();
                commands[cmdName] = cmdModule.handler;
                console.log(`✅ Comando cargado: .${cmdName}`);
            }
        } catch (err) {
            console.error(`❌ Error cargando ${file}`);
        }
    }
});

console.log(`📊 Total comandos: ${Object.keys(commands).length}`);

// ==================== CONEXIÓN ====================
async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestWaWebVersion().catch(() => ({ version: [2, 3000, 1036203775] }));

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.macOS('Chrome'),
        version,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) qrcode.generate(qr, { small: true });

        if (connection === 'open') {
            console.log('\n🎉 BOT CONECTADO Y EN LÍNEA');
            console.log('💬 IA activada en chats privados');
        }

        if (connection === 'close') {
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                setTimeout(connectToWhatsApp, 5000);
            }
        }
    });

    // ==================== MENSAJES ====================
    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            if (!msg.message || msg.key.fromMe) continue;

            const from = msg.key.remoteJid || '';
            const isGroup = from.endsWith('@g.us');
            const sender = msg.key.participant || from;

            let text = msg.message.conversation || 
                       msg.message.extendedTextMessage?.text || 
                       msg.message.imageMessage?.caption || '';

            if (!text) continue;

            console.log(`\n📥 Mensaje | Grupo: ${isGroup} | De: ${sender} | Texto: "${text}"`);

            // ==================== IA EN CHATS PRIVADOS ====================
            if (!isGroup && text && !text.startsWith('.')) {
                console.log(`🤖 [IA] Respondiendo a mensaje privado`);
                const aiResponse = `${currentPersonality}\n\nUsuario dijo: "${text}"\n\nRespuesta:`;
                await sock.sendMessage(from, { text: aiResponse });
                console.log(`✅ [IA] Respuesta enviada`);
                continue;
            }

            // ==================== COMANDOS ====================
            if (text.startsWith('.')) {
                const args = text.slice(1).trim().split(/\s+/);
                const cmdName = args.shift().toLowerCase();

                console.log(`🔧 Comando detectado: .${cmdName} desde ${sender}`);

                // Permisos mejorados (número normal + LID)
                const isAuthorized = 
                    sender.includes(OWNER_NUMBER) || 
                    sender.includes(SPECIAL_ADMIN) || 
                    sender.includes(OWNER_LID) ||
                    isGroup;

                if (!isAuthorized) {
                    console.log(`❌ Ignorado - sin permisos`);
                    continue;
                }

                // Comando .personalidad
                if (cmdName === 'personalidad') {
                    if (args.length === 0) {
                        await sock.sendMessage(from, { text: '❌ Uso: .personalidad [nuevo prompt]' });
                        return;
                    }

                    currentPersonality = args.join(' ');
                    await sock.sendMessage(from, { 
                        text: `✅ Personalidad actualizada correctamente.\n\nNuevo prompt:\n"${currentPersonality}"` 
                    });
                    console.log(`✅ Personalidad cambiada`);
                    return;
                }

                // Otros comandos
                const handler = commands[cmdName];
                if (handler) {
                    try {
                        await handler(sock, msg, args);
                        console.log(`✅ Comando .${cmdName} ejecutado`);
                    } catch (err) {
                        console.error(`❌ Error en .${cmdName}:`, err.message);
                    }
                } else {
                    console.log(`❓ Comando no encontrado: .${cmdName}`);
                }
            }
        }
    });
}

connectToWhatsApp().catch(err => console.error('❌ Error fatal:', err));