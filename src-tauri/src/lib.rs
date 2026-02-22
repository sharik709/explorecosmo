use base64::{engine::general_purpose, Engine as _};
use chrono::Utc;
use hmac::{Hmac, Mac};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::Sha256;

const API_VERSION: &str = "2018-12-31";

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AuthInput {
    auth_type: String,
    secret: Option<String>,
    tenant_id: Option<String>,
    client_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListDatabasesInput {
    account_endpoint: String,
    auth: AuthInput,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListCollectionsInput {
    account_endpoint: String,
    database: String,
    auth: AuthInput,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct QueryCollectionInput {
    account_endpoint: String,
    database: String,
    collection: String,
    query: String,
    limit: Option<i32>,
    auth: AuthInput,
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CosmosDatabase {
    id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CosmosCollection {
    id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct QueryResponse {
    rows: Vec<Value>,
}

fn normalize_endpoint(endpoint: &str) -> Result<String, String> {
    let trimmed = endpoint.trim().trim_end_matches('/').to_string();
    if trimmed.is_empty() {
        return Err("Account endpoint is required.".to_string());
    }

    if !(trimmed.starts_with("https://") || trimmed.starts_with("http://")) {
        return Err("Account endpoint must start with http:// or https://".to_string());
    }

    Ok(trimmed)
}

fn utc_http_date() -> String {
    Utc::now().format("%a, %d %b %Y %H:%M:%S GMT").to_string()
}

fn infer_aad_scope(endpoint: &str) -> &'static str {
    if endpoint.contains(".documents.azure.us") {
        return "https://cosmos.azure.us/.default";
    }

    if endpoint.contains(".documents.azure.cn") {
        return "https://cosmos.azure.cn/.default";
    }

    if endpoint.contains(".documents.azure.de") {
        return "https://cosmos.azure.de/.default";
    }

    "https://cosmos.azure.com/.default"
}

fn build_master_key_auth_header(
    verb: &str,
    resource_type: &str,
    resource_link: &str,
    date: &str,
    master_key: &str,
) -> Result<String, String> {
    let payload = format!(
        "{}\n{}\n{}\n{}\n\n",
        verb.to_lowercase(),
        resource_type.to_lowercase(),
        resource_link,
        date.to_lowercase()
    );

    let decoded_key = general_purpose::STANDARD
        .decode(master_key)
        .map_err(|_| "Invalid Cosmos API key format. Expected base64 encoded key.".to_string())?;

    let mut mac = HmacSha256::new_from_slice(&decoded_key)
        .map_err(|_| "Failed to initialize signature engine.".to_string())?;
    mac.update(payload.as_bytes());
    let signature = general_purpose::STANDARD.encode(mac.finalize().into_bytes());
    let token = format!("type=master&ver=1.0&sig={signature}");

    Ok(urlencoding::encode(&token).to_string())
}

async fn fetch_service_principal_token(
    client: &Client,
    endpoint: &str,
    auth: &AuthInput,
) -> Result<String, String> {
    let tenant_id = auth
        .tenant_id
        .as_ref()
        .map(|value| value.trim().to_string())
        .unwrap_or_default();
    let client_id = auth
        .client_id
        .as_ref()
        .map(|value| value.trim().to_string())
        .unwrap_or_default();
    let client_secret = auth
        .secret
        .as_ref()
        .map(|value| value.trim().to_string())
        .unwrap_or_default();

    if tenant_id.is_empty() || client_id.is_empty() || client_secret.is_empty() {
        return Err("Service principal requires tenantId, clientId, and client secret.".to_string());
    }

    let token_url = format!("https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token");
    let scope = infer_aad_scope(endpoint);

    let response = client
        .post(token_url)
        .form(&[
            ("grant_type", "client_credentials"),
            ("client_id", client_id.as_str()),
            ("client_secret", client_secret.as_str()),
            ("scope", scope),
        ])
        .send()
        .await
        .map_err(|error| format!("Failed to acquire Azure token: {error}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Azure AD token request failed ({status}): {body}"));
    }

    let token = response
        .json::<TokenResponse>()
        .await
        .map_err(|error| format!("Invalid Azure AD token response: {error}"))?
        .access_token;

    if token.trim().is_empty() {
        return Err("Azure AD token response did not include access_token.".to_string());
    }

    Ok(token)
}

async fn build_authorization_header(
    client: &Client,
    endpoint: &str,
    verb: &str,
    resource_type: &str,
    resource_link: &str,
    date: &str,
    auth: &AuthInput,
) -> Result<String, String> {
    match auth.auth_type.as_str() {
        "apiKey" => {
            let secret = auth
                .secret
                .as_ref()
                .map(|value| value.trim().to_string())
                .unwrap_or_default();

            if secret.is_empty() {
                return Err("API key is required for apiKey auth.".to_string());
            }

            build_master_key_auth_header(verb, resource_type, resource_link, date, &secret)
        }
        "servicePrincipal" => {
            let token = fetch_service_principal_token(client, endpoint, auth).await?;
            let aad_token = format!("type=aad&ver=1.0&sig={token}");
            Ok(urlencoding::encode(&aad_token).to_string())
        }
        "ldap" => Err("LDAP auth is not implemented yet. Use service principal or apiKey.".to_string()),
        _ => Err("Unsupported auth type.".to_string()),
    }
}

async fn cosmos_get(
    client: &Client,
    endpoint: &str,
    verb: &str,
    resource_type: &str,
    resource_link: &str,
    auth: &AuthInput,
) -> Result<Value, String> {
    let date = utc_http_date();
    let auth_header = build_authorization_header(
        client,
        endpoint,
        verb,
        resource_type,
        resource_link,
        &date,
        auth,
    )
    .await?;

    let url = if resource_link.is_empty() {
        format!("{endpoint}/{resource_type}")
    } else {
        format!("{endpoint}/{resource_link}/{resource_type}")
    };

    let response = client
        .get(url)
        .header("x-ms-date", &date)
        .header("x-ms-version", API_VERSION)
        .header("authorization", auth_header)
        .send()
        .await
        .map_err(|error| format!("Request failed: {error}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Cosmos request failed ({status}): {body}"));
    }

    response
        .json::<Value>()
        .await
        .map_err(|error| format!("Invalid Cosmos response: {error}"))
}

async fn cosmos_query(
    client: &Client,
    endpoint: &str,
    resource_link: &str,
    query: &str,
    limit: Option<i32>,
    auth: &AuthInput,
) -> Result<Value, String> {
    let date = utc_http_date();
    let auth_header = build_authorization_header(
        client,
        endpoint,
        "POST",
        "docs",
        resource_link,
        &date,
        auth,
    )
    .await?;
    let max_item_count = limit.unwrap_or(100).max(1).min(1000).to_string();

    let body = json!({
        "query": query,
        "parameters": []
    });

    let url = format!("{endpoint}/{resource_link}/docs");
    let response = client
        .post(url)
        .header("x-ms-date", &date)
        .header("x-ms-version", API_VERSION)
        .header("authorization", auth_header)
        .header("x-ms-documentdb-isquery", "true")
        .header("x-ms-documentdb-query-enablecrosspartition", "true")
        .header("x-ms-max-item-count", max_item_count)
        .header("content-type", "application/query+json")
        .json(&body)
        .send()
        .await
        .map_err(|error| format!("Query failed: {error}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Cosmos query failed ({status}): {body}"));
    }

    response
        .json::<Value>()
        .await
        .map_err(|error| format!("Invalid query response: {error}"))
}

#[tauri::command]
async fn list_databases(input: ListDatabasesInput) -> Result<Vec<CosmosDatabase>, String> {
    let endpoint = normalize_endpoint(&input.account_endpoint)?;
    let client = Client::new();
    let response = cosmos_get(&client, &endpoint, "GET", "dbs", "", &input.auth).await?;

    let databases = response
        .get("Databases")
        .and_then(Value::as_array)
        .ok_or_else(|| "Cosmos response did not include Databases.".to_string())?;

    Ok(databases
        .iter()
        .filter_map(|item| item.get("id").and_then(Value::as_str))
        .map(|id| CosmosDatabase { id: id.to_string() })
        .collect())
}

#[tauri::command]
async fn list_collections(input: ListCollectionsInput) -> Result<Vec<CosmosCollection>, String> {
    let endpoint = normalize_endpoint(&input.account_endpoint)?;
    let database = input.database.trim();
    if database.is_empty() {
        return Err("Database is required to list collections.".to_string());
    }

    let resource_link = format!("dbs/{database}");
    let client = Client::new();
    let response = cosmos_get(
        &client,
        &endpoint,
        "GET",
        "colls",
        &resource_link,
        &input.auth,
    )
    .await?;

    let collections = response
        .get("DocumentCollections")
        .and_then(Value::as_array)
        .ok_or_else(|| "Cosmos response did not include DocumentCollections.".to_string())?;

    Ok(collections
        .iter()
        .filter_map(|item| item.get("id").and_then(Value::as_str))
        .map(|id| CosmosCollection { id: id.to_string() })
        .collect())
}

#[tauri::command]
async fn query_collection(input: QueryCollectionInput) -> Result<QueryResponse, String> {
    let endpoint = normalize_endpoint(&input.account_endpoint)?;
    let database = input.database.trim();
    let collection = input.collection.trim();
    let query = input.query.trim();

    if database.is_empty() {
        return Err("Database is required.".to_string());
    }

    if collection.is_empty() {
        return Err("Collection is required.".to_string());
    }

    if query.is_empty() {
        return Err("Query is required.".to_string());
    }

    let resource_link = format!("dbs/{database}/colls/{collection}");
    let client = Client::new();
    let response = cosmos_query(
        &client,
        &endpoint,
        &resource_link,
        query,
        input.limit,
        &input.auth,
    )
    .await?;

    let rows = response
        .get("Documents")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();

    Ok(QueryResponse { rows })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_databases,
            list_collections,
            query_collection
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
