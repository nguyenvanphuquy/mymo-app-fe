const path = require('path');

function nunitoTextPlugin({ types: t }) {
  const target = path.resolve(__dirname, 'src/ui/AppText');

  return {
    name: 'nunito-text',
    visitor: {
      ImportDeclaration(importPath, state) {
        if (importPath.node.source.value !== 'react-native') return;
        if (importPath.node.importKind === 'type') return;

        const filename = String(state.filename || '').replace(/\\/g, '/');
        if (filename.includes('/node_modules/') || filename.endsWith('/src/ui/AppText.tsx')) return;

        const taken = [];
        const kept = [];
        for (const spec of importPath.node.specifiers) {
          const importedName =
            spec.type === 'ImportSpecifier' && spec.imported
              ? spec.imported.name || spec.imported.value
              : null;
          const isText =
            spec.type === 'ImportSpecifier' &&
            spec.importKind !== 'type' &&
            (importedName === 'Text' || importedName === 'TextInput');
          if (isText) taken.push(spec);
          else kept.push(spec);
        }
        if (taken.length === 0) return;

        let rel = path.relative(path.dirname(state.filename), target).replace(/\\/g, '/');
        if (!rel.startsWith('.')) rel = `./${rel}`;

        const nunitoImport = t.importDeclaration(
          taken.map((spec) =>
            t.importSpecifier(t.identifier(spec.local.name), t.identifier(spec.imported.name)),
          ),
          t.stringLiteral(rel),
        );

        if (kept.length === 0) {
          importPath.replaceWith(nunitoImport);
        } else {
          importPath.node.specifiers = kept;
          importPath.insertAfter(nunitoImport);
        }
      },
    },
  };
}

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [nunitoTextPlugin],
  };
};
