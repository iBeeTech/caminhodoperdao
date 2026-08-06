/// <reference types="@cloudflare/workers-types" />
import { describe, it, expect } from "vitest";

import { montarEmailDoPedidoAberto } from "../../functions/_utils/photoOrderDelivery";

/**
 * Este e-mail é a ÚNICA cópia do link do pedido: no banco só fica o hash do
 * token, então um corpo sem o link não é "e-mail feio", é pedido perdido — nem
 * o admin consegue reemitir o endereço depois.
 */

const PEDIDO = {
  nome: "Maria",
  email: "maria@exemplo.com",
  token: "a".repeat(64),
  quantidade: 3,
  valorTotalCentavos: 1500,
  qrCodeText: "00020126...br.gov.bcb.pix",
};

describe("montarEmailDoPedidoAberto", () => {
  it("leva o link do pedido com o token nas duas versões do corpo", () => {
    const email = montarEmailDoPedidoAberto({ SITE_URL: "https://caminhodoperdao.com.br" }, PEDIDO);
    const link = `https://caminhodoperdao.com.br/gallery/pedido?t=${PEDIDO.token}`;

    expect(email.bodyHtml).toContain(link);
    // O texto puro importa tanto quanto o HTML: é o que aparece em cliente de
    // e-mail que bloqueia HTML, e lá não existe âncora para clicar.
    expect(email.bodyText).toContain(link);
  });

  it("não deixa barra dobrada quando SITE_URL termina em /", () => {
    const email = montarEmailDoPedidoAberto({ SITE_URL: "https://caminhodoperdao.com.br/" }, PEDIDO);
    expect(email.bodyText).toContain("https://caminhodoperdao.com.br/gallery/pedido?t=");
    expect(email.bodyText).not.toContain(".com.br//gallery");
  });

  it("cai no domínio de produção quando SITE_URL não está configurado", () => {
    const email = montarEmailDoPedidoAberto({}, PEDIDO);
    expect(email.bodyText).toContain("https://caminhodoperdao.com.br/gallery/pedido?t=");
  });

  it("mostra quantidade e total do jeito que a pessoa confere", () => {
    const email = montarEmailDoPedidoAberto({}, PEDIDO);
    expect(email.subject).toContain("3 fotos");
    expect(email.bodyText).toContain("R$ 15,00");
  });

  it("usa o singular quando é uma foto só", () => {
    const email = montarEmailDoPedidoAberto({}, { ...PEDIDO, quantidade: 1, valorTotalCentavos: 500 });
    expect(email.subject).toContain("1 foto");
    expect(email.subject).not.toContain("1 fotos");
  });

  it("leva o PIX copia e cola, para quem paga pelo celular do banco", () => {
    const email = montarEmailDoPedidoAberto({}, PEDIDO);
    expect(email.bodyText).toContain(PEDIDO.qrCodeText);
    expect(email.bodyHtml).toContain(PEDIDO.qrCodeText);
  });

  it("escapa o nome digitado pelo comprador", () => {
    // O nome vem de campo aberto e entra no HTML do e-mail. Sem escape, um nome
    // com tag vira marcação dentro da mensagem.
    const email = montarEmailDoPedidoAberto({}, { ...PEDIDO, nome: '<script>alert("x")</script>' });
    expect(email.bodyHtml).not.toContain("<script>");
    expect(email.bodyHtml).toContain("&lt;script&gt;");
  });
});
