import { html, LitElement } from "lit";
import { AppStyledElement } from "../AppStyledElement";
import { customElement } from "lit/decorators.js";
import "../FileDrop";

@customElement("start-page")
export class StartPage extends AppStyledElement(LitElement) {
  protected render(): unknown {
    return html`
      <div class="p-8 w-full h-full">
        <file-drop
          @file=${(e: CustomEvent) => {
            this.dispatchEvent(new CustomEvent("file", { detail: e.detail }));
          }}
        ></file-drop>
      </div>
    `;
  }
}
