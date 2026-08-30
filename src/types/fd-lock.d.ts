// SPDX-License-Identifier: Apache-2.0

declare module 'fd-lock' {
  export default class FDLock {
    public constructor(fileDescriptor: number, options?: { wait?: boolean });
    public ready(): Promise<void>;
    public close(): Promise<void>;
  }
}
