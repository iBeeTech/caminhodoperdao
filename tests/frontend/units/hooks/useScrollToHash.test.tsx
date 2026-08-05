/**
 * useScrollToHash — a rolagem por âncora da URL.
 *
 * Estava sem teste nenhum e passou a sustentar o "Visualizar temas anteriores"
 * do painel, que leva a /medalhas#temas. O modo de falhar é silencioso: o link
 * navega, a página abre no topo e ninguém vê erro — só parece que o link "não
 * fez nada". Daí valer teste.
 */

import { render } from "@testing-library/react";
import { useScrollToHash } from "../../../../src/hooks/useScrollToHash";

const Probe: React.FC = () => {
  useScrollToHash();
  return null;
};

/** Troca o hash da URL sem recarregar, como o React Router faz. */
function setHash(hash: string): void {
  window.history.replaceState(null, "", hash ? `/medalhas${hash}` : "/medalhas");
}

function addSection(id: string): HTMLElement {
  const el = document.createElement("h2");
  el.id = id;
  document.body.appendChild(el);
  return el;
}

let scrollSpy: jest.Mock;

beforeEach(() => {
  jest.useFakeTimers();
  document.body.innerHTML = "";
  scrollSpy = jest.fn();
  // jsdom não implementa scrollIntoView.
  Element.prototype.scrollIntoView = scrollSpy;
});

afterEach(() => {
  jest.useRealTimers();
  setHash("");
});

describe("useScrollToHash", () => {
  it("rola até a seção quando o hash aponta para ela", () => {
    const alvo = addSection("temas");
    setHash("#temas");

    render(<Probe />);

    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(scrollSpy.mock.instances[0]).toBe(alvo);
  });

  it("rola suavemente e alinha pelo topo da seção", () => {
    addSection("temas");
    setHash("#temas");

    render(<Probe />);

    expect(scrollSpy).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("não rola quando a URL não tem hash", () => {
    addSection("temas");
    setHash("");

    render(<Probe />);
    jest.advanceTimersByTime(2000);

    expect(scrollSpy).not.toHaveBeenCalled();
    // Sem hash o hook tem de sair ANTES de criar o intervalo. Só olhar o
    // scrollSpy não prova isso: sem hash o seletor não acha nada e a rolagem
    // não aconteceria de qualquer jeito, então o teste passaria mesmo com a
    // guarda removida. Contar o timer é o que prende a saída antecipada — sem
    // ela, toda página sem âncora ficaria repicando 30 vezes à toa.
    expect(jest.getTimerCount()).toBe(0);
  });

  it("espera a seção aparecer quando ela ainda não está no DOM", () => {
    setHash("#temas");
    render(<Probe />);

    // Primeira tentativa: nada no DOM, nada acontece.
    expect(scrollSpy).not.toHaveBeenCalled();

    addSection("temas");
    jest.advanceTimersByTime(200);

    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });

  it("desiste depois de ~6s em vez de tentar para sempre", () => {
    setHash("#naoExiste");
    render(<Probe />);

    jest.advanceTimersByTime(10_000);
    addSection("naoExiste");
    jest.advanceTimersByTime(2_000);

    // Já tinha desistido antes de a seção surgir: nenhuma rolagem tardia.
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it("para de tentar assim que rola, sem repetir a rolagem", () => {
    addSection("temas");
    setHash("#temas");

    render(<Probe />);
    jest.advanceTimersByTime(5_000);

    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });
});
