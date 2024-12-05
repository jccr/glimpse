import { html, css, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { virtualize } from "@lit-labs/virtualizer/virtualize.js";
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
      <table class="table w-full table-pin-rows table-pin-cols">
        ${this.hasHeaders
          ? html`<thead class="relative block w-screen">
              <tr class="w-full">
                <th class="index-column"></th>
                ${this.firstRow?.map(
                  (header) => html`<td class="w-full">${header}</td>`,
                )}
                <th class="index-column"></th>
              </tr>
            </thead>`
          : null}
        <tbody class="w-screen !min-h-screen">
          ${virtualize({
            scroller: true,
            items: this.rows,
            renderItem: (row, index) =>
              html`<tr class="w-full">
                <th class="index-column">${index + 1}</th>
                ${row.map((cell) => html`<td class="w-full">${cell}</td>`)}
                <th class="index-column">${index + 1}</th>
              </tr>`,
          })}
        </tbody>
        ${this.hasHeaders
          ? html`<tfoot class="relative block w-screen">
              <tr class="w-full">
                <th class="index-column"></th>
                ${this.firstRow?.map(
                  (header) => html`<td class="w-full">${header}</td>`,
                )}
                <th class="index-column"></th>
              </tr>
            </tfoot>`
          : null}
      </table>
    </div>`;
  }
}
