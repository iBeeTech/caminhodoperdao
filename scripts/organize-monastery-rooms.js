#!/usr/bin/env node

/**
 * Organiza as pessoas por família/grupo para alocação de quartos no mosteiro
 * Busca dados do D1 de produção automaticamente
 * 
 * Gera:
 * - Arquivo CSV com: NOME, TELEFONE, GRUPO/FAMILIA (ordenado por grupo)
 * - Arquivo JSON com detalhes completos e sugestões de alocação
 * 
 * Uso: npm run monastery:organize
 */

const fs = require('fs');
const path = require('path');

// Função para buscar dados do D1 via Wrangler
async function getDataViaWrangler() {
    const { execSync } = require('child_process');

    try {
        // Query para buscar pessoas que vão dormir no mosteiro
        const query = `
SELECT 
  companion_name,
  name,
  email,
  phone,
  sleep_at_monastery,
  city,
  state
FROM registrations
WHERE status = 'PAID' AND sleep_at_monastery = 1
ORDER BY companion_name, name
`;

        console.log('🔗 Buscando dados do D1...\n');

        // Executa a query usando wrangler d1 execute com output em JSON
        // Tenta primeiro com --remote (produção), se falhar tenta local
        let command = `wrangler d1 execute caminhodoperdao-db --remote --json --command "${query.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;

        let result;
        try {
            result = execSync(command, {
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'pipe']
            });
        } catch (remoteError) {
            // Tenta com banco local
            console.log('ℹ️  Usando banco local...\n');
            command = `wrangler d1 execute caminhodoperdao-db --json --command "${query.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
            result = execSync(command, {
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'pipe']
            });
        }

        // Parse do resultado JSON
        const parsed = JSON.parse(result);

        // Extrai os resultados da query
        let registrations = [];

        // Wrangler retorna um array com um objeto contendo { results, success }
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
    } catch (error) {
        console.error('❌ Erro ao executar query no D1:', error.message);
        console.error('\n📝 Certifique-se de que:');
        console.error('  1. Você tem o Wrangler CLI instalado: npm install -g @cloudflare/wrangler');
        console.error('  2. Você está autenticado: wrangler login');
        console.error('  3. O banco D1 "caminhodoperdao-db" existe em seu projeto Cloudflare');
        console.error('\nUsando dados de exemplo como fallback...\n');

        // Se falhar, retorna array vazio para forçar o erro visível
        throw error;
    }
}

