// comandos/admin.js - Todos los comandos de administración (Versión Final Mejorada)
module.exports = {
  command: 'admin',
  handler: async (sock, msg, args) => {
    const from = msg.key.remoteJid;

    if (!from.endsWith('@g.us')) {
      return await sock.sendMessage(from, { text: '❌ Este comando solo funciona en grupos.' });
    }

    try {
      const groupMetadata = await sock.groupMetadata(from);

      // Detección robusta del bot como administrador
      const botNumber = '573218950565';
      const botLID = '244954936958986';

      const possibleBotJids = [
        sock.user.id,
        `${botNumber}:5@s.whatsapp.net`,
        `${botNumber}@s.whatsapp.net`,
        `${botLID}:5@lid`,
        `${botLID}@lid`
      ];

      const isBotAdmin = groupMetadata.participants.some(p => 
        possibleBotJids.includes(p.id) && (p.admin === 'admin' || p.admin === 'superadmin')
      );

      if (!isBotAdmin) {
        return await sock.sendMessage(from, { 
          text: '❌ El bot no es administrador del grupo.\n\nPor favor, dale permisos de administrador primero.' 
        });
      }

      // Verificar si quien ejecuta el comando es administrador
      const sender = msg.key.participant || msg.key.remoteJid;
      const isSenderAdmin = groupMetadata.participants.some(p => 
        p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin')
      );

      if (!isSenderAdmin) {
        return await sock.sendMessage(from, { text: '❌ Solo los administradores del grupo pueden usar estos comandos.' });
      }

      // Extraer comando
      let text = msg.message?.conversation || 
                 msg.message?.extendedTextMessage?.text || 
                 msg.message?.imageMessage?.caption || '';

      const command = text.split(/\s+/)[0].toLowerCase().replace('.', '');

      // ==================== COMANDO .add (Mejorado) ====================
      if (command === 'add') {
        let target = null;
        const context = msg.message?.extendedTextMessage?.contextInfo;

        // 1. Responder a mensaje (incluso antiguo)
        if (context?.quotedMessage) {
          target = context.participant || context.quotedMessage?.participant;
        }
        // 2. Etiquetar con @
        else if (context?.mentionedJid?.length > 0) {
          target = context.mentionedJid[0];
        }
        // 3. Escribir número directamente (.add 573052274793)
        else if (args.length > 0) {
          let number = args[0].replace(/[^0-9]/g, '');
          if (number.length > 8) {
            target = number + '@s.whatsapp.net';
          }
        }

        if (!target) {
          return await sock.sendMessage(from, { 
            text: '❌ Usa uno de estos métodos:\n' +
                  '• Responde a un mensaje antiguo\n' +
                  '• Etiqueta con @numero\n' +
                  '• Escribe .add 573052274793' 
          });
        }

        await sock.groupParticipantsUpdate(from, [target], "add");

        const adminTag = `@${sender.split('@')[0]}`;
        const userTag = `@${target.split('@')[0]}`;

        await sock.sendMessage(from, {
          text: `${userTag} ha sido **resucitado** por ${adminTag} 👻`,
          mentions: [target, sender]
        });

        return;
      }

      // ==================== COMANDOS RESTANTES ====================
      let target = null;
      const context = msg.message?.extendedTextMessage?.contextInfo;

      if (context?.quotedMessage) {
        target = context.participant;
      } else if (context?.mentionedJid?.length > 0) {
        target = context.mentionedJid[0];
      }

      if (command === 'ban' || command === 'kick') {
        if (!target) return await sock.sendMessage(from, { text: '❌ Responde o etiqueta al usuario.' });
        await sock.groupParticipantsUpdate(from, [target], "remove");
        await sock.sendMessage(from, { text: `✅ Usuario expulsado del grupo.` });
      }

      else if (command === 'admin' || command === 'promote') {
        if (!target) return await sock.sendMessage(from, { text: '❌ Responde o etiqueta al usuario.' });
        await sock.groupParticipantsUpdate(from, [target], "promote");
        await sock.sendMessage(from, { text: `✅ Usuario promovido a administrador.` });
      }

      else if (command === 'demote') {
        if (!target) return await sock.sendMessage(from, { text: '❌ Responde o etiqueta al usuario.' });
        await sock.groupParticipantsUpdate(from, [target], "demote");
        await sock.sendMessage(from, { text: `✅ Administrador removido.` });
      }

      else if (command === 'mute') {
        await sock.groupSettingUpdate(from, "announcement");
        await sock.sendMessage(from, { text: '🔇 Grupo silenciado. Solo admins pueden hablar.' });
      }

      else if (command === 'unmute') {
        await sock.groupSettingUpdate(from, "not_announcement");
        await sock.sendMessage(from, { text: '🔊 Grupo abierto. Todos pueden hablar.' });
      }

      else if (command === 'del' || command === 'delete') {
        const quotedId = context?.stanzaId;
        if (quotedId) await sock.sendMessage(from, { delete: { id: quotedId, remoteJid: from, fromMe: false } });
      }

      else if (command === 'tagall') {
        const mentions = groupMetadata.participants.map(p => p.id);
        await sock.sendMessage(from, { text: '📢 *Mención general*', mentions: mentions });
      }

      else if (command === 'link') {
        const code = await sock.groupInviteCode(from);
        await sock.sendMessage(from, { text: `🔗 https://chat.whatsapp.com/${code}` });
      }

      else if (command === 'revoke') {
        await sock.groupRevokeInvite(from);
        await sock.sendMessage(from, { text: '✅ Enlace revocado.' });
      }

      else if (command === 'info') {
        const admins = groupMetadata.participants
          .filter(p => p.admin)
          .map(p => `• @${p.id.split('@')[0]}`)
          .join('\n') || 'Ninguno';

        await sock.sendMessage(from, {
          text: `📊 *Info del Grupo*\nNombre: ${groupMetadata.subject}\nMiembros: ${groupMetadata.participants.length}\n\n👑 *Admins:*\n${admins}`,
          mentions: groupMetadata.participants.filter(p => p.admin).map(p => p.id)
        });
      }

    } catch (error) {
      console.error('Error en admin.js:', error);
      await sock.sendMessage(from, { text: '❌ Error al ejecutar el comando.' });
    }
  }
};