import type * as Preact from 'preact';
import type * as PreactHooks from 'preact/hooks';

declare global {
  var preact: typeof Preact;
  var preactHooks: typeof PreactHooks;
  var SWP_PopupUI: Record<string, unknown> | undefined;
  var SWP_OptionsUI: Record<string, unknown> | undefined;
}

export {};
