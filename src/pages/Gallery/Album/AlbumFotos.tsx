import React from "react";
import { useNavigate } from "react-router-dom";
import {
  AlbumContainer,
  AlbumHeader,
  AlbumPage,
  AlbumTitle,
  BackButton,
  ModalClose,
  ModalContent,
  ModalImage,
  ModalOverlay,
} from "./AlbumView.styles";
import {
  Aviso,
  AvisoPrazo,
  Baixar,
  BlocoBarra,
  BlocoBotao,
  BotaoPrincipal,
  BotaoTexto,
  Carrinho,
  Celula,
  Erro,
  Fim,
  Formulario,
  Grade,
  Lupa,
  Marca,
} from "./AlbumFotos.styles";
import BuscaPorRosto from "./BuscaPorRosto";
import {
  AlbumManifesto,
  BuscaPorRostoDisponivel,
  FotoEncontrada,
  criarPedido,
  disponibilidadeDaBusca,
  formatarReais,
  urlDaFotoPublica,
  urlDaMiniatura,
} from "../../../services/fotos/fotos.service";

interface AlbumFotosProps {
  manifesto: AlbumManifesto;
  onBack: () => void;
}

/** Preço unitário só para MOSTRAR na tela. Quem cobra é o servidor. */
const PRECO_UNITARIO_CENTAVOS = 500;

/**
 * Quantas miniaturas entram na tela por vez.
 *
 * São 2882 fotos: desenhar todas de uma vez trava o celular mesmo com
 * `loading="lazy"`, porque o navegador ainda cria 2882 elementos. A tela cresce
 * conforme a pessoa chega no fim da lista.
 */
const PASSO = 120;

