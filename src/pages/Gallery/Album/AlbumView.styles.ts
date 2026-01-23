import styled from "styled-components";

export const AlbumPage = styled.main`
  min-height: 100vh;
  background: #f5f7fb;
  padding: 32px 0 72px;
`;

export const AlbumContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
`;

export const AlbumHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
`;

export const AlbumTitle = styled.h1`
  margin: 0;
  font-size: 2rem;
  color: #1f2937;
`;

export const BackButton = styled.button`
  border: none;
  background: transparent;
  color: #4f46e5;
  font-weight: 600;
  cursor: pointer;
`;

export const AlbumGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
`;

export const PhotoCard = styled.button`
  border: none;
  padding: 0;
  background: #ffffff;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
  cursor: pointer;
`;

export const PhotoImage = styled.img`
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
`;

export const EmptyState = styled.p`
  margin: 0;
  color: #6b7280;
`;

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 999;
`;

export const ModalContent = styled.div`
  max-width: min(1000px, 92vw);
  max-height: 90vh;
  background: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
`;

export const ModalImage = styled.img`
  display: block;
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
  background: #000;
`;

export const ModalClose = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: #ffffff;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
`;

