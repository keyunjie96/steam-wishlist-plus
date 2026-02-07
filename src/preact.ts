import type { ComponentChildren, FunctionComponent } from 'preact';
import type * as Preact from 'preact';
import type * as PreactHooks from 'preact/hooks';

const preactGlobal = globalThis.preact as unknown as typeof Preact;
const preactHooksGlobal = globalThis.preactHooks as unknown as typeof PreactHooks;

export const h = preactGlobal.h;
export const Fragment = preactGlobal.Fragment;
export const render = preactGlobal.render;
export const { useState, useCallback, useEffect, useLayoutEffect, useRef } = preactHooksGlobal;

export type { ComponentChildren, FunctionComponent };
