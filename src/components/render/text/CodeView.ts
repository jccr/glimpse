import { html, css, LitElement } from "lit";
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

@customElement("code-view")
export class CodeView extends AppStyledElement(
  LitElement,
  css`
    div {
      display: block;
      /* boost rendering performance for huge amounts of lines */
      content-visibility: auto;
      contain-intrinsic-size: auto 1.5em;
    }
  `,
) {
  @property({ type: File, attribute: false })
  file: File | null = null;

  #streamChunkSize = 100 * 1024; // 100kb
  #lineBufferSize = 1000;

  @property({ type: String })
  language: string = "plaintext";

  #codeRef: Ref<HTMLElement> = createRef();
  #progressRef: Ref<HTMLProgressElement> = createRef();

  #clear() {
    this.#codeRef.value?.replaceChildren();
  }

  #appendChunk(chunk: string): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        const documentFragment = this.ownerDocument.createDocumentFragment();
        const div = document.createElement("div");
        div.textContent = chunk;
        documentFragment.appendChild(div);
        this.#codeRef.value?.appendChild(documentFragment);
        resolve();
      });
    });
  }

  #appendFragment(fragment: DocumentFragment): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        this.#codeRef.value?.appendChild(fragment);
        resolve();
      });
    });
  }

  protected async firstUpdated() {
    if (!this.file) {
      return;
    }

    this.#clear();
    const progress = this.#progressRef.value || { value: 0, max: 0 };

    let documentFragment = this.ownerDocument.createDocumentFragment();

    for await (let line of makeTextFileLineIterator(this.file)) {
      const div = document.createElement("div");
      div.textContent = line;
      documentFragment.appendChild(div);
      if (documentFragment.children.length >= this.#lineBufferSize) {
        await this.#appendFragment(documentFragment);
        documentFragment = this.ownerDocument.createDocumentFragment();
      }
      progress.value += line.length;
    }

    if (documentFragment.children.length) {
      await this.#appendFragment(documentFragment);
    }

    progress.value = this.file.size;

    // const stream = this.file.stream();
    // const reader = stream.getReader();
    // const utf8Decoder = new TextDecoder("utf-8");

    // let totalRead = 0;
    // let chunk = "";
    // let chunkLength = 0;

    // while (true) {
    //   const { done, value } = await reader.read();

    //   if (done) {
    //     if (chunkLength) {
    //       await this.#appendChunk(chunk);
    //       progress.value += chunkLength;
    //     }
    //     console.log("Done!");
    //     // progress.value = 0;
    //     break;
    //   }

    //   totalRead += value.length;
    //   chunkLength += value.length;
    //   const decoded = utf8Decoder.decode(value, { stream: true });
    //   chunk += decoded;

    //   if (chunkLength > this.#streamChunkSize) {
    //     await this.#appendChunk(chunk);
    //     progress.value += chunkLength;
    //     chunk = "";
    //     chunkLength = 0;
    //   }
    // }
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
