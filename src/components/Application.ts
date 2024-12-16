import { Router, RouteConfig } from "@lit-labs/router";
import { AppStyledElement } from "./AppStyledElement";
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import "./ThemeSelector";
import "./Icon";
import "./pages/StartPage";
import { initNavigation, navigate } from "../navigation";

@customElement("x-app")
export class Application extends AppStyledElement(LitElement) {
  #files: Map<string, File> = new Map();

  private routes: RouteConfig[] = [
    {
      path: "/",
      name: "Start",
      render: () => html`
        <start-page
          @file-drop=${(e: CustomEvent) => {
            const file = e.detail as File;
            const key = `${encodeURIComponent(file.name) ?? "file"}/${file.lastModified ?? file.size}`;
            this.#files.set(key, file);
            navigate(`/${file.type}/${key}`);
          }}
        ></start-page>
      `,
    },
    {
      path: "/text/csv/:name/:lastModified",
      name: "CSV Preview",
      enter: async () => {
        await import("./render/text/csv/CsvView");
        return true;
      },
      render: ({ name, lastModified }) => {
        const file = this.#files.get(`${name}/${lastModified}`);
        if (!file) {
          navigate("/error");
          return;
        }

        return html`<csv-view .file=${file}></csv-view>`;
      },
    },
    {
      path: "/text/html/:name/:lastModified",
      name: "HTML Preview",
      enter: async () => {
        await import("./render/text/CodeView");
        return true;
      },
      render: ({ name, lastModified }) => {
        const file = this.#files.get(`${name}/${lastModified}`);
        if (!file) {
          navigate("/error");
          return;
        }

        return html`<code-view
          .file=${file}
          language="html"
          line-numbers
        ></code-view>`;
      },
    },
    {
      path: "/error",
      render: () => html`UNKNOWN ERROR`,
    },
    {
      path: "/*",
      render: () => html`UNKNOWN ROUTE`,
    },
  ];

  private router = new Router(this, this.routes);

  render() {
    return html`
      <div class="grid grid-rows-[auto_1fr] h-screen">
        <div class="navbar bg-base-300 z-10">
          <div class="flex-1">
            <a href="/" class="btn btn-ghost text-xl">glimpse</a>
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
