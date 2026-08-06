import styled from "styled-components";

export const Cartao = styled.section`
  display: grid;
  gap: 14px;
  justify-items: start;
  background: #ffffff;
  border-radius: 14px;
  padding: 22px;
  margin-bottom: 20px;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);

  p {
    margin: 0;
    color: #374151;
    line-height: 1.5;
  }
`;

export const Selo = styled.span<{ $pago: boolean }>`
  display: inline-block;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ $pago }) => ($pago ? "#065f46" : "#92400e")};
  background: ${({ $pago }) => ($pago ? "#d1fae5" : "#fef3c7")};
`;

export const Instrucao = styled.p`
  max-width: 60ch;
`;

export const QrCode = styled.img`
  width: 240px;
  height: 240px;
  object-fit: contain;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 8px;
`;

export const CodigoPix = styled.code`
  display: block;
  width: 100%;
  background: #f3f4f6;
  border-radius: 10px;
  padding: 12px;
  font-size: 0.8rem;
  word-break: break-all;
  color: #1f2937;
`;

export const Chave = styled.p`
  color: #6b7280 !important;
  font-size: 0.9rem;
`;

export const FotoCartao = styled.figure`
  margin: 0;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
  display: grid;

  img {
    width: 100%;
    aspect-ratio: 3 / 2;
    object-fit: cover;
    display: block;
  }

  a {
    padding: 10px;
    text-align: center;
    font-weight: 700;
    color: #4f46e5;
    text-decoration: none;
  }

  a:hover {
    background: #eef2ff;
  }
`;
