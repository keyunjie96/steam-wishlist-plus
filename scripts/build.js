#!/usr/bin/env node
/**
 * Build script for Chrome extension.
 * Uses esbuild to compile TypeScript to browser-compatible IIFE format.
 */
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const srcDir = path.join(__dirname, '..', 'src');
const distDir = path.join(__dirname, '..', 'dist');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Files to build - each becomes a self-contained IIFE
const files = [
  'types.ts',
  'icons.ts',
  'cache.ts',
  'wikidataClient.ts',
  'hltbClient.ts',
  'hltbContent.ts',
  'hltbPageScript.ts',
  'reviewScoresClient.ts',
  'steamDeckClient.ts',
  'steamDeckPageScript.ts',
  'resolver.ts',
  'background.ts',
  'content.ts',
  'options.tsx',
  'popup.tsx',
];

async function build() {
  // Step 1: Build the shared Preact vendor bundle.
  // This avoids duplicating Preact in both popup.js and options.js,
  // and keeps coverage metrics accurate (vendor code is separate).
  await esbuild.build({
    stdin: {
      contents: [
        'import * as preact from "preact";',
        'import * as preactHooks from "preact/hooks";',
        'globalThis.__SWP_preact = preact;',
        'globalThis.__SWP_preactHooks = preactHooks;',
      ].join('\n'),
      resolveDir: path.join(__dirname, '..'),
      loader: 'ts',
    },
    outfile: path.join(distDir, 'preact-vendor.js'),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    sourcemap: true,
    legalComments: 'inline',
  });
  console.log('Built: preact-vendor.js');

  // Plugin that redirects preact imports to the globally loaded vendor bundle
  const preactGlobalPlugin = {
    name: 'preact-global',
    setup(build) {
      build.onResolve({ filter: /^preact(\/hooks)?$/ }, args => ({
        path: args.path,
        namespace: 'preact-global',
      }));
      build.onLoad({ filter: /.*/, namespace: 'preact-global' }, args => ({
        contents: args.path === 'preact'
          ? 'module.exports = globalThis.__SWP_preact;'
          : 'module.exports = globalThis.__SWP_preactHooks;',
        loader: 'js',
      }));
    }
  };

  // Step 2: Build all source files
  for (const file of files) {
    const isTsx = file.endsWith('.tsx');
    const entryPoint = path.join(srcDir, file);
    const outfile = path.join(distDir, file.replace(/\.tsx?$/, '.js'));

    const buildOptions = {
      entryPoints: [entryPoint],
      outfile,
      bundle: true,
      format: 'iife',
      platform: 'browser',
      target: 'es2020',
      sourcemap: true,
      // Preserve istanbul ignore comments for test coverage
      legalComments: 'inline',
      // Mark chrome as external (it's a global in extensions)
      external: ['chrome'],
    };

    if (isTsx) {
      // TSX files (popup, options): bundle components, use global Preact vendor
      buildOptions.jsx = 'automatic';
      buildOptions.jsxImportSource = 'preact';
      buildOptions.plugins = [
        preactGlobalPlugin,
        {
          name: 'externalize-non-component-imports',
          setup(build) {
            // Only externalize imports that are NOT components
            build.onResolve({ filter: /^\.\.?\// }, args => {
              if (args.importer.includes('/src/')) {
                // Allow bundling component imports and CSS
                if (args.path.includes('/components/') || args.path.endsWith('.css')) {
                  return; // Bundle it
                }
                return { path: args.path, external: true };
              }
            });
          }
        }
      ];
    } else {
      // Regular TS files: externalize all local imports
      buildOptions.plugins = [{
        name: 'externalize-local-imports',
        setup(build) {
          build.onResolve({ filter: /^\.\.?\// }, args => {
            if (args.importer.includes('/src/')) {
              return { path: args.path, external: true };
            }
          });
        }
      }];
    }

    await esbuild.build(buildOptions);
    console.log(`Built: ${file}`);
  }

  console.log('Build complete!');

  // Mark preact-vendor.js as ignored for coverage (third-party code)
  const vendorPath = path.join(distDir, 'preact-vendor.js');
  if (fs.existsSync(vendorPath)) {
    const vendorContent = fs.readFileSync(vendorPath, 'utf8');
    fs.writeFileSync(vendorPath, '/* istanbul ignore file */\n' + vendorContent);
  }

  // Post-process: Add istanbul ignore comments for debug branches
  // This ensures code coverage doesn't penalize debug-only code paths
  addIstanbulIgnoreComments();
}

/**
 * Add /* istanbul ignore next * / comments before DEBUG branches
 * so that code coverage doesn't require testing debug-only code.
 */
