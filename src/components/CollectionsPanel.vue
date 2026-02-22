<script setup lang="ts">
import type { CosmosCollection } from "../lib/types";

const props = defineProps<{
    collections: CosmosCollection[];
    activeId: string | null;
}>();

const emit = defineEmits<{
    (event: "select", id: string): void;
}>();

const isActive = (id: string) => props.activeId === id;
</script>

<template>
    <section class="panel">
        <div class="panel-header">
            <span class="panel-title">Collections</span>
            <span class="badge">{{ collections.length }}</span>
        </div>
        <div v-if="collections.length === 0" class="empty-state compact">
            No collections loaded.
        </div>
        <ul v-else class="collection-list">
            <li v-for="collection in collections" :key="collection.id">
                <button
                    class="collection-list-item"
                    :class="{ active: isActive(collection.id) }"
                    type="button"
                    @click="emit('select', collection.id)"
                >
                    {{ collection.id }}
                </button>
            </li>
        </ul>
    </section>
</template>
