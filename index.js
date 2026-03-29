// index.js - Prueba IA Gemini
const { makeWASocket, useMultiFileAuthState, Browsers, fetchLatestWaWebVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const OWNER_NUMBER = '3218950565';
const SPECIAL_ADMIN = '573052274793';

let currentPersonality = "Eres un bot amigable, útil y con sentido del humor llamado Grok. Responde siempre en español de forma natural y clara.";

const genAI = new GoogleGenerativeAI("AIzaSyC34l_BF3qbPTT5YoHSLrHbawuDgcuUW6M"); // Tu clave

console.log("🚀 Iniciando bot con Gemini...");

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
        const { connection, qr } = update;
        if (qr) qrcode.generate(qr, { small: true });
        if (connection === 'open') {
            console.log('\n🎉 BOT CONECTADO');
            console.log('💬 Escribe cualquier cosa en privado para probar la IA');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            if (!msg.message || msg.key.fromMe) continue;

            const from = msg.key.remoteJid || '';
            const isGroup = from.endsWith('@g.us');

            let text = msg.message.conversation || 
                       msg.message.extendedTextMessage?.text || 
                       msg.message.imageMessage?.caption || '';

            if (!text) continue;

            console.log(`\n📥 Mensaje de ${from}: "${text}"`);

            if (isGroup) continue; // Solo IA en privado por ahora

            if (text.startsWith('.')) {
                const args = text.slice(1).trim().split(/\s+/);
                const cmdName = args.shift().toLowerCase();

                if (cmdName === 'personalidad') {
                    currentPersonality = args.join(' ');
                    await sock.sendMessage(from, { text: `✅ Personalidad actualizada.` });
                    console.log(`✅ Nueva personalidad: ${currentPersonality}`);
                    return;
                }
                continue;
            }

            // IA Real
            console.log(`🤖 Llamando a Gemini...`);
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

                const prompt = `${currentPersonality}\n\nUsuario: ${text}\n\nRespuesta natural y útil:`;

                const result = await model.generateContent(prompt);
                const responseText = result.response.text();

                await sock.sendMessage(from, { text: responseText });
                console.log(`✅ Respuesta Gemini enviada`);
            } catch (error) {
                console.error("❌ Error Gemini:", error.message);
                await sock.sendMessage(from, { text: "❌ Error con la IA. Verifica la API Key." });
            }
        }
    });
}

connectToWhatsApp().catch(err => console.error('❌ Error fatal:', err));