const fs = require("fs");
const path = require("path");

/**
 * Script de construção: converte XML USFX do open-bibles em JSON compacto
 * Execução: node scripts/build-bible-json.js
 */

// Parser XML simples (sem dependências)
function parseXMLUsfx(xmlContent) {
    const verses = [];

    // Regex para capturar <book code="...">
    const bookRegex = /<book code="([^"]+)"[^>]*>[\s\S]*?<\/book>/g;
    let bookMatch;

    const bookMap = {
        GEN: "Gênesis",
        EXO: "Êxodo",
        LEV: "Levítico",
        NUM: "Números",
        DEU: "Deuteronômio",
        JOS: "Josué",
        JDG: "Juízes",
        RUT: "Rute",
        "1SA": "1 Samuel",
        "2SA": "2 Samuel",
        "1KI": "1 Reis",
        "2KI": "2 Reis",
        "1CH": "1 Crônicas",
        "2CH": "2 Crônicas",
        EZR: "Esdras",
        NEH: "Neemias",
        EST: "Ester",
        JOB: "Jó",
        PSA: "Salmos",
        PRO: "Provérbios",
        ECC: "Eclesiastes",
        SNG: "Cantares",
        ISA: "Isaías",
        JER: "Jeremias",
        LAM: "Lamentações",
        EZK: "Ezequiel",
        DAN: "Daniel",
        HOS: "Oséias",
        JOL: "Joel",
        AMO: "Amós",
        OBA: "Obadias",
        JON: "Jonas",
        MIC: "Miquéias",
        NAM: "Naum",
        HAB: "Habacuque",
        ZEP: "Sofonias",
        HAG: "Ageu",
        ZEC: "Zacarias",
        MAL: "Malaquias",
        MAT: "Mateus",
        MRK: "Marcos",
        LUK: "Lucas",
        JHN: "João",
        ACT: "Atos",
        ROM: "Romanos",
        "1CO": "1 Coríntios",
        "2CO": "2 Coríntios",
        GAL: "Gálatas",
        EPH: "Efésios",
        PHP: "Filipenses",
        COL: "Colossenses",
        "1TH": "1 Tessalonicenses",
        "2TH": "2 Tessalonicenses",
        "1TI": "1 Timóteo",
        "2TI": "2 Timóteo",
        TIT: "Tito",
        PHM: "Filêmon",
        HEB: "Hebreus",
        JAS: "Tiago",
        "1PE": "1 Pedro",
        "2PE": "2 Pedro",
        "1JN": "1 João",
        "2JN": "2 João",
        "3JN": "3 João",
        JUD: "Judas",
        REV: "Apocalipse",
    };

    while ((bookMatch = bookRegex.exec(xmlContent)) !== null) {
        const bookCode = bookMatch[1];
        const bookContent = bookMatch[0];
        const bookName = bookMap[bookCode] || bookCode;

        // Regex para capturar <chapter number="...">
        const chapterRegex = /<chapter number="(\d+)"[^>]*>[\s\S]*?<\/chapter>/g;
        let chapterMatch;

        while ((chapterMatch = chapterRegex.exec(bookContent)) !== null) {
            const chapterNum = parseInt(chapterMatch[1], 10);
            const chapterContent = chapterMatch[0];

            // Regex para capturar <verse number="...">
            const verseRegex = /<verse number="(\d+)"[^>]*>([\s\S]*?)<\/verse>/g;
            let verseMatch;

            while ((verseMatch = verseRegex.exec(chapterContent)) !== null) {
                const verseNum = parseInt(verseMatch[1], 10);
                let verseText = verseMatch[2];

                // Remove tags XML
                verseText = verseText
                    .replace(/<[^>]+>/g, "")
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/&amp;/g, "&")
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .trim();

                // Remove espaços duplicados
                verseText = verseText.replace(/\s+/g, " ");

                if (verseText.length > 0) {
                    verses.push({
                        refKey: `${bookCode}.${chapterNum}.${verseNum}`,
                        book: bookName,
                        bookId: bookCode,
                        chapter: chapterNum,
                        verse: verseNum,
                        text: verseText,
                    });
                }
            }
        }
    }

    return verses;
}

// Função principal
async function buildBibleJSON() {
    try {
        const xmlPath = path.join(
            __dirname,
            "../data/open-bibles/por-almeida.usfx.xml"
        );
        const outputPath = path.join(
            __dirname,
            "../src/data/compiled/bible-pt-almeida.json"
        );

        console.log(`📖 Lendo XML: ${xmlPath}`);
        if (!fs.existsSync(xmlPath)) {
            throw new Error(`Arquivo não encontrado: ${xmlPath}`);
        }

        const xmlContent = fs.readFileSync(xmlPath, "utf-8");
        console.log(`✅ XML carregado (${(xmlContent.length / 1024).toFixed(2)}KB)`);

        console.log("🔄 Parseando XML...");
        const verses = parseXMLUsfx(xmlContent);
        console.log(`✅ ${verses.length} versículos parseados`);

        if (verses.length === 0) {
            throw new Error("Nenhum versículo foi extraído do XML");
        }

        const bibleData = {
            source: "open-bibles (https://github.com/openbibles/open-bibles)",
            version: "Almeida Revista e Corrigida (1969)",
            language: "pt-BR",
            generatedAt: new Date().toISOString(),
            totalVerses: verses.length,
            verses,
        };

        console.log("💾 Salvando JSON compactado...");
        fs.writeFileSync(outputPath, JSON.stringify(bibleData), "utf-8");
        const fileSize = (fs.statSync(outputPath).size / 1024).toFixed(2);
        console.log(`✅ JSON salvo: ${outputPath} (${fileSize}KB)`);

        console.log("\n📊 Estatísticas:");
        const uniqueBooks = new Set(verses.map((v) => v.book));
        console.log(`   - Livros únicos: ${uniqueBooks.size}`);
        console.log(`   - Total de versículos: ${verses.length}`);
        console.log(`   - Primeiros 3 versículos:`);
        verses.slice(0, 3).forEach((v) => {
            console.log(`     ${v.refKey}: "${v.text.substring(0, 60)}..."`);
        });

        console.log("\n✨ Build concluído com sucesso!");
    } catch (error) {
        console.error("❌ Erro durante build:", error.message);
        process.exit(1);
    }
}

buildBibleJSON();
