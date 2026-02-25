#!/usr/bin/env node

/**
 * Gera uma lista de credenciamento de todos os inscritos (dormindo ou não no mosteiro)
 * Ordena por nome completo (alfabético)
 * Gera CSV: NOME, EMAIL, CPF, TELEFONE, DORME NO MOSTEIRO (Sim/Não), CIDADE, ESTADO
 * Requer: CPF_ENCRYPTION_KEY e CPF_ENCRYPTION_IV em base64 (ex.: variáveis de ambiente ou .env)
 * Uso: node scripts/generate-credential-list.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

function base64Decode(b64) {
    const normalized = b64.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(normalized, 'base64');
}

/**
 * Descriptografa CPF (AES-256-CBC) para uso na exportação.
 * Key e IV devem ser os mesmos usados no Cloudflare (env CPF_ENCRYPTION_KEY e CPF_ENCRYPTION_IV).
 */
function decryptCpf(ciphertextBase64, keyBase64, ivBase64) {
    if (!ciphertextBase64 || !keyBase64 || !ivBase64) return null;
    try {
        const key = base64Decode(keyBase64);
        const iv = base64Decode(ivBase64);
        const cipher = Buffer.from(ciphertextBase64, 'base64');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        const decrypted = Buffer.concat([decipher.update(cipher), decipher.final()]);
        return decrypted.toString('utf8');
    } catch (err) {
        console.warn('Aviso: falha ao descriptografar CPF:', err.message);
        return null;
    }
}

async function getAllRegistrations() {
    const query = `
SELECT 
  name,
  email,
  cpf_encrypted,
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

function generateCSV(registrations, options = {}) {
    const keyBase64 = options.cpfKey || process.env.CPF_ENCRYPTION_KEY;
    const ivBase64 = options.cpfIv || process.env.CPF_ENCRYPTION_IV;
    const canDecrypt = Boolean(keyBase64 && ivBase64);

    const sorted = [...registrations].sort((a, b) => a.name.localeCompare(b.name));
    const csvHeader = 'NOME,EMAIL,CPF,TELEFONE,DORME NO MOSTEIRO,CIDADE,ESTADO,ASSINATURA RECEBIMENTO KIT\n';
    const csvRows = sorted.map(person => {
        const name = `"${person.name}"`;
        const email = `"${person.email}"`;
        let cpf = '';
        if (person.cpf_encrypted && canDecrypt) {
            const decrypted = decryptCpf(person.cpf_encrypted, keyBase64, ivBase64);
            cpf = decrypted ? `"${decrypted}"` : '""';
        } else if (person.cpf_encrypted && !canDecrypt) {
            cpf = '"(configure CPF_ENCRYPTION_KEY e CPF_ENCRYPTION_IV)"';
        } else {
            cpf = '""';
        }
        const phone = `"${person.phone || ''}"`;
        const dorme = person.sleep_at_monastery === 1 ? 'Sim' : 'Não';
        const city = `"${person.city || ''}"`;
        const state = `"${person.state || ''}"`;
        return `${name},${email},${cpf},${phone},${dorme},${city},${state},""`;
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
    if (!process.env.CPF_ENCRYPTION_KEY || !process.env.CPF_ENCRYPTION_IV) {
        console.warn('⚠️  CPF_ENCRYPTION_KEY ou CPF_ENCRYPTION_IV não definidos. O CPF será deixado em branco no CSV.');
        console.warn('   Para incluir CPF, exporte as mesmas chaves usadas no Cloudflare (base64) e execute novamente.');
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
