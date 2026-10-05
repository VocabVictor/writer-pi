/**
 * Citation checking (academic genre). Numeric markers like [1] must be registered in
 * context/references.md; author-year markers like (Zhang, 2021) / 张三（2021） must appear
 * in the provided material. Anything else is reported as unsourced — the writing flow
 * turns it into an unsourced_citation lead. It cannot invent a source for the draft.
 */

export interface CitationMarker {
	marker: string;
	kind: "numeric" | "authorYear";
}

const NUMERIC_RE = /\[(\d{1,3})\]/g;
const AUTHOR_YEAR_RE = /[(（]([A-Za-z][\w&.\- ]{1,40}|[\u4e00-\u9fff]{1,12}),?\s*(\d{4})[)）]/g;
const AUTHOR_YEAR_CJK_RE = /([\u4e00-\u9fff]{2,12})（(\d{4})）/g;

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
export function checkCitations(text: string, referenceTexts: string[]): { marker: string; kind: CitationMarker["kind"] }[] {
	const references = referenceTexts.join("\n");
	const unresolved: { marker: string; kind: CitationMarker["kind"] }[] = [];
	for (const c of extractCitations(text)) {
		if (c.kind === "numeric") {
			// [1] must be registered, e.g. "- [1] → sources/xxx.md".
			if (!references.includes(c.marker)) unresolved.push(c);
			continue;
		}
		// Author-year: the author-name part (without the year parentheses) must appear in material.
		// Chinese markers often swallow a leading word ("如张三（2021）"), so the name's last
		// two characters are also accepted as evidence of a match.
		const name = c.marker
			.replace(/\s*[（(]\s*\d{4}\s*[)）]?\s*$/, "") // strip trailing （2021）
			.replace(/[)）]\s*$/, "") // strip latin trailing ")"
			.split(/[,\uff0c]/)[0].replace(/^[(（]/, "").trim();
		const tail = name.slice(-2);
		if (!references.includes(name) && !(tail.length >= 2 && references.includes(tail))) unresolved.push(c);
	}
	return unresolved;
}