function addIstanbulIgnoreComments() {
  const filesToProcess = [
    'content.js',
    'cache.js',
    'hltbClient.js',
    'reviewScoresClient.js',
    'steamDeckClient.js',
    'resolver.js',
    'steamDeckPageScript.js',
    'hltbPageScript.js',
    'options.js',
    'background.js',
    'wikidataClient.js',
    'popup.js',
    'hltbContent.js'
  ];

  for (const file of filesToProcess) {
    const filePath = path.join(distDir, file);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, 'utf8');

    // Pattern: if (DEBUG_FLAG) or if (SOME_DEBUG)
    // Add /* istanbul ignore next */ before these patterns
    const debugPatterns = [
      /if \(DEBUG\)/g,
      /if \(CACHE_DEBUG\)/g,
      /if \(RESOLVER_DEBUG\)/g,
      /if \(STEAM_DECK_DEBUG\)/g,
      /if \(HLTB_DEBUG\)/g,
      /if \(WIKIDATA_DEBUG\)/g,
      /} else if \(DEBUG\)/g,
      /} else if \(CACHE_DEBUG\)/g,
      /} else if \(RESOLVER_DEBUG\)/g,
    ];

    for (const pattern of debugPatterns) {
      content = content.replace(pattern, (match) => {
        // Don't add if already has istanbul ignore
        if (content.includes('/* istanbul ignore') && content.indexOf(match) < 100) {
          return match;
        }
        return '/* istanbul ignore next */ ' + match;
      });
    }

    // Also ignore MANUAL_OVERRIDES that only run when CACHE_DEBUG is true
    content = content.replace(
      /var MANUAL_OVERRIDES = CACHE_DEBUG \?/g,
      '/* istanbul ignore next */ var MANUAL_OVERRIDES = CACHE_DEBUG ?'
    );

    // Ignore platformStatus function (only used in debug mode with CACHE_DEBUG)
    content = content.replace(
      /function platformStatus\(\{/g,
      '/* istanbul ignore next */ function platformStatus({'
    );

    // Ignore DEBUG && condition combinations
    content = content.replace(
      /if \(DEBUG && hltbData && hltbData\.mainStory > 0\)/g,
      '/* istanbul ignore next */ if (DEBUG && hltbData && hltbData.mainStory > 0)'
    );

    // Ignore debugLog function definition (wrapper for DEBUG logging)
    content = content.replace(
      /var debugLog = \(\.\.\.args\) => \{/g,
      '/* istanbul ignore next */ var debugLog = (...args) => {'
    );
    content = content.replace(
      /const debugLog = \(\.\.\.args\) => \{/g,
      '/* istanbul ignore next */ const debugLog = (...args) => {'
    );

    // Ignore debugLog calls (only execute when DEBUG is true)
    content = content.replace(
      /debugLog\(`/g,
      '/* istanbul ignore next */ debugLog(`'
    );

    // Ignore dead Toggle variant functions in compiled bundles.
    // popup.js only uses mini toggles → FullToggle is dead code.
    // options.js only uses full toggles → MiniToggle is dead code.
    if (file === 'popup.js') {
      content = content.replace(
        /function FullToggle\(/g,
        '/* istanbul ignore next */ function FullToggle('
      );
      // The FullToggle return in Toggle dispatcher is dead in popup (always mini)
      content = content.replace(
        /return \/\* @__PURE__ \*\/ u\(FullToggle/g,
        '/* istanbul ignore next */ return /* @__PURE__  */ u(FullToggle'
      );
    }
    if (file === 'options.js') {
      content = content.replace(
        /function MiniToggle\(/g,
        '/* istanbul ignore next */ function MiniToggle('
      );
    }

    // Ignore esbuild helper functions and Preact JSX runtime (third-party boilerplate).
    // These get bundled into popup.js and options.js but are not application code.
    if (file === 'popup.js' || file === 'options.js') {
      // esbuild helper: __commonJS
      content = content.replace(
        /var __commonJS = \(cb, mod\) =>/g,
        '/* istanbul ignore next */ var __commonJS = (cb, mod) =>'
      );
      // esbuild helper: __copyProps
      content = content.replace(
        /var __copyProps = \(to, from, except, desc\) =>/g,
        '/* istanbul ignore next */ var __copyProps = (to, from, except, desc) =>'
      );
      // esbuild helper: __toESM
      content = content.replace(
        /var __toESM = \(mod, isNodeMode, target\) =>/g,
        '/* istanbul ignore next */ var __toESM = (mod, isNodeMode, target) =>'
      );
      // Preact JSX runtime factory function (from jsxRuntime.module.js)
      content = content.replace(
        /function u\(e2, t, n, o, i, u2\)/g,
        '/* istanbul ignore next */ function u(e2, t, n, o, i, u2)'
      );
    }

    fs.writeFileSync(filePath, content);
  }

  console.log('Added istanbul ignore comments for debug branches');
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
