/**
 * Citation checking (academic genre). Numeric markers like [1] must be registered in
 * context/references.md; author-year markers like (Zhang, 2021) / 张三（2021） / (Иванов, 2021)
 * must appear in the provided material. Anything else is reported as unsourced — the writing
 * flow turns it into an unsourced_citation lead. It cannot invent a source for the draft.
 */

export interface CitationMarker {
	marker: string;
	kind: "numeric" | "authorYear";
}

const NUMERIC_RE = /\[(\d{1,3})\]/g;
// 作者名支持 8 语言字母/表意文字（\p{L} 含拉丁变音符号、西里尔、阿拉伯文、谚文）。
const AUTHOR_YEAR_RE = /[(（]([\p{L}][\p{L}\p{M}0-9&.\- ]{1,40}),?\s*(\d{4})[)）]/gu;
const AUTHOR_YEAR_CJK_RE =
	/[(（]?[\u3041-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7a3]{2,12}（(\d{4})）/g;

export function extractCitations(text: string): CitationMarker[] {
	const found = new Map<string, CitationMarker>();
	for (const m of text.matchAll(NUMERIC_RE)) {
		found.set(m[0], { marker: m[0], kind: "numeric" });
	}
	for (const m of text.matchAll(AUTHOR_YEAR_RE)) {
		found.set(m[0], { marker: m[0], kind: "authorYear" });
	}
	for (const m of text.matchAll(AUTHOR_YEAR_CJK_RE)) {
		found.set(m[0], { marker: m[0], kind: "authorYear" });
	}
	return [...found.values()];
}

/** Citations that cannot be resolved against the reference texts (references.md + sources). */
export function checkCitations(
	text: string,
	referenceTexts: string[],
): { marker: string; kind: CitationMarker["kind"] }[] {
	const references = referenceTexts.join("\n");
	const unresolved: { marker: string; kind: CitationMarker["kind"] }[] = [];
	for (const c of extractCitations(text)) {
		if (c.kind === "numeric") {
			// [1] must be registered, e.g. "- [1] → sources/xxx.md".
			if (!references.includes(c.marker)) unresolved.push(c);
			continue;
		}
		// Author-year: the author-name part (without the year parentheses) must appear in material.
		// 表意文字的标记常吞掉前导词（"如张三（2021）"），所以 CJK/谚文名字的末两字也算命中；
		// 字母文字（拉丁/西里尔/阿拉伯）有词边界，必须全名命中，避免常见后缀误报。
		const name = c.marker
			.replace(/\s*[（(]\s*\d{4}\s*[)）]?\s*$/, "") // strip trailing （2021）
			.replace(/[)）]\s*$/, "") // strip latin trailing ")"
			.split(/[,\uff0c]/)[0]
			.replace(/^[(（]/, "")
			.trim();
		const tail = name.slice(-2);
		const tailOk = tail.length >= 2 && references.includes(tail) && IDEOGRAPHIC_RE.test(name);
		if (!references.includes(name) && !tailOk) unresolved.push(c);
	}
	return unresolved;
}

const IDEOGRAPHIC_RE = /[\u3041-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7a3]/;
