/**
 * Output formats (输出格式). 会话用 --format=<格式> 指定，settings.json 的 defaultFormat
 * 是默认值；起草指令注入目标格式的结构约定，saveDraft 按格式定扩展名。
 * docx/doc 是二进制格式：本期以「内容按目标格式写」为准，二进制转换不在范围内，
 * 文稿仍保存为 Markdown 内容（扩展名 .md）。
 */

export interface OutputFormat {
	id: string;
	name: string;
	/** File extension for saved drafts. */
	extension: string;
	/** Structure conventions injected into the drafting/section instructions. */
	instruction: string;
}

export const OUTPUT_FORMATS: OutputFormat[] = [
	{
		id: "markdown",
		name: "Markdown",
		extension: "md",
		instruction: "输出 Markdown：标题用 #/##，列表、引用块、代码块按 Markdown 语法。",
	},
	{
		id: "latex",
		name: "LaTeX",
		extension: "tex",
		instruction:
			"输出 LaTeX 源码：用 \\documentclass 与 \\section/\\subsection 组织结构，正文是 LaTeX 命令，不要混入 Markdown 标记。",
	},
	{
		id: "docx",
		name: "Word（docx）",
		extension: "md",
		instruction:
			"按 Word 文档的结构约定组织：标题层级、编号列表、段落分明；不产出二进制文件，文稿以 Markdown 内容保存。",
	},
	{
		id: "doc",
		name: "Word（doc）",
		extension: "md",
		instruction:
			"按 Word 文档的结构约定组织：标题层级、编号列表、段落分明；不产出二进制文件，文稿以 Markdown 内容保存。",
	},
	{
		id: "code",
		name: "代码",
		extension: "md",
		instruction: "面向代码场景：正文配合代码块组织，说明文字与代码分开，代码块标注语言。",
	},
];

const byId = new Map(OUTPUT_FORMATS.map((f) => [f.id, f]));

export function getFormat(id: string | null | undefined): OutputFormat | undefined {
	return id ? byId.get(id) : undefined;
}

/** Draft file extension for a format id; markdown is the default. */
export function extensionFor(id: string | null | undefined): string {
	return getFormat(id)?.extension ?? "md";
}

/** Structure conventions for a format id; null when the format is unknown or unset. */
export function formatInstruction(id: string | null | undefined): string | null {
	return getFormat(id)?.instruction ?? null;
}
