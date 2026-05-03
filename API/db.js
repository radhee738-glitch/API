const { Pool } = require('pg');
const { URLSearchParams } = require('url');

let connectionString = process.env.DATABASE_URL;
const poolConfig = {
  connectionString
};

const hasSslMode = /(sslmode=(require|prefer|verify-ca))/i.test(connectionString || '');
if (hasSslMode && !/uselibpqcompat=/i.test(connectionString)) {
  const separator = connectionString.includes('?') ? '&' : '?';
  connectionString = `${connectionString}${separator}uselibpqcompat=true`;
  poolConfig.connectionString = connectionString;
}

const useSsl =
  process.env.DB_SSL === 'true' ||
  /(sslmode=(require|prefer|verify-full|verify-ca))/i.test(connectionString || '');

if (useSsl) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect()
};
