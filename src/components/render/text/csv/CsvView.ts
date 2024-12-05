import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import Papa from "papaparse";
import { AppStyledElement } from "@/components/AppStyledElement";
import "./CsvTableStreamed";

import { Task } from "@lit/task";

@customElement("csv-view")
export class CsvView extends AppStyledElement(LitElement) {
  @property({ type: File, attribute: false })
  file: File | null = null;

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
          worker: false,
          skipEmptyLines: true,
          header: false,
          // dynamicTyping: true,
          chunkSize: 100 * 1024, // 100kb
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
    return this._parseCsvTask.render({
      pending: () => html`<p>Loading...</p>`,
      complete: (data) => html` <csv-table .data=${data}></csv-table> `,
      error: (e) => html`<p>Error: ${e}</p>`,
    });
  }
}
