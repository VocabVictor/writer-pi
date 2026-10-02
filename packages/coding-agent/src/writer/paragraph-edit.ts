/**
 * Paragraph edit application: verbatim-match validation against the current draft snapshot.
 * Pure string logic, kept separate from the flow state machine.
 */

export interface ParagraphEditResult {
	ok: boolean;
	/** New snapshot when ok, unchanged snapshot otherwise. */
	snapshot: string;
	message: string;
}

export function applyParagraphEdit(snapshot: string, original: string, replacement: string): ParagraphEditResult {
	const wanted = original.replace(/\r\n/g, "\n").trim();
	if (!wanted) return { ok: false, snapshot, message: "original 不能为空" };

	const count = countOccurrences(snapshot, wanted);
	if (count === 0) {
		// Retry with paragraph-trimmed variant (line-ending / surrounding whitespace differences).
		const normalized = snapshot
			.replace(/\r\n/g, "\n")
			.split(/\n\s*\n/)
			.map((p) => p.trim())
			.filter((p) => p.length > 0)
			.join("\n\n");
		if (countOccurrences(normalized, wanted) === 1) {
			return {
				ok: true,
				snapshot: normalized.replace(wanted, replacement.replace(/\r\n/g, "\n").trim()),
				message: "已替换（归一化匹配）。",
			};
		}
		return {
			ok: false,
			snapshot,
			message:
				"original 在当前文稿中找不到（必须逐字复制要修改的段落，包括标点）。先调用 read 读取当前文稿，再原样引用要修改的段落。",
		};
	}
	if (count > 1) {
		return {
			ok: false,
			snapshot,
			message: `original 在当前文稿中出现 ${count} 次，无法唯一定位。请包含更多上下文使其唯一。`,
		};
	}
	return { ok: true, snapshot: snapshot.replace(wanted, replacement.replace(/\r\n/g, "\n").trim()), message: "已替换。" };
}

function countOccurrences(haystack: string, needle: string): number {
	let count = 0;
	let idx = haystack.indexOf(needle);
	while (idx !== -1) {
		count += 1;
		idx = haystack.indexOf(needle, idx + needle.length);
	}
	return count;
}
