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
  'options.ts',
  'popup.ts',
];

async function build() {
  for (const file of files) {
    const entryPoint = path.join(srcDir, file);
    const outfile = path.join(distDir, file.replace('.ts', '.js'));

    await esbuild.build({
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
      // Don't include other source files - they're loaded separately via importScripts/script tags
      // Exception: ./components/* imports are bundled into the consuming file (popup.js, options.js)
      plugins: [{
        name: 'externalize-local-imports',
        setup(build) {
          // Mark all ./foo imports as external - we load them via importScripts
          // But allow ./components/* imports to be bundled (they're part of the Lit component tree)
          build.onResolve({ filter: /^\.\.?\// }, args => {
            // Only externalize .ts/.js imports from src directory
            if (args.importer.includes('/src/')) {
              // Allow bundling component imports — they should be included in the output
              // This covers both ./components/* (from popup/options) and ./* (from within components/)
              if (args.path.includes('/components/') || args.path.includes('./components/') || args.importer.includes('/components/')) {
                return; // Don't externalize
              }
              return { path: args.path, external: true };
            }
          });
        }
      }]
    });
    console.log(`Built: ${file}`);
  }

  console.log('Build complete!');

  // Post-process: Add istanbul ignore comments for debug branches
  // This ensures code coverage doesn't penalize debug-only code paths
  addIstanbulIgnoreComments();

  // Post-process: Ignore bundled Lit library code in popup.js and options.js
  // The Lit framework is bundled into these files by esbuild and shouldn't affect coverage
  addBundledLibraryIgnoreComments();
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

    fs.writeFileSync(filePath, content);
  }

  console.log('Added istanbul ignore comments for debug branches');
}

/**
 * Add istanbul ignore comments for bundled third-party library code
 * (Lit framework) in popup.js and options.js so that coverage only
 * measures our own component and application code.
 *
 * Only targets top-level declarations (var, function, class) to avoid
 * breaking syntax by inserting comments inside expressions.
 */
function addBundledLibraryIgnoreComments() {
  const bundledFiles = ['popup.js', 'options.js'];
  // Pattern: lines that start a new statement (with leading whitespace)
  const declarationPattern = /^(\s+)(var |const |let |function |class )/;

  for (const file of bundledFiles) {
    const filePath = path.join(distDir, file);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let inNodeModules = false;
    let modified = false;

    for (let idx = 0; idx < lines.length; idx++) {
      const trimmed = lines[idx].trim();

      // Detect node_modules section boundaries
      if (trimmed.startsWith('// node_modules/')) {
        inNodeModules = true;
        continue;
      }
      if (trimmed.startsWith('// src/')) {
        inNodeModules = false;
        continue;
      }

      // Mark esbuild helper functions at the top (__decorateClass, __defProp, etc.)
      if (!inNodeModules && declarationPattern.test(lines[idx]) && trimmed.startsWith('var __')) {
        if (!lines[idx].includes('istanbul ignore')) {
          const match = lines[idx].match(declarationPattern);
          lines[idx] = match[1] + '/* istanbul ignore next */ ' + trimmed;
          modified = true;
        }
        continue;
      }

      // Only add ignore comments to declaration lines in node_modules sections
      if (inNodeModules && declarationPattern.test(lines[idx])) {
        if (!lines[idx].includes('istanbul ignore')) {
          const match = lines[idx].match(declarationPattern);
          lines[idx] = match[1] + '/* istanbul ignore next */ ' + trimmed;
          modified = true;
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, lines.join('\n'));
    }
  }

  console.log('Added istanbul ignore comments for bundled library code');
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
