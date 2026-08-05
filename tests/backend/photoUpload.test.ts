/// <reference types="@cloudflare/workers-types" />
import { describe, it, expect } from "vitest";

import {
  buildPhotoKey,
  detectImageFormat,
  generateUploadToken,
  hashUploadToken,
  sanitizeFilename,
} from "../../functions/_utils/photoUpload";

/**
 * O link de upload é entregue a alguém de fora, sem conta e sem senha: o link É
 * a credencial. Estas três peças são as que impedem que um link vazado vire
 * problema, e todas falham em silêncio se estiverem erradas — o arquivo sobe,
 * ninguém vê erro, e só depois se descobre onde ele foi parar.
 */

describe("sanitizeFilename", () => {
  it("mantém um nome comum de câmera intacto", () => {
    expect(sanitizeFilename("DSC_0421.JPG")).toBe("DSC_0421.JPG");
  });

  it("tira acento em vez de trocar por traço", () => {
    expect(sanitizeFilename("peregrinação.jpg")).toBe("peregrinacao.jpg");
  });

  it("descarta caminho e fica só com o nome do arquivo", () => {
    expect(sanitizeFilename("/etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("C:\\fotos\\DSC_1.jpg")).toBe("DSC_1.jpg");
  });

  it("não deixa subir de pasta com ..", () => {
    const out = sanitizeFilename("../../../segredo.jpg");
    expect(out).toBe("segredo.jpg");
    expect(out).not.toContain("..");
    expect(out).not.toContain("/");
  });

  it("nunca devolve vazio, mesmo com nome só de lixo", () => {
    expect(sanitizeFilename("///")).toBe("foto");
    expect(sanitizeFilename("")).toBe("foto");
    expect(sanitizeFilename("...")).toBe("foto");
  });

  it("corta nome absurdamente longo", () => {
    expect(sanitizeFilename(`${"a".repeat(500)}.jpg`).length).toBeLessThanOrEqual(120);
  });
});

describe("buildPhotoKey", () => {
  it("guarda sob originais/<ano>/", () => {
    expect(buildPhotoKey(2026, "DSC_0421.JPG")).toBe("originais/2026/DSC_0421.JPG");
  });

  it("não deixa o nome do arquivo escapar do prefixo do ano", () => {
    // Sem sanitização, isto viraria "originais/2026/../../outro/x.jpg" e o
    // arquivo cairia fora da pasta do ano — quem envia escolheria onde grava.
    const key = buildPhotoKey(2026, "../../outro/x.jpg");
    expect(key).toBe("originais/2026/x.jpg");
    expect(key.startsWith("originais/2026/")).toBe(true);
    expect(key).not.toContain("..");
  });
});

/** Cabeçalho de 16 bytes, que é o que o detector recebe. */
function head(...bytes: number[]): Uint8Array {
  const buf = new Uint8Array(16);
  buf.set(bytes.slice(0, 16));
  return buf;
}

describe("detectImageFormat", () => {
  it("reconhece JPEG", () => {
    expect(detectImageFormat(head(0xff, 0xd8, 0xff, 0xe0))).toBe("jpeg");
  });

  it("reconhece PNG", () => {
    expect(detectImageFormat(head(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("png");
  });

  it("reconhece WebP", () => {
    // "RIFF" + 4 bytes de tamanho + "WEBP"
    expect(
      detectImageFormat(
        head(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50)
      )
    ).toBe("webp");
  });

  it("reconhece HEIC do iPhone", () => {
    // tamanho da caixa + "ftyp"
    expect(detectImageFormat(head(0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70))).toBe("heic");
  });

  it("reconhece TIFF/DNG nas duas ordens de byte", () => {
    expect(detectImageFormat(head(0x49, 0x49, 0x2a, 0x00))).toBe("tiff");
    expect(detectImageFormat(head(0x4d, 0x4d, 0x00, 0x2a))).toBe("tiff");
  });

  it("RECUSA executável disfarçado de .jpg", () => {
    // "MZ" — cabeçalho de .exe. O nome e o content-type vêm de quem envia, e
    // aceitar por eles transformaria o link em hospedagem de malware no domínio.
    expect(detectImageFormat(head(0x4d, 0x5a, 0x90, 0x00))).toBeNull();
  });

  it("RECUSA ZIP e PDF", () => {
    expect(detectImageFormat(head(0x50, 0x4b, 0x03, 0x04))).toBeNull();
    expect(detectImageFormat(head(0x25, 0x50, 0x44, 0x46))).toBeNull();
  });

  it("RECUSA HTML, que serviria para phishing no domínio do projeto", () => {
    expect(detectImageFormat(head(0x3c, 0x68, 0x74, 0x6d, 0x6c, 0x3e))).toBeNull();
  });

  it("recusa arquivo curto demais para ter assinatura", () => {
    expect(detectImageFormat(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull();
  });
});

describe("token do link", () => {
  it("gera 64 hex, que é o formato que o servidor aceita", () => {
    expect(generateUploadToken()).toMatch(/^[a-f0-9]{64}$/);
  });

  it("não repete", () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateUploadToken()));
    expect(tokens.size).toBe(200);
  });

  it("o hash é estável e não devolve o segredo", async () => {
    const token = generateUploadToken();
    const hash = await hashUploadToken(token);
    expect(hash).toBe(await hashUploadToken(token));
    expect(hash).not.toBe(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("tokens diferentes geram hashes diferentes", async () => {
    expect(await hashUploadToken(generateUploadToken())).not.toBe(
      await hashUploadToken(generateUploadToken())
    );
  });
});
