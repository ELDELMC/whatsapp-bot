// comandos/ping.js
module.exports = {
  command: 'ping',
  handler: async (sock, msg) => {
    const from = msg.key.remoteJid;

    await sock.sendMessage(from, {
      text: '🏓 Pong!\n\n✅ El bot está funcionando correctamente.\n¡Listo para recibir más comandos!'
    });

    console.log(`✅ Comando .ping respondido a ${from}`);
  }
};