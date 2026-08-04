import React from "react";
import { useTranslation } from "react-i18next";
import { useTestimonials } from "../../../../../hooks/useTestimonials";
import {
  AuthorAvatar,
  AuthorName,
  AuthorRole,
  Container,
  Star,
  TestimonialAuthor,
  TestimonialCard,
  TestimonialComment,
  TestimonialContent,
  TestimonialRating,
  TestimonialsGrid,
  TestimonialsSectionWrapper,
  Title,
  LoadingContainer,
  ErrorContainer,
  EmptyContainer,
  CalloutContainer,
  CalloutTitle,
  CalloutText,
  SubmitLink,
} from "./TestimonialsSection.styles";

const renderStars = (rating?: number) =>
  Array(rating || 5)
    .fill(0)
    .map((_, index) => (
      <Star key={index}>
        ⭐
      </Star>
    ));

interface TestimonialsSectionProps {
  // Quando false, oculta o bloco "Deixe seu depoimento" (usado dentro de /depoimentos,
  // onde o formulário já está logo acima).
  showSubmitLink?: boolean;
  /**
   * Quantos depoimentos mostrar. A home fica com 3 — ali eles são um convite,
   * não o conteúdo. A página `/depoimentos` pede um número alto, porque lá eles
   * SÃO o conteúdo e a pessoa foi até lá justamente para ler vários.
   */
  limit?: number;
}

const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({
  showSubmitLink = true,
  limit = 3,
}) => {
  const { t } = useTranslation("landing");
  const { data: testimonials = [], isLoading, error } = useTestimonials(false, limit);

  if (isLoading) {
    return (
      <TestimonialsSectionWrapper id="testimonials">
        <Container>
          <Title>{t("testimonials.title")}</Title>
          <LoadingContainer>{t("common.loading")}</LoadingContainer>
        </Container>
      </TestimonialsSectionWrapper>
    );
  }

  if (error) {
    return (
      <TestimonialsSectionWrapper id="testimonials">
        <Container>
          <Title>{t("testimonials.title")}</Title>
          <ErrorContainer>{t("testimonials.error")}</ErrorContainer>
        </Container>
      </TestimonialsSectionWrapper>
    );
  }

  if (!testimonials || testimonials.length === 0) {
    return (
      <TestimonialsSectionWrapper id="testimonials">
        <Container>
          <Title>{t("testimonials.title")}</Title>
          <EmptyContainer>
            <p>{t("testimonials.empty")}</p>
          </EmptyContainer>
        </Container>
      </TestimonialsSectionWrapper>
    );
  }

  return (
    <TestimonialsSectionWrapper id="testimonials">
      <Container>
        <Title>{t("testimonials.title")}</Title>
        <TestimonialsGrid>
          {testimonials.map(testimonial => (
            <TestimonialCard key={testimonial.id}>
              <TestimonialContent>
                <TestimonialComment>{testimonial.content}</TestimonialComment>
                <TestimonialRating>{renderStars(testimonial.rating)}</TestimonialRating>
              </TestimonialContent>
              <TestimonialAuthor>
                <AuthorAvatar>{testimonial.name.charAt(0)}</AuthorAvatar>
                <div>
                  <AuthorName>{testimonial.name}</AuthorName>
                  <AuthorRole>{testimonial.role}</AuthorRole>
                </div>
              </TestimonialAuthor>
            </TestimonialCard>
          ))}
        </TestimonialsGrid>

        {showSubmitLink && (
          <CalloutContainer>
            <CalloutTitle>{t("testimonials.callout.title")}</CalloutTitle>
            <CalloutText>{t("testimonials.callout.message")}</CalloutText>
            <SubmitLink to="/depoimentos">
              {t("testimonials.callout.buttonText")}
            </SubmitLink>
          </CalloutContainer>
        )}
      </Container>
    </TestimonialsSectionWrapper>
  );
};

export default TestimonialsSection;
