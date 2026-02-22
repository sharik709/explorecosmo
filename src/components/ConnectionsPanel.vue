<script setup lang="ts">
import type { ConnectionMetadata } from "../lib/connections";

const props = defineProps<{
    connections: ConnectionMetadata[];
    activeId: string | null;
}>();

const emit = defineEmits<{
    (event: "connect", id: string): void;
    (event: "remove", id: string): void;
    (event: "add"): void;
}>();

const isActive = (id: string) => props.activeId === id;
</script>

<template>
    <section class="panel">
        <div class="panel-header">
            <span class="panel-title">Connections</span>
            <button class="action-button ghost" type="button" @click="emit('add')">
                Add
            </button>
        </div>
        <div v-if="connections.length === 0" class="empty-state">
            Add a connection to start browsing collections.
        </div>
        <div v-else>
            <div
                v-for="connection in connections"
                :key="connection.id"
                class="connection-item"
                :class="{ active: isActive(connection.id) }"
            >
                <div class="connection-meta">
                    <span class="connection-name">{{ connection.name }}</span>
                    <span class="connection-detail">
                        {{ connection.database || "Database not selected" }} · {{ connection.authType }}
                    </span>
                </div>
                <div>
                    <button
                        class="action-button secondary"
                        type="button"
                        @click="emit('connect', connection.id)"
                    >
                        Connect
                    </button>
                    <button
                        class="action-button ghost"
                        type="button"
                        @click="emit('remove', connection.id)"
                    >
                        Remove
                    </button>
                </div>
            </div>
        </div>
    </section>
</template>
