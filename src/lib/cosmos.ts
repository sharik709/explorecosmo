import { invoke } from "@tauri-apps/api/core";
import type { AuthType } from "./connections";
import type { CosmosCollection, CosmosDatabase, RowData } from "./types";

export type CosmosAuthPayload = {
    authType: AuthType;
    secret?: string;
    tenantId?: string;
    clientId?: string;
};

type ListDatabasesInput = {
    accountEndpoint: string;
    auth: CosmosAuthPayload;
};

type ListCollectionsInput = {
    accountEndpoint: string;
    database: string;
    auth: CosmosAuthPayload;
};

type QueryCollectionInput = {
    accountEndpoint: string;
    database: string;
    collection: string;
    query: string;
    limit?: number;
    auth: CosmosAuthPayload;
};

type QueryResponse = {
    rows: RowData[];
};

const ensureTauriRuntime = () => {
    const runtime = globalThis as {
        __TAURI_INTERNALS__?: unknown;
        __TAURI__?: {
            core?: {
                invoke?: unknown;
            };
        };
    };

    const hasInvoke =
        Boolean(runtime.__TAURI_INTERNALS__) ||
        typeof runtime.__TAURI__?.core?.invoke === "function";

    if (!hasInvoke) {
        throw new Error(
            "Tauri runtime is not available. Start this app with `pnpm tauri dev` instead of browser-only `pnpm dev`."
        );
    }
};

export const listDatabases = async (input: ListDatabasesInput) =>
    (ensureTauriRuntime(), invoke<CosmosDatabase[]>("list_databases", { input }));

export const listCollections = async (input: ListCollectionsInput) =>
    (ensureTauriRuntime(), invoke<CosmosCollection[]>("list_collections", { input }));

export const queryCollection = async (input: QueryCollectionInput) =>
    (ensureTauriRuntime(), invoke<QueryResponse>("query_collection", { input }));
