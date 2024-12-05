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

  @property({ type: Boolean, attribute: "disable-streaming" })
  disableStreaming: boolean = false;

  @property({ type: Boolean, attribute: "use-worker" })
  useWorker: boolean = false;

  #csvTableRef: Ref<CsvTable> = createRef();

  #appendRows(rows: unknown[][]) {
    this.#csvTableRef.value?.appendRows(rows);
  }

  #clearRows() {
    this.#csvTableRef.value?.clearRows();
  }

  protected firstUpdated(): void {
    if (this.disableStreaming || !this.file) {
      return;
    }

    this.#clearRows();

    const file = this.file;
    Papa.parse(file, {
      complete: () => {},
      error: (e) => {
        console.error(e);
      },
      worker: this.useWorker,
      skipEmptyLines: true,
      header: false,
      chunkSize: 100 * 1024, // 100kb
      chunk: (results) => {
        this.#appendRows(results.data as unknown[][]);
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

    return html`<csv-table ${ref(this.#csvTableRef)}></csv-table> `;
  }
}
