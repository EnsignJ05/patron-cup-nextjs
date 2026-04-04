import { generateTempPassword } from '@/lib/passwordUtils';

describe('generateTempPassword', () => {
  it('uses default length and charset when options are omitted', () => {
    const password = generateTempPassword({
      getRandomValues: (values) => {
        values.fill(0);
      },
    });

    expect(password).toHaveLength(12);
    expect(password).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('generates a password with the requested length and charset', () => {
    const getRandomValues = (values: Uint32Array) => {
      values.set([0, 1, 2, 0]);
    };

    const password = generateTempPassword({
      length: 4,
      chars: 'ABC',
      getRandomValues,
    });

    expect(password).toBe('ABCA');
  });

  it('falls back to Math.random when crypto is unavailable', () => {
    const originalCrypto = window.crypto;
    Object.defineProperty(window, 'crypto', { value: undefined, configurable: true });

    const password = generateTempPassword({ length: 4, chars: 'AB' });

    expect(password).toHaveLength(4);

    Object.defineProperty(window, 'crypto', { value: originalCrypto, configurable: true });
  });

  it('uses window.crypto when available', () => {
    const originalCrypto = window.crypto;
    const getRandomValues = jest.fn((values: Uint32Array) => values.set([1, 1, 1, 1]));
    Object.defineProperty(window, 'crypto', { value: { getRandomValues }, configurable: true });

    const password = generateTempPassword({ length: 4, chars: 'AB' });

    expect(getRandomValues).toHaveBeenCalled();
    expect(password).toBe('BBBB');

    Object.defineProperty(window, 'crypto', { value: originalCrypto, configurable: true });
  });
});
