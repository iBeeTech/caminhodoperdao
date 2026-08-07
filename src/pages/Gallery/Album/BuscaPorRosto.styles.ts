import styled from "styled-components";

/**
 * Painel da busca por rosto.
 *
 * Azul, e não amarelo como os outros avisos do álbum: os de cima falam de prazo
 * e de dinheiro, este oferece uma ajuda. Cor diferente para a pessoa não ler "mais
 * um aviso" e pular.
 */
export const Painel = styled.section`
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
  border: 1px solid #c7d2fe;
  border-left: 4px solid #4f46e5;
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 20px;
  color: #312e81;

  h3 {
    margin: 0 0 6px;
    font-size: 1.05rem;
    color: #312e81;
  }

  p {
    margin: 0 0 10px;
    line-height: 1.5;
    font-size: 0.95rem;
  }
`;

export const Privacidade = styled.p`
  font-size: 0.85rem !important;
  color: #4338ca;
`;

export const Acoes = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
`;

export const BotaoBuscar = styled.button`
  border: none;
  border-radius: 10px;
  background: #4f46e5;
  color: #ffffff;
  font-weight: 700;
  padding: 11px 20px;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: #4338ca;
  }

  &:disabled {
    background: #a5b4fc;
    cursor: not-allowed;
  }
`;

export const BotaoSecundario = styled.button`
  border: 1px solid #4f46e5;
  border-radius: 10px;
  background: transparent;
  color: #4338ca;
  font-weight: 600;
  padding: 10px 16px;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const Andamento = styled.p`
  margin: 12px 0 0 !important;
  font-weight: 600;
  color: #3730a3;
`;

/**
 * Barra de progresso do download.
 *
 * `<progress>` de verdade, e não uma div pintada: leitor de tela anuncia
 * porcentagem sozinho, e são 39 MB — quem está no 3G da estrada precisa saber se
 * está andando ou travado.
 */
export const Barra = styled.progress`
  width: 100%;
  height: 10px;
  margin-top: 8px;
  accent-color: #4f46e5;
`;

export const Falha = styled.p`
  margin: 12px 0 0 !important;
  color: #9f1239;
  font-weight: 600;
`;

export const Resultado = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #c7d2fe;
  font-weight: 600;
`;

/** Miniaturas das selfies escolhidas, para a pessoa ver o que está mandando. */
export const Escolhidas = styled.ul`
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 12px;
  padding: 0;

  li {
    position: relative;
  }

  img {
    width: 56px;
    height: 56px;
    object-fit: cover;
    border-radius: 10px;
    border: 2px solid #ffffff;
  }

  button {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: none;
    background: #1f2937;
    color: #ffffff;
    font-size: 12px;
    line-height: 1;
    cursor: pointer;
  }
`;
