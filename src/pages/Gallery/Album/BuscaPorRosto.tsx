import React from "react";
import {
  Acoes,
  Andamento,
  Barra,
  BotaoBuscar,
  BotaoSecundario,
  Escolhidas,
  Falha,
  Painel,
  Privacidade,
  Resultado,
} from "./BuscaPorRosto.styles";
import {
  BuscaPorRostoDisponivel,
  FotoEncontrada,
  buscarPorRosto,
} from "../../../services/fotos/fotos.service";

interface BuscaPorRostoProps {
  ano: number;
  busca: BuscaPorRostoDisponivel;
  /** Lista ordenada por semelhança, ou null para voltar ao álbum inteiro. */
  onResultado: (fotos: FotoEncontrada[] | null) => void;
  filtrando: boolean;
}

/**
 * Quantas selfies a pessoa pode mandar de uma vez.
 *
 * Mais de uma foto é a alavanca que mais melhora o resultado: cada uma traz um
 * ângulo e uma luz, e a média cancela o que é da FOTO, deixando o que é da
 * PESSOA. No teste de 2026, os piores casos foram selfies de óculos escuro e
 * boné, que casavam com qualquer outro rosto igualmente tapado — uma segunda
 * foto sem óculos resolve isso.
 *
 * O teto é 3 porque cada foto custa uma passada no modelo, e da quarta em diante
 * a média praticamente não muda.
 */
const MAX_SELFIES = 3;

type Etapa = "parado" | "preparando" | "lendo" | "buscando";

interface SelfieEscolhida {
  arquivo: File;
  /** URL local só para a miniatura. Revogada ao remover. */
  previa: string;
}

function mensagemDaFalha(motivo: string, rostoPx: number, minimo: number): string {
  if (motivo === "nenhum_rosto") {
    return "Não achei nenhum rosto nessa foto. Tente uma de frente, com o rosto bem visível e boa luz.";
  }
  if (motivo === "rosto_pequeno") {
    return (
      `O rosto ficou pequeno na foto (${rostoPx} pixels, o mínimo é ${minimo}). ` +
      "Chegue mais perto ou recorte a foto em volta do rosto — de longe, a busca traz gente que não é você."
    );
  }
  if (motivo === "arquivo_grande_demais") {
    return "Essa imagem é grande demais. Use uma foto tirada pelo celular mesmo.";
  }
  if (motivo === "face_too_small") {
    return "O rosto ficou pequeno demais na foto. Chegue mais perto e tente de novo.";
  }
  if (motivo.startsWith("modelo_indisponivel")) {
    return "Não consegui baixar o reconhecedor. Confira a conexão e tente de novo.";
  }
  return "Não deu para fazer a busca agora. Tente de novo em instantes.";
}

/**
 * "Ache as suas fotos": a pessoa manda uma selfie e a grade passa a mostrar só
 * as fotos em que ela aparece.
 *
 * ⚠️ A SELFIE NÃO SAI DO CELULAR. Os dois modelos são baixados para o navegador
 * e a impressão digital do rosto é calculada aqui dentro; o que viaja para o
 * servidor são 128 números, dos quais não se remonta imagem nenhuma. Isso está
 * escrito na tela de propósito: sem essa frase, mandar a própria cara para um
 * site é um pedido grande demais.
 *
 * O peso: 39 MB de modelo na primeira busca. Por isso nada é baixado ao abrir o
 * álbum — só depois do toque no botão, e com barra de progresso.
 */
