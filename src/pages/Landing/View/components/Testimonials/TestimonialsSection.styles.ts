import styled from "styled-components";
import { SectionContainer, SectionTitle } from "../shared";

export const TestimonialsSectionWrapper = styled.section`
  padding: 100px 0;
  background: #fff;
`;

export const Container = styled(SectionContainer)``;

export const Title = styled(SectionTitle)``;

export const TestimonialsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
`;

export const TestimonialCard = styled.article`
  background: #f8f9fa;
  padding: 2rem;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
  }
`;

export const TestimonialContent = styled.div`
  margin-bottom: 1.5rem;
`;

export const TestimonialComment = styled.p`
  font-size: 1.1rem;
  line-height: 1.6;
  font-style: italic;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 1rem;
`;

export const TestimonialRating = styled.div`
  display: flex;
  gap: 0.2rem;
`;

export const Star = styled.span`
  font-size: 1.2rem;
`;

export const TestimonialAuthor = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

export const AuthorAvatar = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.gradientStart} 0%, ${({ theme }) => theme.colors.gradientEnd} 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 1.2rem;
`;

export const AuthorName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 0.2rem;
`;

export const AuthorRole = styled.p`
  font-size: 0.9rem;
  color: #6c757d;
  margin: 0;
`;

export const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.125rem;
`;

export const ErrorContainer = styled.div`
  background-color: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 20px;
  color: #dc2626;
  text-align: center;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  font-weight: 500;
`;

export const EmptyContainer = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: ${({ theme }) => theme.colors.text};

  p {
    margin: 0;
    font-size: 1.125rem;
  }
`;

export const CalloutContainer = styled.div`
  margin-top: 4rem;
  padding: 2.5rem;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.gradientStart}20 0%, ${({ theme }) => theme.colors.gradientEnd}20 100%);
  border-left: 4px solid ${({ theme }) => theme.colors.gradientStart};
  border-radius: 12px;
  text-align: center;

  @media (max-width: 768px) {
    padding: 2rem;
    margin-top: 3rem;
  }
`;

export const CalloutTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 1rem 0;
`;

export const CalloutText = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 1.5rem 0;
  line-height: 1.6;
`;

export const WhatsAppLink = styled.a`
  display: inline-block;
  padding: 0.875rem 2rem;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.gradientStart} 0%, ${({ theme }) => theme.colors.gradientEnd} 100%);
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: translateY(0);
  }
`;
