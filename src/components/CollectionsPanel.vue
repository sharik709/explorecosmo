<script setup lang="ts">
import type { CollectionData } from "../lib/sample-data";

const props = defineProps<{
    collections: CollectionData[];
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
        <div v-if="collections.length === 0" class="empty-state">
            Connect to a database to load collections.
        </div>
        <div v-else>
            <button
                v-for="collection in collections"
                :key="collection.id"
                class="collection-item"
                :class="{ active: isActive(collection.id) }"
                type="button"
                @click="emit('select', collection.id)"
            >
                <div class="collection-meta">
                    <span class="collection-name">{{ collection.name }}</span>
                    <span class="collection-detail">{{ collection.description }}</span>
                </div>
            </button>
        </div>
    </section>
</template>
