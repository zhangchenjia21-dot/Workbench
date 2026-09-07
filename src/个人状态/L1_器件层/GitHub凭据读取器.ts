import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
// Explorer 启动时可能没有终端的 Git PATH；优先使用已安装的标准 Windows 路径。
const installedGit = join(
  process.env.ProgramFiles ?? "C:\\Program Files",
  "Git",
  "cmd",
  "git.exe",
);
const gitExecutable = existsSync(installedGit) ? installedGit : "git";

/** GCM 标准输入/输出只在主进程内使用；错误不携带可能包含凭据的 stdout/stderr/cause。 */
export type CredentialCommand = (
  args: string[],
  input?: string,
  interactive?: boolean,
) => Promise<string>;
export const runCredentialCommand: CredentialCommand = (
  args,
  input = "",
  interactive = false,
) =>
  new Promise((resolve, reject) => {
    const child = execFile(
      gitExecutable,
      ["credential-manager", ...args],
      {
        windowsHide: true,
        timeout: interactive ? 180000 : 15000,
        maxBuffer: 65536,
        env: {
          ...process.env,
          GCM_INTERACTIVE: interactive ? "always" : "never",
          GIT_TERMINAL_PROMPT: "0",
          GCM_TRACE: "0",
          GIT_TRACE: "0",
        },
      },
      (error, stdout) => {
        if (error)
          reject(
            Error(
              interactive
                ? "GitHub 登录未完成，请重试。需要安装 Git for Windows（包含 Git Credential Manager）。"
                : "无法读取 Windows GitHub 登录。请检查 Git for Windows 和 Git Credential Manager，或重新登录。",
            ),
          );
        else resolve(stdout);
      },
    );
    child.stdin?.on("error", () => {
      /* 进程提前退出时由 execFile 回调返回统一错误，不记录凭据。 */
    });
    child.stdin?.end(input);
  });

/** 凭据继续由 GCM/Windows 管理；Workbench 不保存 Token，也不将它送入 SQLite、renderer 或备份。 */
export function githubCredentials(
  run: CredentialCommand = runCredentialCommand,
) {
  async function accounts(): Promise<string[]> {
    return (await run(["github", "list"]))
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return {
    async status() {
      try {
        return { accounts: await accounts(), error: null as string | null };
      } catch {
        return {
          accounts: [] as string[],
          error:
            "未找到可用的 Git for Windows 登录组件；公开仓库仍可匿名读取，私有仓库需要 Git Credential Manager。",
        };
      }
    },
    async token(): Promise<string | undefined> {
      // 无 GCM 或没有已存账号时可匿名读取公开仓库；已存账号读取失败必须报错，不能掩盖登录失效。
      const status = await this.status();
      if (status.error || !status.accounts.length) return undefined;
      const reply = await run(["get"], "protocol=https\nhost=github.com\n\n");
      const password = reply
        .split(/\r?\n/)
        .find((line) => line.startsWith("password="))
        ?.slice(9);
      if (!password || /[\r\n]/.test(password))
        throw Error("GitHub 登录不可用，请重新登录。");
      return password;
    },
    async login(): Promise<void> {
      await run(
        [
          "github",
          "login",
          "--url",
          "https://github.com",
          "--browser",
          "--force",
        ],
        "",
        true,
      );
    },
  };
}
