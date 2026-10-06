/**
 * Language e2e for the writing flows: 8 languages (中/英/日/法/西/韩/俄/阿拉伯) through the
 * real pipeline (faux provider scripted model, real /draft command). 阿拉伯文用真实 RTL 文本、
 * 日语带假名、韩语谚文、俄语西里尔。断言各语言正文完整落盘逐字一致（不截断、不转码损坏），
 * 短文与分节长文两条路径都覆盖，长度档位与语言取代表组合。
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai";
import { afterEach, describe, expect, test } from "vitest";
import { countWords } from "../../src/writer/checker.ts";
import { readState } from "../../src/writer/project.ts";
import { createHarness, type Harness } from "../suite/harness.ts";

interface Language {
	id: string;
	/** 要求里带长度档位走短文；--long 走分节。 */
	prompt: string;
	/** 每节/短文正文由这些句子与序号句拼成。 */
	sentences: [string, string, string];
	/** 该语言脚本的正文必须出现的真实字符（RTL/假名/谚文/西里尔）。 */
	script: RegExp;
}

const LANGUAGES: Language[] = [
	{
		id: "zh",
		prompt: "写一篇说明文，长度：500 字",
		sentences: [
			"长文写作流程把全文分成若干小节，每一节单独一轮完成。",
			"分节写作先拟提纲再逐节推进，正文由程序组装落盘。",
			"状态与检查环节对长文本保持可靠，字数统计覆盖各语言口径。",
		],
		script: /\p{Script=Han}/u,
	},
	{
		id: "en",
		prompt: "Write an essay about long-form pipelines, roughly 1200 words",
		sentences: [
			"The long-form pipeline writes every section to disk before assembling the manuscript.",
			"An outline comes first, then each section is written in its own turn.",
			"The state and the review stages must stay reliable for very long content.",
		],
		script: /\b(the|and|of|long|section)\b/i,
	},
	{
		id: "ja",
		prompt: "長文パイプラインについての解説文を書いてください",
		sentences: [
			"長文の執筆では、各節を別々のターンで書いてから組み立てます。",
			"まず提綱を書き、その後に各節を一つずつ書き進めます。",
			"状態とチェックの各段階は、長い本文でも壊れてはいけません。",
		],
		script: /\p{Script=Hiragana}/u,
	},
	{
		id: "fr",
		prompt: "Écris un exposé sur les textes longs, environ 800 mots",
		sentences: [
			"Le flux d'écriture longue rédige chaque section dans un tour séparé.",
			"On écrit d'abord un plan, puis chaque section l'une après l'autre.",
			"Les étapes de vérification doivent rester fiables sur un texte très long.",
		],
		script: /\b(le|la|les|une|dans|sur)\b/i,
	},
	{
		id: "es",
		prompt: "Escribe un texto sobre flujos de escritura larga, unas 800 palabras",
		sentences: [
			"El flujo de escritura larga redacta cada sección en un turno aparte.",
			"Primero se escribe un esquema y luego cada sección por separado.",
			"Las etapas de revisión deben seguir siendo fiables con textos largos.",
		],
		script: /\b(el|la|los|las|una|con|por)\b/i,
	},
	{
		id: "ko",
		prompt: "장문 집필 흐름에 대한 해설문을 써 주세요",
		sentences: [
			"장문 집필 흐름은 각 절을 별도의 턴으로 작성합니다.",
			"먼저 개요를 쓰고, 그다음 각 절을 하나씩 써 내려갑니다.",
			"상태와 검토 단계는 아주 긴 본문에서도 안정적이어야 합니다.",
		],
		script: /\p{Script=Hangul}/u,
	},
	{
		id: "ru",
		prompt: "Напиши текст о процессе работы над длинными рукописями",
		sentences: [
			"Процесс длинного текста пишет каждый раздел отдельным ходом.",
			"Сначала составляется план, затем разделы пишутся по очереди.",
			"Этапы проверки должны оставаться надёжными на очень длинном тексте.",
		],
		script: /\p{Script=Cyrillic}/u,
	},
	{
		id: "ar",
		prompt: "اكتب نصًا عن مسار الكتابة الطويلة",
		sentences: [
			"يكتب مسار الكتابة الطويلة كل قسم في دور منفصل ثم يجمع المخطوطة.",
			"أولًا يُكتب المخطط، ثم تُكتب الأقسام واحدًا تلو الآخر.",
			"يجب أن تبقى مراحل الفحص والحالة موثوقة مع النصوص الطويلة جدًا.",
		],
		script: /\p{Script=Arabic}/u,
	},
];

/** 序号句让每节唯一（不触发重复段落/句子线索），数字按组计入字数。 */
function sectionText(language: Language, n: number): string {
	return `${language.sentences[n % language.sentences.length]} ${language.sentences[(n + 1) % language.sentences.length]} Part ${n}.`;
}

