<script setup lang="ts">
import type { GridColumn } from "../lib/grid";
import type { RowData } from "../lib/types";

defineProps<{
    columns: GridColumn[];
    rows: RowData[];
}>();

const emit = defineEmits<{
    (event: "reorder", payload: { sourceId: string; targetId: string }): void;
    (event: "updateCell", payload: { rowIndex: number; field: string; value: string }): void;
    (event: "selectRow", payload: { rowIndex: number }): void;
}>();

const onDragStart = (event: DragEvent, id: string) => {
    if (!event.dataTransfer) {
        return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
};

const onDrop = (event: DragEvent, targetId: string) => {
    event.preventDefault();
    const sourceId = event.dataTransfer?.getData("text/plain");
    if (!sourceId) {
        return;
    }
    emit("reorder", { sourceId, targetId });
};

const onDragOver = (event: DragEvent) => {
    event.preventDefault();
};

const getCellValue = (row: RowData, field: string) => {
    const value = row[field];
    if (value === null || value === undefined) {
        return "";
    }

    if (typeof value === "object") {
        return JSON.stringify(value);
    }

    return String(value);
};
</script>

<template>
    <section class="grid-shell">
        <div class="grid-header">
            <div
                v-for="column in columns"
                :key="column.id"
                class="grid-header-cell"
                draggable="true"
                @dragstart="onDragStart($event, column.id)"
                @dragover="onDragOver"
                @drop="onDrop($event, column.id)"
            >
                <span>&lt;&gt;</span>
                <span>{{ column.label }}</span>
            </div>
        </div>
        <div class="grid-body">
            <div
                v-for="(row, rowIndex) in rows"
                :key="rowIndex"
                class="grid-row"
                @click="emit('selectRow', { rowIndex })"
            >
                <div
                    v-for="column in columns"
                    :key="column.id"
                    class="grid-cell"
                    @click.stop
                >
                    <input
                        :value="getCellValue(row, column.id)"
                        @change="emit('updateCell', { rowIndex, field: column.id, value: ($event.target as HTMLInputElement).value })"
                    />
                </div>
            </div>
        </div>
    </section>
</template>
