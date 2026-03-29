// auto-push.js - Actualización automática cada 1 minuto
const { exec } = require('child_process');
const path = require('path');

const projectPath = path.resolve(__dirname);

console.log(`[${new Date().toLocaleString()}] 🔄 Auto-push iniciado (cada 1 minuto)`);

function runCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, { cwd: projectPath }, (error, stdout, stderr) => {
            if (error && !stdout.includes("nothing to commit")) {
                reject(error);
                return;
            }
            resolve((stdout || stderr || "").trim());
        });
    });
}

async function autoPush() {
    try {
        await runCommand('git add .');

        const status = await runCommand('git status --porcelain');

        if (!status) {
            // Silencioso cuando no hay cambios
            return;
        }

        const timestamp = new Date().toLocaleString('es-CO');
        await runCommand(`git commit -m "Auto-update: ${timestamp}"`);

        await runCommand('git push origin main');

        console.log(`[${new Date().toLocaleString()}] ✅ Cambios subidos correctamente a GitHub`);

    } catch (error) {
        if (!error.message.includes("nothing to commit")) {
            console.error(`[${new Date().toLocaleString()}] ❌ Error:`, error.message);
        }
    }
}

// Ejecutar inmediatamente
autoPush();

// Ejecutar cada 1 minuto (60000 milisegundos)
setInterval(autoPush, 60 * 1000);

console.log(`[${new Date().toLocaleString()}] ⏰ Auto-push configurado cada 1 minuto`);