// comandos/ping.js
module.exports = {
  command: 'ping',                    // Nombre del comando (sin el punto)
  handler: async (sock, msg, args) => {
    const from = msg.key.remoteJid;   // Número o grupo que envió el mensaje

    await sock.sendMessage(from, {
      text: '🏓 Pong!\n\n✅ El bot está funcionando correctamente.\n¡Listo para añadir más comandos!'
    });

    console.log(`✅ Comando .ping ejecutado desde ${from}`);
  }
};