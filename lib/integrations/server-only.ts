// 服务端运行屏障防护：禁止服务端私密代码、数据库秘钥与第三方凭证泄露至客户端 Bundle
export function assertServerOnly(moduleName: string): void {
  if (typeof window !== "undefined" && process.env.VITEST !== "true" && process.env.NODE_ENV !== "test") {
    throw new Error(`[Security Violation] ${moduleName} can only be executed on the server.`);
  }
}
