<script setup lang="ts">
import { computed, ref } from "vue";
import CollectionsPanel from "../components/CollectionsPanel.vue";
import ConnectionsPanel from "../components/ConnectionsPanel.vue";
import ConnectionModal, { type ConnectionModalPayload } from "../components/ConnectionModal.vue";
import DataGrid from "../components/DataGrid.vue";
import QueryEditor from "../components/QueryEditor.vue";
import RowDrawer from "../components/RowDrawer.vue";
import { listCollections, listDatabases, queryCollection } from "../lib/cosmos";
import { createConnectionsStore } from "../lib/connections";
import { downloadTextFile, toCsv } from "../lib/exporters";
import { reorderColumns, type GridColumn } from "../lib/grid";
import { createQueriesStore } from "../lib/queries";
import type { CosmosCollection, RowData } from "../lib/types";

const connectionsStore = createConnectionsStore();
const queriesStore = createQueriesStore();

const connections = ref(connectionsStore.getAll());
const activeConnectionId = ref(connectionsStore.getActiveId());
const collections = ref<CosmosCollection[]>([]);
const activeCollectionId = ref<string | null>(null);
const gridColumns = ref<GridColumn[]>([]);
const rows = ref<RowData[]>([]);
const selectedRowIndex = ref<number | null>(null);
const queryText = ref("SELECT * FROM c");
const queryName = ref("");
const queryLimit = ref(100);
const isConnectionModalOpen = ref(false);
const isQueryStudioVisible = ref(true);
const isLoading = ref(false);
const statusMessage = ref("");
const availableDatabases = ref<string[]>([]);
const selectedDatabase = ref("");
const connectionSecrets = ref<Record<string, string>>({});

const activeConnection = computed(() =>
    connections.value.find((item) => item.id === activeConnectionId.value) ?? null
);

const activeCollection = computed(() =>
    collections.value.find((item) => item.id === activeCollectionId.value) ?? null
);

const savedQueries = computed(() => {
    if (!activeCollectionId.value) {
        return [];
    }
    return queriesStore.getByCollection(activeCollectionId.value);
});

const selectedRow = computed(() => {
    if (selectedRowIndex.value === null) {
        return null;
    }
    return rows.value[selectedRowIndex.value] ?? null;
});

const clearData = () => {
    collections.value = [];
    activeCollectionId.value = null;
    gridColumns.value = [];
    rows.value = [];
    selectedRowIndex.value = null;
};

const getDatabaseForConnection = () => {
    const fromConnection = activeConnection.value?.database?.trim() ?? "";
    if (fromConnection) {
        return fromConnection;
    }

    return selectedDatabase.value.trim();
};

const deriveColumns = (items: RowData[]) => {
    const keySet = new Set<string>();
    items.forEach((row) => {
        Object.keys(row).forEach((key) => keySet.add(key));
    });

    const keys = [...keySet];
    gridColumns.value = keys.map((key) => ({
        id: key,
        label: key,
        width: 180
    }));
};

const resolveAuth = () => {
    if (!activeConnection.value) {
        return null;
    }

    const secret = connectionSecrets.value[activeConnection.value.id];
    if (activeConnection.value.authType === "apiKey" && !secret) {
        statusMessage.value = "Missing API key for this connection. Recreate the connection with a key.";
        return null;
    }

    if (activeConnection.value.authType === "servicePrincipal") {
        if (!activeConnection.value.tenantId || !activeConnection.value.clientId || !secret) {
            statusMessage.value =
                "Service principal connection requires tenant ID, client ID, and client secret.";
            return null;
        }
    }

    return {
        authType: activeConnection.value.authType,
        secret,
        tenantId: activeConnection.value.tenantId,
        clientId: activeConnection.value.clientId
    };
};

const loadRowsForCollection = async (collectionId: string, query: string) => {
    if (!activeConnection.value) {
        return;
    }

    const database = getDatabaseForConnection();
    if (!database) {
        statusMessage.value = "Select a database before loading data.";
        return;
    }

    const auth = resolveAuth();
    if (!auth) {
        return;
    }

    isLoading.value = true;
    statusMessage.value = "";
    try {
        const response = await queryCollection({
            accountEndpoint: activeConnection.value.accountEndpoint,
            database,
            collection: collectionId,
            query,
            limit: queryLimit.value,
            auth
        });

        rows.value = response.rows;
        deriveColumns(response.rows);
        selectedRowIndex.value = null;
    } catch (error) {
        statusMessage.value = error instanceof Error ? error.message : String(error);
        rows.value = [];
        gridColumns.value = [];
    } finally {
        isLoading.value = false;
    }
};

