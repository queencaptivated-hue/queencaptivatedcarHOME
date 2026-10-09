const { customAlphabet } = require('nanoid');

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);
function newId(prefix) {
  return `${prefix}_${nanoid()}`;
}

module.exports = { newId };
