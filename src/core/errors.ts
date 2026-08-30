// SPDX-License-Identifier: Apache-2.0

export class GroundtrailError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
    public readonly exitCode: 1 | 2 | 3 | 4 = 4,
    public readonly details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = 'GroundtrailError';
  }
}

export function asGroundtrailError(error: unknown): GroundtrailError {
  if (error instanceof GroundtrailError) return error;
  if (error instanceof Error && hasCode(error))
    return new GroundtrailError(error.code, error.message);
  return new GroundtrailError('GT_INTERNAL', 'Unexpected internal error.');
}

function hasCode(error: Error): error is Error & { code: string } {
  return typeof (error as { code?: unknown }).code === 'string';
}
