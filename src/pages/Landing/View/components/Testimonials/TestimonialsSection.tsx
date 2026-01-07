import React from "react";
import { useTranslation } from "react-i18next";
import { useSectionView } from "../../../../../hooks/useSectionView";
import { Testimonial } from "../../../Model";
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
} from "./TestimonialsSection.styles";

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
}

const renderStars = (rating: number) =>
  Array(rating)
    .fill(0)
    .map((_, index) => (
      <Star key={index}>
        ⭐
      </Star>
    ));

const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({ testimonials }) => {
  const { t } = useTranslation("landing");
  useSectionView("testimonials", "testimonials");

  return (
    <TestimonialsSectionWrapper id="testimonials">
      <Container>
        <Title>{t("testimonials.title")}</Title>
        <TestimonialsGrid>
          {testimonials.map(testimonial => (
            <TestimonialCard key={testimonial.id}>
              <TestimonialContent>
                <TestimonialComment>{testimonial.comment}</TestimonialComment>
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
      </Container>
    </TestimonialsSectionWrapper>
  );
};

export default TestimonialsSection;
