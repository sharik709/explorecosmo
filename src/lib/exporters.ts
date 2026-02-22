import type { RowData } from "./types";

const escapeCsvValue = (value: string) => {
    const escaped = value.split('"').join('""');
    if (escaped.includes(",") || escaped.includes("\n") || escaped.includes('"')) {
        return `"${escaped}"`;
    }
    return escaped;
};

export const toCsv = (rows: RowData[], fields: string[]) => {
    const header = fields.join(",");
    const lines = rows.map((row) =>
        fields
            .map((field) => {
                const value = row[field];
                return escapeCsvValue(value === null || value === undefined ? "" : String(value));
            })
            .join(",")
    );

    return [header, ...lines].join("\n");
};

export const downloadTextFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};
