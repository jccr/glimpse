import { html, css, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { AppStyledElement } from "@/components/AppStyledElement";
import { hasHeaders } from "./lib/csvHeaderHeuristics";

@customElement("csv-table")
export class CsvTable extends AppStyledElement(
  LitElement,
  css`
    .index-column {
      width: 1em;
    }
  `,
) {
  @property({ type: Array<Array<String>>, attribute: false })
  data: string[][] | null = null;

  @property({ type: Boolean })
  headers: boolean = false;

  @property({ type: Boolean })
  skipHeaderCheck: boolean = false;

  private get hasHeaders() {
    if (this.skipHeaderCheck) return this.headers;
    if (!this.data) return false;
    return hasHeaders(this.data[0], this.data.slice(1, 10));
  }

  private get firstRow() {
    return this.data?.[0];
  }

  private get rows() {
    return (this.hasHeaders ? this.data?.slice(1) : this.data) ?? [];
  }

  protected render(): unknown {
    return html`<div>
      <table class="table table-pin-rows table-pin-cols">
        ${this.hasHeaders
          ? html`<thead>
              <tr>
                <th></th>
                ${this.firstRow?.map((header) => html`<td>${header}</td>`)}
                <th></th>
              </tr>
            </thead>`
          : null}
        <tbody>
          ${this.rows.map(
            (row, index) =>
              html`<tr>
                <th class="index-column">${index + 1}</th>
                ${row.map((cell) => html`<td>${cell}</td>`)}
                <th class="index-column">${index + 1}</th>
              </tr>`,
          )}
        </tbody>
        ${this.hasHeaders
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
