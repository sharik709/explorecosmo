import { describe, expect, it } from "vitest";
import { createConnectionsStore } from "../connections";
import { createMemoryStore } from "../storage";

const createStore = () => createConnectionsStore(createMemoryStore());

describe("connections store", () => {
    it("adds and lists connections sorted by name", () => {
        const store = createStore();
        store.add({
            name: "B",
            accountEndpoint: "https://b.documents.azure.com",
            database: "db",
            authType: "apiKey"
        });
        store.add({
            name: "A",
            accountEndpoint: "https://a.documents.azure.com",
            database: "db",
            authType: "servicePrincipal",
            tenantId: "tenant",
            clientId: "client"
        });

        const items = store.getAll();
        expect(items.map((item) => item.name)).toEqual(["A", "B"]);
    });

    it("tracks active connection and clears on removal", () => {
        const store = createStore();
        const connection = store.add({
            name: "Primary",
            accountEndpoint: "https://a.documents.azure.com",
            database: "db",
            authType: "apiKey"
        });

        store.setActive(connection.id);
        expect(store.getActiveId()).toBe(connection.id);

        store.remove(connection.id);
        expect(store.getActiveId()).toBe(null);
    });
});
