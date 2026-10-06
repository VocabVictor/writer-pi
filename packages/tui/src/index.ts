// Core TUI interfaces and classes

export { Marked, type Token, type Tokens } from "marked";
export { TuiAltScreen, type TuiAltScreenOptions } from "./altscreen.ts";
// Autocomplete support
export {
	type AutocompleteItem,
	type AutocompleteProvider,
	type AutocompleteSuggestions,
	CombinedAutocompleteProvider,
	type SlashCommand,
} from "./autocomplete.ts";
// Colors and styling
export {
	backgroundAnsi,
	type Color,
	type ColorMixSpace,
	colorToHex,
	colorToOkhsl,
	colorToOklch,
	colorToRgb,
	foregroundAnsi,
	type IndexedColor,
	indexedColor,
	mixColors,
	type OkhslChannels,
	type OklchChannels,
	type OklchColorValue,
	okhslColor,
	oklchColor,
	parseColor,
	type RgbColorValue,
	rgbColor,
	styleText,
	styleTextWithAnsi,
	type TerminalColorMode,
	type TextAttributes,
	type TextStyle,
} from "./colors.ts";
// Components
export { Box } from "./components/box.ts";
export { CancellableLoader } from "./components/cancellable.ts";
export { Editor, type EditorOptions, type EditorTheme } from "./components/editor.ts";
export { HStack } from "./components/hstack.ts";
export { Image, type ImageOptions, type ImageTheme } from "./components/image.ts";
export { Input } from "./components/input.ts";
export { Loader, type LoaderIndicatorOptions } from "./components/loader.ts";
export { type DefaultTextStyle, Markdown, type MarkdownOptions, type MarkdownTheme } from "./components/markdown.ts";
export { MouseRegion, type MouseRegionHandler } from "./components/mouseregion.ts";
export {
	ScrollView,
	type ScrollViewOptions,
	type ScrollViewScrollbar,
	type ScrollViewScrollToOptions,
} from "./components/scrollview.ts";
export {
	type SelectItem,
	SelectList,
	type SelectListLayoutOptions,
	type SelectListTheme,
	type SelectListTruncatePrimaryContext,
} from "./components/selectlist.ts";
export { type SettingItem, SettingsList, type SettingsListTheme } from "./components/settingslist.ts";
export { Spacer } from "./components/spacer.ts";
export { Text } from "./components/text.ts";
export { TruncatedText } from "./components/truncatedtext.ts";
export {
	type StackChild,
	type StackEntry,
	type StackEntryOptions,
	type StackOptions,
	VStack,
} from "./components/vstack.ts";
// Editor component interface (for custom editors)
export type { EditorComponent } from "./editorcomponent.ts";
// Fuzzy matching
export { type FuzzyMatch, fuzzyFilter, fuzzyMatch } from "./fuzzy.ts";
// Keybindings
export {
	getKeybindings,
	type Keybinding,
	type KeybindingConflict,
	type KeybindingDefinition,
	type KeybindingDefinitions,
	type Keybindings,
	type KeybindingsConfig,
	KeybindingsManager,
	setKeybindings,
	TUI_KEYBINDINGS,
} from "./keybindings.ts";
// Keyboard input handling
export {
	decodeKittyPrintable,
	isKeyRelease,
	isKeyRepeat,
	isKittyProtocolActive,
	Key,
	type KeyEventType,
	type KeyId,
	matchesKey,
	parseKey,
	setKittyProtocolActive,
} from "./keys.ts";
// LaTeX rendering
export { type RenderLatexOptions, renderLatex } from "./latex.ts";
export { TuiMainScreen, type TuiMainScreenRenderState } from "./mainscreen.ts";
// Native platform integration
export { getNativeClipboard, type NativeClipboard } from "./nativeplatform.ts";
export { oklabToOkhslLightness } from "./oklab.ts";
// Input buffering for batch splitting
export { StdinBuffer, type StdinBufferEventMap, type StdinBufferOptions } from "./stdinbuffer.ts";
// Terminal interface and implementations
export { isAppleTerminalSession, ProcessTerminal, type Terminal } from "./terminal.ts";
// Terminal colors
export {
	parseTerminalColorSchemeReport,
	type RgbColor,
	type TerminalColorScheme,
	type TerminalColors,
} from "./terminalcolors.ts";
// Terminal image support
export {
	allocateImageId,
	type CellDimensions,
	calculateImageRows,
	deleteAllKittyImages,
	deleteKittyImage,
	detectCapabilities,
	encodeITerm2,
	encodeKitty,
	getCapabilities,
	getCellDimensions,
	getGifDimensions,
	getImageDimensions,
	getJpegDimensions,
	getPngDimensions,
	getTerminalColorMode,
	getWebpDimensions,
	hyperlink,
	type ImageDimensions,
	type ImageProtocol,
	type ImageRenderOptions,
	imageFallback,
	renderImage,
	resetCapabilitiesCache,
	setCapabilities,
	setCapabilityOverrides,
	setCellDimensions,
	type TerminalCapabilities,
} from "./terminalimage.ts";
export {
	type Component,
	Container,
	CURSOR_MARKER,
	compositeTuiLine,
	type Focusable,
	isFocusable,
	isViewportTUI,
	type OverlayAnchor,
	type OverlayBounds,
	type OverlayHandle,
	type OverlayMargin,
	type OverlayOptions,
	type OverlayUnfocusOptions,
	type SizeValue,
	type TUI,
	type TuiInputListener,
	type TuiInputListenerResult,
	type TuiMode,
	type TuiMouseButton,
	type TuiMouseEvent,
	type TuiMouseEventResult,
	type TuiMouseEventType,
	type TuiStopOptions,
	type ViewportTUI,
} from "./tui.ts";
// Utilities
export {
	getOsc8LinkAtColumn,
	sliceByColumn,
	stripTerminalSequences,
	truncateToWidth,
	visibleWidth,
	wrapTextWithAnsi,
} from "./utils.ts";
export type { WheelScrollLines } from "./wheelscroll.ts";
