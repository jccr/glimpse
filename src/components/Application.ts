import { Router, PathRouteConfig } from "@lit-labs/router";
import { AppStyledElement } from "./AppStyledElement";
import { ref, createRef, Ref } from "lit/directives/ref.js";
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import "./ThemeSelector";
import "./Icon";
import "./pages/StartPage";
import "./render/text/csv/CsvTable";
import { initNavigation } from "../navigation";
import { CsvTable } from "./render/text/csv/CsvTable";
import Papa from "papaparse";

@customElement("x-app")
export class Application extends AppStyledElement(LitElement) {
  _file: File | null = null;

  get file(): File | null {
    return this._file;
  }

  csvTableRef: Ref<CsvTable> = createRef();

  set file(file: File | null) {
    console.log("file", file);
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        if (!this.csvTableRef.value) return;
        this.csvTableRef.value.data = results.data as string[][];
      },
    });

    // const reader = new FileReader();
    // reader.onload = () => {};
    // reader.readAsText(file);
  }

  private routes: PathRouteConfig[] = [
    {
      path: "/",
      name: "Start",
      render: () => html`
        <start-page
          @file=${(e: CustomEvent) => {
            this.router.goto("/csv");
            this.file = e.detail;
          }}
        ></start-page>
      `,
    },
    {
      path: "/csv",
      name: "CSV",
      render: () => html`<csv-table ${ref(this.csvTableRef)}></csv-table>`,
    },
  ];

  private router = new Router(this, this.routes);

  render() {
    return html`
      <div class="grid grid-rows-[auto_1fr] h-screen">
        <div class="navbar bg-base-300 z-10">
          <div class="flex-1">
            <a class="btn btn-ghost text-xl">glimpse</a>
          </div>
          <div class="flex-none">
            <theme-selector></theme-selector>
          </div>
        </div>

        <div class="bg-base-200">${this.router.outlet()}</div>
      </div>
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    initNavigation(this.router);
  }
}
