#!/usr/bin/env node

/**
 * Script para gerar Tracking Plan do Amplitude em formato CSV
 * Formato: Amplitude Import Template (hierarchical structure)
 * Saída: tracking/amplitude-import.csv
 * 
 * Uso: npm run tracking:amplitude
 */

const fs = require("fs");
const path = require("path");

// ============ CATÁLOGO DE EVENTOS ============
const AMPLITUDE_EVENTS = {
    PAGE_VIEWED: "page_viewed",
    SECTION_VIEWED: "section_viewed",
    FORM_SECTION_VIEWED: "form_section_viewed",
    NAVIGATION_LINK_CLICKED: "navigation_link_clicked",
    NAVIGATION_MENU_TOGGLED: "navigation_menu_toggled",
    CTA_CLICKED: "cta_clicked",
    FORM_STARTED: "form_started",
    FORM_SUBMITTED: "form_submitted",
    FORM_SUCCESS: "form_success",
    FORM_ERROR: "form_error",
    GALLERY_VIEWED: "gallery_viewed",
    GALLERY_ALBUM_CLICKED: "gallery_album_clicked",
    EXTERNAL_LINK_CLICKED: "external_link_clicked",
    ERROR_OCCURRED: "error_occurred",
};

const EVENT_PROPERTIES_SCHEMA = {
    page_viewed: {
        required: ["page_name"],
        optional: ["route", "referrer"],
        description: "Visualização de página",
    },
    section_viewed: {
        required: ["page_name", "section_id", "section_name"],
        optional: ["position"],
        description: "Seção se tornou visível",
    },
    form_section_viewed: {
        required: ["page_name", "section_id", "section_name"],
        optional: ["position", "message_camel_case"],
        description: "Seção de formulário ficou visível",
    },
    navigation_link_clicked: {
        required: ["page_name", "link_text", "href"],
        optional: ["location"],
        description: "Clique em link de navegação",
    },
    navigation_menu_toggled: {
        required: ["action"],
        optional: ["location"],
        description: "Menu aberto/fechado",
    },
    cta_clicked: {
        required: ["page_name", "cta_id"],
        optional: [
            "cta_text",
            "destination",
            "section_id",
            "section_name",
            "position",
            "component_name",
        ],
        description: "Clique em CTA",
    },
    form_started: {
        required: ["page_name", "form_id"],
        optional: ["form_step"],
        description: "Formulário começou a ser preenchido",
    },
    form_submitted: {
        required: ["page_name", "form_id"],
        optional: ["form_step", "status"],
        description: "Formulário foi enviado",
    },
    form_success: {
        required: ["page_name", "form_id"],
        optional: ["status", "form_step"],
        description: "Formulário processado com sucesso",
    },
    form_error: {
        required: ["page_name", "form_id", "error_type"],
        optional: ["field_name", "form_step"],
        description: "Erro ao processar formulário",
    },
    gallery_viewed: {
        required: ["page_name"],
        optional: ["route"],
        description: "Visualização de galeria",
    },
    gallery_album_clicked: {
        required: ["page_name"],
        optional: ["album_year", "album_name"],
        description: "Clique em álbum da galeria",
    },
    external_link_clicked: {
        required: [],
        optional: ["page_name", "link_text", "url", "platform"],
        description: "Clique em link externo",
    },
    error_occurred: {
        required: ["error_type"],
        optional: ["error_message", "context", "page_name"],
        description: "Erro na aplicação",
    },
};

const EVENT_CATEGORIES = {
    page_viewed: "PAGE",
    section_viewed: "SECTION",
    form_section_viewed: "FORMS",
    navigation_link_clicked: "NAVIGATION",
    navigation_menu_toggled: "NAVIGATION",
    cta_clicked: "CTA",
    form_started: "FORMS",
    form_submitted: "FORMS",
    form_success: "FORMS",
    form_error: "FORMS",
    gallery_viewed: "GALLERY",
    gallery_album_clicked: "GALLERY",
    external_link_clicked: "EXTERNAL",
    error_occurred: "ERRORS",
};

// ============ FUNÇÕES UTILITÁRIAS ============
function inferPropertyType(propName) {
    if (["timestamp", "form_step", "album_year"].includes(propName)) {
        return "number";
    }
    return "string";
}

