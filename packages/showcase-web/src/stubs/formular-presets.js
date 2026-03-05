/**
 * Stub for @pulsar-framework/formular.dev internal `./schema/presets` module.
 *
 * The published dist bundles contain a lazy `require("./schema/presets")` inside
 * `createFormFromPreset()` that was never shipped as a separate file. Webpack
 * statically analyses all require() calls and fails at build time even though
 * the function is never called by this app.
 *
 * This stub satisfies the import. If `createFormFromPreset` were ever called it
 * would receive an empty registry and throw "Preset not found" — acceptable
 * since we always use `createForm()` directly.
 */
export const presetRegistry = {
  register: () => {},
  get:      () => undefined,
  has:      () => false,
  list:     () => [],
}
