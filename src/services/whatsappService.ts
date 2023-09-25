import fs from 'fs';
import path from 'path';
import pino from 'pino';
import { toDataURL } from 'qrcode';
import dirname from '../utils/dirname';
import * as ResponseUtil from '../utils/response';
import util from 'util';
import {
  makeWASocket,
  DisconnectReason,
  makeInMemoryStore,
  useMultiFileAuthState,
  delay,
  ChatUpdate,
  AuthenticationCreds,
} from '@whiskeysockets/baileys';
import { Response } from 'express';

interface SessionData {
  isLegacy: boolean;
  store: any; // Replace with the actual type of your store if possible
}

interface SessionMap {
  [sessionId: string]: SessionData;
}

const sessions: SessionMap = {};
const retries: Map<string, number> = new Map();

const sessionsDir = (sessionId: string = '') =>
  path.join(dirname, 'sessions', sessionId || '');

const isSessionExists = (sessionId: string): boolean => sessionId in sessions;

const shouldReconnect = (sessionId: string): boolean => {
  let maxRetries = parseInt(process.env.MAX_RETRIES || '0');
  let retriesCount = retries.get(sessionId) || 0;
  maxRetries = maxRetries < 1 ? 1 : maxRetries;

  if (retriesCount < maxRetries) {
    retriesCount++;
    console.log('Reconnecting...', { attempts: retriesCount, sessionId });
    retries.set(sessionId, retriesCount);
    return true;
  }

  return false;
};

const getSessionStatus = async (sessionId: string) => {
  try {
    const data = await util.promisify(fs.readFile)(
      `sessions/md_${sessionId}/creds.json`
    );

    let userdata = JSON.parse(data.toString());
    return {
      status: 'connected',
      user: userdata,
    };
  } catch {
    return {
      status: 'disconnected',
    };
  }
};

