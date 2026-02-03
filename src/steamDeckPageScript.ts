/**
 * Steam Wishlist Plus - Steam Deck Page Script
 *
 * Runs in the MAIN world (page context) to extract Steam Deck compatibility
 * data from window.SSR and TanStack Query cache, storing it in a hidden DOM
 * element for the content script to read.
 *
 * Loaded via script src from web_accessible_resources to bypass CSP.
 */

(function() {
  'use strict';

  const DEBUG = false;
  const LOG_PREFIX = '[SWP SteamDeck PageScript]';
  const DATA_ELEMENT_ID = 'scpw-steamdeck-data';

  interface TanStackQuery {
    queryKey?: (string | unknown)[];
    state?: {
      data?: {
        steam_deck_compat_category?: number;
      };
    };
  }

  interface QueryData {
    queries?: TanStackQuery[];
    queryData?: string;
  }

  // React fiber and QueryClient types (minimal for our needs)
  interface ReactFiber {
    return?: ReactFiber;
    memoizedState?: unknown;
    memoizedProps?: {
      client?: QueryClient;
    };
    type?: {
      _context?: {
        _currentValue?: QueryClient;
      };
    };
  }

  interface QueryCacheQuery {
    queryKey?: (string | unknown)[];
    state?: {
      data?: {
        steam_deck_compat_category?: number;
      };
    };
  }

  interface QueryCache {
    getAll(): QueryCacheQuery[];
  }

  interface QueryClient {
    getQueryCache(): QueryCache;
  }

  /**
   * Checks if a query entry contains Steam Deck compatibility data.
   */
  function isDeckCompatQuery(query: TanStackQuery | QueryCacheQuery): boolean {
    return !!(query.queryKey &&
      query.queryKey[0] === 'StoreItem' &&
      query.state?.data?.steam_deck_compat_category !== undefined);
  }

  /**
   * Extracts appId and deck category from a valid query entry.
   */
  function extractFromQuery(query: TanStackQuery | QueryCacheQuery): { appId: string; category: number } {
    const appId = String(query.queryKey![1]).replace('app_', '');
    const category = query.state!.data!.steam_deck_compat_category!;
    return { appId, category };
  }

  /**
   * Extracts Steam Deck data from queries array into mapping object.
   */
  function extractFromQueries(queries: (TanStackQuery | QueryCacheQuery)[], mapping: Record<string, number>): void {
    for (const query of queries) {
      if (isDeckCompatQuery(query)) {
        const { appId, category } = extractFromQuery(query);
        mapping[appId] = category;
      }
    }
  }

  /**
   * Attempts to find the TanStack QueryClient by walking React's fiber tree.
   * This allows us to access dynamically loaded data (not just SSR snapshot).
   */
  function findQueryClient(): QueryClient | null {
    try {
      // Find a React root element - Steam uses various containers
      const possibleRoots = [
        document.getElementById('application_root'),
        document.querySelector('[data-react-root]'),
        document.getElementById('root'),
        document.body.firstElementChild
      ];

      for (const rootElement of possibleRoots) {
        if (!rootElement) continue;

        // Find the React fiber key (React 18+ uses __reactFiber$)
        const fiberKey = Object.keys(rootElement).find(
          key => key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')
        );
        if (!fiberKey) continue;

        const fiber = (rootElement as Record<string, unknown>)[fiberKey] as ReactFiber | undefined;
        if (!fiber) continue;

        // Walk up the fiber tree looking for QueryClientProvider
        let current: ReactFiber | undefined = fiber;
        let depth = 0;
        const maxDepth = 100; // Prevent infinite loops

        while (current && depth < maxDepth) {
          // Check memoizedProps.client (QueryClientProvider passes client as prop)
          if (current.memoizedProps?.client?.getQueryCache) {
            /* istanbul ignore if */
            if (DEBUG) console.log(`${LOG_PREFIX} Found QueryClient via memoizedProps at depth ${depth}`);
            return current.memoizedProps.client;
          }

          // Check React context (TanStack Query uses context)
          if (current.type?._context?._currentValue?.getQueryCache) {
            /* istanbul ignore if */
            if (DEBUG) console.log(`${LOG_PREFIX} Found QueryClient via context at depth ${depth}`);
            return current.type._context._currentValue;
          }

          current = current.return;
          depth++;
        }
      }
    } catch (error) {
      /* istanbul ignore if */
      if (DEBUG) console.log(`${LOG_PREFIX} Error finding QueryClient:`, error);
    }

    return null;
  }

  /**
   * Extracts Steam Deck data from TanStack Query's live cache.
   * This captures data for dynamically loaded items (pagination/scroll).
   */
  function extractFromQueryCache(mapping: Record<string, number>): void {
    const queryClient = findQueryClient();
    if (!queryClient) {
      /* istanbul ignore if */
      if (DEBUG) console.log(`${LOG_PREFIX} QueryClient not found, skipping cache extraction`);
      return;
    }

    try {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();

      /* istanbul ignore if */
      if (DEBUG) console.log(`${LOG_PREFIX} Found ${queries.length} queries in cache`);

      extractFromQueries(queries, mapping);
    } catch (error) {
      /* istanbul ignore if */
      if (DEBUG) console.log(`${LOG_PREFIX} Error extracting from QueryCache:`, error);
    }
  }

  /**
   * Extracts Steam Deck compatibility data from page SSR data and live cache.
   */
  function extractDeckData(): Record<string, number> {
    const mapping: Record<string, number> = {};

    try {
      // Primary: window.SSR.renderContext.queryData (SSR hydration data)
      if (window.SSR?.renderContext?.queryData) {
        const queryData = JSON.parse(window.SSR.renderContext.queryData) as QueryData;
        if (Array.isArray(queryData.queries)) {
          extractFromQueries(queryData.queries, mapping);
        }
      }

      // Fallback: window.SSR.loaderData
      if (Object.keys(mapping).length === 0 && window.SSR?.loaderData) {
        for (const jsonStr of window.SSR.loaderData) {
          try {
            const data = JSON.parse(jsonStr) as QueryData;
            const queries = data.queries ||
              (data.queryData && (JSON.parse(data.queryData) as QueryData).queries) ||
              [];
            extractFromQueries(queries, mapping);
          } catch {
            // Ignore parse errors for individual strings
          }
        }
      }

      // NEW: Also extract from live TanStack Query cache
      // This captures dynamically loaded items from pagination/infinite scroll
      const ssrCount = Object.keys(mapping).length;
      extractFromQueryCache(mapping);
      const totalCount = Object.keys(mapping).length;

      /* istanbul ignore if */
      if (DEBUG) {
        console.log(`${LOG_PREFIX} Extracted ${ssrCount} from SSR, ${totalCount - ssrCount} additional from cache, ${totalCount} total`);
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Error:`, error);
    }

    return mapping;
  }

  /**
   * Stores extracted data in a hidden DOM element for content script access.
   */
  function storeDataInDOM(data: Record<string, number>): void {
    const existing = document.getElementById(DATA_ELEMENT_ID);
    if (existing) {
      existing.remove();
    }

    const el = document.createElement('script');
    el.type = 'application/json';
    el.id = DATA_ELEMENT_ID;
    el.textContent = JSON.stringify(data);
    document.documentElement.appendChild(el);

    /* istanbul ignore if */
    if (DEBUG) {
      console.log(`${LOG_PREFIX} Stored data in #${DATA_ELEMENT_ID}`);
    }
  }

  // Execute immediately
  const data = extractDeckData();
  storeDataInDOM(data);
})();
