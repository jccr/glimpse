import { ref, createRef, Ref } from "lit/directives/ref.js";
import { html, css, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { AppStyledElement } from "./AppStyledElement";

@customElement("file-drop")
export class FileDrop extends AppStyledElement(
  LitElement,
  css`
    .drag-hover .icon-onhover {
      visibility: visible;
    }

    .drag-hover .icon-default {
      visibility: hidden;
    }
  `,
) {
  iconRef: Ref<HTMLElement> = createRef();

  @property({ type: File, attribute: false })
  file: File | null = null;

  protected onDragOver(event: DragEvent) {
    event.preventDefault();
    this.iconRef.value?.classList.add("drag-hover");
    if (!event.dataTransfer) return;
    var effectAllowed;
    try {
      effectAllowed = event.dataTransfer.effectAllowed;
    } catch (error) {
      // Handle error if necessary
    }
    event.dataTransfer.dropEffect =
      effectAllowed === "move" || effectAllowed === "linkMove"
        ? "move"
        : "copy";
  }

  protected onDrop(event: DragEvent) {
    event.preventDefault();
    this.iconRef.value?.classList.remove("drag-hover");
    this.file = event.dataTransfer?.files[0] || null;
    this.dispatchEvent(new CustomEvent("file", { detail: this.file }));
  }

  protected onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.file = input.files?.[0] || null;
    this.dispatchEvent(new CustomEvent("file", { detail: this.file }));
  }

  protected render(): unknown {
    return html`<div
      class="flex items-center justify-center w-full h-full"
      @dragover=${this.onDragOver}
      @drop=${this.onDrop}
      @dragenter=${() => this.iconRef.value?.classList.add("drag-hover")}
      @dragleave=${() => this.iconRef.value?.classList.remove("drag-hover")}
      @dragend=${() => this.iconRef.value?.classList.remove("drag-hover")}
    >
      <label
        for="dropzone-file"
        class="flex flex-col items-center justify-center w-full h-full border-2 border-neutral border-dashed rounded-lg cursor-pointer bg-base-50 hover:bg-base-100"
      >
        <div
          class="flex flex-col items-center justify-center pt-5 pb-6"
          id="drop-icon"
          ${ref(this.iconRef)}
        >
          <div class="w-8 h-8 mb-4">
            <svg
              class="absolute w-8 h-8 animate-bounce invisible icon-onhover"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                fill-rule="evenodd"
                d="M9 7V2.221a2 2 0 0 0-.5.365L4.586 6.5a2 2 0 0 0-.365.5H9Zm2 0V2h7a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5h7.586l-.293.293a1 1 0 0 0 1.414 1.414l2-2a1 1 0 0 0 0-1.414l-2-2a1 1 0 0 0-1.414 1.414l.293.293H4V9h5a2 2 0 0 0 2-2Z"
                clip-rule="evenodd"
              />
            </svg>
            <svg
              class="absolute w-8 h-8 icon-default"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 12V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-4m5-13v4a1 1 0 0 1-1 1H5m0 6h9m0 0-2-2m2 2-2 2"
              />
            </svg>
          </div>

          <p class="mb-2 text-sm text-center">
            <span class="font-semibold">Drag & drop a file to preview</span
            ><br />
            or click to choose a file
          </p>
        </div>
        <input
          id="dropzone-file"
          type="file"
          class="hidden"
          @change=${this.onFileChange}
        />
      </label>
    </div>`;
  }
}
