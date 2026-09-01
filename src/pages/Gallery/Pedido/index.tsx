import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlbumContainer,
  AlbumHeader,
  AlbumPage,
  AlbumTitle,
  BackButton,
} from "../Album/AlbumView.styles";
import {
  Aviso,
  BotaoPrincipal,
  Erro,
  Grade,
} from "../Album/AlbumFotos.styles";
import {
  Cartao,
  Chave,
  CodigoPix,
  FotoCartao,
  Instrucao,
  QrCode,
  Selo,
} from "./Pedido.styles";
import {
  PedidoDeFotos,
  buscarPedido,
  formatarReais,
  urlDaMiniatura,
} from "../../../services/fotos/fotos.service";

/**
 * Página do pedido de fotos: mostra o PIX enquanto não pagou e os downloads
 * depois que pagou.
 *
 * O endereço carrega o segredo do pedido (?t=...). É ele que identifica o
 * comprador — não existe login para comprar foto, e pedir cadastro para uma
 * compra de R$ 5 espantaria a maior parte das pessoas.
 */

/** De quanto em quanto tempo a tela pergunta se o PIX caiu. */
const INTERVALO_MS = 4000;

const PedidoDeFotosPage: React.FC = () => {
  const navigate = useNavigate();
  const [parametros] = useSearchParams();
  const token = parametros.get("t") ?? "";
  const [pedido, setPedido] = React.useState<PedidoDeFotos | null>(null);
  const [carregando, setCarregando] = React.useState(true);
  const [copiado, setCopiado] = React.useState(false);

  React.useEffect(() => {
    if (!token) {
      setCarregando(false);
      return undefined;
    }

    const controle = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let ativo = true;

    const consultar = async () => {
      try {
        const atual = await buscarPedido(token, controle.signal);
        if (!ativo) return;
        setPedido(atual);
        setCarregando(false);
        // Só continua perguntando enquanto o pagamento não cai. Pedido pago ou
        // cancelado não muda mais sozinho, e ficar consultando à toa gasta
        // bateria de quem deixou a aba aberta.
        if (atual?.status === "PENDING") {
          timer = setTimeout(consultar, INTERVALO_MS);
        }
      } catch {
        if (ativo) setCarregando(false);
      }
    };

    consultar();

    return () => {
      ativo = false;
      controle.abort();
      if (timer) clearTimeout(timer);
    };
  }, [token]);

  const copiarCodigo = async () => {
    if (!pedido?.qrCodeText) return;
    try {
      await navigator.clipboard.writeText(pedido.qrCodeText);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <AlbumPage>
      <AlbumContainer>
        <AlbumHeader>
          <AlbumTitle>Seu pedido de fotos</AlbumTitle>
          <BackButton type="button" onClick={() => navigate("/gallery")}>
            Voltar à galeria
          </BackButton>
        </AlbumHeader>

        {carregando && <p>Carregando o pedido...</p>}

        {!carregando && !pedido && (
          <Erro>
            Não encontramos este pedido. Confira se o endereço foi copiado inteiro — ele é
            longo e costuma quebrar quando passa por aplicativo de mensagem. O link certo está
            no e-mail que enviamos quando você começou a compra.
          </Erro>
        )}

        {pedido && (
          <>
            <Cartao>
              <Selo $pago={pedido.status === "PAID"}>
                {pedido.status === "PAID"
                  ? "Pagamento confirmado"
                  : pedido.status === "CANCELED"
                    ? "Pedido cancelado"
                    : "Aguardando o pagamento"}
              </Selo>
              <p>
                <strong>{pedido.quantidade}</strong> foto(s) — total{" "}
                <strong>{formatarReais(pedido.valor_total_centavos)}</strong>
              </p>
              <p>
                Em nome de {pedido.nome} ({pedido.email})
              </p>
            </Cartao>

            {pedido.status === "PENDING" && pedido.qrCodeText && (
              <Cartao>
                <Instrucao>
                  Abra o aplicativo do seu banco, escolha PIX e leia o código abaixo. Assim que o
                  pagamento cair, <strong>esta página libera as fotos sozinha</strong> — não
                  precisa atualizar nem mandar comprovante.
                </Instrucao>
                {pedido.qrCodeImageUrl && (
                  <QrCode src={pedido.qrCodeImageUrl} alt="QR Code do PIX" />
                )}
                <CodigoPix>{pedido.qrCodeText}</CodigoPix>
                <BotaoPrincipal type="button" onClick={copiarCodigo}>
                  {copiado ? "Código copiado" : "Copiar o código PIX"}
                </BotaoPrincipal>
                <Chave>
                  Já mandamos o endereço desta página para o seu e-mail. Pode fechar a aba: é por
                  aquele link que você volta para baixar as fotos.
                </Chave>
              </Cartao>
            )}

            {pedido.status === "CANCELED" && (
              <Aviso>
                <p>
                  A cobrança venceu antes do pagamento. As fotos continuam na galeria — é só
                  escolher de novo e gerar um PIX novo.
                </p>
              </Aviso>
            )}

            {pedido.baixavel && (
              <>
                <Aviso>
                  <p>
                    <strong>Pronto, as fotos são suas.</strong> Clique em cada uma para baixar o
                    arquivo original, em alta e sem marca d'água.
                    {pedido.downloads_expiram_em && (
                      <>
                        {" "}
                        Os links valem até{" "}
                        <strong>
                          {new Date(pedido.downloads_expiram_em).toLocaleDateString("pt-BR")}
                        </strong>
                        .
                      </>
                    )}
                  </p>
                </Aviso>
                <Grade>
                  {pedido.fotos.map(foto => (
                    <FotoCartao key={foto.nome}>
                      {/* A miniatura é montada aqui, e não usada como veio da
                          API (`foto.previa`), para levar a mesma versão de cache
                          do resto do site — senão esta tela mostraria a foto
                          antiga depois de uma regravação. */}
                      <img src={urlDaMiniatura(pedido.ano, foto.nome)} alt="" loading="lazy" />
                      <a href={foto.download ?? "#"} download>
                        Baixar em alta
                      </a>
                    </FotoCartao>
                  ))}
                </Grade>
              </>
            )}
          </>
        )}
      </AlbumContainer>
    </AlbumPage>
  );
};

export default PedidoDeFotosPage;
