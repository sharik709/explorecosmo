import { defaultStore, readJson, writeJson, type KeyValueStore } from "./storage";

export type SavedQuery = {
    id: string;
    name: string;
    collectionId: string;
    text: string;
    updatedAt: string;
};

const STORAGE_KEY = "explorecosmo.queries";

const createId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }

    return `qry_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
};

const sortByName = (items: SavedQuery[]) =>
    [...items].sort((a, b) => a.name.localeCompare(b.name));

export const createQueriesStore = (store: KeyValueStore = defaultStore) => {
    const getAll = () => sortByName(readJson<SavedQuery[]>(store, STORAGE_KEY, []));

    const getByCollection = (collectionId: string) =>
        sortByName(getAll().filter((item) => item.collectionId === collectionId));

    const save = (input: Omit<SavedQuery, "id" | "updatedAt">) => {
        const items = getAll();
        const updatedAt = new Date().toISOString();
        const next = {
            ...input,
            id: createId(),
            updatedAt
        } satisfies SavedQuery;
        writeJson(store, STORAGE_KEY, [...items, next]);
        return next;
    };

    const update = (id: string, patch: Partial<Omit<SavedQuery, "id">>) => {
        const items = getAll();
        const updatedAt = new Date().toISOString();
        const next = items.map((item) =>
            item.id === id ? { ...item, ...patch, updatedAt } : item
        );
        writeJson(store, STORAGE_KEY, next);
        return next.find((item) => item.id === id) ?? null;
    };

    const remove = (id: string) => {
        const items = getAll().filter((item) => item.id !== id);
        writeJson(store, STORAGE_KEY, items);
        return items;
    };

    return {
        getAll,
        getByCollection,
        save,
        update,
        remove
    };
};
