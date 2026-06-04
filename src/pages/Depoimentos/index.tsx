import React, { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Header } from "../../components";
import TestimonialsSection from "../Landing/View/components/Testimonials/TestimonialsSection";
import {
  Page,
  Main,
  FormSection,
  FormContainer,
  FormTitle,
  FormSubtitle,
  FormCard,
  Field,
  Label,
  Input,
  Textarea,
  StarsRow,
  StarButton,
  SubmitButton,
  FeedbackMessage,
  FieldError,
} from "./Depoimentos.styles";

const Depoimentos: React.FC = () => {
  const { t } = useTranslation("landing");
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [errors, setErrors] = useState<{ name?: string; content?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ variant: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    const nextErrors: { name?: string; content?: string } = {};
    if (name.trim().length < 2) nextErrors.name = t("testimonials.form.nameRequired");
    if (content.trim().length < 5) nextErrors.content = t("testimonials.form.contentRequired");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || "";
      const response = await fetch(`${apiUrl}/api/testimonials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          role: role.trim(),
          content: content.trim(),
          rating,
        }),
      });
      if (!response.ok) throw new Error("submit_failed");

      setFeedback({ variant: "success", text: t("testimonials.form.success") });
      setName("");
      setRole("");
      setContent("");
      setRating(5);
      // Atualiza a lista de depoimentos exibida logo abaixo (e na home).
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
    } catch {
      setFeedback({ variant: "error", text: t("testimonials.form.error") });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Page>
      <Header />
      <Main>
        <FormSection>
          <FormContainer>
            <FormTitle>{t("testimonials.form.title")}</FormTitle>
            <FormSubtitle>{t("testimonials.form.subtitle")}</FormSubtitle>

            <FormCard onSubmit={handleSubmit} noValidate>
              {feedback && (
                <FeedbackMessage $variant={feedback.variant}>{feedback.text}</FeedbackMessage>
              )}

              <Field>
                <Label htmlFor="dep-name">{t("testimonials.form.nameLabel")}</Label>
                <Input
                  id="dep-name"
                  type="text"
                  value={name}
                  maxLength={80}
                  placeholder={t("testimonials.form.namePlaceholder")}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                />
                {errors.name && <FieldError>{errors.name}</FieldError>}
              </Field>

              <Field>
                <Label htmlFor="dep-role">{t("testimonials.form.roleLabel")}</Label>
                <Input
                  id="dep-role"
                  type="text"
                  value={role}
                  maxLength={80}
                  placeholder={t("testimonials.form.rolePlaceholder")}
                  onChange={(e) => setRole(e.target.value)}
                />
              </Field>

              <Field>
                <Label>{t("testimonials.form.ratingLabel")}</Label>
                <StarsRow role="radiogroup" aria-label={t("testimonials.form.ratingLabel")}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <StarButton
                      key={value}
                      type="button"
                      $active={value <= rating}
                      aria-label={`${value}`}
                      aria-pressed={value === rating}
                      onClick={() => setRating(value)}
                    >
                      ⭐
                    </StarButton>
                  ))}
                </StarsRow>
              </Field>

              <Field>
                <Label htmlFor="dep-content">{t("testimonials.form.contentLabel")}</Label>
                <Textarea
                  id="dep-content"
                  value={content}
                  maxLength={1000}
                  placeholder={t("testimonials.form.contentPlaceholder")}
                  onChange={(e) => {
                    setContent(e.target.value);
                    if (errors.content) setErrors((prev) => ({ ...prev, content: undefined }));
                  }}
                />
                {errors.content && <FieldError>{errors.content}</FieldError>}
              </Field>

              <SubmitButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? t("testimonials.form.submitting") : t("testimonials.form.submit")}
              </SubmitButton>
            </FormCard>
          </FormContainer>
        </FormSection>

        {/* Mesmos depoimentos da home, logo abaixo do formulário (sem o CTA, que já está acima). */}
        <TestimonialsSection showSubmitLink={false} />
      </Main>
    </Page>
  );
};

export default Depoimentos;
