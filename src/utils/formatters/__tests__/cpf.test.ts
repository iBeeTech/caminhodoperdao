import { applyCpfInput, formatCpfBR } from "../cpf";

describe("formatCpfBR", () => {
  it("formata o CPF completo", () => {
    expect(formatCpfBR("39624925852")).toBe("396.249.258-52");
  });

  it("formata enquanto a pessoa digita", () => {
    expect(formatCpfBR("396")).toBe("396");
    expect(formatCpfBR("3962")).toBe("396.2");
    expect(formatCpfBR("396249258")).toBe("396.249.258");
  });

  it("ignora o que não é número e corta em 11 dígitos", () => {
    expect(formatCpfBR("396.249.258-52999")).toBe("396.249.258-52");
    expect(formatCpfBR("abc")).toBe("");
  });
});

describe("applyCpfInput", () => {
  it("apaga normalmente, porque a máscara nunca deixa ponto sobrando", () => {
    // Diferente do telefone (que mostra "(16)" com dois dígitos), o CPF só põe
    // o ponto quando o próximo grupo começa. Então o backspace sempre come um
    // dígito de verdade e a armadilha do cursor não existe aqui.
    expect(formatCpfBR("396")).toBe("396");
    expect(applyCpfInput("396", "3962")).toBe("396");
    expect(applyCpfInput("39", "396")).toBe("39");
  });

  it("aceita dígito novo normalmente", () => {
    expect(applyCpfInput("396.2", "396")).toBe("3962");
  });
});