const AlbumFotos: React.FC<AlbumFotosProps> = ({ manifesto, onBack }) => {
  const navigate = useNavigate();
  const [visiveis, setVisiveis] = React.useState(PASSO);
  const [bloco, setBloco] = React.useState<number | null>(null);
  const [escolhidas, setEscolhidas] = React.useState<string[]>([]);
  const [ampliada, setAmpliada] = React.useState<string | null>(null);
  const [checkout, setCheckout] = React.useState(false);
  const [nome, setNome] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);
  const [erro, setErro] = React.useState("");
  const sentinela = React.useRef<HTMLParagraphElement | null>(null);
  const [busca, setBusca] = React.useState<BuscaPorRostoDisponivel | null>(null);
  const [porRosto, setPorRosto] = React.useState<FotoEncontrada[] | null>(null);

  // Pergunta se este ano foi indexado. São ~200 bytes: o custo de baixar os
  // modelos (dezenas de MB) só existe depois que a pessoa toca no botão.
  React.useEffect(() => {
    const controller = new AbortController();

    disponibilidadeDaBusca(manifesto.ano, controller.signal).then(resposta => {
      if (resposta.disponivel) setBusca(resposta);
    });

    return () => controller.abort();
  }, [manifesto.ano]);

  /**
   * Quais fotos a grade mostra.
   *
   * Com a busca por rosto ativa, a ORDEM é a da resposta (da mais parecida para
   * a menos) e não a do álbum. É a diferença entre "metade dos resultados está
   * errada" e "as suas vêm primeiro, role até começar a aparecer estranho e
   * pare" — mesmo resultado, percepção oposta.
   */
  const fotos = React.useMemo(() => {
    if (porRosto) {
      const posicao = new Map(porRosto.map((foto, indice) => [foto.nome, indice]));
      return manifesto.fotos
        .filter(foto => posicao.has(foto.n))
        .sort((a, b) => (posicao.get(a.n) ?? 0) - (posicao.get(b.n) ?? 0));
    }
    return bloco === null ? manifesto.fotos : manifesto.fotos.filter(foto => foto.b === bloco);
  }, [manifesto.fotos, bloco, porRosto]);

  const aplicarBuscaPorRosto = (encontradas: FotoEncontrada[] | null) => {
    setPorRosto(encontradas);
    setBloco(null);
    setVisiveis(PASSO);
  };

  // Quem decide se vende é o servidor (o manifesto já chega com a resposta). O
  // relógio do celular não entra na conta: adiantado ou atrasado, mudaria a tela.
  const vende = manifesto.venda;
  const prazo = manifesto.venda_ate
    ? new Date(manifesto.venda_ate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    : "31/08";

  const naTela = fotos.slice(0, visiveis);
  const escolhidasSet = React.useMemo(() => new Set(escolhidas), [escolhidas]);

  // Cresce a lista quando o fim aparece na janela. IntersectionObserver e não
  // evento de rolagem: o evento dispara dezenas de vezes por segundo e brigaria
  // com a rolagem em celular mais fraco.
  React.useEffect(() => {
    const alvo = sentinela.current;
    if (!alvo) return undefined;

    const observador = new IntersectionObserver(entradas => {
      if (entradas.some(entrada => entrada.isIntersecting)) {
        setVisiveis(atual => Math.min(atual + PASSO, fotos.length));
      }
    });

    observador.observe(alvo);
    return () => observador.disconnect();
  }, [fotos.length]);

  const trocarBloco = (indice: number | null) => {
    setBloco(indice);
    setVisiveis(PASSO);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const alternar = (nomeArquivo: string) => {
    setEscolhidas(atual =>
      atual.includes(nomeArquivo)
        ? atual.filter(item => item !== nomeArquivo)
        : [...atual, nomeArquivo]
    );
  };

  const finalizar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setErro("");
    setEnviando(true);

    try {
      const pedido = await criarPedido({
        nome: nome.trim(),
        email: email.trim(),
        ano: manifesto.ano,
        fotos: escolhidas,
      });
      navigate(`/gallery/pedido?t=${pedido.token}`);
    } catch (falha: unknown) {
      const codigo = falha instanceof Error ? falha.message : "";
      setErro(
        codigo === "invalid_email"
          ? "Confira o e-mail: é para lá que vai o aviso do pagamento."
          : codigo === "invalid_name"
            ? "Escreva seu nome completo."
            : "Não deu para abrir o pedido agora. Tente de novo em instantes."
      );
      setEnviando(false);
    }
  };

  const total = escolhidas.length * PRECO_UNITARIO_CENTAVOS;

  return (
    <AlbumPage>
      <AlbumContainer>
        <AlbumHeader>
          <AlbumTitle>Fotos {manifesto.ano}</AlbumTitle>
          <BackButton type="button" onClick={onBack}>
            Voltar
          </BackButton>
        </AlbumHeader>

        {vende && (
          <AvisoPrazo>
            <p>
              <strong>Atenção ao prazo:</strong> as fotos em <strong>alta resolução</strong> ficam
              disponíveis para compra até <strong>{prazo}</strong> — é essa compra que vira a
              doação. Depois dessa data, as fotos continuam aqui{" "}
              <strong>gratuitamente, em resolução média</strong> — boa para guardar e imprimir
              pequeno, menor que o arquivo da câmera.
            </p>
          </AvisoPrazo>
        )}

        {vende ? (
          <Aviso>
            <p>
              <strong>
                As fotos em alta saem por {formatarReais(PRECO_UNITARIO_CENTAVOS)} cada.
              </strong>{" "}
              O valor não é o preço da foto: é uma doação que vira melhoria na estrutura da
              Caminhada — banheiro, água, apoio no percurso e segurança para o ano que vem.
              Escolha as suas, pague por PIX e baixe os arquivos originais, sem marca d'água.
            </p>
          </Aviso>
        ) : (
          <Aviso>
            <p>
              <strong>Este álbum é gratuito.</strong> Clique em "baixar" em qualquer foto para
              guardar a sua.{" "}
              {manifesto.medias
                ? "As imagens estão em resolução média (2048 pixels): boa para o celular, para as redes e para imprimir até mais ou menos 15×20 cm."
                : "As imagens estão em resolução reduzida, boa para celular e redes sociais."}
            </p>
          </Aviso>
        )}

        {busca && (
          <BuscaPorRosto
            ano={manifesto.ano}
            busca={busca}
            onResultado={aplicarBuscaPorRosto}
            filtrando={porRosto !== null}
          />
        )}

        {/* Com o filtro por rosto ligado, as partes do álbum sairiam do caminho:
            a lista já é "as suas fotos", ordenada por semelhança, e dividi-la por
            trecho do percurso só embaralharia essa ordem. */}
        {!porRosto && (
          <BlocoBarra aria-label="Partes do álbum">
            <BlocoBotao type="button" $ativo={bloco === null} onClick={() => trocarBloco(null)}>
              Todas ({manifesto.total})
            </BlocoBotao>
            {manifesto.blocos.map((item, indice) => (
              <BlocoBotao
                key={item.titulo}
                type="button"
                $ativo={bloco === indice}
                onClick={() => trocarBloco(indice)}
              >
                {item.titulo}
              </BlocoBotao>
            ))}
          </BlocoBarra>
        )}

        <Grade>
          {naTela.map(foto => {
            const escolhida = escolhidasSet.has(foto.n);
            return (
              <Celula
                key={foto.n}
                $escolhida={escolhida}
                tabIndex={0}
                role={vende ? "button" : "figure"}
                aria-pressed={vende ? escolhida : undefined}
                aria-label={`Foto ${foto.n}`}
                onClick={() => vende && alternar(foto.n)}
                onKeyDown={evento => {
                  if (vende && (evento.key === "Enter" || evento.key === " ")) {
                    evento.preventDefault();
                    alternar(foto.n);
                  }
                }}
              >
                <img src={urlDaMiniatura(manifesto.ano, foto.n)} alt="" loading="lazy" />
                {vende ? (
                  <Marca $escolhida={escolhida} aria-hidden="true">
                    {escolhida ? "✓" : "+"}
                  </Marca>
                ) : (
                  <Baixar
                    href={urlDaFotoPublica(manifesto, foto.n)}
                    download={foto.n}
                    onClick={evento => evento.stopPropagation()}
                  >
                    baixar
                  </Baixar>
                )}
                <Lupa
                  type="button"
                  onClick={evento => {
                    evento.stopPropagation();
                    setAmpliada(foto.n);
                  }}
                >
                  ampliar
                </Lupa>
              </Celula>
            );
          })}
        </Grade>

        <Fim ref={sentinela}>
          {visiveis >= fotos.length
            ? `${fotos.length} foto(s) — fim desta parte.`
            : `Mostrando ${naTela.length} de ${fotos.length}...`}
        </Fim>

        {vende && escolhidas.length > 0 && (
          <Carrinho>
            <span>
              <strong>{escolhidas.length}</strong> foto(s) escolhida(s) — total{" "}
              <strong>{formatarReais(total)}</strong>
            </span>
            <span style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <BotaoTexto type="button" onClick={() => setEscolhidas([])}>
                limpar
              </BotaoTexto>
              <BotaoPrincipal type="button" onClick={() => setCheckout(true)}>
                Finalizar e pagar
              </BotaoPrincipal>
            </span>
          </Carrinho>
        )}
      </AlbumContainer>

      {ampliada && (
        <ModalOverlay onClick={() => setAmpliada(null)}>
          <ModalContent onClick={evento => evento.stopPropagation()}>
            <ModalClose type="button" onClick={() => setAmpliada(null)}>
              ×
            </ModalClose>
            <ModalImage src={urlDaFotoPublica(manifesto, ampliada)} alt={`Foto ${ampliada}`} />
          </ModalContent>
        </ModalOverlay>
      )}

      {checkout && (
        <ModalOverlay onClick={() => !enviando && setCheckout(false)}>
          <Formulario onSubmit={finalizar} onClick={evento => evento.stopPropagation()}>
            <h2>
              {escolhidas.length} foto(s) — {formatarReais(total)}
            </h2>
            <p>
              O aviso de pagamento e o link das fotos vão para o seu e-mail. Não pedimos CPF.
            </p>
            <label>
              Seu nome
              <input
                value={nome}
                onChange={evento => setNome(evento.target.value)}
                required
                minLength={2}
                autoComplete="name"
              />
            </label>
            <label>
              Seu e-mail
              <input
                type="email"
                value={email}
                onChange={evento => setEmail(evento.target.value)}
                required
                autoComplete="email"
              />
            </label>
            {erro && <Erro>{erro}</Erro>}
            <BotaoPrincipal type="submit" disabled={enviando}>
              {enviando ? "Gerando o PIX..." : "Gerar o PIX"}
            </BotaoPrincipal>
            <BotaoTexto
              type="button"
              onClick={() => setCheckout(false)}
              style={{ color: "#4f46e5" }}
            >
              voltar e escolher mais fotos
            </BotaoTexto>
          </Formulario>
        </ModalOverlay>
      )}
    </AlbumPage>
  );
};

export default AlbumFotos;
