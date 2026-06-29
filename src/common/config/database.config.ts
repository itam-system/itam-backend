import { registerAs } from '@nestjs/config';

export function buildMongoUrl(): string {
  const host = process.env.MONGODB_HOST || 'localhost';
  const authDb = process.env.MONGODB_AUTH_DB;
  const dbName = process.env.MONGODB_DB || 'itam_db';
  const user = process.env.MONGODB_USER;
  const pwd = process.env.MONGODB_PWD;
  const replicaSet = process.env.MONGODB_REPLICA_SET;

  let credentials = '';
  if (user && pwd) {
    const encodedUser = encodeURIComponent(user);
    const encodedPwd = encodeURIComponent(pwd);
    credentials = `${encodedUser}:${encodedPwd}@`;
  }

  const queryParams: string[] = [];
  if (authDb) {
    queryParams.push(`authSource=${authDb}`);
  }
  if (replicaSet) {
    queryParams.push(`replicaSet=${replicaSet}`);
  }

  const queryStr = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
  const protocol = host.startsWith('mongodb://') || host.startsWith('mongodb+srv://') ? '' : 'mongodb://';

  return `${protocol}${credentials}${host}/${dbName}${queryStr}`;
}

if (!process.env.DATABASE_URL && process.env.MONGODB_HOST) {
  process.env.DATABASE_URL = buildMongoUrl();
}

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL || 'mongodb://localhost:27017/itam_db',
}));
