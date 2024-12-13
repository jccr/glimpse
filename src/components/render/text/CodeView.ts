import { html, css, LitElement } from "lit";
// import { createHighlighter } from "shiki";
import { createHighlighterCore } from "shiki/core";
// import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
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
    requestAnimationFrame(() => {
      resolve(fn());
    });
  });
}

function doubleUntilMax(initialValue = 50, maxValue = 1000) {
  let currentValue = initialValue;

  return function () {
    if (currentValue >= maxValue) {
      return maxValue;
    }

    currentValue *= 2;
    return currentValue;
  };
}

@customElement("code-view")
export class CodeView extends AppStyledElement(
  LitElement,
  css`
    .line {
      /* boost rendering performance for huge amounts of lines */
      content-visibility: auto;
      contain-intrinsic-size: auto 1.5em;
    }
  `,
) {
  @property({ type: File, attribute: false })
  file: File | null = null;

  #firstBufferSize = 50;
  #lineBufferSize = 5000;

  #getBufferSize = doubleUntilMax(this.#firstBufferSize, this.#lineBufferSize);

  @property({ type: String })
  language: string = "text";

  @property({ type: String })
  theme: string = "github-dark";

  #codeRef: Ref<HTMLElement> = createRef();
  #progressRef: Ref<HTMLProgressElement> = createRef();

  #clear() {
    this.#codeRef.value?.replaceChildren();
  }

  #abort = false;

  async #appendFragment(fragment: DocumentFragment) {
    this.#codeRef.value?.appendChild(fragment);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#abort = true;
  }

  protected async firstUpdated() {
    if (!this.file) {
      return;
    }

    const highlighter = await createHighlighterCore({
      themes: [import(`shiki/dist/themes/${this.theme}.mjs`)],
      langs:
        this.language === "text"
          ? []
          : [import(`shiki/dist/langs/${this.language}.mjs`)],
      // engine: createJavaScriptRegexEngine({ forgiving: true }),
      engine: createOnigurumaEngine(import("shiki/wasm")),
    });

    this.#clear();

    const progress = this.#progressRef.value || { value: 0, max: 0 };
    progress.value = progress.max / 90;

    let documentFragment = this.ownerDocument.createDocumentFragment();

    const domParser = new DOMParser();

    let lines: string[] = [];
    let firstRender = true;

    const appendLines = (language = this.language) => {
      if (!lines.length) {
        return;
      }
      const code = lines.join("\n");
      console.log(lines.length);
      const html = highlighter.codeToHtml(code, {
        theme: this.theme,
        lang: language,
      });
      const doc = domParser.parseFromString(html, "text/html");
      documentFragment.append(...doc.body.childNodes);
    };

    let bufferSize = this.#getBufferSize();

    for await (let line of makeTextFileLineIterator(this.file)) {
      if (this.#abort) {
        return;
      }

      lines.push(line);
      if (lines.length >= bufferSize) {
        if (firstRender) {
          console.time("append preview");
          await queueRequestAnimationFrame(async () => {
            appendLines("text");
            await this.#appendFragment(documentFragment);
            documentFragment = this.ownerDocument.createDocumentFragment();
            console.timeEnd("append preview");
          });
        }
        bufferSize = this.#getBufferSize();
        console.time("append");
        await queueRequestAnimationFrame(async () => {
          appendLines();
          if (firstRender) {
            this.#clear();
          }
          await this.#appendFragment(documentFragment);
          documentFragment = this.ownerDocument.createDocumentFragment();
          lines = [];
          console.timeEnd("append");
        });

        firstRender = false;
      }
      progress.value += line.length;
    }

    if (lines.length) {
      console.time("append last");
      await queueRequestAnimationFrame(async () => {
        appendLines();
        await this.#appendFragment(documentFragment);
        documentFragment = this.ownerDocument.createDocumentFragment();
        lines = [];
        console.timeEnd("append last");
      });

      firstRender = false;
    }

    progress.value = 0; // finished
  }

  render() {
    return html`<progress
        ${ref(this.#progressRef)}
        class="progress block h-0.5 bg-base-100 fixed top-[1px] z-10"
        value="0"
        max=${this.file?.size ?? 0}
      ></progress>
      <pre class="p-2"><code ${ref(this.#codeRef)} class="language-${this
        .language}"></code></pre>`;
  }
}