const loadCollectionsForActiveConnection = async () => {
    if (!activeConnection.value) {
        return;
    }

    const database = getDatabaseForConnection();
    if (!database) {
        clearData();
        statusMessage.value = "Select a database to load collections.";
        return;
    }

    const auth = resolveAuth();
    if (!auth) {
        clearData();
        return;
    }

    isLoading.value = true;
    statusMessage.value = "";
    try {
        const items = await listCollections({
            accountEndpoint: activeConnection.value.accountEndpoint,
            database,
            auth
        });

        collections.value = items;
        const firstCollectionId = items[0]?.id ?? null;
        activeCollectionId.value = firstCollectionId;

        if (!firstCollectionId) {
            rows.value = [];
            gridColumns.value = [];
            statusMessage.value = "No collections found in selected database.";
            return;
        }

        await loadRowsForCollection(firstCollectionId, queryText.value);
    } catch (error) {
        statusMessage.value = error instanceof Error ? error.message : String(error);
        clearData();
    } finally {
        isLoading.value = false;
    }
};

const loadDatabasesForActiveConnection = async () => {
    if (!activeConnection.value) {
        return;
    }

    const auth = resolveAuth();
    if (!auth) {
        return;
    }

    isLoading.value = true;
    statusMessage.value = "";
    try {
        const databases = await listDatabases({
            accountEndpoint: activeConnection.value.accountEndpoint,
            auth
        });

        availableDatabases.value = databases.map((item) => item.id);
        if (!selectedDatabase.value && availableDatabases.value.length === 1) {
            selectedDatabase.value = availableDatabases.value[0];
            connectionsStore.update(activeConnection.value.id, { database: selectedDatabase.value });
            connections.value = connectionsStore.getAll();
        }
    } catch (error) {
        statusMessage.value = error instanceof Error ? error.message : String(error);
        availableDatabases.value = [];
    } finally {
        isLoading.value = false;
    }
};

const handleConnect = async (id: string) => {
    connectionsStore.setActive(id);
    activeConnectionId.value = id;
    selectedDatabase.value =
        connections.value.find((item) => item.id === id)?.database?.trim() ?? "";

    if (!selectedDatabase.value) {
        await loadDatabasesForActiveConnection();
    }

    await loadCollectionsForActiveConnection();
};

const handleRemove = (id: string) => {
    connectionsStore.remove(id);
    const nextSecrets = { ...connectionSecrets.value };
    delete nextSecrets[id];
    connectionSecrets.value = nextSecrets;
    connections.value = connectionsStore.getAll();

    if (activeConnectionId.value === id) {
        activeConnectionId.value = null;
        availableDatabases.value = [];
        selectedDatabase.value = "";
        statusMessage.value = "";
        clearData();
    }
};

const handleAddConnection = async (payload: ConnectionModalPayload) => {
    const created = connectionsStore.add(payload.connection);
    if (payload.secret) {
        connectionSecrets.value = {
            ...connectionSecrets.value,
            [created.id]: payload.secret
        };
    }

    connections.value = connectionsStore.getAll();
    isConnectionModalOpen.value = false;
    await handleConnect(created.id);
};

const handleSelectCollection = async (id: string) => {
    activeCollectionId.value = id;
    await loadRowsForCollection(id, queryText.value);
};

const handleRunQuery = async () => {
    if (!activeCollectionId.value) {
        return;
    }
    await loadRowsForCollection(activeCollectionId.value, queryText.value);
};

const handleSaveQuery = () => {
    if (!activeCollectionId.value || !queryText.value.trim()) {
        return;
    }
    const name = queryName.value.trim() || "Untitled Query";
    queriesStore.save({
        name,
        collectionId: activeCollectionId.value,
        text: queryText.value.trim()
    });
    queryName.value = "";
};

const handleLoadQuery = async (query: { text: string; name: string }) => {
    queryText.value = query.text;
    queryName.value = query.name;
    await handleRunQuery();
};

const handleReorder = (payload: { sourceId: string; targetId: string }) => {
    gridColumns.value = reorderColumns(gridColumns.value, payload.sourceId, payload.targetId);
};

const handleUpdateCell = (payload: { rowIndex: number; field: string; value: string }) => {
    rows.value = rows.value.map((row, index) =>
        index === payload.rowIndex ? { ...row, [payload.field]: payload.value } : row
    );
};

