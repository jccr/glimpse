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

  if (startIndex <= decodedChunk.length) {
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
    code .line {
      content-visibility: auto;
      contain-intrinsic-size: auto 1.5em;
    }

    code .line span {
      display: inline-block;
    }

    code .line .number {
      display: inline-block;
      width: var(--line-num-width, 1.5rem);
      margin-right: 1.5rem;
      text-align: right;
      color: rgba(115, 138, 148, 0.4);
      user-select: none;
    }
  `,
) {
  @property({ type: File, attribute: false })
  file: File | null = null;

  @property({ type: String })
  language = "text";

  @property({ type: String })
  theme = "github-dark";

  @property({ type: Boolean, attribute: "line-numbers" })
  lineNumbers = false;

  #initialBufferSize = 50;
  #maxBufferSize = 2000;
  #calculateBufferSize = createExponentialBackoff(
    this.#initialBufferSize,
    this.#maxBufferSize,
  );

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

  async #setLineNumWidth(lineNumWidth: number) {
    this.#container.value?.style.setProperty(
      "--line-num-width",
      `${lineNumWidth}ch`,
    );
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
    const lineNumWidth = Math.max(
      Math.ceil(this.file.size / 100).toString().length,
      1,
    );
    this.#setLineNumWidth(lineNumWidth);

    const renderLineNumbers = this.lineNumbers;

    const createFragment = (
      codeLines: string[],
      language = this.language,
      offset = 0,
    ) => {
      const fragment = document.createDocumentFragment();
      if (!codeLines.length) return fragment;
      const codeText = codeLines.join("\n");
      const htmlText = highlighter.codeToHtml(codeText, {
        theme: this.theme,
        lang: language,
        transformers: [
          {
            pre(node) {
              node.properties["tabindex"] = null;
            },
            line(node, line) {
              if (!renderLineNumbers) {
                return;
              }
              node.children.unshift({
                type: "element",
                tagName: "span",
                properties: { class: "number" },
                children: [{ type: "text", value: `${line + offset}` }],
              });
            },
          },
        ],
      });
      const parsedDocument = domParser.parseFromString(htmlText, "text/html");
      fragment.append(...parsedDocument.body.childNodes);
      return fragment;
    };

    const tagRegex = /<[^>]+>/;
    const isXmlLike =
      this.language.includes("xml") || this.language.includes("html");
    let bufferUntilTag = false;

    let offset = 0;

    for await (const line of makeTextFileLineIterator(this.file)) {
      if (this.#abortRendering) return;

      lines.push(line);
      progressBar.value += line.length;

      // Handle buffering for XML-like lines
      if (isXmlLike) {
        const lineHasTag = tagRegex.test(line);
        // Buffer until a tag is found
        if (!lineHasTag) {
          continue;
        }

        // Handle starting tags
        if (!bufferUntilTag && lineHasTag) {
          bufferUntilTag = true;
          continue;
        }

        // Handle ending tags
        if (bufferUntilTag && lineHasTag) {
          bufferUntilTag = false;
        }

        // Buffer lines within tags
        if (bufferUntilTag) {
          continue;
        }
      }

      // Buffer until bufferSize is reached
      if (lines.length < bufferSize) {
        continue;
      }

      // Render buffered lines:

      // Render preview fragment on first render
      if (isFirstRender) {
        await queueRequestAnimationFrame(() => {
          const previewFragment = createFragment(lines, "text", offset);
          this.#appendToContainer(previewFragment);
        });
      }

      // Render code fragment
      await queueRequestAnimationFrame(() => {
        const codeFragment = createFragment(lines, this.language, offset);

        // Clean up preview fragment
        if (isFirstRender) {
          this.#clearContainer();
          isFirstRender = false;
        }

        this.#appendToContainer(codeFragment);
        offset += lines.length;
        lines = [];
      });

      bufferSize = this.#calculateBufferSize();
    }

    // Render remaining lines
    if (lines.length) {
      await queueRequestAnimationFrame(() => {
        const finalFragment = createFragment(lines, this.language, offset);
        this.#appendToContainer(finalFragment);
        offset += lines.length;
        lines = [];
      });
    }

    const actualLineNumWidth = offset.toString().length;
    if (lineNumWidth < actualLineNumWidth) {
      this.#setLineNumWidth(actualLineNumWidth);
    }

    // Rendering completed
    progressBar.value = 0;
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
