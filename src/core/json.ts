// SPDX-License-Identifier: Apache-2.0

export const MAX_JSON_BYTES = 1_048_576;

export class GroundtrailParseError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
    public readonly offset?: number,
  ) {
    super(message);
    this.name = 'GroundtrailParseError';
  }
}

/** Checks JSON tokens before JSON.parse can discard duplicate keys or number spelling. */
export function inspectJson(text: string): void {
  if (Buffer.byteLength(text, 'utf8') > MAX_JSON_BYTES) {
    throw new GroundtrailParseError('GT_JSON_TOO_LARGE', 'JSON input exceeds the byte limit.');
  }
  if (hasLoneSurrogate(text)) {
    throw new GroundtrailParseError('GT_JSON_SURROGATE', 'JSON contains a lone UTF-16 surrogate.');
  }
  if (text.includes('\0')) {
    throw new GroundtrailParseError('GT_JSON_NUL', 'JSON input contains a NUL byte.');
  }

  let index = 0;
  const skipSpace = (): void => {
    while (/\s/u.test(text[index] ?? '')) index += 1;
  };
  const string = (): string => {
    const start = index;
    if (text[index] !== '"')
      throw new GroundtrailParseError('GT_JSON_SYNTAX', 'Expected string.', index);
    index += 1;
    while (index < text.length) {
      const character = text[index++];
      if (character === '"') {
        const token = text.slice(start, index);
        try {
          const decoded = JSON.parse(token) as string;
          if (hasLoneSurrogate(decoded))
            throw new GroundtrailParseError(
              'GT_JSON_SURROGATE',
              'JSON contains a lone UTF-16 surrogate.',
              start,
            );
          return decoded;
        } catch (error) {
          if (error instanceof GroundtrailParseError) throw error;
          throw new GroundtrailParseError('GT_JSON_SYNTAX', 'Invalid JSON string.', start);
        }
      }
      if (character === '\\') {
        const escaped = text[index++];
        if (escaped === undefined) break;
        if (escaped === 'u') index += 4;
      } else if (character !== undefined && character.charCodeAt(0) < 0x20) {
        throw new GroundtrailParseError(
          'GT_JSON_SYNTAX',
          'Control character in JSON string.',
          index - 1,
        );
      }
    }
    throw new GroundtrailParseError('GT_JSON_SYNTAX', 'Unterminated JSON string.', start);
  };
  const primitive = (): void => {
    const start = index;
    while (index < text.length && !/[\s,}\]]/u.test(text[index] ?? '')) index += 1;
    const token = text.slice(start, index);
    if (/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/u.test(token)) {
      assertSafeJsonNumber(token, start);
    } else if (!['true', 'false', 'null'].includes(token)) {
      throw new GroundtrailParseError('GT_JSON_SYNTAX', `Invalid JSON token ${token}.`, start);
    }
  };
  const value = (): void => {
    skipSpace();
    switch (text[index]) {
      case '{': {
        index += 1;
        const names = new Set<string>();
        skipSpace();
        if (text[index] === '}') {
          index += 1;
          return;
        }
        while (true) {
          skipSpace();
          const name = string();
          if (names.has(name))
            throw new GroundtrailParseError(
              'GT_JSON_DUPLICATE_KEY',
              `Duplicate JSON key: ${name}.`,
              index,
            );
          names.add(name);
          skipSpace();
          if (text[index++] !== ':')
            throw new GroundtrailParseError('GT_JSON_SYNTAX', 'Expected colon.', index - 1);
          value();
          skipSpace();
          if (text[index] === '}') {
            index += 1;
            return;
          }
          if (text[index++] !== ',')
            throw new GroundtrailParseError('GT_JSON_SYNTAX', 'Expected comma.', index - 1);
        }
      }
      case '[':
        index += 1;
        skipSpace();
        if (text[index] === ']') {
          index += 1;
          return;
        }
        while (true) {
          value();
          skipSpace();
          if (text[index] === ']') {
            index += 1;
            return;
          }
          if (text[index++] !== ',')
            throw new GroundtrailParseError('GT_JSON_SYNTAX', 'Expected comma.', index - 1);
        }
      case '"':
        string();
        return;
      default:
        primitive();
    }
  };
  value();
  skipSpace();
  if (index !== text.length)
    throw new GroundtrailParseError('GT_JSON_SYNTAX', 'Unexpected trailing JSON content.', index);
}