function shortText(language: Language): string {
	return `${language.sentences[0]} ${language.sentences[2]} Part 1.`;
}

describe("8 语言 e2e（faux 脚本化模型，真管线：短文 + 分节长文两条路径）", () => {
	const harnesses: Harness[] = [];

	afterEach(() => {
		while (harnesses.length > 0) {
			harnesses.pop()?.cleanup();
		}
	});

	for (const language of LANGUAGES) {
		test(`短文单轮：${language.id} 正文逐字落盘`, async () => {
			const harness = await createHarness();
			harnesses.push(harness);
			const article = shortText(language);

			harness.setResponses([
				fauxAssistantMessage(fauxToolCall("save_draft", { content: article, note: "初稿" }), {
					stopReason: "toolUse",
				}),
				fauxAssistantMessage('{"issues": []}'),
				fauxAssistantMessage('{"issues": []}'),
			]);

			await harness.session.prompt(`/draft ${language.prompt}`);

			// 完整落盘：文件内容与脚本正文逐字一致（不截断、不转码损坏）
			const onDisk = await readFile(join(harness.tempDir, "drafts", "draft-001.md"), "utf-8");
			expect(onDisk).toBe(article);
			expect(onDisk).toMatch(language.script);
			// 管线统计与实际文稿一致（字数口径跨脚本自洽）
			const review = JSON.parse(await readFile(join(harness.tempDir, "reviews", "review-001.json"), "utf-8"));
			expect(review.programChecks.length.wordCount).toBe(countWords(onDisk).wordCount);
			expect(review.programChecks.length.wordCount).toBeGreaterThan(0);
			const state = await readState(harness.tempDir);
			expect(state.currentDraft).toBe("drafts/draft-001.md");
			expect(state.draftCount).toBe(1);
			expect(state.stage).toBe("idle");
		});

		test(`分节长文：${language.id} 提纲 → 2 节 → 组装完整`, async () => {
			const harness = await createHarness();
			harnesses.push(harness);
			const first = sectionText(language, 1);
			const second = sectionText(language, 2);
			const outline = "## 第 1 节：第一部分\n\n## 第 2 节：第二部分";

			harness.setResponses([
				fauxAssistantMessage(outline),
				fauxAssistantMessage(first),
				fauxAssistantMessage(second),
				fauxAssistantMessage('{"issues": []}'),
			]);

			await harness.session.prompt(`/draft --long ${language.prompt}`);

			expect(await readFile(join(harness.tempDir, "sections", "outline.md"), "utf-8")).toBe(`${outline}\n`);
			expect(await readFile(join(harness.tempDir, "sections", "section-001.md"), "utf-8")).toBe(`${first}\n`);
			expect(await readFile(join(harness.tempDir, "sections", "section-002.md"), "utf-8")).toBe(`${second}\n`);
			// 组装稿 = 两节按序拼接，各语言正文逐字一致
			const assembled = await readFile(join(harness.tempDir, "drafts", "draft-001.md"), "utf-8");
			expect(assembled).toBe(`${first}\n\n${second}`);
			expect(assembled).toMatch(language.script);
			const state = await readState(harness.tempDir);
			expect(state.currentDraft).toBe("drafts/draft-001.md");
			expect(state.stage).toBe("idle");
			expect(state.longForm).toBeUndefined();
		});
	}

	test("长度档位 × 语言：阿拉伯文（RTL）多节长文，字数统计自洽", async () => {
		const harness = await createHarness();
		harnesses.push(harness);
		const ar = LANGUAGES[7];
		const sections = [1, 2, 3].map((n) => `${ar.sentences[0]} ${ar.sentences[1]} Part ${n}.`);
		const outline = "## 第 1 节：一\n\n## 第 2 节：二\n\n## 第 3 节：三";
		harness.setResponses([
			fauxAssistantMessage(outline),
			...sections.map((text) => fauxAssistantMessage(text)),
			fauxAssistantMessage('{"issues": []}'),
			fauxAssistantMessage('{"issues": []}'),
		]);
		await harness.session.prompt(`/draft --long ${ar.prompt}`);
		const assembled = await readFile(join(harness.tempDir, "drafts", "draft-001.md"), "utf-8");
		expect(assembled).toBe(sections.join("\n\n"));
		expect(assembled).toMatch(/\p{Script=Arabic}/u);
		const review = JSON.parse(await readFile(join(harness.tempDir, "reviews", "review-001.json"), "utf-8"));
		expect(review.programChecks.length.wordCount).toBe(countWords(assembled).wordCount);
		const state = await readState(harness.tempDir);
		expect(state.stage).toBe("idle");
	});
});
