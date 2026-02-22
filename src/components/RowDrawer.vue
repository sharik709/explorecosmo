<script setup lang="ts">
import type { RowData } from "../lib/types";

const props = defineProps<{
    row: RowData | null;
    fields: string[];
}>();

const emit = defineEmits<{
    (event: "close"): void;
    (event: "update", payload: { field: string; value: string }): void;
}>();

const getValue = (field: string) => {
    if (!props.row) {
        return "";
    }
    const value = props.row[field];
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
    <aside v-if="row" class="drawer">
        <div class="drawer-header">
            <div>
                <h3>Row Details</h3>
                <p class="helper-text">Edit fields and they update the grid.</p>
            </div>
            <button class="action-button ghost" type="button" @click="emit('close')">
                Close
            </button>
        </div>
        <div class="drawer-grid">
            <div v-for="field in fields" :key="field" class="drawer-field">
                <label :for="field">{{ field }}</label>
                <input
                    :id="field"
                    :value="getValue(field)"
                    @change="emit('update', { field, value: ($event.target as HTMLInputElement).value })"
                />
            </div>
        </div>
    </aside>
</template>
