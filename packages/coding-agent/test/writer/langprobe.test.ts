/**
 * Language e2e: one real prompt per language against the self-hosted GLM vLLM endpoint.
 * Each prompt generates for real, save_draft lands the text on disk, and the file matches
 * what the model submitted — covering RTL Arabic and Japanese kana through the write path.
 * Skipped when the endpoint is unreachable (3s /health probe) or local LLMs are disabled.
 */

import { mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AssistantMessage, ToolCall } from "@earendil-works/pi-ai";
import { describe, expect, test } from "vitest";
import { AuthStorage } from "../../src/core/authstorage.ts";
import { freeGlmBaseUrl, freeGlmModelId } from "../../src/core/freeglm.ts";
import { ModelRuntime } from "../../src/core/modelruntime.ts";
import { createAgentSession } from "../../src/core/sdk.ts";
import type { AgentSession } from "../../src/index.ts";
import { readState } from "../../src/writer/project.ts";
import { stripFences } from "../../src/writer/prompts.ts";

/** Cheap skip decision; generation only runs on a healthy endpoint. */
const PROBE_TIMEOUT_MS = 3000;
/** Fifteen minutes per language: eight concurrent generations on a shared GPU queue for minutes. */
const TEST_TIMEOUT_MS = 900000;

interface Language {
	id: string;
	prompt: string;
	/** Content must match: a script range for non-Latin languages, function words for Latin ones. */
	matches: RegExp;
	/** Non-whitespace characters the draft must reach; omitted = any non-blank draft. */
	minChars?: number;
}

const LANGUAGES: Language[] = [
	{
		id: "zh",
		prompt: "写一首关于秋夜的小诗，八行左右。写完调用 save_draft 工具把完整文稿保存为新版本。",
		matches: /\p{Script=Han}/u,
		// The model sometimes mixes English into the poem (e.g. "folded进衣袖"); that is a
		// generation-quality issue owned by the flow layer, so zh only requires a non-blank draft.
	},
	{
		id: "en",
		prompt:
			"Write a short poem about an autumn night, about eight lines long, in English only (no Chinese). Then call the save_draft tool to save the full text as a new version.",
		matches: /\b(the|of|and|night|autumn)\b/i,
		minChars: 80,
	},
	{
		id: "ja",
		prompt:
			"秋の夜についての短い詩を八行ほど、日本語だけで書いてください（中国語は使わないでください）。書き終えたら save_draft ツールを呼び出して全文を新しいバージョンとして保存してください。",
		matches: /\p{Script=Hiragana}/u,
		minChars: 30,
	},
	{
		id: "fr",
		prompt:
			"Écris un petit poème sur une nuit d'automne, d'environ huit lignes, uniquement en français (sans chinois). Puis appelle l'outil save_draft pour enregistrer le texte complet comme nouvelle version.",
		matches: /\b(le|la|et|de|une|dans|nuit|est)\b/i,
		minChars: 120,
	},
	{
		id: "es",
		prompt:
			"Escribe un poema corto sobre una noche de otoño, de unas ocho líneas, únicamente en español (sin chino). Después llama a la herramienta save_draft para guardar el texto completo como una nueva versión.",
		matches: /\b(el|la|y|de|una|en|noche|es)\b/i,
		minChars: 120,
	},
	{
		id: "ko",
		prompt:
			"가을밤에 대한 짧은 시를 여덟 줄 정도, 한국어로만 써 주세요(중국어는 쓰지 마세요). 다 쓴 다음에 save_draft 도구를 호출해서 전문을 새 버전으로 저장해 주세요.",
		matches: /\p{Script=Hangul}/u,
		minChars: 40,
	},
	{
		id: "ru",
		prompt:
			"Напиши короткое стихотворение об осенней ночи, примерно восемь строк, только по-русски (без китайского). Затем вызови инструмент save_draft, чтобы сохранить полный текст как новую версию.",
		matches: /\p{Script=Cyrillic}/u,
		minChars: 100,
	},
	{
		id: "ar",
		prompt:
			"اكتب قصيدة قصيرة عن ليل خريفي، من نحو ثمانية أسطر، بالعربية فقط (بدون صينية). ثم استخدم أداة save_draft لحفظ النص الكامل كنسخة جديدة.",
		matches: /\p{Script=Arabic}/u,
		minChars: 60,
	},
];

