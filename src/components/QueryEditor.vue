<script setup lang="ts">
import type { SavedQuery } from "../lib/queries";

defineProps<{
    modelValue: string;
    saveName: string;
    limit: number;
    collectionName: string | null;
    savedQueries: SavedQuery[];
    loading: boolean;
}>();

const emit = defineEmits<{
    (event: "update:modelValue", value: string): void;
    (event: "update:saveName", value: string): void;
    (event: "update:limit", value: number): void;
    (event: "run"): void;
    (event: "save"): void;
    (event: "load", query: SavedQuery): void;
}>();

const onInput = (event: Event) => {
    const target = event.target as HTMLTextAreaElement;
    emit("update:modelValue", target.value);
};

const onNameInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    emit("update:saveName", target.value);
};

const onLimitInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const parsed = Number(target.value);
    emit("update:limit", Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 100);
};
</script>

<template>
    <section class="query-editor">
        <div class="panel-header">
            <span class="panel-title">Query Studio</span>
            <span class="badge">{{ collectionName ?? "No collection" }}</span>
        </div>
        <textarea
            :value="modelValue"
            placeholder="SELECT * FROM c"
            @input="onInput"
        />
        <div class="query-controls">
            <div class="form-field">
                <label for="query-name">Save As</label>
                <input
                    id="query-name"
                    :value="saveName"
                    placeholder="Recent invoices"
                    @input="onNameInput"
                />
            </div>
            <div class="form-field query-limit-field">
                <label for="query-limit">Limit</label>
                <input
                    id="query-limit"
                    :value="limit"
                    min="1"
                    max="1000"
                    type="number"
                    @input="onLimitInput"
                />
            </div>
        </div>
        <div class="query-actions">
            <button class="action-button" type="button" :disabled="loading" @click="emit('run')">
                {{ loading ? "Running" : "Run Query" }}
            </button>
            <button class="action-button secondary" type="button" @click="emit('save')">
                Save Query
            </button>
        </div>
        <div v-if="savedQueries.length > 0" class="query-saved">
            <button
                v-for="query in savedQueries"
                :key="query.id"
                class="query-tag"
                type="button"
                @click="emit('load', query)"
            >
                {{ query.name }}
            </button>
        </div>
    </section>
</template>
