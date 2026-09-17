const fs = require('fs');
const path = require('path');
const swaggerJsDoc = require('swagger-jsdoc');

// Dynamically extract swagger specification directly from route definitions
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Chembur Samithi Seva API',
            version: '1.0.0',
            description: 'API documentation for the Volunteer Management System',
        },
    },
    apis: [
        path.join(__dirname, '../src/routes/authRoutes.js'),
        path.join(__dirname, '../src/routes/publicRoutes.js'),
        path.join(__dirname, '../src/routes/volunteerRoutes.js'),
        path.join(__dirname, '../src/routes/adminRoutes.js'),
    ],
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);
const endpoints = [];

for (const [routePath, methods] of Object.entries(swaggerSpec.paths || {})) {
    for (const [method, def] of Object.entries(methods)) {
        const responses = [];
        if (def.responses) {
            for (const [code, r] of Object.entries(def.responses)) {
                responses.push({ code, desc: r.description || '' });
            }
        }
        endpoints.push({
            method: method.toUpperCase(),
            path: routePath,
            summary: def.summary || '',
            description: def.description || '',
            parameters: def.parameters || [],
            requestBody: def.requestBody || null,
            responses: responses
        });
    }
}

function formatSchema(schema) {
    if (!schema) return 'None';
    if (schema.type === 'object') {
        const props = schema.properties || {};
        const req = schema.required || [];
        const lines = Object.entries(props).map(([k, v]) => {
            const isReq = req.includes(k) ? ' *(Required)*' : ' *(Optional)*';
            const typeStr = v.type || (v.$ref ? v.$ref.split('/').pop() : 'any');
            const enumStr = v.enum ? ` [Allowed values: \`${v.enum.join('`, `')}\`]` : '';
            const descStr = v.description ? ` — ${v.description}` : '';
            return `  - \`${k}\` (\`${typeStr}\`${isReq}${enumStr})${descStr}`;
        });
        return lines.length > 0 ? lines.join('\n') : 'Empty object `{}`';
    }
    return '`' + JSON.stringify(schema) + '`';
}

const publicCount = endpoints.filter(e => e.path.startsWith('/api/public')).length;
const authCount = endpoints.filter(e => e.path.startsWith('/api/auth')).length;
const volunteerCount = endpoints.filter(e => e.path.startsWith('/api/volunteer')).length;
const adminCount = endpoints.filter(e => e.path.startsWith('/api/admin')).length;

let md = `# Chembur Samithi Seva – Complete Backend API Reference

> A comprehensive, production-grade reference manual covering all **${endpoints.length} backend API endpoints** grouped by user role (**Public**, **Auth**, **Volunteer**, and **Admin**).
> 
> Designed to provide full architectural and schema parity for frontend developers and AI coding agents building web/mobile interfaces.

---

## Table of Contents
1. [Global Architectural Conventions](#1-global-architectural-conventions)
2. [Public Endpoints (Guest / Unauthenticated)](#2-public-endpoints-guest--unauthenticated) (${publicCount} endpoints)
3. [Authentication & Session Endpoints](#3-authentication--session-endpoints) (${authCount} endpoints)
4. [Volunteer Portal Endpoints (Role: volunteer)](#4-volunteer-portal-endpoints-role-volunteer) (${volunteerCount} endpoints)
5. [Admin Management Endpoints (Role: admin)](#5-admin-management-endpoints-role-admin) (${adminCount} endpoints)
6. [Response Codes & Standard Error Matrix](#6-response-codes--standard-error-matrix)

---

## 1. Global Architectural Conventions

### 1.1 Base URLs & Access Points
- **API Base Path**: \`/api\`
- **Interactive Swagger UI**: \`/api-docs\`
- **OpenAPI 3.0.0 JSON Specification**: \`/api-docs/swagger.json\`
- **Default Content-Type**: \`application/json\`

### 1.2 Authentication Header (Bearer Token)
All protected endpoints require the standard HTTP \`Authorization\` header containing a valid JSON Web Token (JWT):
\`\`\`http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
\`\`\`
Tokens are obtained via \`POST /api/auth/login\` or \`POST /api/auth/register\`.

### 1.3 Uniform Envelope Schema

#### Standard Success Response (\`200 OK\`, \`201 Created\`)
\`\`\`json
{
  "success": true,
  "message": "Action completed successfully.",
  "data": { ... }
}
\`\`\`

#### Standard Error Response (\`400\`, \`401\`, \`403\`, \`404\`, \`409\`, \`500\`, \`503\`)
\`\`\`json
{
  "success": false,
  "message": "Specific error explanation."
}
\`\`\`

---

`;

