import styled from "styled-components";

export const TshirtSectionWrapper = styled.section`
  background: #f5f7fb;
  padding: 64px 0 0;
`;

export const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
`;

export const TshirtCard = styled.div`
  background: #ffffff;
  border-radius: 16px;
  padding: 32px;
  box-shadow: ${({ theme }) => theme.shadows.md};
  max-width: 720px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
`;

export const Header = styled.div`
  display: grid;
  gap: 8px;

  h2 {
    margin: 0;
    font-size: 1.65rem;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.muted};
    line-height: 1.5;
  }
`;

export const ImageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const ImageFigure = styled.figure`
  margin: 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  overflow: hidden;
  background: #f8fafc;

  figcaption {
    padding: 10px 12px;
    text-align: center;
    font-size: 0.92rem;
    color: ${({ theme }) => theme.colors.muted};
  }
`;

export const TshirtImageButton = styled.button`
  display: block;
  width: 100%;
  border: none;
  background: none;
  padding: 0;
  margin: 0;
  cursor: zoom-in;

  &:focus-visible {
    outline: 2px solid #1d4ed8;
    outline-offset: 2px;
  }
`;

export const TshirtImage = styled.img`
  width: 140px;
  max-width: 100%;
  display: block;
  object-fit: contain;
  margin: 0 auto;
  transition: transform 0.2s ease;

  ${TshirtImageButton}:hover & {
    transform: scale(1.04);
  }
`;

export const SizeGuideLink = styled.button`
  color: #1d4ed8;
  text-decoration: underline;
  font-weight: 600;
  width: fit-content;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: 1rem;
`;

export const SizeGuideModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

export const SizeGuideModalContent = styled.div`
  background: #fff;
  border-radius: 12px;
  padding: 24px 16px 16px 16px;
  max-width: 95vw;
  max-height: 90vh;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const SizeGuideClose = styled.button`
  margin-top: 12px;
  background: #1d4ed8;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 18px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
`;

export const SizeTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
  font-size: 0.95rem;

  caption {
    caption-side: top;
    font-weight: 700;
    margin-bottom: 12px;
    color: ${({ theme }) => theme.colors.text};
  }

  th,
  td {
    border: 1px solid ${({ theme }) => theme.colors.border};
    padding: 8px 12px;
    text-align: center;
  }

  thead th {
    background: #f1f5f9;
    font-weight: 700;
  }

  tbody th {
    background: #f8fafc;
    font-weight: 700;
  }

  tbody tr:nth-child(even) td {
    background: #fafafa;
  }
`;

export const ZoomModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
`;

export const ZoomModalContent = styled.div`
  position: relative;
  max-width: 95vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const ZoomImage = styled.img`
  max-width: 95vw;
  max-height: 85vh;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
`;

export const ZoomCaption = styled.p`
  margin: 12px 0 0;
  color: #fff;
  font-size: 0.95rem;
  text-align: center;
`;

export const ZoomClose = styled.button`
  position: absolute;
  top: -16px;
  right: -16px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #fff;
  color: #0f172a;
  border: none;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

  @media (max-width: 640px) {
    top: 8px;
    right: 8px;
  }
`;

export const Form = styled.form`
  display: grid;
  gap: 14px;
`;

export const QuantityGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const QuantityField = styled.label`
  display: grid;
  gap: 6px;
  font-size: 0.92rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`;

export const Summary = styled.div`
  padding: 12px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-weight: 600;
`;

export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

export const PixBox = styled.div`
  margin-top: 6px;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  background: #f9fafb;
  display: grid;
  gap: 12px;
`;

export const PixOrderTitle = styled.p`
  margin: 0;
  font-weight: 700;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.text};
`;

export const PixLabelContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
`;

export const PixLabel = styled.label`
  font-weight: 700;
  margin: 0;
  flex: 1;
`;

export const CopyButton = styled.button`
  padding: 6px 12px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    background-color: #2563eb;
  }
`;

export const PixTextarea = styled.textarea`
  width: 100%;
  min-height: 108px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  padding: 12px;
  resize: vertical;
  font-family: monospace;
`;

export const QRCodeContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 4px;
  padding: 12px;
  background-color: #ffffff;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

export const QRCodeImage = styled.img`
  max-width: 200px;
  height: auto;
  border-radius: 6px;

  @media (max-width: 640px) {
    max-width: 150px;
  }
`;

export const TotalsList = styled.ul`
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
`;
