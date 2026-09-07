import { githubCredentials } from "../L1_器件层/GitHub凭据读取器";
import { readGitHubProject } from "../L1_器件层/GitHub项目读取器";

/** 桌面主进程的 GitHub 登录边界；IPC 仅公开账号状态和登录命令，不返回凭据。测试默认不接触本机账号。 */
export function createGitHubConnection(useSystemCredentials = true) {
  const credentials = githubCredentials();
  let loggingIn: Promise<void> | undefined;
  return {
    status: () =>
      useSystemCredentials
        ? credentials.status()
        : Promise.resolve({ accounts: [] as string[], error: null }),
    login: () => {
      if (!useSystemCredentials)
        return Promise.reject(Error("隔离测试不启动系统登录"));
      if (!loggingIn)
        loggingIn = credentials.login().finally(() => {
          loggingIn = undefined;
        });
      return loggingIn;
    },
    read: async (repository: string) =>
      readGitHubProject(
        repository,
        fetch,
        useSystemCredentials ? await credentials.token() : undefined,
      ),
  };
}
