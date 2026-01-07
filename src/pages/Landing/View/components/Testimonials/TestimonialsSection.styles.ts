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