const createSession = async (
  sessionId: string,
  isLegacy = false,
  res?: Response
) => {
  const sessionFileName =
    (isLegacy ? 'legacy_' : 'md_') + sessionId + (isLegacy ? '.json' : '');
  const logger = pino({ level: 'warn' });
  const inMemoryStore = makeInMemoryStore({ logger });

  let auth: any;
  let saveCreds: any;

  if (isLegacy) {
    // Handle legacy logic
  } else {
    ({ state: auth, saveCreds } = await useMultiFileAuthState(
      sessionsDir(sessionFileName)
    ));
  }

  const clientOptions = {
    auth,
    printQRInTerminal: true,
    logger,
    browser: [
      process.env.APP_NAME || 'Whatsapp Api',
      'Chrome',
      '103.0.5060.114',
    ] as [string, string, string],
    patchMessageBeforeSending: (message: any) => {
      const isButtonsMessage = !!(
        message.buttonsMessage || message.listMessage
      );

      if (isButtonsMessage) {
        message = {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadataVersion: 0x2,
                deviceListMetadata: {},
              },
              ...message,
            },
          },
        };
      }

      return message;
    },
  };

  const client = makeWASocket(clientOptions);

  if (!isLegacy) {
    inMemoryStore.readFromFile(sessionsDir(sessionId + '_store.json'));
    inMemoryStore.bind(client.ev);
  }

  sessions[sessionId] = { ...client, store: inMemoryStore, isLegacy };

  client.ev.on('creds.update', saveCreds);

  client.ev.on('messaging-history.set', ({ chats }) => {
    if (isLegacy) {
      inMemoryStore.chats.insertIfAbsent(...chats);
    }
  });

  client.ev.on('messages.update', async (message) => {
    // TODO:
  });

  client.ev.on('messages.upsert', async (message) => {
    try {
      const firstMessage = message.messages[0];
      if (firstMessage) {
        if (!firstMessage.key.fromMe && message.type === 'notify') {
          const webHookData: any = [];

          let conversation = firstMessage.message?.conversation ?? null;

          if (firstMessage?.message?.buttonsResponseMessage != null) {
            conversation =
              firstMessage.message.buttonsResponseMessage.selectedDisplayText ??
              null;
          }

          if (firstMessage.message?.listResponseMessage != null) {
            conversation =
              firstMessage.message.listResponseMessage.title ?? null;
          }

          const remoteJidParts = firstMessage.key.remoteJid?.split('@');
          const remoteId = remoteJidParts?.at(1) || null;
          const isSWhatsApp = !(remoteId == 's.whatsapp.net');

          if (conversation !== '' && !isSWhatsApp) {
            webHookData.remote_id = firstMessage.key.remoteJid;
            webHookData.sessionId = sessionId;
            webHookData.message_id = firstMessage.key.id;
            webHookData.message = conversation;
            // TODO: send webhook
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
  });

  client.ev.on('connection.update', async (update: any) => {
    const { connection, lastDisconnect }: any = update;
    const statusCode = lastDisconnect?.['error']?.['output']?.['statusCode'];

    if (connection === 'open') {
      retries.delete(sessionId);
    }

    if (connection === 'close') {
      if (
        statusCode === DisconnectReason.loggedOut ||
        !shouldReconnect(sessionId)
      ) {
        deleteSession(sessionId, isLegacy);
        if (res && !res.headersSent) {
          return ResponseUtil.badRequest({
            res,
            message: 'Unable to create session.',
          });
        }
      }

      setTimeout(
        () => {
          createSession(sessionId, isLegacy, res);
        },
        statusCode === DisconnectReason.restartRequired
          ? 0
          : parseInt(process.env.RECONNECT_INTERVAL || '5000')
      );
    }

    if (update.qr) {
      if (res && !res.headersSent) {
        try {
          const qr = await toDataURL(update.qr);
          return ResponseUtil.ok({
            res,
            message: 'QR code generated',
            data: {
              qr,
            },
          });
        } catch (error) {
          return ResponseUtil.internalError({
            res,
            message: 'Unable to create QR code.',
            err: error,
          });
        }
      }

      try {
        await client.logout();
      } catch {
      } finally {
        deleteSession(sessionId, isLegacy);
      }
    }
  });
};

const getSession = (sessionId: string) => sessions[sessionId] || null;

const deleteSession = (sessionId: string, isLegacy = false) => {
  const sessionFileName =
    (isLegacy ? 'legacy_' : 'md_') + sessionId + (isLegacy ? '.json' : '');
  const storeFileName = sessionId + '_store.json';
  const removeOptions = { force: true, recursive: true };

  fs.rmSync(sessionsDir(sessionFileName), removeOptions);
  fs.rmSync(sessionsDir(storeFileName), removeOptions);

  delete sessions[sessionId];
  retries.delete(sessionId);
  return true;
};

const getChatList = (sessionId: string, isGroup = false) => {
  const chatType = isGroup ? '@g.us' : '@s.whatsapp.net';
  const session = sessions[sessionId];

  if (session && session.store) {
    return session.store.chats.filter((chat: any) =>
      chat.id.endsWith(chatType)
    );
  }

  return []; // or handle the case where session or session.store is null
};

const isExists = async (client: any, chatId: string, isGroup = false) => {
  try {
    let chatInfo: any;

    if (isGroup) {
      chatInfo = await client.groupMetadata(chatId);
      return Boolean(chatInfo.id);
    }

    if (client.isLegacy) {
      chatInfo = await client.onWhatsApp(chatId);
    } else {
      chatInfo = await client.getChatInfo(chatId);
    }

    return chatInfo.exists;
  } catch {
    return false;
  }
};

const sendMessage = async (
  client: any,
  chatId: string,
  message: string,
  delayTime = 5
) => {
  try {
    return client.sendMessage(chatId, message);
  } catch (err) {
    return Promise.reject(null);
  }
};

const formatPhone = (phoneNumber: string) => {
  if (phoneNumber.toString().endsWith('@s.whatsapp.net')) {
    return phoneNumber;
  }

  const cleanedPhoneNumber = phoneNumber.replace(/\D/g, '');
  return cleanedPhoneNumber + '@s.whatsapp.net';
};

const formatGroup = (groupId: string) => {
  if (groupId.toString().endsWith('@g.us')) {
    return groupId;
  }

  const cleanedGroupId = groupId.replace(/[^\d-]/g, '');
  return cleanedGroupId + '@g.us';
};

const cleanup = () => {
  console.log('Running cleanup before exit.');
  Object.keys(sessions).forEach((sessionId) => {
    const session = sessions[sessionId];
    if (session && !session.isLegacy && session.store) {
      session.store.writeToFile(sessionsDir(sessionId + '_store.json'));
    }
  });
};

const init = () => {
  // check if sessionsFolder not exists then create it
  if (!fs.existsSync(sessionsDir())) {
    fs.mkdirSync(sessionsDir());
  }

  fs.readdirSync(sessionsDir()).forEach((fileName) => {
    if (
      !(fileName.startsWith('md_') || fileName.startsWith('legacy_')) ||
      fileName.endsWith('_store')
    ) {
      return;
    }

    const parts = fileName.replace('.json', '').split('_');
    const isLegacy = parts[0] !== 'md';
    const sessionId = isLegacy
      ? parts.slice(2).join('_')
      : parts.slice(1).join('_');

    createSession(sessionId, isLegacy);
  });
};

const getSessionAndCheckStatus = async (sender: string, res: Response) => {
  const sessionStatus = await getSessionStatus(sender);
  if (sessionStatus.status === 'disconnected') {
    return ResponseUtil.badRequest({
      res,
      message: 'Session not connected',
    });
  }
  return getSession(sender);
};

export {
  isSessionExists,
  createSession,
  getSession,
  deleteSession,
  getChatList,
  isExists,
  sendMessage,
  formatPhone,
  formatGroup,
  cleanup,
  init,
  getSessionStatus,
  getSessionAndCheckStatus,
};
