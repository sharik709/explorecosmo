import { describe, expect, it } from "vitest";
import { createMemoryStore } from "../storage";
import { createQueriesStore } from "../queries";

describe("queries store", () => {
    it("saves and filters by collection", () => {
        const store = createQueriesStore(createMemoryStore());
        store.save({
            name: "Active",
            collectionId: "customers",
            text: "SELECT * FROM c WHERE c.status = 'active'"
        });
        store.save({
            name: "All Orders",
            collectionId: "orders",
            text: "SELECT * FROM c"
        });

        const customerQueries = store.getByCollection("customers");
        expect(customerQueries).toHaveLength(1);
        expect(customerQueries[0].collectionId).toBe("customers");
    });

    it("updates query metadata", () => {
        const store = createQueriesStore(createMemoryStore());
        const saved = store.save({
            name: "Base",
            collectionId: "orders",
            text: "SELECT * FROM c"
        });

        const updated = store.update(saved.id, { name: "Updated" });
        expect(updated?.name).toBe("Updated");
    });
});
