import styled from "styled-components";

export const Aviso = styled.section`
  display: flex;
  gap: 14px;
  align-items: flex-start;
  background: linear-gradient(135deg, #fff8e6 0%, #fff3d6 100%);
  border: 1px solid #f2d894;
  border-left: 4px solid #d99b0b;
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 24px;
  color: #6b4b12;

  p {
    margin: 0;
    line-height: 1.5;
  }

  strong {
    color: #4a3208;
  }
`;

export const BlocoBarra = styled.nav`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-bottom: 20px;
`;

export const BlocoBotao = styled.button<{ $ativo: boolean }>`
  flex: 0 0 auto;
  border: 1px solid ${({ $ativo }) => ($ativo ? "#4f46e5" : "#d9dbe7")};
  background: ${({ $ativo }) => ($ativo ? "#4f46e5" : "#ffffff")};
  color: ${({ $ativo }) => ($ativo ? "#ffffff" : "#4b5563")};
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    border-color: #4f46e5;
  }
`;

export const Grade = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
`;

export const Celula = styled.figure<{ $escolhida: boolean }>`
  position: relative;
  margin: 0;
  aspect-ratio: 3 / 2;
  border-radius: 12px;
  overflow: hidden;
  background: #e9ecf5;
  cursor: pointer;
  outline: ${({ $escolhida }) => ($escolhida ? "3px solid #4f46e5" : "none")};
  outline-offset: -3px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &:focus-visible {
    outline: 3px solid #1f2937;
  }
`;

export const Marca = styled.span<{ $escolhida: boolean }>`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
  background: ${({ $escolhida }) => ($escolhida ? "#4f46e5" : "rgba(17, 24, 39, 0.45)")};
  border: 2px solid #ffffff;
`;

export const Lupa = styled.button`
  position: absolute;
  bottom: 8px;
  right: 8px;
  border: none;
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #1f2937;
  background: rgba(255, 255, 255, 0.9);
  cursor: pointer;
`;

export const Carrinho = styled.div`
  position: sticky;
  bottom: 0;
  z-index: 5;
  margin-top: 28px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #111827;
  color: #ffffff;
  border-radius: 14px;
  padding: 16px 20px;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.25);

  strong {
    font-size: 1.15rem;
  }
`;

export const BotaoPrincipal = styled.button`
  border: none;
  border-radius: 10px;
  background: #22c55e;
  color: #06240f;
  font-weight: 700;
  padding: 12px 22px;
  cursor: pointer;

  &:disabled {
    background: #4b5563;
    color: #d1d5db;
    cursor: not-allowed;
  }
`;

export const BotaoTexto = styled.button`
  border: none;
  background: transparent;
  color: #c7d2fe;
  font-weight: 600;
  cursor: pointer;
`;

export const Formulario = styled.form`
  display: grid;
  gap: 14px;
  background: #ffffff;
  border-radius: 14px;
  padding: 24px;
  max-width: 460px;
  width: 100%;

  h2 {
    margin: 0;
    font-size: 1.3rem;
    color: #1f2937;
  }

  label {
    display: grid;
    gap: 6px;
    font-size: 0.9rem;
    font-weight: 600;
    color: #374151;
  }

  input {
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 11px 12px;
    font-size: 1rem;
  }

  p {
    margin: 0;
    color: #6b7280;
    font-size: 0.9rem;
    line-height: 1.5;
  }
`;

export const Erro = styled.p`
  margin: 0;
  color: #b91c1c;
  font-weight: 600;
`;

export const Fim = styled.p`
  margin: 28px 0 0;
  text-align: center;
  color: #6b7280;
`;
