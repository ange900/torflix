const CryptoJS = require('crypto-js');

const KEY = process.env.ENCRYPTION_KEY || 'default_32_char_encryption_key!!';

function encrypt(text) {
  return CryptoJS.AES.encrypt(text, KEY).toString();
}

function decrypt(cipherText) {
  const bytes = CryptoJS.AES.decrypt(cipherText, KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

module.exports = { encrypt, decrypt };
