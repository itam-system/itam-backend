import { hash, compare } from 'bcryptjs';
import { BCRYPT_SALT_ROUNDS } from '../constants/app.constant.js';

export async function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_SALT_ROUNDS);
}

export async function comparePassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return compare(plainPassword, hashedPassword);
}
