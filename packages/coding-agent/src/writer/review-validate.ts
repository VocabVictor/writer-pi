/**
 * Review-output validation (检查 JSON 验证).
 * 不存在的原文引用、越界段落编号、解析失败都不能直接驱动修改。
 */

import { splitParagraphs } from "./project.ts";
import { ISSUE_KINDS, type IssueKind, type ReviewIssue } from "./types.ts";

export interface ReviewValidationOk {
	ok: true;
	issues: ReviewIssue[];
	warnings: string[];
}

export interface ReviewValidationFailed {
	ok: false;
	errors: string[];
}

export type ReviewValidation = ReviewValidationOk | ReviewValidationFailed;

/** Pull the first balanced {...} JSON object out of model output (tolerates fences and prose). */
export function extractJsonObject(text: string): string | null {
	const start = text.indexOf("{");
	if (start === -1) return null;
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let i = start; i < text.length; i++) {
		const ch = text[i];
		if (inString) {
			if (escaped) escaped = false;
			else if (ch === "\\") escaped = true;
			else if (ch === '"') inString = false;
			continue;
		}
		if (ch === '"') inString = true;
		else if (ch === "{") depth += 1;
		else if (ch === "}") {
			depth -= 1;
			if (depth === 0) return text.slice(start, i + 1);
		}
	}
	return null;
}

/**
 * Validate model review output against the draft it reviewed.
 * - Unparseable or structurally wrong output → ok:false (the flow may retry format once).
 * - Individually broken findings (unknown kind, out-of-range paragraph, quote not found in the
 *   draft) are dropped with a warning; if nothing valid remains → ok:false.
 * A finding is only allowed to drive edits when its quote is an exact substring of the draft.
 */
export function validateReview(
	rawOutput: string,
	draftText: string,
	options?: { sourceTexts?: string[] },
): ReviewValidation {
	const errors: string[] = [];
	const warnings: string[] = [];

	const jsonText = extractJsonObject(rawOutput);
	if (!jsonText) {
		return { ok: false, errors: ["输出中未找到 JSON 对象"] };
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(jsonText);
	} catch (e) {
		return { ok: false, errors: [`JSON 解析失败：${(e as Error).message}`] };
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		return { ok: false, errors: ["顶层应为 JSON 对象"] };
	}
	const issuesRaw = (parsed as { issues?: unknown }).issues;
	if (!Array.isArray(issuesRaw)) {
		return { ok: false, errors: ["缺少 issues 数组"] };
	}

	const paragraphs = splitParagraphs(draftText);
	const sourceAll = (options?.sourceTexts ?? []).join("\n");
	const valid: ReviewIssue[] = [];

	issuesRaw.forEach((item, i) => {
		const issue = normalizeIssue(item, i, { draftText, paragraphs, sourceAll }, warnings);
		if (issue) valid.push(issue);
	});

	if (valid.length === 0) {
		if (errors.length > 0) return { ok: false, errors };
		if (issuesRaw.length === 0) return { ok: true, issues: [], warnings };
		return { ok: false, errors: [...warnings, "没有任何一条有效的检查意见"] };
	}
	return { ok: true, issues: valid, warnings };
}

interface NormalizeContext {
	draftText: string;
	paragraphs: string[];
	sourceAll: string;
}

function normalizeIssue(
	item: unknown,
	index: number,
	ctx: NormalizeContext,
	warnings: string[],
): ReviewIssue | undefined {
	const label = `issues[${index}]`;
	if (typeof item !== "object" || item === null) {
		warnings.push(`${label} 不是对象，已丢弃`);
		return undefined;
	}
	const it = item as Record<string, unknown>;

	const kind = it.kind;
	if (typeof kind !== "string" || !ISSUE_KINDS.includes(kind as IssueKind)) {
		warnings.push(`${label} 的 kind 无效（${JSON.stringify(kind ?? null)}），已丢弃`);
		return undefined;
	}
	const paragraph = it.paragraph;
	if (
		typeof paragraph !== "number" ||
		!Number.isInteger(paragraph) ||
		paragraph < 1 ||
		paragraph > ctx.paragraphs.length
	) {
		warnings.push(
			`${label} 的段落编号越界（${JSON.stringify(paragraph ?? null)}，共 ${ctx.paragraphs.length} 段），已丢弃`,
		);
		return undefined;
	}
	const quote = it.quote;
	if (typeof quote !== "string" || quote.trim().length === 0) {
		warnings.push(`${label} 缺少原文引用，已丢弃`);
		return undefined;
	}
	const quoteTrimmed = quote.trim();
	if (!ctx.draftText.includes(quoteTrimmed)) {
		warnings.push(`${label} 的引用在文稿中不存在（「${quoteTrimmed.slice(0, 40)}…」），已丢弃`);
		return undefined;
	}
	const reason = it.reason;
	if (typeof reason !== "string" || reason.trim().length === 0) {
		warnings.push(`${label} 缺少具体理由，已丢弃`);
		return undefined;
	}

	const suggestion =
		typeof it.suggestion === "string" && it.suggestion.trim().length > 0 ? it.suggestion.trim() : undefined;
	let sourceQuote =
		typeof it.source_quote === "string" && it.source_quote.trim().length > 0 ? it.source_quote.trim() : undefined;
	if (sourceQuote && ctx.sourceAll && !ctx.sourceAll.includes(sourceQuote)) {
		warnings.push(`${label} 的素材引用在素材中不存在，已忽略 source_quote 字段`);
		sourceQuote = undefined;
	}
	return {
		kind: kind as IssueKind,
		paragraph,
		quote: quoteTrimmed,
		reason: reason.trim(),
		suggestion,
		source_quote: sourceQuote,
	};
}
