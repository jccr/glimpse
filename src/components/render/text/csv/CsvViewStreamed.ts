import { html, LitElement, PropertyValues } from "lit";
import { ref, createRef, Ref } from "lit/directives/ref.js";

import { customElement, property } from "lit/decorators.js";
import Papa from "papaparse";
import { AppStyledElement } from "@/components/AppStyledElement";
import "./CsvTableStreamed";

import { CsvTable } from "./CsvTableStreamed";

@customElement("csv-view")
export class CsvView extends AppStyledElement(LitElement) {
  @property({ type: File, attribute: false })
  file: File | null = null;

  csvTableRef: Ref<CsvTable> = createRef();

  appendRows(rows: unknown[][]) {
    this.csvTableRef.value?.appendRows(rows);
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    if (!this.file) return;
    const file = this.file;
    Papa.parse(file, {
      complete: () => {
        console.log("complete!");
      },
      error: (e) => {
        console.error(e);
      },
      worker: false,
      skipEmptyLines: true,
      header: false,
      chunkSize: 100 * 1024, // 100kb
      chunk: (results) => {
        this.appendRows(results.data as unknown[][]);
      },
    });
  }

  render() {
    return html` <csv-table ${ref(this.csvTableRef)}></csv-table> `;
  }
}
