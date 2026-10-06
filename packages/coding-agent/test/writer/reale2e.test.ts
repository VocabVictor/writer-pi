/**
 * Gated long-form e2e with a REAL model: skipIf no endpoint key. 中文 + 三个非 CJK 代表
 * （英/日/阿拉伯）各跑一次真实生成分节长文——真管线：/draft --long 进 → 提纲 → 各节 →
 * 组装稿落盘 → 检查闭环。断言收得松（真实模型输出不可脚本化）：流程完成、文稿落盘、
 * 语言正确。其余语言由 langse2e / langprobe 的 faux 与本地端点测试覆盖。
 */

import { mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getModel } from "@earendil-works/pi-ai/compat";
import { afterEach, describe, expect, test } from "vitest";
import { AuthStorage } from "../../src/core/authstorage.ts";
import { ModelRuntime } from "../../src/core/modelruntime.ts";
import { createAgentSession } from "../../src/core/sdk.ts";
import type { AgentSession } from "../../src/index.ts";
import { readState } from "../../src/writer/project.ts";
import { API_KEY } from "../utilities.ts";

const TEST_TIMEOUT_MS = 600000;

interface RealLanguage {
	id: string;
	prompt: string;
	/** The assembled manuscript must contain characters of this script. */
	script: RegExp;
}

const REAL_LANGUAGES: RealLanguage[] = [
	{ id: "zh", prompt: "写一篇关于分节写作流程的说明文，长度 1500 字左右", script: /\p{Script=Han}/u },
	{
		id: "en",
		prompt: "Write a structured essay about long-form writing pipelines, roughly 800 words",
		script: /\b(the|and|of)\b/i,
	},
	{ id: "ja", prompt: "長文執筆パイプラインについての解説文を、800字程度で書いてください", script: /\p{Script=Han}/u },
	{
		id: "ar",
		prompt: "اكتب نصًا منظمًا عن مسار الكتابة الطويلة بنحو 600 كلمة",
		script: /\p{Script=Arabic}/u,
	},
];

describe.skipIf(!API_KEY)("长文 gated e2e：真实生成走分节管线（skipIf 无 key）", () => {
	const sessions: AgentSession[] = [];
	const roots: string[] = [];

	afterEach(async () => {
		while (sessions.length > 0) sessions.pop()?.dispose();
		while (roots.length > 0) {
			await rm(roots.pop()!, { recursive: true, force: true });
		}
	});

	for (const language of REAL_LANGUAGES) {
		test(`真实生成分节长文：${language.id}`, { timeout: TEST_TIMEOUT_MS }, async () => {
			const root = join(tmpdir(), `writer-real-${language.id}-${Date.now()}`);
			await mkdir(root, { recursive: true });
			roots.push(root);
			const authStorage = AuthStorage.create(join(root, "auth.json"));
			await authStorage.modify("anthropic", async () => ({ type: "api_key", key: API_KEY! }));
			const modelRuntime = await ModelRuntime.create({ credentials: authStorage, modelsPath: null });
			const model = getModel("anthropic", "claude-sonnet-4-5");
			if (!model) throw new Error("anthropic model unavailable");
			const { session } = await createAgentSession({
				cwd: root,
				agentDir: join(root, "agent"),
				modelRuntime,
				model,
			});
			sessions.push(session);

			// 真管线：一段提示词驱动 提纲 → 各节 → 组装 → 检查闭环
			await session.prompt(`/draft --long ${language.prompt}`);

			const state = await readState(root);
			expect(state.stage, "流程应正常收尾").toBe("idle");
			expect(state.currentDraft, "组装稿应落盘").toBeTruthy();
			expect(state.draftCount).toBeGreaterThan(0);
			const manuscript = await readFile(join(root, state.currentDraft!), "utf-8");
			expect(manuscript.trim().length, "文稿不应为空").toBeGreaterThan(100);
			expect(manuscript, `${language.id} 文稿缺少目标语言的字符`).toMatch(language.script);
		});
	}
});
