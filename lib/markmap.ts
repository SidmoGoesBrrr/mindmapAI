import { loadCSS, loadJS } from 'markmap-common';
import { Transformer } from 'markmap-lib';
import * as markmap from 'markmap-view';

export const transformer = new Transformer();
const assets = transformer.getAssets();
const styles = assets.styles || [];
const scripts = assets.scripts || [];

// Only load assets in the browser (i.e. when document is defined)
if (typeof document !== 'undefined') {
  loadCSS(styles);
  loadJS(scripts, { getMarkmap: () => markmap });
}
