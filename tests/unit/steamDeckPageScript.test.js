/**
 * Unit tests for steamDeckPageScript.js
 * 
 * Note: This script runs in the page's main world and accesses window.SSR.
 * We mock window.SSR for testing.
 */

describe('steamDeckPageScript.js', () => {
    beforeEach(() => {
        jest.resetModules();

        // Clean up any existing data element
        const existingEl = document.getElementById('scpw-steamdeck-data');
        if (existingEl) {
            existingEl.remove();
        }

        // Reset window.SSR
        delete window.SSR;
    });

    afterEach(() => {
        delete window.SSR;
        const el = document.getElementById('scpw-steamdeck-data');
        if (el) el.remove();
    });

    describe('data extraction', () => {
        it('should create data element in DOM', () => {
            // Set up mock SSR data
            window.SSR = {
                renderContext: {
                    queryData: JSON.stringify({
                        queries: [
                            {
                                queryKey: ['StoreItem', 'app_12345', 'include_platforms'],
                                state: { data: { steam_deck_compat_category: 3 } }
                            }
                        ]
                    })
                }
            };

            // Load the script
            require('../../dist/steamDeckPageScript.js');

            // Check that data element was created
            const dataEl = document.getElementById('scpw-steamdeck-data');
            expect(dataEl).not.toBeNull();
            expect(dataEl.type).toBe('application/json');
        });

        it('should extract Steam Deck data from SSR.renderContext.queryData', () => {
            window.SSR = {
                renderContext: {
                    queryData: JSON.stringify({
                        queries: [
                            {
                                queryKey: ['StoreItem', 'app_12345', 'include_platforms'],
                                state: { data: { steam_deck_compat_category: 3 } }
                            },
                            {
                                queryKey: ['StoreItem', 'app_67890', 'include_platforms'],
                                state: { data: { steam_deck_compat_category: 2 } }
                            }
                        ]
                    })
                }
            };

            require('../../dist/steamDeckPageScript.js');

            const dataEl = document.getElementById('scpw-steamdeck-data');
            const data = JSON.parse(dataEl.textContent);

            expect(data['12345']).toBe(3);
            expect(data['67890']).toBe(2);
        });

        it('should skip queries without steam_deck_compat_category', () => {
            window.SSR = {
                renderContext: {
                    queryData: JSON.stringify({
                        queries: [
                            {
                                queryKey: ['StoreItem', 'app_12345', 'include_platforms'],
                                state: { data: { steam_deck_compat_category: 3 } }
                            },
                            {
                                queryKey: ['StoreItem', 'app_67890', 'include_platforms'],
                                state: { data: { name: 'Some Game' } }  // No deck category
                            }
                        ]
                    })
                }
            };

            require('../../dist/steamDeckPageScript.js');

            const dataEl = document.getElementById('scpw-steamdeck-data');
            const data = JSON.parse(dataEl.textContent);

            expect(data['12345']).toBe(3);
            expect(data['67890']).toBeUndefined();
        });

        it('should skip queries that are not StoreItem', () => {
            window.SSR = {
                renderContext: {
                    queryData: JSON.stringify({
                        queries: [
                            {
                                queryKey: ['OtherType', 'app_12345', 'include_platforms'],
                                state: { data: { steam_deck_compat_category: 3 } }
                            },
                            {
                                queryKey: ['StoreItem', 'app_67890', 'wrong_key'],
                                state: { data: { steam_deck_compat_category: 2 } }
                            }
                        ]
                    })
                }
            };

            require('../../dist/steamDeckPageScript.js');

            const dataEl = document.getElementById('scpw-steamdeck-data');
            const data = JSON.parse(dataEl.textContent);

            expect(data['12345']).toBeUndefined();
            expect(data['67890']).toBe(2);
        });

        it('should handle missing SSR gracefully', () => {
            // No window.SSR set
            require('../../dist/steamDeckPageScript.js');

            const dataEl = document.getElementById('scpw-steamdeck-data');
            const data = JSON.parse(dataEl.textContent);

            expect(Object.keys(data).length).toBe(0);
        });

        it('should handle invalid queryData JSON gracefully', () => {
            window.SSR = {
                renderContext: {
                    queryData: 'not valid json'
                }
            };

            // Should not throw
            require('../../dist/steamDeckPageScript.js');

            const dataEl = document.getElementById('scpw-steamdeck-data');
            const data = JSON.parse(dataEl.textContent);

            expect(Object.keys(data).length).toBe(0);
        });

        it('should use loaderData fallback when queryData is empty', () => {
            window.SSR = {
                renderContext: { queryData: '{"queries":[]}' },
                loaderData: [
                    JSON.stringify({
                        queries: [
                            {
                                queryKey: ['StoreItem', 'app_99999', 'include_platforms'],
                                state: { data: { steam_deck_compat_category: 1 } }
                            }
                        ]
                    })
                ]
            };

            require('../../dist/steamDeckPageScript.js');

            const dataEl = document.getElementById('scpw-steamdeck-data');
            const data = JSON.parse(dataEl.textContent);

            expect(data['99999']).toBe(1);
        });

        it('should use loaderData with nested queryData', () => {
            window.SSR = {
                renderContext: { queryData: '{"queries":[]}' },
                loaderData: [
                    JSON.stringify({
                        queryData: JSON.stringify({
                            queries: [
                                {
                                    queryKey: ['StoreItem', 'app_88888', 'include_platforms'],
                                    state: { data: { steam_deck_compat_category: 2 } }
                                }
                            ]
                        })
                    })
                ]
            };

            require('../../dist/steamDeckPageScript.js');

            const dataEl = document.getElementById('scpw-steamdeck-data');
            const data = JSON.parse(dataEl.textContent);

            expect(data['88888']).toBe(2);
        });

        it('should handle loaderData with invalid nested JSON gracefully', () => {
            window.SSR = {
                renderContext: { queryData: '{"queries":[]}' },
                loaderData: [
                    'invalid json string',
                    JSON.stringify({
                        queries: [
                            {
                                queryKey: ['StoreItem', 'app_77777', 'include_platforms'],
                                state: { data: { steam_deck_compat_category: 3 } }
                            }
                        ]
                    })
                ]
            };

            require('../../dist/steamDeckPageScript.js');

            const dataEl = document.getElementById('scpw-steamdeck-data');
            const data = JSON.parse(dataEl.textContent);

            // Should still get valid data from second item
            expect(data['77777']).toBe(3);
        });

        it('should replace existing data element', () => {
            // Create an existing element
            const existingEl = document.createElement('script');
            existingEl.type = 'application/json';
            existingEl.id = 'scpw-steamdeck-data';
            existingEl.textContent = '{"old": "data"}';
            document.documentElement.appendChild(existingEl);

            window.SSR = {
                renderContext: {
                    queryData: JSON.stringify({
                        queries: [
                            {
                                queryKey: ['StoreItem', 'app_11111', 'include_platforms'],
                                state: { data: { steam_deck_compat_category: 2 } }
                            }
                        ]
                    })
                }
            };

            require('../../dist/steamDeckPageScript.js');

            const dataEl = document.getElementById('scpw-steamdeck-data');
            const data = JSON.parse(dataEl.textContent);

            expect(data['11111']).toBe(2);
            expect(data['old']).toBeUndefined();
        });
    });

    describe('TanStack Query cache extraction', () => {
        it('should extract data from React fiber QueryClient via memoizedProps', () => {
            // Set up empty SSR (to not get data from SSR path)
            window.SSR = {
                renderContext: {
                    queryData: JSON.stringify({ queries: [] })
                }
            };

            // Create a mock React root element with fiber
            const rootEl = document.createElement('div');
            rootEl.id = 'application_root';
            document.body.appendChild(rootEl);

            // Mock QueryClient with cache data
            const mockQueryClient = {
                getQueryCache: () => ({
                    getAll: () => [
                        {
                            queryKey: ['StoreItem', 'app_55555', 'include_platforms'],
                            state: { data: { steam_deck_compat_category: 3 } }
                        },
                        {
                            queryKey: ['StoreItem', 'app_66666', 'include_platforms'],
                            state: { data: { steam_deck_compat_category: 2 } }
                        }
                    ]
                })
            };

            // Attach React fiber to element (simulating React's internal structure)
            rootEl['__reactFiber$abc123'] = {
                return: {
                    memoizedProps: {
                        client: mockQueryClient
                    }
                }
            };

            require('../../dist/steamDeckPageScript.js');

            const dataEl = document.getElementById('scpw-steamdeck-data');
            const data = JSON.parse(dataEl.textContent);

            expect(data['55555']).toBe(3);
            expect(data['66666']).toBe(2);

            // Clean up
            rootEl.remove();
        });

        it('should extract data from React context QueryClient', () => {
            window.SSR = {
                renderContext: {
                    queryData: JSON.stringify({ queries: [] })
                }
            };

            const rootEl = document.createElement('div');
            rootEl.id = 'application_root';
            document.body.appendChild(rootEl);

            const mockQueryClient = {
                getQueryCache: () => ({
                    getAll: () => [
                        {
                            queryKey: ['StoreItem', 'app_44444', 'include_platforms'],
                            state: { data: { steam_deck_compat_category: 1 } }
                        }
                    ]
                })
            };

            // Attach via React context path
            rootEl['__reactFiber$xyz789'] = {
                return: {
                    type: {
                        _context: {
                            _currentValue: mockQueryClient
                        }
                    }
                }
            };

            require('../../dist/steamDeckPageScript.js');

            const dataEl = document.getElementById('scpw-steamdeck-data');
            const data = JSON.parse(dataEl.textContent);

            expect(data['44444']).toBe(1);

            rootEl.remove();
        });

        it('should merge SSR and cache data', () => {
            // SSR has one game
            window.SSR = {
                renderContext: {
                    queryData: JSON.stringify({
                        queries: [
                            {
                                queryKey: ['StoreItem', 'app_11111', 'include_platforms'],
                                state: { data: { steam_deck_compat_category: 3 } }
                            }
                        ]
                    })
                }
            };

            const rootEl = document.createElement('div');
            rootEl.id = 'application_root';
            document.body.appendChild(rootEl);

            // Cache has a different game (simulating dynamic load)
            const mockQueryClient = {
                getQueryCache: () => ({
                    getAll: () => [
                        {
                            queryKey: ['StoreItem', 'app_22222', 'include_platforms'],
                            state: { data: { steam_deck_compat_category: 2 } }
                        }
                    ]
                })
            };

            rootEl['__reactFiber$merge'] = {
                return: {
                    memoizedProps: {
                        client: mockQueryClient
                    }
                }
            };

            require('../../dist/steamDeckPageScript.js');

            const dataEl = document.getElementById('scpw-steamdeck-data');
            const data = JSON.parse(dataEl.textContent);

            // Should have both SSR and cache data
            expect(data['11111']).toBe(3);
            expect(data['22222']).toBe(2);

            rootEl.remove();
        });

        it('should handle missing fiber key gracefully', () => {
            window.SSR = {
                renderContext: {
                    queryData: JSON.stringify({
                        queries: [
                            {
                                queryKey: ['StoreItem', 'app_33333', 'include_platforms'],
                                state: { data: { steam_deck_compat_category: 2 } }
                            }
                        ]
                    })
                }
            };

            const rootEl = document.createElement('div');
            rootEl.id = 'application_root';
            // No fiber attached
            document.body.appendChild(rootEl);

            require('../../dist/steamDeckPageScript.js');

            const dataEl = document.getElementById('scpw-steamdeck-data');
            const data = JSON.parse(dataEl.textContent);

            // Should still have SSR data
            expect(data['33333']).toBe(2);

            rootEl.remove();
        });

        it('should handle QueryCache.getAll throwing error', () => {
            window.SSR = {
                renderContext: {
                    queryData: JSON.stringify({
                        queries: [
                            {
                                queryKey: ['StoreItem', 'app_77777', 'include_platforms'],
                                state: { data: { steam_deck_compat_category: 3 } }
                            }
                        ]
                    })
                }
            };

            const rootEl = document.createElement('div');
            rootEl.id = 'application_root';
            document.body.appendChild(rootEl);

            const mockQueryClient = {
                getQueryCache: () => ({
                    getAll: () => { throw new Error('Cache error'); }
                })
            };

            rootEl['__reactFiber$error'] = {
                return: {
                    memoizedProps: {
                        client: mockQueryClient
                    }
                }
            };

            require('../../dist/steamDeckPageScript.js');

            const dataEl = document.getElementById('scpw-steamdeck-data');
            const data = JSON.parse(dataEl.textContent);

            // Should still have SSR data despite cache error
            expect(data['77777']).toBe(3);

            rootEl.remove();
        });

        it('should try alternative root elements', () => {
            window.SSR = {
                renderContext: {
                    queryData: JSON.stringify({ queries: [] })
                }
            };

            // Create a root element that will be found by data-react-root selector
            const rootEl = document.createElement('div');
            rootEl.setAttribute('data-react-root', 'true');
            document.body.appendChild(rootEl);

            const mockQueryClient = {
                getQueryCache: () => ({
                    getAll: () => [
                        {
                            queryKey: ['StoreItem', 'app_88888', 'include_platforms'],
                            state: { data: { steam_deck_compat_category: 1 } }
                        }
                    ]
                })
            };

            rootEl['__reactInternalInstance$legacy'] = {
                return: {
                    memoizedProps: {
                        client: mockQueryClient
                    }
                }
            };

            require('../../dist/steamDeckPageScript.js');

            const dataEl = document.getElementById('scpw-steamdeck-data');
            const data = JSON.parse(dataEl.textContent);

            expect(data['88888']).toBe(1);

            rootEl.remove();
        });

        it('should handle fiber walking reaching max depth', () => {
            window.SSR = {
                renderContext: {
                    queryData: JSON.stringify({
                        queries: [
                            {
                                queryKey: ['StoreItem', 'app_99999', 'include_platforms'],
                                state: { data: { steam_deck_compat_category: 2 } }
                            }
                        ]
                    })
                }
            };

            const rootEl = document.createElement('div');
            rootEl.id = 'application_root';
            document.body.appendChild(rootEl);

            // Create a deeply nested fiber that doesn't have QueryClient
            // (simulates max depth being reached without finding client)
            let fiber = { memoizedProps: {} };
            for (let i = 0; i < 150; i++) {
                fiber = { return: fiber, memoizedProps: {} };
            }
            rootEl['__reactFiber$deep'] = fiber;

            require('../../dist/steamDeckPageScript.js');

            const dataEl = document.getElementById('scpw-steamdeck-data');
            const data = JSON.parse(dataEl.textContent);

            // Should still have SSR data
            expect(data['99999']).toBe(2);

            rootEl.remove();
        });
    });
});
