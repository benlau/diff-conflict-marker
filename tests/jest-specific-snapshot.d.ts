declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchSpecificSnapshot(snapshotPath: string): R;
    }
  }
}

export {};
