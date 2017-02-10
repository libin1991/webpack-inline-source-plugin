const assert = require('assert');
const fs = require('fs');

function typeOf(value, type) {
  return Object.prototype.toString.call(value).slice(8, -1).toLowerCase() === type.toLowerCase();
}

function normalizeAssets(assets, normalized = { body: [], head: [] }) {
  if (typeOf(assets, 'string')) {
    normalized.body.push({
      path: assets,
      type: 'js'
    });
  } else if (typeOf(assets, 'object')) {
    normalized[assets.inject === 'head' ? 'head' : 'body'].push({
      path: assets.path,
      type: assets.type === 'css' ? 'css' : 'js'
    });
  } else if (typeOf(assets, 'array')) {
    assets.forEach((asset) => {
      normalized = normalizeAssets(asset, normalized);
    });
  }
  return normalized;
}

function extractSource(path) {
  return fs.readFileSync(path, { encoding: 'utf8' }).toString();
}

function processAsset(asset) {
  if (asset.type === 'css') {
    return `<style type="text/css">${extractSource(asset.path)}</style>`;
  }
  return `<script type="text/javascript">${extractSource(asset.path)}</script>`;
}

function WebpackInlineSourcePlugin(assets) {
  assert(
    typeOf(assets, 'array') ||
    typeOf(assets, 'object') ||
    typeOf(assets, 'string'),
    'Should assign a String, Object or Array<String|Object> asset configuration'
  );
  this.assets = normalizeAssets(assets);
}

WebpackInlineSourcePlugin.prototype.apply = function(compiler) {
  const self = this;
  compiler.plugin('compilation', (compilation) => {
    compilation.plugin('html-webpack-plugin-before-html-processing', (htmlPluginData, callback) => {
      self.assets.body = self.assets.body.map(processAsset);
      self.assets.head = self.assets.head.map(processAsset);
      htmlPluginData.html = htmlPluginData.html.replace(/(<\/head>)/i, (match, head) => self.assets.head.join('\n') + head);
      htmlPluginData.html = htmlPluginData.html.replace(/(<\/body>)/i, (match, body) => self.assets.body.join('\n') + body);
      callback(null, htmlPluginData);
    });
  });
};

module.exports = WebpackInlineSourcePlugin;