function getExampleRegistrations() {
    return [
        // Família Silva - 4 pessoas
        {
            companion_name: 'Família Silva',
            name: 'João Silva',
            email: 'joao@example.com',
            phone: '(11) 99999-0001',
            city: 'São Paulo',
            state: 'SP'
        },
        {
            companion_name: 'Família Silva',
            name: 'Maria Silva',
            email: 'maria@example.com',
            phone: '(11) 99999-0002',
            city: 'São Paulo',
            state: 'SP'
        },
        {
            companion_name: 'Família Silva',
            name: 'Ana Silva',
            email: 'ana.silva@example.com',
            phone: '(11) 99999-0007',
            city: 'São Paulo',
            state: 'SP'
        },
        {
            companion_name: 'Família Silva',
            name: 'Lucas Silva',
            email: 'lucas.silva@example.com',
            phone: '(11) 99999-0008',
            city: 'São Paulo',
            state: 'SP'
        },

        // Grupo Peregrinos do Amor - 5 pessoas
        {
            companion_name: 'Grupo Peregrinos do Amor',
            name: 'Pedro Santos',
            email: 'pedro@example.com',
            phone: '(21) 99999-0003',
            city: 'Rio de Janeiro',
            state: 'RJ'
        },
        {
            companion_name: 'Grupo Peregrinos do Amor',
            name: 'Ana Costa',
            email: 'ana@example.com',
            phone: '(21) 99999-0004',
            city: 'Rio de Janeiro',
            state: 'RJ'
        },
        {
            companion_name: 'Grupo Peregrinos do Amor',
            name: 'Carlos Oliveira',
            email: 'carlos@example.com',
            phone: '(21) 99999-0005',
            city: 'Rio de Janeiro',
            state: 'RJ'
        },
        {
            companion_name: 'Grupo Peregrinos do Amor',
            name: 'Beatriz Ferreira',
            email: 'beatriz@example.com',
            phone: '(21) 99999-0009',
            city: 'Rio de Janeiro',
            state: 'RJ'
        },
        {
            companion_name: 'Grupo Peregrinos do Amor',
            name: 'Thiago Mendes',
            email: 'thiago@example.com',
            phone: '(21) 99999-0010',
            city: 'Rio de Janeiro',
            state: 'RJ'
        },

        // Família Santos - 3 pessoas
        {
            companion_name: 'Família Santos',
            name: 'Fulano de Tal',
            email: 'fulano@example.com',
            phone: '(85) 99999-0006',
            city: 'Fortaleza',
            state: 'CE'
        },
        {
            companion_name: 'Família Santos',
            name: 'Ciclana dos Santos',
            email: 'ciclana@example.com',
            phone: '(85) 99999-0011',
            city: 'Fortaleza',
            state: 'CE'
        },
        {
            companion_name: 'Família Santos',
            name: 'Beltrano Santos',
            email: 'beltrano@example.com',
            phone: '(85) 99999-0012',
            city: 'Fortaleza',
            state: 'CE'
        },

        // Família Oliveira - 2 pessoas
        {
            companion_name: 'Família Oliveira',
            name: 'Roberto Oliveira',
            email: 'roberto@example.com',
            phone: '(31) 99999-0013',
            city: 'Belo Horizonte',
            state: 'MG'
        },
        {
            companion_name: 'Família Oliveira',
            name: 'Fernanda Oliveira',
            email: 'fernanda@example.com',
            phone: '(31) 99999-0014',
            city: 'Belo Horizonte',
            state: 'MG'
        },

        // Grupo Caminhantes da Fé - 4 pessoas
        {
            companion_name: 'Grupo Caminhantes da Fé',
            name: 'Marcelo Rocha',
            email: 'marcelo@example.com',
            phone: '(48) 99999-0015',
            city: 'Florianópolis',
            state: 'SC'
        },
        {
            companion_name: 'Grupo Caminhantes da Fé',
            name: 'Gabriela Rocha',
            email: 'gabriela@example.com',
            phone: '(48) 99999-0016',
            city: 'Florianópolis',
            state: 'SC'
        },
        {
            companion_name: 'Grupo Caminhantes da Fé',
            name: 'Patricia Lima',
            email: 'patricia@example.com',
            phone: '(48) 99999-0017',
            city: 'Florianópolis',
            state: 'SC'
        },
        {
            companion_name: 'Grupo Caminhantes da Fé',
            name: 'Eduardo Costa',
            email: 'eduardo@example.com',
            phone: '(48) 99999-0018',
            city: 'Florianópolis',
            state: 'SC'
        },

        // Sem Grupo - pessoas sem acompanhantes
        {
            companion_name: null,
            name: 'Joana Pereira',
            email: 'joana@example.com',
            phone: '(71) 99999-0019',
            city: 'Salvador',
            state: 'BA'
        },
        {
            companion_name: null,
            name: 'Victor Alves',
            email: 'victor@example.com',
            phone: '(71) 99999-0020',
            city: 'Salvador',
            state: 'BA'
        }
    ];
}

function organizeByGroup(registrations) {
    const groups = {};

    registrations.forEach((person) => {
        const groupName = (person.companion_name && person.companion_name !== 'null') ? person.companion_name : 'Sem Grupo';

        if (!groups[groupName]) {
            groups[groupName] = {
                name: groupName,
                people: [],
                count: 0
            };
        }

        groups[groupName].people.push({
            name: person.name,
            email: person.email,
            phone: person.phone,
            city: person.city,
            state: person.state
        });

        groups[groupName].count += 1;
    });

    return groups;
}

function generateRoomSuggestions(groups) {
    const rooms = [];
    const maxCapacity = 4;
    let currentRoom = 1;
    let currentPeople = [];

    Object.values(groups).forEach((group) => {
        if (group.count <= maxCapacity - currentPeople.length) {
            // Cabe no quarto atual
            currentPeople.push({
                group: group.name,
                count: group.count,
                people: group.people
            });
        } else {
            // Precisa de um novo quarto
            if (currentPeople.length > 0) {
                rooms.push({
                    room: currentRoom++,
                    people: currentPeople
                });
            }
            currentPeople = [{
                group: group.name,
                count: group.count,
                people: group.people
            }];
        }
    });

    // Adiciona o último quarto
    if (currentPeople.length > 0) {
        rooms.push({
            room: currentRoom,
            people: currentPeople
        });
    }

    return rooms;
}