function escapeCSV(value) {
    if (!value) return "";
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

const COLUMNS = [
    "Action",
    "Object Type",
    "Object Name",
    "Event Display Name",
    "Object Description",
    "Event Category",
    "Tags",
    "Event Activity",
    "Event Hidden From Dropdowns",
    "Event Hidden From Persona Results",
    "Event Hidden From Pathfinder",
    "Event Hidden From Timeline",
    "Event Source",
    "Property Type",
    "Property Group Names",
    "Event Property Name",
    "Property Description",
    "Property Value Type",
    "Property Required",
    "Property Visibility",
    "Property Is Array",
    "Enum Values",
    "Property Regex",
    "Const Value",
    "String Property Value Min Length",
    "String Property Value Max Length",
    "Number Property Value Min",
    "Number Property Value Max",
    "Array Min Items",
    "Array Max Items",
];

function createRow(data) {
    return COLUMNS.map((col) => escapeCSV(data[col] || "")).join(",");
}

// ============ GERAÇÃO DO CSV ============
function generateAmplitudeImportCSV() {
    const rows = [];

    // Header line
    const headerLine = COLUMNS.join(",");

    // Property Group genérico para todas as propriedades
    const propertyGroupRow = {
        "Object Type": "Property Group",
        "Object Name": "Common-Properties",
        "Object Description": "Propriedades comuns a todos os eventos",
    };
    rows.push(propertyGroupRow);

    // Coletar todas as propriedades únicas
    const allPropertiesSet = new Set();
    for (const schema of Object.values(EVENT_PROPERTIES_SCHEMA)) {
        for (const prop of schema.required) {
            allPropertiesSet.add(prop);
        }
        for (const prop of schema.optional) {
            allPropertiesSet.add(prop);
        }
    }

    // Adicionar propriedades ao grupo
    for (const propName of Array.from(allPropertiesSet).sort()) {
        const propertyRow = {
            "Object Type": "",
            "Event Property Name": propName,
            "Property Description": `Property ${propName}`,
            "Property Value Type": inferPropertyType(propName),
            "Property Required": "FALSE",
        };
        rows.push(propertyRow);
    }

    // Linha em branco
    rows.push({});

    // Eventos
    for (const [_key, eventName] of Object.entries(AMPLITUDE_EVENTS)) {
        const schema = EVENT_PROPERTIES_SCHEMA[eventName];

        const eventRow = {
            "Object Type": "Event",
            "Object Name": eventName,
            "Event Display Name": eventName,
            "Object Description": schema.description,
            "Event Category": EVENT_CATEGORIES[eventName] || "OTHER",
            "Event Activity": "ACTIVE",
            "Event Source": "web",
        };
        rows.push(eventRow);

        // Referência ao Property Group
        const propertyGroupRef = {
            "Object Type": "",
            "Property Group Names": "Common-Properties",
        };
        rows.push(propertyGroupRef);

        // Propriedades específicas do evento (required)
        for (const propName of schema.required) {
            const propRow = {
                "Object Type": "",
                "Event Property Name": propName,
                "Property Description": `Property ${propName} (required)`,
                "Property Value Type": inferPropertyType(propName),
                "Property Required": "TRUE",
            };
            rows.push(propRow);
        }
    }

    // Montar CSV
    let csv = headerLine + "\n";
    for (const row of rows) {
        if (Object.keys(row).length === 0) {
            csv += "\n";
        } else {
            csv += createRow(row) + "\n";
        }
    }

    return csv;
}

// ============ MAIN ============
function main() {
    try {
        const trackingDir = path.resolve(__dirname, "../tracking");
        if (!fs.existsSync(trackingDir)) {
            fs.mkdirSync(trackingDir, { recursive: true });
        }

        const csv = generateAmplitudeImportCSV();
        const csvPath = path.join(trackingDir, "amplitude-import.csv");

        fs.writeFileSync(csvPath, csv, "utf-8");

        console.log("\n✅ Tracking Plan Amplitude gerado com sucesso!\n");

        console.log("📁 Arquivo criado:");
        console.log(`  - ${csvPath}\n`);

        console.log(
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        );
        console.log("📊 AMPLITUDE-IMPORT.CSV (primeiras 10 linhas):");
        console.log(
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        );
        const lines = csv.split("\n").slice(0, 11);
        lines.forEach((line) => console.log(line));

        console.log(
            "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        );

        const lineCount = csv.split("\n").length - 1;
        console.log(`📈 Estatísticas:`);
        console.log(`  - Total de linhas (incluindo header): ${lineCount}\n`);

        console.log(`🔗 Para importar no Amplitude:`);
        console.log(`  1. Acesse: https://analytics.amplitude.com`);
        console.log(`  2. Vá para: Data > Catalog > Import`);
        console.log(`  3. Clique em: "Import Events and Event Properties"`);
        console.log(`  4. Upload do arquivo: amplitude-import.csv\n`);
    } catch (error) {
        console.error("❌ Erro ao gerar Tracking Plan:", error);
        process.exit(1);
    }
}

main();
