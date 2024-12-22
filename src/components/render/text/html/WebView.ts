import { html, css, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { AppStyledElement } from "@/components/AppStyledElement";

@customElement("web-view")
export class WebView extends AppStyledElement(LitElement, css``) {
  @property({ type: File, attribute: false })
  file: File | null = null;

  render() {
    if (!this.file) return;

    return html`<iframe
      src="${URL.createObjectURL(this.file)}"
      style="width: 100%; height: 100%;"
    ></iframe>`;
  }
}