function generateReport(groups, roomAllocation) {
    return {
        summary: {
            totalPeople: Object.values(groups).reduce((sum, g) => sum + g.count, 0),
            totalGroups: Object.keys(groups).length,
            totalRoomsNeeded: roomAllocation.length,
            timestamp: new Date().toISOString()
        },
        groups: groups,
        roomAllocation: roomAllocation
    };
}

function generateCSV(registrations) {
    // Ordena por grupo/familia e depois por nome
    const sorted = [...registrations].sort((a, b) => {
        // Para garantir que "Sem Grupo" fique no final, prefixe com 'ZZZ_'
        const groupA = (a.companion_name && a.companion_name !== 'null') ? a.companion_name : 'ZZZ_Sem Grupo';
        const groupB = (b.companion_name && b.companion_name !== 'null') ? b.companion_name : 'ZZZ_Sem Grupo';

        if (groupA !== groupB) {
            return groupA.localeCompare(groupB);
        }
        return a.name.localeCompare(b.name);
    });

    const csvHeader = 'NOME,TELEFONE,GRUPO/FAMILIA\n';

    const csvRows = sorted
        .map(person => {
            const name = `"${person.name}"`;
            const phone = `"${person.phone || ''}"`;
            const group = `"${(person.companion_name && person.companion_name !== 'null') ? person.companion_name : 'Sem Grupo'}"`;
            return `${name},${phone},${group}`;
        })
        .join('\n');

    return csvHeader + csvRows;
}

// ============ MAIN ============
async function main() {
    console.log('🏛️  Organizador de Quartos - Mosteiro do Caminhada do Perdão de Assis\n');

    try {
        console.log('📋 Gerando relatório de organização de quartos...\n');

        // Tenta buscar do D1 de produção
        let registrations = [];
        try {
            registrations = await getDataViaWrangler();
        } catch (error) {
            console.error('⚠️  Não foi possível conectar ao D1. Usando dados de exemplo.\n');
            registrations = getExampleRegistrations();
        }

        if (registrations.length === 0) {
            console.error('❌ Nenhum registro encontrado com status PAID e sleep_at_monastery = 1');
            process.exit(1);
        }

        console.log(`✅ Carregados ${registrations.length} registros\n`);

        // Organiza os grupos
        const groups = organizeByGroup(registrations);

        console.log(`📊 ${Object.keys(groups).length} grupos/famílias encontrados:\n`);
        Object.entries(groups).forEach(([groupName, data]) => {
            console.log(`   • ${groupName}: ${data.count} pessoa(s)`);
        });
        console.log('');

        // Gera sugestões de alocação
        const roomAllocation = generateRoomSuggestions(groups);

        console.log(`🏠 ${roomAllocation.length} quartos sugeridos:\n`);
        roomAllocation.forEach((room) => {
            console.log(`   Quarto ${room.room}:`);
            if (Array.isArray(room.people[0]?.people)) {
                // Múltiplos grupos no mesmo quarto
                room.people.forEach((item) => {
                    console.log(`      - ${item.group}: ${item.count} pessoa(s)`);
                });
            } else {
                // Um grupo por quarto
                console.log(`      Grupo: ${room.group}`);
                room.people.forEach((person) => {
                    console.log(`      - ${person.name}`);
                });
            }
        });
        console.log('');

        // Gera relatório completo
        const report = generateReport(groups, roomAllocation);

        // Cria pasta de relatórios se não existir
        const reportsDir = path.join(__dirname, 'reports');
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        // Salva em JSON
        const jsonOutputFile = path.join(reportsDir, 'monastery-rooms-organization.json');
        fs.writeFileSync(jsonOutputFile, JSON.stringify(report, null, 2));

        // Gera e salva em CSV
        const csvContent = generateCSV(registrations);
        const csvOutputFile = path.join(reportsDir, 'monastery-rooms-organization.csv');
        fs.writeFileSync(csvOutputFile, csvContent, 'utf-8');

        console.log(`✅ Relatório JSON salvo em: scripts/reports/monastery-rooms-organization.json`);
        console.log(`✅ Relatório CSV salvo em: scripts/reports/monastery-rooms-organization.csv\n`);

        // Exibe sumário
        console.log('📈 Resumo Final:');
        console.log(`   • Total de pessoas: ${report.summary.totalPeople}`);
        console.log(`   • Total de grupos: ${report.summary.totalGroups}`);
        console.log(`   • Quartos necessários: ${report.summary.totalRoomsNeeded}`);
        console.log(`   • Gerado em: ${new Date(report.summary.timestamp).toLocaleString('pt-BR')}\n`);

    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    }
}

main();
