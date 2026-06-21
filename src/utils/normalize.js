const SIMPLE_PUNCTUATION_REGEX = /[!"#$%&'()*+,./:;<=>?@[\\\]^_`{|}~-]/g;
const WHITESPACE_REGEX = /\s+/g;

function normalizeText(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value)
    .trim()
    .toLowerCase()
    .replace(SIMPLE_PUNCTUATION_REGEX, " ")
    .replace(WHITESPACE_REGEX, " ")
    .trim();
}

module.exports = {
  normalizeText,
};
