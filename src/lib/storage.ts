export type KeyValueStore = {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
};

export const createMemoryStore = (): KeyValueStore => {
    const map = new Map<string, string>();
    return {
        getItem: (key) => map.get(key) ?? null,
        setItem: (key, value) => {
            map.set(key, value);
        },
        removeItem: (key) => {
            map.delete(key);
        }
    };
};

export const defaultStore: KeyValueStore =
    typeof localStorage === "undefined" ? createMemoryStore() : localStorage;

export const readJson = <T>(store: KeyValueStore, key: string, fallback: T): T => {
    const raw = store.getItem(key);
    if (!raw) {
        return fallback;
    }

    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
};

export const writeJson = <T>(store: KeyValueStore, key: string, value: T): void => {
    store.setItem(key, JSON.stringify(value));
};
