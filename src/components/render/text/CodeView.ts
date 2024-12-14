import { html, css, LitElement } from "lit";
import { createHighlighterCore, HighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";
import { ref, createRef, Ref } from "lit/directives/ref.js";
import { customElement, property } from "lit/decorators.js";
import { AppStyledElement } from "@/components/AppStyledElement";

async function* makeTextFileLineIterator(file: File) {
  const utf8Decoder = new TextDecoder("utf-8");
  const reader = file.stream().getReader();
  let { value: chunk, done: isReaderDone } = await reader.read();
  let decodedChunk = chunk ? utf8Decoder.decode(chunk, { stream: true }) : "";

  const lineBreakPattern = /\r\n|\n|\r/gm;
  let startIndex = 0;

  while (true) {
    const match = lineBreakPattern.exec(decodedChunk);
    if (!match) {
      if (isReaderDone) break;

      const remainder = decodedChunk.slice(startIndex);
      ({ value: chunk, done: isReaderDone } = await reader.read());
      decodedChunk =
        remainder + (chunk ? utf8Decoder.decode(chunk, { stream: true }) : "");
      startIndex = lineBreakPattern.lastIndex = 0;
      continue;
    }

    yield decodedChunk.slice(startIndex, match.index);
    startIndex = lineBreakPattern.lastIndex;
  }

  if (startIndex < decodedChunk.length) {
    yield decodedChunk.slice(startIndex);
  }
}

function queueRequestAnimationFrame<T>(fn: () => T): Promise<T> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve(fn()));
  });
}

function createExponentialBackoff(initialValue: number, maxValue: number) {
  let currentValue = initialValue;
  return () => {
    if (currentValue >= maxValue) return maxValue;
    currentValue *= 2;
    return currentValue;
  };
}

@customElement("code-view")
export class CodeView extends AppStyledElement(
  LitElement,
  css`
    .line {
      content-visibility: auto;
      contain-intrinsic-size: auto 1.5em;
    }
  `,
) {
  @property({ type: File, attribute: false })
  file: File | null = null;

  #initialBufferSize = 50;
  #maxBufferSize = 3200;
  #calculateBufferSize = createExponentialBackoff(
    this.#initialBufferSize,
    this.#maxBufferSize,
  );

  @property({ type: String })
  language = "text";

  @property({ type: String })
  theme = "github-dark";

  #container: Ref<HTMLElement> = createRef();
  #progressBar: Ref<HTMLProgressElement> = createRef();
  #abortRendering = false;

  #clearContainer() {
    this.#container.value?.replaceChildren();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#abortRendering = true;
  }

  async #appendToContainer(node: Node) {
    this.#container.value?.appendChild(node);
  }

  async #initializeHighlighter() {
    return createHighlighterCore({
      themes: [import(`shiki/dist/themes/${this.theme}.mjs`)],
      langs:
        this.language === "text"
          ? []
          : [import(`shiki/dist/langs/${this.language}.mjs`)],
      engine: createOnigurumaEngine(import("shiki/wasm")),
    });
  }

  async #renderLines(highlighter: HighlighterCore, domParser: DOMParser) {
    if (!this.file) return;

    this.#clearContainer();
    const progressBar = this.#progressBar.value || { value: 0, max: 0 };
    progressBar.value = 0;
    progressBar.max = this.file.size;

    let lines: string[] = [];
    let isFirstRender = true;
    let bufferSize = this.#calculateBufferSize();

    const createFragment = (codeLines: string[], language = this.language) => {
      const fragment = document.createDocumentFragment();
      if (!codeLines.length) return fragment;
      const codeText = codeLines.join("\n");
      const htmlText = highlighter.codeToHtml(codeText, {
        theme: this.theme,
        lang: language,
      });
      const parsedDocument = domParser.parseFromString(htmlText, "text/html");
      fragment.append(...parsedDocument.body.childNodes);
      return fragment;
    };

    for await (const line of makeTextFileLineIterator(this.file)) {
      if (this.#abortRendering) return;

      lines.push(line);
      progressBar.value += line.length;

      if (lines.length >= bufferSize) {
        if (isFirstRender) {
          await queueRequestAnimationFrame(() => {
            const previewFragment = createFragment(lines, "text");
            this.#appendToContainer(previewFragment);
          });
        }

        await queueRequestAnimationFrame(() => {
          const codeFragment = createFragment(lines);
          if (isFirstRender) {
            this.#clearContainer();
            isFirstRender = false;
          }
          this.#appendToContainer(codeFragment);
          lines = [];
        });

        bufferSize = this.#calculateBufferSize();
      }
    }

    if (lines.length) {
      await queueRequestAnimationFrame(() => {
        const finalFragment = createFragment(lines);
        this.#appendToContainer(finalFragment);
        lines = [];
      });
    }

    progressBar.value = 0; // Rendering completed
  }

  protected async firstUpdated() {
    if (!this.file) return;

    const highlighter = await this.#initializeHighlighter();
    const domParser = new DOMParser();
    this.#renderLines(highlighter, domParser);
  }

  render() {
    return html`
      <progress
        ${ref(this.#progressBar)}
        class="progress block h-0.5 bg-base-100 fixed top-[1px] z-10"
        value="0"
        max=${this.file?.size ?? 0}
      ></progress>
      <div ${ref(this.#container)} class="p-2"></div>
    `;
  }
}
