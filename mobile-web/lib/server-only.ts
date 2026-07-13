export function assertServerOnly(moduleName: string): void {
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") throw new Error(`${moduleName} is server-only`);
}
