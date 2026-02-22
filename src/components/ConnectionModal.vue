<script setup lang="ts">
import { computed, ref } from "vue";
import type { AuthType, ConnectionInput } from "../lib/connections";

const emit = defineEmits<{
    (event: "close"): void;
    (event: "save", payload: ConnectionInput): void;
}>();

const name = ref("");
const accountEndpoint = ref("");
const database = ref("");
const authType = ref<AuthType>("apiKey");
const tenantId = ref("");
const clientId = ref("");
const secret = ref("");

const requiresTenant = computed(() => authType.value === "servicePrincipal");

const onSubmit = () => {
    if (!name.value || !accountEndpoint.value || !database.value) {
        return;
    }

    const payload: ConnectionInput = {
        name: name.value,
        accountEndpoint: accountEndpoint.value,
        database: database.value,
        authType: authType.value,
        tenantId: requiresTenant.value ? tenantId.value : undefined,
        clientId: requiresTenant.value ? clientId.value : undefined
    };

    emit("save", payload);
    secret.value = "";
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
                    <input id="connection-name" v-model="name" placeholder="Production - West Europe" />
                </div>
                <div class="form-field">
                    <label for="connection-db">Database</label>
                    <input id="connection-db" v-model="database" placeholder="cosmos-db" />
                </div>
                <div class="form-field" style="grid-column: 1 / -1;">
                    <label for="connection-endpoint">Account Endpoint</label>
                    <input
                        id="connection-endpoint"
                        v-model="accountEndpoint"
                        placeholder="https://my-account.documents.azure.com"
                    />
                </div>
                <div class="form-field">
                    <label for="connection-auth">Auth Type</label>
                    <select id="connection-auth" v-model="authType">
                        <option value="apiKey">Cosmos API Key</option>
                        <option value="servicePrincipal">Service Principal</option>
                        <option value="ldap">Microsoft Intra / LDAP</option>
                    </select>
                </div>
                <div class="form-field">
                    <label for="connection-secret">Secret</label>
                    <input
                        id="connection-secret"
                        v-model="secret"
                        placeholder="Stored locally during session"
                    />
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
            <p class="helper-text">
                Connection metadata is stored locally. Secrets stay in memory for this session.
            </p>
            <div class="query-actions">
                <button class="action-button" type="submit">Save Connection</button>
                <button class="action-button secondary" type="button" @click="emit('close')">
                    Cancel
                </button>
            </div>
        </form>
    </div>
</template>