const sections = [
    {
        title: "2. Public Endpoints (Guest / Unauthenticated)",
        filter: (e) => e.path.startsWith("/api/public"),
        accessNote: "Open to all unauthenticated clients. No token required."
    },
    {
        title: "3. Authentication & Session Endpoints",
        filter: (e) => e.path.startsWith("/api/auth"),
        accessNote: "Entry points for onboarding, session creation, password resets, and session recovery."
    },
    {
        title: "4. Volunteer Portal Endpoints (Role: volunteer)",
        filter: (e) => e.path.startsWith("/api/volunteer"),
        accessNote: "Requires valid Bearer token and role 'volunteer'. Enforced by global router middleware."
    },
    {
        title: "5. Admin Management Endpoints (Role: admin)",
        filter: (e) => e.path.startsWith("/api/admin"),
        accessNote: "Requires valid Bearer token and role 'admin'. Enforced by global router middleware."
    }
];

sections.forEach((sec) => {
    md += `## ${sec.title}\n\n`;
    md += `*Access Requirement: ${sec.accessNote}*\n\n`;

    const items = endpoints.filter(sec.filter);

    items.forEach((e) => {
        md += `### \`${e.method} ${e.path}\`\n\n`;
        md += `**Summary**: ${e.summary}\n\n`;
        if (e.description) {
            md += `**Description**: ${e.description}\n\n`;
        }

        let authHeader = "None (Public)";
        if (e.path.startsWith("/api/volunteer")) {
            authHeader = "`Authorization: Bearer <token>` (Volunteer)";
        } else if (e.path.startsWith("/api/admin")) {
            authHeader = "`Authorization: Bearer <token>` (Admin)";
        } else if (e.path === "/api/auth/me" || e.path === "/api/auth/change-password") {
            authHeader = "`Authorization: Bearer <token>` (Authenticated User)";
        }

        md += `- **Required Headers**:\n`;
        md += `  - \`Authorization\`: ${authHeader}\n`;
        md += `  - \`Content-Type\`: \`application/json\`\n`;

        if (e.parameters && e.parameters.length > 0) {
            md += `- **URL / Query Parameters**:\n`;
            e.parameters.forEach((p) => {
                const req = p.required ? ' *(Required)*' : ' *(Optional)*';
                const schemaType = p.schema ? `\`${p.schema.type || 'string'}\`` : '`string`';
                md += `  - \`${p.name}\` (In: \`${p.in}\`, Type: ${schemaType}${req}) — ${p.description || 'No description'}\n`;
            });
        } else {
            md += `- **URL / Query Parameters**: None\n`;
        }

        if (e.requestBody && e.requestBody.content && e.requestBody.content['application/json']) {
            const schema = e.requestBody.content['application/json'].schema;
            md += `- **JSON Request Body Parameters**:\n${formatSchema(schema)}\n`;
        } else {
            md += `- **Request Body**: None\n`;
        }

        md += `- **Expected HTTP Status Codes**:\n`;
        e.responses.forEach((r) => {
            md += `  - **\`${r.code}\`**: ${r.desc}\n`;
        });

        md += `\n---\n\n`;
    });
});

md += `## 6. Response Codes & Standard Error Matrix

| HTTP Status Code | Meaning | Typical Trigger | Recommended Frontend Behavior |
| :--- | :--- | :--- | :--- |
| **\`200 OK\`** | Success | Request succeeded and returned requested data. | Render components or update state with \`data\`. |
| **\`201 Created\`** | Created | New record established (e.g., registration, event creation). | Save returned token/ID and navigate to the target screen. |
| **\`400 Bad Request\`** | Validation Failure | Missing required fields, invalid UUID, deadline passed, event at capacity, invalid status transition. | Display toast or form field validation message from \`response.data.message\`. |
| **\`401 Unauthorized\`** | Authentication Error | Missing token, invalid credentials, or expired JWT. | Clear stored token and redirect user to \`/login\`. |
| **\`403 Forbidden\`** | Authorization Error | Role mismatch (e.g. volunteer accessing admin route) or trying to modify an unassigned task. | Render "Access Denied" view or show error banner. |
| **\`404 Not Found\`** | Resource Missing | Event, volunteer, task, or certificate ID does not exist in the database. | Render 404 Empty State / "Resource Not Found" screen. |
| **\`409 Conflict\`** | Conflict / Duplicate | Email address or phone number is already registered. | Prompt user to log in or use alternate contact info. |
| **\`500 Internal Error\`**| Server Exception | Uncaught server or database error. | Show generic error alert: *"An unexpected error occurred. Please try again later."* |
| **\`503 Unavailable\`**   | Maintenance / Timeout | Database service temporarily unavailable or connection timeout. | Prompt user to retry request shortly. |
`;

const outputPath = path.join(__dirname, '../API_DOCUMENTATION.md');
fs.writeFileSync(outputPath, md, 'utf8');
console.log('API_DOCUMENTATION.md created successfully. Total characters:', md.length);

