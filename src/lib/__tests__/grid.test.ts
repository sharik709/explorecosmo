import { describe, expect, it } from "vitest";
import { reorderColumns, type GridColumn } from "../grid";

describe("grid reorder", () => {
    it("moves a column to the target position", () => {
        const columns: GridColumn[] = [
            { id: "a", label: "A", width: 120 },
            { id: "b", label: "B", width: 120 },
            { id: "c", label: "C", width: 120 }
        ];

        const next = reorderColumns(columns, "a", "c");
        expect(next.map((column) => column.id)).toEqual(["b", "c", "a"]);
    });

    it("keeps ordering when ids are missing", () => {
        const columns: GridColumn[] = [
            { id: "a", label: "A", width: 120 },
            { id: "b", label: "B", width: 120 }
        ];

        const next = reorderColumns(columns, "x", "b");
        expect(next.map((column) => column.id)).toEqual(["a", "b"]);
    });
});
