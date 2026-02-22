<script setup lang="ts">
import { computed, ref } from "vue";
import { listDatabases } from "../lib/cosmos";
import type { AuthType, ConnectionInput } from "../lib/connections";

export type ConnectionModalPayload = {
    connection: ConnectionInput;
    secret?: string;
};

const emit = defineEmits<{
    (event: "close"): void;
    (event: "save", payload: ConnectionModalPayload): void;
}>();

const name = ref("");
const accountEndpoint = ref("");
const database = ref("");
const authType = ref<AuthType>("apiKey");
const tenantId = ref("");
const clientId = ref("");
const secret = ref("");
const discoveredDatabases = ref<string[]>([]);
const databasesLoading = ref(false);
const errorMessage = ref("");

const requiresTenant = computed(() => authType.value === "servicePrincipal");
const canDiscoverDatabases = computed(() => {
    if (!accountEndpoint.value.trim() || !secret.value.trim()) {
        return false;
    }

    if (authType.value === "apiKey") {
        return true;
    }

    if (authType.value === "servicePrincipal") {
        return !!tenantId.value.trim() && !!clientId.value.trim();
    }

    return false;
});

const discoverDatabases = async () => {
    errorMessage.value = "";
    if (!canDiscoverDatabases.value) {
        errorMessage.value =
            authType.value === "servicePrincipal"
                ? "Provide endpoint, client secret, tenant ID, and client ID before loading databases."
                : "Provide endpoint and API key before loading databases.";
        return;
    }

    databasesLoading.value = true;
    try {
        const items = await listDatabases({
            accountEndpoint: accountEndpoint.value.trim(),
            auth: {
                authType: authType.value,
                secret: secret.value.trim(),
                tenantId: tenantId.value.trim() || undefined,
                clientId: clientId.value.trim() || undefined
            }
        });
        discoveredDatabases.value = items.map((item) => item.id);
        if (!database.value && discoveredDatabases.value.length > 0) {
            database.value = discoveredDatabases.value[0];
        }
    } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : String(error);
    } finally {
        databasesLoading.value = false;
    }
};

const onSubmit = () => {
    errorMessage.value = "";
    if (!name.value.trim() || !accountEndpoint.value.trim()) {
        errorMessage.value = "Connection name and endpoint are required.";
        return;
    }

    if (authType.value === "servicePrincipal") {
        if (!tenantId.value.trim() || !clientId.value.trim() || !secret.value.trim()) {
            errorMessage.value = "Service principal requires tenant ID, client ID, and client secret.";
            return;
        }
    }

    const connection: ConnectionInput = {
        name: name.value.trim(),
        accountEndpoint: accountEndpoint.value.trim(),
        database: database.value.trim(),
        authType: authType.value,
        tenantId: requiresTenant.value ? tenantId.value.trim() : undefined,
        clientId: requiresTenant.value ? clientId.value.trim() : undefined
    };

    const cleanedSecret = secret.value.trim();
    emit("save", {
        connection,
        secret: cleanedSecret || undefined
    });
};
</script>

<template>
    <div class="modal-backdrop" @click.self="emit('close')">
        <form class="modal" @submit.prevent="onSubmit">
            <div class="panel-header">
                <span class="panel-title">New Connection</span>
                <button class="action-button ghost" type="button" @click="emit('close')">
                    Close
                </button>
            </div>
            <div class="form-grid">
                <div class="form-field">
                    <label for="connection-name">Connection Name</label>
                    <input id="connection-name" v-model="name" placeholder="Production West" />
                </div>
                <div class="form-field">
                    <label for="connection-auth">Auth Type</label>
                    <select id="connection-auth" v-model="authType">
                        <option value="apiKey">Cosmos API Key</option>
                        <option value="servicePrincipal">Service Principal</option>
                        <option value="ldap">Microsoft Intra / LDAP</option>
                    </select>
                </div>
                <div class="form-field" style="grid-column: 1 / -1;">
                    <label for="connection-endpoint">Account Endpoint</label>
                    <input
                        id="connection-endpoint"
                        v-model="accountEndpoint"
                        placeholder="https://my-account.documents.azure.com"
                    />
                </div>
                <div class="form-field" style="grid-column: 1 / -1;">
                    <label for="connection-secret">Secret</label>
                    <input
                        id="connection-secret"
                        v-model="secret"
                        placeholder="API key or token"
                        type="password"
                    />
                </div>
                <div class="form-field" style="grid-column: 1 / -1;">
                    <label for="connection-db">Database (Optional)</label>
                    <div class="inline-field">
                        <input id="connection-db" v-model="database" placeholder="Leave empty to choose later" />
                        <button
                            class="action-button secondary"
                            type="button"
                            :disabled="databasesLoading"
                            @click="discoverDatabases"
                        >
                            {{ databasesLoading ? "Loading" : "Load Databases" }}
                        </button>
                    </div>
                </div>
                <div v-if="discoveredDatabases.length > 0" class="form-field" style="grid-column: 1 / -1;">
                    <label for="connection-db-select">Database Selector</label>
                    <select id="connection-db-select" v-model="database">
                        <option v-for="item in discoveredDatabases" :key="item" :value="item">
                            {{ item }}
                        </option>
                    </select>
                </div>
                <div v-if="requiresTenant" class="form-field">
                    <label for="connection-tenant">Tenant ID</label>
                    <input id="connection-tenant" v-model="tenantId" placeholder="Tenant GUID" />
                </div>
                <div v-if="requiresTenant" class="form-field">
                    <label for="connection-client">Client ID</label>
                    <input id="connection-client" v-model="clientId" placeholder="Client GUID" />
                </div>
            </div>
            <p class="helper-text" v-if="authType === 'ldap'">
                LDAP auth is not implemented yet in backend commands.
            </p>
            <p class="helper-text" v-if="errorMessage">{{ errorMessage }}</p>
            <div class="query-actions">
                <button class="action-button" type="submit">Save Connection</button>
                <button class="action-button secondary" type="button" @click="emit('close')">
                    Cancel
                </button>
            </div>
        </form>
    </div>
</template>
