import { html, LitElement } from "lit";
import { ref, createRef, Ref } from "lit/directives/ref.js";
import { customElement, property } from "lit/decorators.js";
import Papa from "papaparse";
import { Task } from "@lit/task";
import { AppStyledElement } from "@/components/AppStyledElement";
import "./CsvTable";
import { CsvTable } from "./CsvTable";

@customElement("csv-view")
export class CsvView extends AppStyledElement(LitElement) {
  @property({ type: File, attribute: false })
  file: File | null = null;

  #streamChunkSize = 100 * 1024; // 100kb

  @property({ type: Boolean, attribute: "disable-streaming" })
  disableStreaming: boolean = false;

  @property({ type: Boolean, attribute: "use-worker" })
  useWorker: boolean = false;

  #csvTableRef: Ref<CsvTable> = createRef();
  #progressRef: Ref<HTMLProgressElement> = createRef();

  #appendRows(rows: unknown[][]) {
    this.#csvTableRef.value?.appendRows(rows);
  }

  #clearRows() {
    this.#csvTableRef.value?.clearRows();
  }

  protected firstUpdated() {
    if (this.disableStreaming || !this.file) {
      return;
    }

    this.#clearRows();

    const progress = this.#progressRef.value || { value: 0, max: 0 };

    const file = this.file;
    Papa.parse(file, {
      complete: () => {
        progress.value = 0;
      },
      error: (e) => {
        console.error(e);
      },
      worker: this.useWorker,
      skipEmptyLines: true,
      header: false,
      chunkSize: this.#streamChunkSize,
      chunk: (results) => {
        this.#appendRows(results.data as unknown[][]);
        progress.value += this.#streamChunkSize;
      },
    });
  }

  private _parseCsvTask = new Task(this, {
    task: async ([file], { signal }) => {
      return new Promise<string[][]>((resolve, reject) => {
        const data: string[][] = [];
        if (!file) {
          reject(new Error("No file provided"));
          return;
        }
        Papa.parse(file, {
          complete: () => resolve(data),
          error: (e) => reject(e),
          worker: this.useWorker,
          skipEmptyLines: true,
          header: false,
          chunkSize: 500 * 1024, // 500kb
          chunk: (results, parser) => {
            data.push(...(results.data as string[][]));
            if (signal.aborted) {
              parser.abort();
              reject(new Error("Aborted"));
              return;
            }
          },
        });
      });
    },
    args: () => [this.file],
  });

  render() {
    if (this.disableStreaming) {
      return this._parseCsvTask.render({
        pending: () => html`<p>Loading...</p>`,
        complete: (data) => html` <csv-table .data=${data}></csv-table> `,
        error: (e) => html`<p>Error: ${e}</p>`,
      });
    }

    return html`
      <progress
        ${ref(this.#progressRef)}
        class="progress block h-0.5 bg-base-100 sticky top-[1px] z-10"
        value="0"
        max=${this.file?.size ?? 0}
      ></progress>
      <csv-table ${ref(this.#csvTableRef)}></csv-table>
    `;
  }
}
