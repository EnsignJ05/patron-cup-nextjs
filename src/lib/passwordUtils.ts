import { tempPasswordPolicy } from '@/lib/authConfig';

export function generateTempPassword(options?: {
  length?: number;
  chars?: string;
  getRandomValues?: (values: Uint32Array) => void;
}) {
  const length = options?.length ?? tempPasswordPolicy.length;
  const chars = options?.chars ?? tempPasswordPolicy.chars;
  const values = new Uint32Array(length);

  if (options?.getRandomValues) {
    options.getRandomValues(values);
  } else if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(values);
  } else {
    for (let i = 0; i < length; i += 1) {
      values[i] = Math.floor(Math.random() * chars.length);
    }
  }

  return Array.from(values, (value) => chars[value % chars.length]).join('');
}