export function parseBoundedJson(input: Uint8Array | string): unknown {
  const text =
    typeof input === 'string' ? input : new TextDecoder('utf-8', { fatal: true }).decode(input);
  inspectJson(text);
  const parsed = JSON.parse(text) as unknown;
  if (containsLoneSurrogate(parsed))
    throw new GroundtrailParseError('GT_JSON_SURROGATE', 'JSON contains a lone UTF-16 surrogate.');
  return parsed;
}

function assertSafeJsonNumber(token: string, offset: number): void {
  if (token === '-0')
    throw new GroundtrailParseError(
      'GT_JSON_NEGATIVE_ZERO',
      'Negative zero is not permitted.',
      offset,
    );
  const number = Number(token);
  if (!Number.isFinite(number))
    throw new GroundtrailParseError('GT_JSON_NUMBER', 'JSON number must be finite.', offset);
  if (!/[.eE]/u.test(token) && !Number.isSafeInteger(number)) {
    throw new GroundtrailParseError(
      'GT_JSON_UNSAFE_INTEGER',
      'Integer is outside the safe IEEE-754 range.',
      offset,
    );
  }
  if (!decimalEqualsBinary64(token, number)) {
    throw new GroundtrailParseError(
      'GT_JSON_LOSSY_NUMBER',
      'Number cannot round-trip through binary64 without value change.',
      offset,
    );
  }
}

/** Compares a source decimal rational to the exact IEEE-754 binary64 value. */
function decimalEqualsBinary64(token: string, number: number): boolean {
  const match =
    /^(?:-?)(?<integer>0|[1-9][0-9]*)(?:\.(?<fraction>[0-9]+))?(?:[eE](?<exponent>[+-]?[0-9]+))?$/u.exec(
      token,
    );
  if (match?.groups === undefined) return false;
  const fraction = match.groups.fraction ?? '';
  const exponent = Number(match.groups.exponent ?? '0');
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 400) {
    return number === 0 && /^0(?:\.0+)?(?:[eE][+-]?[0-9]+)?$/u.test(token);
  }
  const numerator = BigInt(`${match.groups.integer}${fraction}`);
  if (numerator === 0n) return number === 0;
  const decimalPower = exponent - fraction.length;
  const decimalNumerator = decimalPower >= 0 ? numerator * 10n ** BigInt(decimalPower) : numerator;
  const decimalDenominator = decimalPower >= 0 ? 1n : 10n ** BigInt(-decimalPower);
  const bytes = new ArrayBuffer(8);
  new DataView(bytes).setFloat64(0, Math.abs(number), false);
  const bits = new DataView(bytes).getBigUint64(0, false);
  const exponentBits = Number((bits >> 52n) & 0x7ffn);
  const fractionBits = bits & ((1n << 52n) - 1n);
  const binaryMantissa = exponentBits === 0 ? fractionBits : (1n << 52n) | fractionBits;
  const binaryPower = exponentBits === 0 ? -1074 : exponentBits - 1075;
  const binaryNumerator =
    binaryPower >= 0 ? binaryMantissa * (1n << BigInt(binaryPower)) : binaryMantissa;
  const binaryDenominator = binaryPower >= 0 ? 1n : 1n << BigInt(-binaryPower);
  return decimalNumerator * binaryDenominator === binaryNumerator * decimalDenominator;
}

function containsLoneSurrogate(value: unknown): boolean {
  if (typeof value === 'string') return hasLoneSurrogate(value);
  if (Array.isArray(value)) return value.some(containsLoneSurrogate);
  if (value !== null && typeof value === 'object')
    return Object.entries(value).some(
      ([key, child]) => hasLoneSurrogate(key) || containsLoneSurrogate(child),
    );
  return false;
}

function hasLoneSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return true;
  }
  return false;
}
