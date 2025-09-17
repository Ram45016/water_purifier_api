// utils/caseConverter.js
function toSnakeCaseKey(key) {
  return key.replace(/([A-Z])/g, "_$1").toLowerCase();
}

function toSnakeCase(obj) {
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  } else if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [toSnakeCaseKey(k), toSnakeCase(v)])
    );
  }
  return obj;
}

module.exports = { toSnakeCase };
