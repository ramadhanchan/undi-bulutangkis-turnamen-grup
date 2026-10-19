#!/usr/bin/env node
/**
 * Build design tokens CSS from src/design/tokens.json
 *
 * Usage:
 *   node scripts/build-tokens.mjs           # write src/design/tokens.css
 *   node scripts/build-tokens.mjs --check   # fail if generated file is stale
 *
 * The JSON file is the source of truth. Never edit the generated CSS by hand.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CONFIG_PATH = path.join(ROOT, "src/design/tokens.json");
const OUTPUT_PATH = path.join(ROOT, "src/design/tokens.css");

/**
 * Semantic tokens exposed to Tailwind v4 as utilities.
 * Key = Tailwind theme variable, value = semantic runtime variable.
 */
const TAILWIND_THEME = {
  "--color-background": "--semantic-color-background",
  "--color-foreground": "--semantic-color-foreground",
  "--color-surface": "--semantic-color-surface",
  "--color-surface-muted": "--semantic-color-surface-muted",
  "--color-muted": "--semantic-color-muted",
  "--color-muted-foreground": "--semantic-color-muted-foreground",
  "--color-border": "--semantic-color-border",
  "--color-border-strong": "--semantic-color-border-strong",
  "--color-primary": "--semantic-color-primary",
  "--color-primary-foreground": "--semantic-color-primary-foreground",
  "--color-primary-subtle": "--semantic-color-primary-subtle",
  "--color-primary-subtle-foreground": "--semantic-color-primary-subtle-foreground",
  "--color-secondary": "--semantic-color-secondary",
  "--color-secondary-foreground": "--semantic-color-secondary-foreground",
  "--color-accent": "--semantic-color-accent",
  "--color-accent-foreground": "--semantic-color-accent-foreground",
  "--color-success": "--semantic-color-success",
  "--color-success-foreground": "--semantic-color-success-foreground",
  "--color-success-subtle": "--semantic-color-success-subtle",
  "--color-success-subtle-foreground": "--semantic-color-success-subtle-foreground",
  "--color-warning": "--semantic-color-warning",
  "--color-warning-foreground": "--semantic-color-warning-foreground",
  "--color-warning-subtle": "--semantic-color-warning-subtle",
  "--color-warning-subtle-foreground": "--semantic-color-warning-subtle-foreground",
  "--color-danger": "--semantic-color-danger",
  "--color-danger-foreground": "--semantic-color-danger-foreground",
  "--color-danger-subtle": "--semantic-color-danger-subtle",
  "--color-danger-subtle-foreground": "--semantic-color-danger-subtle-foreground",
  "--color-info": "--semantic-color-info",
  "--color-info-foreground": "--semantic-color-info-foreground",
  "--color-info-subtle": "--semantic-color-info-subtle",
  "--color-info-subtle-foreground": "--semantic-color-info-subtle-foreground",
  "--color-champion": "--semantic-color-champion",
  "--color-champion-foreground": "--semantic-color-champion-foreground",
  "--color-champion-subtle": "--semantic-color-champion-subtle",
  "--color-phase-registration": "--semantic-color-phase-registration",
  "--color-phase-registration-subtle": "--semantic-color-phase-registration-subtle",
  "--color-phase-pairing": "--semantic-color-phase-pairing",
  "--color-phase-pairing-subtle": "--semantic-color-phase-pairing-subtle",
  "--color-phase-group-stage": "--semantic-color-phase-group-stage",
  "--color-phase-group-stage-subtle": "--semantic-color-phase-group-stage-subtle",
  "--color-phase-knockout": "--semantic-color-phase-knockout",
  "--color-phase-knockout-subtle": "--semantic-color-phase-knockout-subtle",
  "--color-phase-finished": "--semantic-color-phase-finished",
  "--color-phase-finished-subtle": "--semantic-color-phase-finished-subtle",
  "--color-ring": "--semantic-color-ring",
  "--color-overlay": "--semantic-color-overlay",
  "--spacing-page-x": "--semantic-space-page-x",
  "--spacing-page-y": "--semantic-space-page-y",
  "--spacing-section": "--semantic-space-section",
  "--spacing-section-sm": "--semantic-space-section-sm",
  "--spacing-component": "--semantic-space-component",
  "--spacing-component-sm": "--semantic-space-component-sm",
  "--spacing-component-lg": "--semantic-space-component-lg",
  "--spacing-gap": "--semantic-space-gap",
  "--text-display": "--semantic-font-size-display",
  "--text-heading": "--semantic-font-size-heading",
  "--text-heading-sm": "--semantic-font-size-heading-sm",
  "--text-body": "--semantic-font-size-body",
  "--text-body-sm": "--semantic-font-size-body-sm",
  "--text-label": "--semantic-font-size-label",
  "--text-caption": "--semantic-font-size-caption",
  "--text-score": "--semantic-font-size-score",
  "--font-weight-regular": "--semantic-font-weight-regular",
  "--font-weight-medium": "--semantic-font-weight-medium",
  "--font-weight-semibold": "--semantic-font-weight-semibold",
  "--font-weight-bold": "--semantic-font-weight-bold",
  "--font-sans": "--semantic-font-family-sans",
  "--font-mono": "--semantic-font-family-mono",
  "--radius-control": "--semantic-radius-control",
  "--radius-card": "--semantic-radius-card",
  "--radius-badge": "--semantic-radius-badge",
  "--shadow-card": "--semantic-shadow-card",
  "--shadow-card-hover": "--semantic-shadow-card-hover",
  "--shadow-overlay": "--semantic-shadow-overlay",
  "--duration-fast": "--semantic-duration-fast",
  "--duration-normal": "--semantic-duration-normal",
  "--duration-slow": "--semantic-duration-slow",
};

