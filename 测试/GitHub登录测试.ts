import { test } from "node:test";
import assert from "node:assert/strict";
import { githubCredentials } from "../src/个人状态/L1_器件层/GitHub凭据读取器";
import { readGitHubProject } from "../src/个人状态/L1_器件层/GitHub项目读取器";
import { createGitHubConnection } from "../src/个人状态/L3_外交层/GitHub登录接口";

test("GitHub 登录：GCM 明文仅留主进程，不进入状态；无登录/不可用/读取失败区分", async () => {
  const calls: { args: string[]; input?: string; interactive?: boolean }[] = [];
  const credentials = githubCredentials(async (args, input, interactive) => {
    calls.push({ args, input, interactive });
    if (args[0] === "get") return "username=owner\npassword=fixture-secret\n\n";
    return args[1] === "list" ? "owner\n" : "";
  });
  assert.deepEqual(await credentials.status(), {
    accounts: ["owner"],
    error: null,
  });
  assert.equal(await credentials.token(), "fixture-secret");
  assert.equal(
    JSON.stringify(await credentials.status()).includes("fixture-secret"),
    false,
  );
  await credentials.login();
  assert.deepEqual(calls.at(-1), {
    args: [
      "github",
      "login",
      "--url",
      "https://github.com",
      "--browser",
      "--force",
    ],
    input: "",
    interactive: true,
  });
  assert.ok(
    calls.some((c) => c.input === "protocol=https\nhost=github.com\n\n"),
  );
  assert.equal(await githubCredentials(async () => "").token(), undefined);
  const missing = githubCredentials(async () => {
    throw Error("sensitive child output");
  });
  assert.equal(await missing.token(), undefined);
  assert.ok(!(await missing.status()).error!.includes("sensitive"));
  await assert.rejects(
    githubCredentials(async (args) =>
      args[0] === "get" ? "username=owner\n" : "owner\n",
    ).token(),
    /重新登录/,
  );
  const isolated = createGitHubConnection(false);
  assert.deepEqual(await isolated.status(), { accounts: [], error: null });
  await assert.rejects(isolated.login(), /隔离测试/);
});

test("私有读取：只给固定官方 API 附带凭据；401/404明确，Actions无权限不误报成功", async () => {
  const request: typeof fetch = async (url, init) => {
    assert.equal(new URL(String(url)).origin, "https://api.github.com");
    assert.equal(init?.redirect, "error");
    assert.equal(
      (init?.headers as Record<string, string>).Authorization,
      "Bearer fixture-secret",
    );
    if (String(url).includes("/actions/"))
      return new Response("", { status: 403 });
    const body = String(url).includes("/commits?")
      ? [
          {
            sha: "a".repeat(40),
            commit: {
              message: "private fixture",
              committer: { date: "2026-09-07T00:00:00Z" },
            },
          },
        ]
      : String(url).includes("/pulls?")
        ? []
        : {
            id: 1,
            full_name: "owner/private",
            default_branch: "main",
            private: true,
          };
    return new Response(JSON.stringify(body));
  };
  const result = await readGitHubProject(
    "owner/private",
    request,
    "fixture-secret",
  );
  assert.equal(result.private, true);
  assert.equal(result.checksAvailable, false);
  assert.deepEqual(result.checks, []);
  assert.ok(!JSON.stringify(result).includes("fixture-secret"));
  await assert.rejects(
    readGitHubProject(
      "owner/private",
      async () => new Response("", { status: 401 }),
      "fixture-secret",
    ),
    /登录已失效/,
  );
  await assert.rejects(
    readGitHubProject(
      "owner/private",
      async () => new Response("", { status: 404 }),
      "fixture-secret",
    ),
    /访问权限/,
  );
  await assert.rejects(
    readGitHubProject(
      "https://evil.test/owner/private",
      request,
      "fixture-secret",
    ),
    /owner\/repo/,
  );
});
