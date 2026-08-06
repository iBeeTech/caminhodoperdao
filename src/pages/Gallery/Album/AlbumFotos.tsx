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
import {
  AlbumManifesto,
  criarPedido,
  formatarReais,
  urlDaMiniatura,
  urlDaPrevia,
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

  const fotos = React.useMemo(
    () => (bloco === null ? manifesto.fotos : manifesto.fotos.filter(foto => foto.b === bloco)),
    [manifesto.fotos, bloco]
  );

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

        <Aviso>
          <p>
            <strong>As fotos em alta saem por {formatarReais(PRECO_UNITARIO_CENTAVOS)} cada.</strong>{" "}
            O valor não é o preço da foto: é uma doação que vira melhoria na estrutura da
            Caminhada — banheiro, água, apoio no percurso e segurança para o ano que vem.
            Escolha as suas, pague por PIX e baixe os arquivos originais, sem marca d'água.
          </p>
        </Aviso>

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

        <Grade>
          {naTela.map(foto => {
            const escolhida = escolhidasSet.has(foto.n);
            return (
              <Celula
                key={foto.n}
                $escolhida={escolhida}
                tabIndex={0}
                role="button"
                aria-pressed={escolhida}
                aria-label={`Foto ${foto.n}`}
                onClick={() => alternar(foto.n)}
                onKeyDown={evento => {
                  if (evento.key === "Enter" || evento.key === " ") {
                    evento.preventDefault();
                    alternar(foto.n);
                  }
                }}
              >
                <img src={urlDaMiniatura(manifesto.ano, foto.n)} alt="" loading="lazy" />
                <Marca $escolhida={escolhida} aria-hidden="true">
                  {escolhida ? "✓" : "+"}
                </Marca>
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

        {escolhidas.length > 0 && (
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
            <ModalImage src={urlDaPrevia(manifesto.ano, ampliada)} alt={`Foto ${ampliada}`} />
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
