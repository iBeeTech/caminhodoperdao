import styled from "styled-components";

export const HeroSectionWrapper = styled.section`
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.gradientStart} 0%, ${({ theme }) => theme.colors.gradientEnd} 100%);
  color: white;
  padding: 40px 0;
  position: relative;
  overflow: hidden;
  min-height: auto;
  display: flex;
  align-items: center;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 100" fill="white" opacity="0.1"><polygon points="0,100 1000,0 1000,100"/></svg>') no-repeat;
    background-size: cover;
  }
`;

export const HeroContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
  position: relative;
  z-index: 1;
  grid-template-rows: auto 1fr;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 48px;
    text-align: center;
    grid-template-rows: auto 1fr;
  }
`;

export const HeroContent = styled.div`
  animation: fadeInLeft 1s ease-out;

  @keyframes fadeInLeft {
    from {
      opacity: 0;
      transform: translateX(-50px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

export const HeroTitle = styled.h1`
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 1rem;
  line-height: 1.2;

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }

  @media (max-width: 480px) {
    font-size: 2rem;
  }
`;

export const HeroSubtitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 300;
  margin-bottom: 1.5rem;
  opacity: 0.9;

  @media (max-width: 768px) {
    font-size: 1.2rem;
  }
`;

export const HeroDescription = styled.p`
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 2.5rem;
  opacity: 0.8;
`;

export const HeroActions = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    justify-content: center;
  }
`;

export const HeroVisual = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  animation: fadeInRight 1s ease-out;

  @keyframes fadeInRight {
    from {
      opacity: 0;
      transform: translateX(50px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

export const HeroImageWrapper = styled.div`
  width: 360px;
  max-width: 100%;
  animation: float 3s ease-in-out infinite;

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }
`;

export const HeroImage = styled.img`
  width: 100%;
  height: auto;
  display: block;
`;