async function probeEndpoint(): Promise<boolean> {
	try {
		const response = await fetch(`${freeGlmBaseUrl()}/health`, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
		return response.ok;
	} catch {
		return false;
	}
}

const endpointUp = await probeEndpoint();

let runtime: Promise<ModelRuntime> | undefined;

/** One runtime for all languages: one availability pass, shared catalog state, in-memory credentials. */
function sharedRuntime(): Promise<ModelRuntime> {
	runtime ??= ModelRuntime.create({ credentials: AuthStorage.inMemory(), modelsPath: null });
	return runtime;
}

async function createTempRoot(): Promise<string> {
	const root = join(tmpdir(), `pi-lang-${Date.now()}-${Math.random().toString(36).slice(2)}`);
	await mkdir(root, { recursive: true });
	return root;
}

/** The latest save_draft call in the transcript, whose fences saveDraft stripped before writing. */
function lastSaveDraftCall(session: AgentSession): ToolCall | undefined {
	for (let i = session.messages.length - 1; i >= 0; i--) {
		const message = session.messages[i];
		if (message.role !== "assistant") continue;
		const assistant = message as AssistantMessage;
		const call = assistant.content.find(
			(block): block is ToolCall => block.type === "toolCall" && block.name === "save_draft",
		);
		if (call) return call;
	}
	return undefined;
}

function submittedContent(call: ToolCall): string | undefined {
	const content = call.arguments.content;
	return typeof content === "string" ? content : undefined;
}

describe.skipIf(!endpointUp || Boolean(process.env.PI_NO_LOCAL_LLM))(
	"language e2e: real generation per language lands a draft on disk",
	() => {
		for (const language of LANGUAGES) {
			test(`真实生成：${language.id}`, { concurrent: true, timeout: TEST_TIMEOUT_MS }, async () => {
				const modelRuntime = await sharedRuntime();
				const root = await createTempRoot();
				const { session, modelFallbackMessage } = await createAgentSession({
					cwd: root,
					agentDir: join(root, "agent"),
					modelRuntime,
				});
				try {
					expect(modelFallbackMessage).toBeUndefined();
					expect(session.model?.provider).toBe("free-glm");
					expect(session.model?.id).toBe(freeGlmModelId());

					const started = Date.now();
					await session.prompt(language.prompt);

					const call = lastSaveDraftCall(session);
					expect(call, "模型必须调用 save_draft").toBeTruthy();
					const submitted = submittedContent(call!);
					expect(submitted, "save_draft 需要 content 参数").toBeTruthy();

					// 落盘核对：当前草稿与最近一次 save_draft 提交的正文逐字一致（覆盖阿拉伯文 RTL 与日语假名的完整性）。
					// 模型可能自我修正而保存多次，所以读 state.currentDraft 而非固定的第一版。
					const state = await readState(root);
					expect(state.currentDraft, "未落盘草稿").toBeTruthy();
					const onDisk = await readFile(join(root, state.currentDraft!), "utf-8");
					expect(onDisk).toBe(stripFences(submitted!));

					// 字数与语言核对
					const charCount = onDisk.replace(/\s/g, "").length;
					if (language.minChars !== undefined) {
						expect(charCount, `${language.id} 正文过短：${charCount} 字符`).toBeGreaterThanOrEqual(
							language.minChars,
						);
					} else {
						expect(charCount, `${language.id} 正文为空白`).toBeGreaterThan(0);
					}
					expect(onDisk, `${language.id} 正文缺少目标语言的字符`).toMatch(language.matches);

					// 保存次数取决于模型行为（自我修正时会保存多次），只要求至少落盘一版。
					expect(state.draftCount).toBeGreaterThanOrEqual(1);

					console.log(`[lang-e2e] ${language.id}: ${Date.now() - started}ms, ${charCount} 字符`);
				} finally {
					session.dispose();
					await rm(root, { recursive: true, force: true });
				}
			});
		}
	},
);
