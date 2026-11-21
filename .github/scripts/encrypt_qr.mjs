// Lock the QR code generator (qr.html) with the password in the QR_PAGE_PASSWORD secret.
//
// Run by .github/workflows/static.yml each time the site is published. It reads the tool
// from .github/private/ (never published), encrypts it with AES-256-GCM using a key made
// from the password (PBKDF2-SHA256, 600,000 rounds, random salt), and puts only the
// encrypted text into qr.html. The browser needs the password to turn it back into the tool.
//
// If the secret is missing, qr.html stays locked with nothing inside, and the deploy carries on.
// Uses only Node's built-in crypto, so nothing needs installing.
import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes, pbkdf2Sync, createCipheriv } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const priv = join(root, ".github", "private");
const page = join(root, "qr.html");
const START = "<!-- QR:PAYLOAD -->", END = "<!-- /QR:PAYLOAD -->";
const ITER = 600000;

let html = readFileSync(page, "utf8");
if (!html.includes(START) || !html.includes(END)) {
  console.error("qr.html is missing the QR:PAYLOAD markers");
  process.exit(1);
}

const password = process.env.QR_PAGE_PASSWORD || "";
let block = "";
if (!password) {
  console.log("QR_PAGE_PASSWORD secret is not set: qr.html published locked and empty.");
} else {
  const logo = "data:image/svg+xml;base64," + readFileSync(join(priv, "mpa-logo-dove.svg")).toString("base64");
  const tool = readFileSync(join(priv, "qr-tool.html"), "utf8")
    .replaceAll("{{QRLIB}}", () => readFileSync(join(priv, "qrlib.min.js"), "utf8"))
    .replaceAll("{{LOGO}}", () => logo);
  if (/\{\{(QRLIB|LOGO)\}\}/.test(tool)) { console.error("qr-tool.html still has a placeholder"); process.exit(1); }
  const salt = randomBytes(16), iv = randomBytes(12);
  const key = pbkdf2Sync(password.normalize("NFC"), salt, ITER, 32, "sha256");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(tool, "utf8"), cipher.final(), cipher.getAuthTag()]);
  const data = { v: 1, iter: ITER, salt: salt.toString("base64"), iv: iv.toString("base64"), ct: ct.toString("base64") };
  block = '<script type="application/json" id="qr-payload">' + JSON.stringify(data) + "</script>";
  console.log(`qr.html: tool encrypted (${Math.round(ct.length / 1024)} KB).`);
}

const a = html.indexOf(START) + START.length, b = html.indexOf(END);
writeFileSync(page, html.slice(0, a) + block + html.slice(b));