const handleSelectRow = (payload: { rowIndex: number }) => {
    selectedRowIndex.value = payload.rowIndex;
};

const handleDrawerUpdate = (payload: { field: string; value: string }) => {
    if (selectedRowIndex.value === null) {
        return;
    }
    handleUpdateCell({
        rowIndex: selectedRowIndex.value,
        field: payload.field,
        value: payload.value
    });
};

const handleExportCsv = () => {
    if (!activeCollection.value) {
        return;
    }

    const fields = gridColumns.value.map((column) => column.id);
    const csv = toCsv(rows.value, fields);
    downloadTextFile(`${activeCollection.value.id}.csv`, csv);
};

const handleExportJson = () => {
    if (!activeCollection.value) {
        return;
    }
    const content = JSON.stringify(rows.value, null, 2);
    downloadTextFile(`${activeCollection.value.id}.json`, content);
};

const handleDatabaseChange = async (value: string) => {
    selectedDatabase.value = value;
    if (!activeConnection.value) {
        return;
    }

    connectionsStore.update(activeConnection.value.id, { database: value });
    connections.value = connectionsStore.getAll();
    await loadCollectionsForActiveConnection();
};

if (activeConnectionId.value) {
    const savedConnection = connections.value.find((item) => item.id === activeConnectionId.value);
    if (savedConnection) {
        selectedDatabase.value = savedConnection.database?.trim() ?? "";
    }
}
</script>

<template>
    <div class="app-shell">
        <aside class="sidebar">
            <ConnectionsPanel
                :connections="connections"
                :active-id="activeConnectionId"
                @connect="handleConnect"
                @remove="handleRemove"
                @add="isConnectionModalOpen = true"
            />
            <CollectionsPanel
                :collections="collections"
                :active-id="activeCollectionId"
                @select="handleSelectCollection"
            />
            <section class="panel">
                <div class="panel-header">
                    <span class="panel-title">Exports</span>
                </div>
                <div class="query-actions">
                    <button class="action-button secondary" type="button" @click="handleExportCsv">
                        Export CSV
                    </button>
                    <button class="action-button secondary" type="button" @click="handleExportJson">
                        Export JSON
                    </button>
                </div>
            </section>
        </aside>

        <main class="main">
            <header class="top-bar">
                <div>
                    <h1>ExploreCosmo</h1>
                    <p class="helper-text">
                        {{ activeConnection ? `Active: ${activeConnection.name}` : "No active connection" }}
                    </p>
                    <p v-if="statusMessage" class="helper-text error-text">{{ statusMessage }}</p>
                </div>
                <div class="query-actions">
                    <div v-if="activeConnection && !activeConnection.database" class="database-select">
                        <label for="database-selector">Database</label>
                        <select
                            id="database-selector"
                            :value="selectedDatabase"
                            @change="handleDatabaseChange(($event.target as HTMLSelectElement).value)"
                        >
                            <option value="">Select database</option>
                            <option v-for="item in availableDatabases" :key="item" :value="item">
                                {{ item }}
                            </option>
                        </select>
                    </div>
                    <button class="action-button secondary" type="button" @click="isQueryStudioVisible = !isQueryStudioVisible">
                        {{ isQueryStudioVisible ? "Hide Query Studio" : "Show Query Studio" }}
                    </button>
                    <button class="action-button" type="button" @click="isConnectionModalOpen = true">
                        New Connection
                    </button>
                </div>
            </header>

            <section class="content" :class="{ 'query-hidden': !isQueryStudioVisible }">
                <QueryEditor
                    v-if="isQueryStudioVisible"
                    v-model="queryText"
                    v-model:save-name="queryName"
                    v-model:limit="queryLimit"
                    :collection-name="activeCollection?.id ?? null"
                    :saved-queries="savedQueries"
                    :loading="isLoading"
                    @run="handleRunQuery"
                    @save="handleSaveQuery"
                    @load="handleLoadQuery"
                />

                <DataGrid
                    :columns="gridColumns"
                    :rows="rows"
                    @reorder="handleReorder"
                    @update-cell="handleUpdateCell"
                    @select-row="handleSelectRow"
                />
            </section>
        </main>

        <RowDrawer
            :row="selectedRow"
            :fields="gridColumns.map((column) => column.id)"
            @close="selectedRowIndex = null"
            @update="handleDrawerUpdate"
        />

        <ConnectionModal
            v-if="isConnectionModalOpen"
            @close="isConnectionModalOpen = false"
            @save="handleAddConnection"
        />
    </div>
</template>
