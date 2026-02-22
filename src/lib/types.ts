export type JsonValue =
    | string
    | number
    | boolean
    | null
    | JsonValue[]
    | { [key: string]: JsonValue };

export type RowData = Record<string, JsonValue>;

export type CosmosCollection = {
    id: string;
};

export type CosmosDatabase = {
    id: string;
};
