import styled from "styled-components";

export const GalleryPage = styled.div`
  min-height: 100vh;
  background: #f5f7fb;
`;

export const GalleryMain = styled.main`
  display: block;
`;

export const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
`;

export const GalleryHero = styled.section`
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.gradientStart} 0%, ${({ theme }) => theme.colors.gradientEnd} 100%);
  color: #fff;
  padding: 80px 0 60px;

  h1 {
    margin: 0 0 12px 0;
    font-size: 2.6rem;
  }

  p {
    margin: 0 0 16px 0;
    font-size: 1.1rem;
    max-width: 760px;
    line-height: 1.6;
  }

  @media (max-width: 640px) {
    padding: 60px 0 48px;

    h1 {
      font-size: 2.1rem;
    }

    p {
      font-size: 1rem;
    }
  }
`;

export const GalleryListSection = styled.section`
  padding: 48px 0 72px;
`;

export const AlbumGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 18px;
`;

export const AlbumCard = styled.article`
  background: #fff;
  border-radius: 16px;
  padding: 18px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
  display: grid;
  gap: 12px;
`;

export const AlbumHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const AlbumYear = styled.div`
  font-size: 1.4rem;
  font-weight: 700;
  color: #1f2937;
`;

export const AlbumStatus = styled.span`
  font-size: 0.9rem;
  color: #6b7280;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

export const AlbumThumb = styled.div`
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  background: linear-gradient(135deg, #e0e7ff 0%, #f3f4f6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4b5563;
  font-weight: 600;
  font-size: 0.95rem;
  border: 1px dashed #d1d5db;
`;

export const AlbumThumbImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 10px;
`;

export const AlbumButton = styled.button`
  border: none;
  padding: 10px 14px;
  border-radius: 10px;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.gradientStart} 0%, ${({ theme }) => theme.colors.gradientEnd} 100%);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 24px rgba(102, 126, 234, 0.25);
  }
`;

export const AlbumFootnote = styled.p`
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
`;
