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
  WhatsAppLink,
} from "./TestimonialsSection.styles";
import { useAnalytics } from "../../../../../hooks/useAnalytics";

const renderStars = (rating?: number) =>
  Array(rating || 5)
    .fill(0)
    .map((_, index) => (
      <Star key={index}>
        ⭐
      </Star>
    ));

const TestimonialsSection: React.FC = () => {
  const { t } = useTranslation("landing");
  const { data: testimonials = [], isLoading, error } = useTestimonials(false, 3);
  const { externalLinkClicked } = useAnalytics();
  const whatsappUrl = t("testimonials.callout.whatsappUrl");
  const handleWhatsAppClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    externalLinkClicked("whatsapp_testimonial");
    window.open(whatsappUrl, "_blank");
  };

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

        <CalloutContainer>
          <CalloutTitle>{t("testimonials.callout.title")}</CalloutTitle>
          <CalloutText>{t("testimonials.callout.message")}</CalloutText>
          <WhatsAppLink 
            href={whatsappUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={handleWhatsAppClick}
          >
            {t("testimonials.callout.buttonText")}
          </WhatsAppLink>
        </CalloutContainer>
      </Container>
    </TestimonialsSectionWrapper>
  );
};

export default TestimonialsSection;