const BuscaPorRosto: React.FC<BuscaPorRostoProps> = ({ ano, busca, onResultado, filtrando }) => {
  const [selfies, setSelfies] = React.useState<SelfieEscolhida[]>([]);
  const [etapa, setEtapa] = React.useState<Etapa>("parado");
  const [progresso, setProgresso] = React.useState({ baixados: 0, total: 0 });
  const [falha, setFalha] = React.useState("");
  const [achadas, setAchadas] = React.useState<number | null>(null);
  const entrada = React.useRef<HTMLInputElement | null>(null);

  /**
   * As miniaturas são URLs de objeto: o navegador segura a imagem INTEIRA na
   * memória da aba até alguém revogar. Selfie de celular tem vários MB, e quem
   * está caçando a foto certa troca de imagem várias vezes.
   *
   * A limpeza de desmontagem precisa da lista ATUAL, não da que existia quando o
   * componente montou — daí o ref. Com `[]` na dependência e sem ele, o
   * `return` fecharia sobre a lista vazia do primeiro render e não revogaria
   * nada.
   */
  const ultimasSelfies = React.useRef<SelfieEscolhida[]>([]);
  React.useEffect(() => {
    ultimasSelfies.current = selfies;
  }, [selfies]);
  React.useEffect(() => {
    return () => ultimasSelfies.current.forEach(selfie => URL.revokeObjectURL(selfie.previa));
  }, []);

  const escolher = (evento: React.ChangeEvent<HTMLInputElement>) => {
    const arquivos = Array.from(evento.target.files ?? []);
    if (arquivos.length === 0) return;

    setFalha("");
    setSelfies(atual => {
      const todas = [
        ...atual,
        ...arquivos.map(arquivo => ({ arquivo, previa: URL.createObjectURL(arquivo) })),
      ];

      // Escolher 5 fotos de uma vez cria 5 URLs; ficamos com 3. As duas
      // descartadas precisam ser revogadas na mão, senão vazam sem nunca
      // aparecer na tela.
      todas.slice(MAX_SELFIES).forEach(selfie => URL.revokeObjectURL(selfie.previa));
      return todas.slice(0, MAX_SELFIES);
    });

    // Sem isto, escolher a MESMA foto de novo não dispara o onChange.
    evento.target.value = "";
  };

  const remover = (indice: number) => {
    setSelfies(atual => {
      URL.revokeObjectURL(atual[indice].previa);
      return atual.filter((_, posicao) => posicao !== indice);
    });
  };

  const procurar = async () => {
    if (selfies.length === 0) return;

    setFalha("");
    setAchadas(null);
    setEtapa("preparando");

    try {
      // Carregado só agora: o onnxruntime e os modelos somam dezenas de MB, e a
      // maioria de quem abre o álbum nunca vai tocar neste botão.
      const [{ carregarModelos }, { combinarImpressoes, gerarImpressaoDigital, SelfieRecusada }] =
        await Promise.all([
          import("../../../services/fotos/rosto/modelos"),
          import("../../../services/fotos/rosto/impressaoDigital"),
        ]);

      const modelos = await carregarModelos(
        { detector: busca.detector, reconhecedor: busca.modelo },
        andamento => setProgresso({ baixados: andamento.baixados, total: andamento.total })
      );

      setEtapa("lendo");

      const impressoes: Array<{ vetor: number[]; rostoPx: number }> = [];
      let primeiraRecusa: unknown = null;

      for (const selfie of selfies) {
        try {
          impressoes.push(await gerarImpressaoDigital(selfie.arquivo, modelos, busca.min_rosto_px));
        } catch (erro: unknown) {
          // Uma selfie ruim no meio de três não pode derrubar a busca inteira:
          // se ao menos uma serviu, segue com ela. Só falha ao aparecer erro que
          // não é "esta foto não presta" — rede caindo, modelo corrompido.
          if (!(erro instanceof SelfieRecusada)) throw erro;
          primeiraRecusa = primeiraRecusa ?? erro;
        }
      }

      // Todas recusadas: repassa o motivo da PRIMEIRA, não um genérico. Dizer
      // "não achei rosto" quando o problema era o rosto pequeno faz a pessoa
      // tentar de novo do mesmo jeito e falhar de novo.
      if (impressoes.length === 0) throw primeiraRecusa ?? new SelfieRecusada("nenhum_rosto");

      setEtapa("buscando");

      const fotos = await buscarPorRosto({
        ano,
        vetor: combinarImpressoes(impressoes.map(impressao => impressao.vetor)),
        // O menor dos rostos manda: é ele que define a qualidade do vetor médio.
        rostoPx: Math.min(...impressoes.map(impressao => impressao.rostoPx)),
      });

      setAchadas(fotos.length);
      onResultado(fotos);
    } catch (erro: unknown) {
      const motivo = erro instanceof Error ? erro.message : "";
      const rostoPx =
        erro && typeof erro === "object" && "rostoPx" in erro ? Number(erro.rostoPx) : 0;
      setFalha(mensagemDaFalha(motivo, rostoPx, busca.min_rosto_px));
      onResultado(null);
    } finally {
      setEtapa("parado");
    }
  };

  const limpar = () => {
    setAchadas(null);
    setFalha("");
    onResultado(null);
  };

  const ocupado = etapa !== "parado";
  const megas = (bytes: number) => (bytes / 1_000_000).toFixed(0);

  return (
    <Painel aria-labelledby="busca-por-rosto-titulo">
      <h3 id="busca-por-rosto-titulo">Ache as suas fotos</h3>
      <p>
        São {busca.total_fotos.toLocaleString("pt-BR")} fotos. Mande uma selfie e a galeria mostra
        só aquelas em que <strong>você</strong> aparece, da mais parecida para a menos.
      </p>
      <Privacidade>
        🔒 <strong>Sua foto não sai do celular.</strong> A comparação é feita aqui, no seu
        navegador; para o servidor vai apenas uma sequência de números que não vira imagem de volta.
        {busca.modelo_bytes > 0 &&
          ` Na primeira busca o site baixa o reconhecedor de rostos (${megas(busca.modelo_bytes)} MB)` +
            " — se puder, use wi-fi. Depois disso ele fica guardado no aparelho."}
      </Privacidade>

      {selfies.length > 0 && (
        <Escolhidas>
          {selfies.map((selfie, indice) => (
            <li key={selfie.previa}>
              <img src={selfie.previa} alt={`Selfie ${indice + 1}`} />
              <button
                type="button"
                onClick={() => remover(indice)}
                disabled={ocupado}
                aria-label={`Tirar a selfie ${indice + 1}`}
              >
                ×
              </button>
            </li>
          ))}
        </Escolhidas>
      )}

      <Acoes>
        <input
          ref={entrada}
          type="file"
          accept="image/*"
          multiple
          onChange={escolher}
          style={{ display: "none" }}
        />
        <BotaoSecundario
          type="button"
          onClick={() => entrada.current?.click()}
          disabled={ocupado || selfies.length >= MAX_SELFIES}
        >
          {selfies.length === 0 ? "Escolher a selfie" : `Somar outra (${selfies.length}/${MAX_SELFIES})`}
        </BotaoSecundario>
        <BotaoBuscar type="button" onClick={procurar} disabled={ocupado || selfies.length === 0}>
          {ocupado ? "Procurando..." : "Procurar minhas fotos"}
        </BotaoBuscar>
        {filtrando && (
          <BotaoSecundario type="button" onClick={limpar} disabled={ocupado}>
            Ver o álbum inteiro
          </BotaoSecundario>
        )}
      </Acoes>

      {selfies.length === 1 && !ocupado && achadas === null && (
        <Privacidade>
          Dica: some uma segunda foto, de outro ângulo e sem óculos escuro. É o que mais melhora o
          resultado.
        </Privacidade>
      )}

      {etapa === "preparando" && (
        <>
          <Andamento role="status">
            Baixando o reconhecedor de rostos
            {progresso.total > 0
              ? ` — ${megas(progresso.baixados)} de ${megas(progresso.total)} MB`
              : ` — ${megas(progresso.baixados)} MB`}
          </Andamento>
          <Barra value={progresso.baixados} max={progresso.total || undefined} />
        </>
      )}
      {etapa === "lendo" && <Andamento role="status">Lendo o rosto na sua foto...</Andamento>}
      {etapa === "buscando" && <Andamento role="status">Procurando no álbum...</Andamento>}

      {falha && <Falha role="alert">{falha}</Falha>}

      {achadas !== null && !falha && (
        <Resultado>
          {achadas === 0 ? (
            <span>
              Não achei nenhuma foto sua. Tente outra selfie, mais de perto — o álbum tem{" "}
              {busca.total_fotos.toLocaleString("pt-BR")} fotos e nem todo mundo aparece de frente.
            </span>
          ) : (
            <span>
              {achadas} foto(s) parecida(s) com você. <strong>As primeiras são as mais certas</strong>{" "}
              — role até começar a aparecer gente que não é você e pare por ali.
            </span>
          )}
        </Resultado>
      )}
    </Painel>
  );
};

export default BuscaPorRosto;
