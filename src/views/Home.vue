<script setup lang="ts">
import { computed, ref } from "vue";
import CollectionsPanel from "../components/CollectionsPanel.vue";
import ConnectionsPanel from "../components/ConnectionsPanel.vue";
import ConnectionModal from "../components/ConnectionModal.vue";
import DataGrid from "../components/DataGrid.vue";
import QueryEditor from "../components/QueryEditor.vue";
import RowDrawer from "../components/RowDrawer.vue";
import { createConnectionsStore, type ConnectionInput } from "../lib/connections";
import { createQueriesStore } from "../lib/queries";
import { reorderColumns, type GridColumn } from "../lib/grid";
import {
    getCollections,
    runQuery,
    type CollectionData,
    type RowData
} from "../lib/sample-data";
import { downloadTextFile, toCsv } from "../lib/exporters";

const connectionsStore = createConnectionsStore();
const queriesStore = createQueriesStore();

const connections = ref(connectionsStore.getAll());
const activeConnectionId = ref(connectionsStore.getActiveId());
const collections = ref<CollectionData[]>([]);
const activeCollectionId = ref<string | null>(null);
const gridColumns = ref<GridColumn[]>([]);
const rows = ref<RowData[]>([]);
const selectedRowIndex = ref<number | null>(null);
const queryText = ref("SELECT * FROM c");
const queryName = ref("");
const isConnectionModalOpen = ref(false);

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

const syncColumns = (collection: CollectionData) => {
    gridColumns.value = collection.fields.map((field) => ({
        id: field,
        label: field,
        width: 160
    }));
};

const syncRows = (collection: CollectionData) => {
    rows.value = [...collection.rows];
};

const loadCollections = () => {
    collections.value = getCollections();
    const first = collections.value[0]?.id ?? null;
    activeCollectionId.value = first;
    if (first) {
        const collection = collections.value.find((item) => item.id === first);
        if (collection) {
            syncColumns(collection);
            syncRows(collection);
        }
    }
};

const handleConnect = (id: string) => {
    connectionsStore.setActive(id);
    activeConnectionId.value = id;
    loadCollections();
};

const handleRemove = (id: string) => {
    connectionsStore.remove(id);
    connections.value = connectionsStore.getAll();
    if (activeConnectionId.value === id) {
        activeConnectionId.value = null;
        collections.value = [];
        activeCollectionId.value = null;
        rows.value = [];
        gridColumns.value = [];
    }
};

const handleAddConnection = (payload: ConnectionInput) => {
    connectionsStore.add(payload);
    connections.value = connectionsStore.getAll();
    isConnectionModalOpen.value = false;
};

const handleSelectCollection = (id: string) => {
    activeCollectionId.value = id;
    const collection = collections.value.find((item) => item.id === id);
    if (!collection) {
        return;
    }
    syncColumns(collection);
    syncRows(collection);
    queryText.value = "SELECT * FROM c";
    queryName.value = "";
    selectedRowIndex.value = null;
};

const handleRunQuery = () => {
    if (!activeCollection.value) {
        return;
    }
    rows.value = runQuery(activeCollection.value, queryText.value);
    selectedRowIndex.value = null;
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

const handleLoadQuery = (query: { text: string; name: string }) => {
    queryText.value = query.text;
    queryName.value = query.name;
};

const handleReorder = (payload: { sourceId: string; targetId: string }) => {
    gridColumns.value = reorderColumns(gridColumns.value, payload.sourceId, payload.targetId);
};

const handleUpdateCell = (payload: { rowIndex: number; field: string; value: string }) => {
    rows.value = rows.value.map((row, index) =>
        index === payload.rowIndex ? { ...row, [payload.field]: payload.value } : row
    );
    if (activeCollection.value) {
        const collection = collections.value.find((item) => item.id === activeCollection.value?.id);
        if (collection) {
            collection.rows = rows.value;
        }
    }
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
    const csv = toCsv(rows.value, activeCollection.value.fields);
    downloadTextFile(`${activeCollection.value.name}.csv`, csv);
};

const handleExportJson = () => {
    if (!activeCollection.value) {
        return;
    }
    const content = JSON.stringify(rows.value, null, 2);
    downloadTextFile(`${activeCollection.value.name}.json`, content);
};

const handleSyncCollections = () => {
    if (!activeConnectionId.value) {
        return;
    }
    loadCollections();
};

if (activeConnectionId.value) {
    loadCollections();
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
                <p class="helper-text">
                    Exports are local downloads based on current grid results.
                </p>
            </section>
        </aside>

        <main class="main">
            <header class="top-bar">
                <div>
                    <h1>ExploreCosmo</h1>
                    <p class="helper-text">
                        {{ activeConnection ? `Active: ${activeConnection.name}` : "No active connection" }}
                    </p>
                </div>
                <div class="query-actions">
                    <button class="action-button" type="button" @click="isConnectionModalOpen = true">
                        New Connection
                    </button>
                    <button
                        class="action-button secondary"
                        type="button"
                        :disabled="!activeConnection"
                        @click="handleSyncCollections"
                    >
                        Sync Collections
                    </button>
                </div>
            </header>

            <section class="content">
                <QueryEditor
                    v-model="queryText"
                    v-model:save-name="queryName"
                    :collection-name="activeCollection?.name ?? null"
                    :saved-queries="savedQueries"
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
