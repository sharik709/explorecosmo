<script setup lang="ts">
import type { SavedQuery } from "../lib/queries";

const props = defineProps<{
    modelValue: string;
    saveName: string;
    collectionName: string | null;
    savedQueries: SavedQuery[];
}>();

const emit = defineEmits<{
    (event: "update:modelValue", value: string): void;
    (event: "update:saveName", value: string): void;
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
</script>

<template>
    <section class="query-editor">
        <div class="panel-header">
            <span class="panel-title">Query Studio</span>
            <span class="badge">{{ collectionName ?? "No collection" }}</span>
        </div>
        <textarea
            :value="modelValue"
            placeholder="SELECT * FROM c WHERE c.status = 'active' LIMIT 50"
            @input="onInput"
        />
        <div class="form-field" style="margin-top: 12px;">
            <label for="query-name">Save As</label>
            <input
                id="query-name"
                :value="saveName"
                placeholder="High value customers"
                @input="onNameInput"
            />
        </div>
        <div class="query-actions">
            <button class="action-button" type="button" @click="emit('run')">
                Run Query
            </button>
            <button class="action-button secondary" type="button" @click="emit('save')">
                Save Query
            </button>
            <span class="helper-text">Queries save without secrets.</span>
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
