// auto-push.js - Actualización automática inteligente a GitHub
const { exec } = require('child_process');
const path = require('path');

const projectPath = path.resolve(__dirname);

console.log(`[${new Date().toLocaleString()}] 🔄 Auto-push iniciado`);

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
        // 1. Asegurarnos que el .gitignore esté presente y actualizado
        await runCommand('git add .gitignore');

        // 2. Agregar solo los archivos importantes (respetando .gitignore)
        await runCommand('git add .');

        // 3. Verificar si realmente hay cambios
        const status = await runCommand('git status --porcelain');

        if (!status) {
            // Silencioso cuando no hay cambios
            return;
        }

        // 4. Commit con mensaje claro
        const timestamp = new Date().toLocaleString('es-CO');
        await runCommand(`git commit -m "Auto-update: ${timestamp}"`);

        // 5. Push a GitHub
        await runCommand('git push origin main');

        console.log(`[${new Date().toLocaleString()}] ✅ Cambios subidos correctamente a GitHub`);

    } catch (error) {
        if (!error.message.includes("nothing to commit")) {
            console.error(`[${new Date().toLocaleString()}] ❌ Error:`, error.message);
        }
    }
}

// Ejecutar inmediatamente al iniciar
autoPush();

// Ejecutar cada 5 minutos
setInterval(autoPush, 5 * 60 * 1000);

console.log(`[${new Date().toLocaleString()}] ⏰ Auto-push configurado cada 5 minutos (solo sube cambios reales)`);