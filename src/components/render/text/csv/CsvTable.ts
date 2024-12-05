import { html, css, LitElement, render } from "lit";
import { ref, createRef, Ref } from "lit/directives/ref.js";
import { customElement, property } from "lit/decorators.js";
import { AppStyledElement } from "@/components/AppStyledElement";
import { hasHeader } from "./lib/csvHeaderHeuristics";

@customElement("csv-table")
export class CsvTable extends AppStyledElement(
  LitElement,
  css`
    tr {
      /* boost rendering performance for huge amounts of rows */
      content-visibility: auto;
      contain-intrinsic-size: auto 3em;
    }
    .index-column {
      width: 1em;
    }
  `,
) {
  @property({ type: Array<Array<String>>, attribute: false })
  data?: string[][];

  @property({ type: Boolean })
  header: boolean = false;

  @property({ type: Boolean, attribute: "skip-header-check" })
  skipHeaderCheck: boolean = false;

  private get hasHeader() {
    if (this.skipHeaderCheck) return this.header;

    if (this.data) {
      return hasHeader(this.data[0], this.data.slice(1, 10));
    }

    if (this.#firstRow && this.#firstChunk) {
      const firstRow = this.#firstRow as string[];
      const firstChunk = this.#firstChunk as string[][];
      return hasHeader(firstRow, firstChunk.slice(1, 10));
    }

    return false;
  }

  #tbodyRef: Ref<HTMLTableSectionElement> = createRef();

  #firstChunk?: unknown[][];
  #firstRow?: unknown[];
  #index = 0;

  private get firstRow() {
    return this.data?.[0] ?? this.#firstRow;
  }

  private get rows() {
    return (this.hasHeader ? this.data?.slice(1) : this.data) ?? [];
  }

  private renderRows(rows: unknown[][], isChunked = false) {
    return html`${rows.map((row, index) => {
      let rowIndex = index + 1;
      if (isChunked) {
        rowIndex = this.#index++ + 1;
      }
      return html`<tr>
        <th class="index-column">${rowIndex}</th>
        ${row.map((cell) => html`<td>${cell}</td>`)}
        <th class="index-column">${rowIndex}</th>
      </tr>`;
    })}`;
  }

  appendRows(rows: unknown[][]) {
    let rowsToRender = rows;
    const tbody = this.#tbodyRef.value;
    if (!tbody) return;

    if (!this.#firstChunk) {
      this.#firstChunk = rows;
    }

    if (!this.#firstRow) {
      this.#firstRow = rows[0];

      if (this.hasHeader) {
        rowsToRender = rows.slice(1);
      }
    }

    this.requestUpdate();

    const documentFragment = this.ownerDocument.createDocumentFragment();
    const htmlTemplate = this.renderRows(rowsToRender, true);
    render(htmlTemplate, documentFragment);

    tbody.appendChild(documentFragment);
  }

  clearRows() {
    this.#tbodyRef.value?.replaceChildren();
  }

  protected render(): unknown {
    return html`<div>
      <table class="table table-pin-rows table-pin-cols">
        ${this.hasHeader
          ? html`<thead>
              <tr>
                <th></th>
                ${this.firstRow?.map((header) => html`<td>${header}</td>`)}
                <th></th>
              </tr>
            </thead>`
          : null}
        <tbody ${ref(this.#tbodyRef)}>
          ${this.data?.length ? this.renderRows(this.rows) : null}
        </tbody>
        ${this.hasHeader
          ? html`<tfoot>
              <tr>
                <th></th>
                ${this.firstRow?.map((header) => html`<td>${header}</td>`)}
                <th></th>
              </tr>
            </tfoot>`
          : null}
      </table>
    </div>`;
  }
}