/** Index every token by "layer.path" so references can be resolved. */
function indexTokens(node, layer, pathParts, out) {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    const next = [...pathParts, key];
    if (value && typeof value === "object") {
      if (value.$value !== undefined) {
        out[`${layer}.${next.join(".")}`] = {
          raw: value.$value,
          name: `--${layer}-${next.join("-")}`,
        };
      } else {
        indexTokens(value, layer, next, out);
      }
    }
  }
  return out;
}

/**
 * A `{layer.path}` reference resolves to `var(--runtime-name)` so the value
 * chain stays live in CSS (theme overrides, dark mode) instead of being
 * flattened into a literal at build time.
 */
function resolveValue(raw, index) {
  if (typeof raw !== "string") return raw;
  if (!raw.startsWith("{") || !raw.endsWith("}")) return raw;
  const target = index[raw.slice(1, -1)];
  if (!target) throw new Error(`Unknown token reference: ${raw}`);
  return `var(${target.name})`;
}

function renderBlock(bucket, indent = "  ") {
  return Object.entries(bucket)
    .map(([name, entry]) => `${indent}${name}: ${resolveValue(entry.raw, index)};`)
    .join("\n");
}

const tokens = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));

const index = {};
indexTokens(tokens.primitive ?? {}, "primitive", [], index);
indexTokens(tokens.semantic ?? {}, "semantic", [], index);
indexTokens(tokens.component ?? {}, "component", [], index);

const darkIndex = {};
indexTokens(tokens.dark?.semantic ?? {}, "semantic", [], darkIndex);

const primitiveBucket = {};
const semanticBucket = {};
const componentBucket = {};
const darkBucket = {};

for (const [key, entry] of Object.entries(index)) {
  const [layer] = key.split(".");
  if (layer === "primitive") primitiveBucket[entry.name] = entry;
  else if (layer === "semantic") semanticBucket[entry.name] = entry;
  else if (layer === "component") componentBucket[entry.name] = entry;
}

// Dark overrides reuse the semantic runtime names, so they shadow the light
// values at the same variable name.
for (const entry of Object.values(darkIndex)) {
  darkBucket[entry.name] = entry;
}

const themeBlock = Object.entries(TAILWIND_THEME)
  .map(([tailwindName, semanticName]) => `  ${tailwindName}: var(${semanticName});`)
  .join("\n");

const css = `/* Design tokens — generated by scripts/build-tokens.mjs. Do not edit. */
/* Source of truth: src/design/tokens.json */

/* === PRIMITIVES === */
:root {
${renderBlock(primitiveBucket)}
}

/* === SEMANTIC === */
:root {
${renderBlock(semanticBucket)}
}

/* === COMPONENT === */
:root {
${renderBlock(componentBucket)}
}

/* === DARK MODE === */
@media (prefers-color-scheme: dark) {
  :root:not(.light) {
${renderBlock(darkBucket, "    ")}
  }
}

.dark {
${renderBlock(darkBucket)}
}

/* === TAILWIND BRIDGE === */
@theme inline {
${themeBlock}
}
`;

if (process.argv.includes("--check")) {
  const current = fs.existsSync(OUTPUT_PATH) ? fs.readFileSync(OUTPUT_PATH, "utf8") : "";
  if (current !== css) {
    console.error("✖ src/design/tokens.css is out of date. Run: bun run tokens:build");
    process.exit(1);
  }
  console.log("✔ design tokens are up to date");
} else {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, css);
  console.log(
    `✔ generated src/design/tokens.css (${Object.keys(index).length} light + ${Object.keys(darkIndex).length} dark tokens)`
  );
}
