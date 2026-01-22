#!/usr/bin/env node

/**
 * Gera uma lista de credenciamento de todos os inscritos (dormindo ou não no mosteiro)
 * Ordena por nome completo (alfabético)
 * Gera CSV: NOME, EMAIL, TELEFONE, DORME NO MOSTEIRO (Sim/Não), CIDADE, ESTADO
 * Uso: node scripts/generate-credential-list.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function getAllRegistrations() {
    const query = `
SELECT 
  name,
  email,
  phone,
  sleep_at_monastery,
  city,
  state
FROM registrations
WHERE status = 'PAID'
ORDER BY name
`;
    let command = `wrangler d1 execute caminhodoperdao-db --remote --json --command "${query.replace(/"/g, '\"').replace(/\n/g, ' ')}"`;
    let result;
    try {
        result = execSync(command, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (remoteError) {
        command = `wrangler d1 execute caminhodoperdao-db --json --command "${query.replace(/"/g, '\"').replace(/\n/g, ' ')}"`;
        result = execSync(command, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    }
    const parsed = JSON.parse(result);
    let registrations = [];
    if (Array.isArray(parsed) && parsed[0]) {
        const data = parsed[0];
        if (data.success && data.results && Array.isArray(data.results)) {
            registrations = data.results;
        }
    } else if (parsed.success && parsed.results && Array.isArray(parsed.results)) {
        registrations = parsed.results;
    } else if (parsed.success && parsed.result && Array.isArray(parsed.result)) {
        registrations = parsed.result;
    }
    return registrations;
}

function generateCSV(registrations) {
    const sorted = [...registrations].sort((a, b) => a.name.localeCompare(b.name));
    const csvHeader = 'NOME,EMAIL,TELEFONE,DORME NO MOSTEIRO,CIDADE,ESTADO,ASSINATURA RECEBIMENTO KIT\n';
    const csvRows = sorted.map(person => {
        const name = `"${person.name}"`;
        const email = `"${person.email}"`;
        const phone = `"${person.phone || ''}"`;
        const dorme = person.sleep_at_monastery === 1 ? 'Sim' : 'Não';
        const city = `"${person.city || ''}"`;
        const state = `"${person.state || ''}"`;
        return `${name},${email},${phone},${dorme},${city},${state},""`;
    }).join('\n');
    return csvHeader + csvRows;
}

async function main() {
    console.log('🔎 Gerando lista de credenciamento de todos os inscritos...');
    let registrations = [];
    try {
        registrations = await getAllRegistrations();
    } catch (error) {
        console.error('⚠️  Não foi possível conectar ao D1. Nenhum dado gerado.');
        process.exit(1);
    }
    if (registrations.length === 0) {
        console.error('❌ Nenhum registro encontrado com status PAID');
        process.exit(1);
    }
    const csvContent = generateCSV(registrations);
    const reportsDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }
    const csvOutputFile = path.join(reportsDir, 'credential-list.csv');
    fs.writeFileSync(csvOutputFile, csvContent, 'utf-8');
    console.log(`✅ Lista de credenciamento salva em: scripts/reports/credential-list.csv`);
}

main();
