import { defaultStore, readJson, writeJson, type KeyValueStore } from "./storage";

export type AuthType = "servicePrincipal" | "apiKey" | "ldap";

export type ConnectionMetadata = {
    id: string;
    name: string;
    accountEndpoint: string;
    database: string;
    authType: AuthType;
    tenantId?: string;
    clientId?: string;
    createdAt: string;
    lastUsedAt?: string;
};

export type ConnectionInput = Omit<ConnectionMetadata, "id" | "createdAt" | "lastUsedAt">;

export type ConnectionsState = {
    items: ConnectionMetadata[];
    activeId: string | null;
};

const STORAGE_KEY = "explorecosmo.connections";
const ACTIVE_KEY = "explorecosmo.activeConnection";

const createId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }

    return `conn_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
};

const sortByName = (items: ConnectionMetadata[]) =>
    [...items].sort((a, b) => a.name.localeCompare(b.name));

export const createConnectionsStore = (store: KeyValueStore = defaultStore) => {
    const getAll = () =>
        sortByName(readJson<ConnectionMetadata[]>(store, STORAGE_KEY, []));

    const getActiveId = () => store.getItem(ACTIVE_KEY);

    const setActiveId = (id: string | null) => {
        if (!id) {
            store.removeItem(ACTIVE_KEY);
            return;
        }

        store.setItem(ACTIVE_KEY, id);
    };

    const add = (input: ConnectionInput) => {
        const items = getAll();
        const createdAt = new Date().toISOString();
        const next = {
            ...input,
            id: createId(),
            createdAt
        } satisfies ConnectionMetadata;

        writeJson(store, STORAGE_KEY, [...items, next]);
        return next;
    };

    const update = (id: string, patch: Partial<ConnectionInput>) => {
        const items = getAll();
        const next = items.map((item) =>
            item.id === id ? { ...item, ...patch } : item
        );

        writeJson(store, STORAGE_KEY, next);
        return next.find((item) => item.id === id) ?? null;
    };

    const remove = (id: string) => {
        const items = getAll().filter((item) => item.id !== id);
        writeJson(store, STORAGE_KEY, items);
        if (getActiveId() === id) {
            setActiveId(null);
        }
        return items;
    };

    const touch = (id: string) => {
        const items = getAll();
        const now = new Date().toISOString();
        const next = items.map((item) =>
            item.id === id ? { ...item, lastUsedAt: now } : item
        );
        writeJson(store, STORAGE_KEY, next);
        return next.find((item) => item.id === id) ?? null;
    };

    const setActive = (id: string | null) => {
        setActiveId(id);
        if (id) {
            touch(id);
        }
    };

    return {
        getAll,
        add,
        update,
        remove,
        touch,
        getActiveId,
        setActive
    };
};
