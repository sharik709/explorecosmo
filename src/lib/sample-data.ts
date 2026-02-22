export type RowData = Record<string, string | number | boolean | null>;

export type CollectionData = {
    id: string;
    name: string;
    description: string;
    fields: string[];
    rows: RowData[];
};

const collections: CollectionData[] = [
    {
        id: "customers",
        name: "Customers",
        description: "Accounts, segmentation, and lifecycle status.",
        fields: ["id", "name", "segment", "status", "region", "credits"],
        rows: [
            {
                id: "CUS-2034",
                name: "Northwind Logistics",
                segment: "Enterprise",
                status: "active",
                region: "West Europe",
                credits: 184
            },
            {
                id: "CUS-2035",
                name: "Bluegrass Retail",
                segment: "Mid-Market",
                status: "active",
                region: "Central US",
                credits: 67
            },
            {
                id: "CUS-2036",
                name: "Hearth & Harbor",
                segment: "SMB",
                status: "trial",
                region: "East US",
                credits: 12
            },
            {
                id: "CUS-2037",
                name: "Atlas Dynamics",
                segment: "Enterprise",
                status: "paused",
                region: "North Europe",
                credits: 42
            }
        ]
    },
    {
        id: "orders",
        name: "Orders",
        description: "Transactional orders across regions.",
        fields: ["id", "customer", "total", "currency", "fulfilled", "priority"],
        rows: [
            {
                id: "ORD-9921",
                customer: "Northwind Logistics",
                total: 9850,
                currency: "EUR",
                fulfilled: false,
                priority: "high"
            },
            {
                id: "ORD-9922",
                customer: "Bluegrass Retail",
                total: 1430,
                currency: "USD",
                fulfilled: true,
                priority: "normal"
            },
            {
                id: "ORD-9923",
                customer: "Hearth & Harbor",
                total: 680,
                currency: "USD",
                fulfilled: false,
                priority: "rush"
            }
        ]
    },
    {
        id: "sessions",
        name: "Sessions",
        description: "Operational telemetry for app sessions.",
        fields: ["id", "user", "device", "duration", "country", "status"],
        rows: [
            {
                id: "SES-118",
                user: "nyla",
                device: "desktop",
                duration: 420,
                country: "GB",
                status: "ok"
            },
            {
                id: "SES-119",
                user: "mason",
                device: "tablet",
                duration: 288,
                country: "FR",
                status: "slow"
            },
            {
                id: "SES-120",
                user: "aiko",
                device: "mobile",
                duration: 512,
                country: "US",
                status: "ok"
            }
        ]
    }
];

const copyCollections = () => {
    if (typeof structuredClone === "function") {
        return structuredClone(collections) as CollectionData[];
    }

    return JSON.parse(JSON.stringify(collections)) as CollectionData[];
};

export const getCollections = () => copyCollections();

const parseWhereClause = (clause: string) => {
    const parts = clause.split("=");
    if (parts.length < 2) {
        return null;
    }

    const left = parts[0].trim();
    const right = parts.slice(1).join("=").trim();
    const field = left.startsWith("c.") ? left.slice(2) : left;
    const cleanValue = right.startsWith("'") && right.endsWith("'")
        ? right.slice(1, -1)
        : right;

    return { field, value: cleanValue };
};

const applyWhere = (rows: RowData[], clause: string) => {
    const parsed = parseWhereClause(clause);
    if (!parsed) {
        return rows;
    }

    return rows.filter((row) => {
        const value = row[parsed.field];
        return value !== undefined && String(value) === parsed.value;
    });
};

const applyLimit = (rows: RowData[], limitValue: string | null) => {
    if (!limitValue) {
        return rows;
    }

    const parsed = Number(limitValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return rows;
    }

    return rows.slice(0, parsed);
};

export const runQuery = (collection: CollectionData, query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
        return [...collection.rows];
    }

    const lower = trimmed.toLowerCase();
    const whereIndex = lower.indexOf("where");
    const limitIndex = lower.indexOf("limit");

    let rows = [...collection.rows];
    if (whereIndex >= 0) {
        const endIndex = limitIndex > whereIndex ? limitIndex : trimmed.length;
        const clause = trimmed.slice(whereIndex + 5, endIndex).trim();
        rows = applyWhere(rows, clause);
    }

    const limitValue =
        limitIndex >= 0 ? trimmed.slice(limitIndex + 5).trim() : null;

    return applyLimit(rows, limitValue);
};
