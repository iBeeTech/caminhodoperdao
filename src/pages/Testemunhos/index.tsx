import React, { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "../../components";
import { MAX_RECORDING_SECONDS, useAudioRecorder } from "../../hooks/useAudioRecorder";
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
  ModeTabs,
  ModeTab,
  RecorderBox,
  LimitNote,
  Timer,
  RecordButton,
  SecondaryButton,
  AudioPlayer,
  HelperText,
  ConsentRow,
  ConsentCheckbox,
  SubmitButton,
  FeedbackMessage,
  FieldError,
  ListSection,
  ListContainer,
  ListTitle,
  TestimonyCard,
  TestimonyContent,
  TestimonyMeta,
  AudioBadge,
  EmptyState,
} from "./Testemunhos.styles";

type Mode = "audio" | "text";

interface PublicTestimony {
  id: string;
  name: string;
  content: string;
  source: "text" | "audio";
  audio_url: string | null;
  created_at: string;
}

const API_BASE = process.env.REACT_APP_API_URL || "";

const formatClock = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const Testemunhos: React.FC = () => {
  const { t } = useTranslation("landing");
  const recorder = useAudioRecorder();

  const [mode, setMode] = useState<Mode>("audio");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [consent, setConsent] = useState(false);

  const [audioKey, setAudioKey] = useState<string | null>(null);
  const [audioContentType, setAudioContentType] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionNote, setTranscriptionNote] = useState<string | null>(null);

  const [errors, setErrors] = useState<{ name?: string; content?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ variant: "success" | "error"; text: string } | null>(null);

  const [items, setItems] = useState<PublicTestimony[]>([]);
  const [listLoading, setListLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const loadTestimonies = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/testemunhos`);
      const data = (await res.json()) as { data?: PublicTestimony[] };
      setItems(data.data ?? []);
    } catch {
      setItems([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTestimonies();
  }, [loadTestimonies]);

  // Envia o áudio gravado para transcrição; o texto volta editável no campo.
  const handleTranscribe = async () => {
    if (!recorder.audioBlob) return;
    setIsTranscribing(true);
    setTranscriptionNote(null);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append("audio", recorder.audioBlob, "testemunho");
      const res = await fetch(`${API_BASE}/api/testemunhos/transcrever`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("transcribe_failed");
      const data = (await res.json()) as {
        audioKey: string;
        audioContentType: string;
        transcript: string;
        transcriptionFailed: boolean;
      };
      setAudioKey(data.audioKey);
      setAudioContentType(data.audioContentType);
      if (data.transcript) setContent(data.transcript);
      setTranscriptionNote(
        data.transcriptionFailed
          ? t("testimony.audio.transcriptionFailed")
          : t("testimony.audio.transcriptionDone")
      );
    } catch {
      setTranscriptionNote(t("testimony.audio.transcriptionError"));
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleDiscardAudio = () => {
    recorder.reset();
    setAudioKey(null);
    setAudioContentType(null);
    setTranscriptionNote(null);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    setFeedback(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    const nextErrors: { name?: string; content?: string } = {};
    if (name.trim().length < 2) nextErrors.name = t("testimony.form.nameRequired");
    if (content.trim().length < 10) nextErrors.content = t("testimony.form.contentRequired");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!consent) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/testemunhos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          content: content.trim(),
          consent: true,
          audioKey: mode === "audio" ? audioKey : undefined,
          audioContentType: mode === "audio" ? audioContentType : undefined,
        }),
      });
      if (!res.ok) throw new Error("submit_failed");

      setFeedback({ variant: "success", text: t("testimony.form.success") });
      setName("");
      setContent("");
      setConsent(false);
      handleDiscardAudio();
    } catch {
      setFeedback({ variant: "error", text: t("testimony.form.error") });
    } finally {
      setIsSubmitting(false);
    }
  };

  const remaining = MAX_RECORDING_SECONDS - recorder.elapsedSeconds;
  const isRecording = recorder.status === "recording";
  const canSubmit = name.trim().length >= 2 && content.trim().length >= 10 && consent && !isSubmitting;

  const renderRecorder = () => {
    if (recorder.status === "unsupported") {
      return (
        <RecorderBox>
          <HelperText>{t("testimony.audio.unsupported")}</HelperText>
        </RecorderBox>
      );
    }

    return (
      <RecorderBox>
        <LimitNote>⏱️ {t("testimony.audio.limitNote")}</LimitNote>

        {recorder.status !== "recorded" && (
          <>
            <Timer $warning={isRecording && remaining <= 15}>
              {isRecording ? formatClock(remaining) : formatClock(MAX_RECORDING_SECONDS)}
            </Timer>
            <RecordButton
              type="button"
              $recording={isRecording}
              onClick={() => (isRecording ? recorder.stop() : recorder.start())}
            >
              {isRecording ? `⏹️ ${t("testimony.audio.stop")}` : `🎙️ ${t("testimony.audio.start")}`}
            </RecordButton>
            {isRecording && <HelperText>{t("testimony.audio.recordingHint")}</HelperText>}
            {recorder.status === "denied" && (
              <HelperText>{t("testimony.audio.denied")}</HelperText>
            )}
          </>
        )}

        {recorder.status === "recorded" && (
          <>
            {recorder.audioUrl && <AudioPlayer controls src={recorder.audioUrl} />}
            {!audioKey ? (
              <RecordButton type="button" onClick={handleTranscribe} disabled={isTranscribing}>
                {isTranscribing ? `⏳ ${t("testimony.audio.transcribing")}` : `📝 ${t("testimony.audio.transcribe")}`}
              </RecordButton>
            ) : (
              <HelperText>{t("testimony.audio.reviewHint")}</HelperText>
            )}
            {transcriptionNote && <HelperText>{transcriptionNote}</HelperText>}
            <SecondaryButton type="button" onClick={handleDiscardAudio}>
              {t("testimony.audio.discard")}
            </SecondaryButton>
          </>
        )}
      </RecorderBox>
    );
  };

  return (
    <Page>
      <Header />
      <Main>
        <FormSection>
          <FormContainer>
            <FormTitle>{t("testimony.form.title")}</FormTitle>
            <FormSubtitle>{t("testimony.form.subtitle")}</FormSubtitle>

            <FormCard onSubmit={handleSubmit} noValidate>
              {feedback && (
                <FeedbackMessage $variant={feedback.variant}>{feedback.text}</FeedbackMessage>
              )}

              <Field>
                <Label htmlFor="test-name">{t("testimony.form.nameLabel")}</Label>
                <Input
                  id="test-name"
                  type="text"
                  value={name}
                  maxLength={80}
                  placeholder={t("testimony.form.namePlaceholder")}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                />
                {errors.name && <FieldError>{errors.name}</FieldError>}
              </Field>

              <Field>
                <Label>{t("testimony.form.howLabel")}</Label>
                <ModeTabs role="tablist">
                  <ModeTab
                    type="button"
                    role="tab"
                    aria-selected={mode === "audio"}
                    $active={mode === "audio"}
                    onClick={() => switchMode("audio")}
                  >
                    🎙️ {t("testimony.form.tabAudio")}
                  </ModeTab>
                  <ModeTab
                    type="button"
                    role="tab"
                    aria-selected={mode === "text"}
                    $active={mode === "text"}
                    onClick={() => switchMode("text")}
                  >
                    ✍️ {t("testimony.form.tabText")}
                  </ModeTab>
                </ModeTabs>
              </Field>

              {mode === "audio" && renderRecorder()}

              <Field>
                <Label htmlFor="test-content">
                  {mode === "audio" ? t("testimony.form.transcriptLabel") : t("testimony.form.contentLabel")}
                </Label>
                <Textarea
                  id="test-content"
                  value={content}
                  maxLength={4000}
                  placeholder={
                    mode === "audio"
                      ? t("testimony.form.transcriptPlaceholder")
                      : t("testimony.form.contentPlaceholder")
                  }
                  onChange={(e) => {
                    setContent(e.target.value);
                    if (errors.content) setErrors((prev) => ({ ...prev, content: undefined }));
                  }}
                />
                {errors.content && <FieldError>{errors.content}</FieldError>}
              </Field>

              <ConsentRow>
                <ConsentCheckbox
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>{t("testimony.form.consent")}</span>
              </ConsentRow>

              <HelperText>{t("testimony.form.moderationNote")}</HelperText>

              <SubmitButton type="submit" disabled={!canSubmit}>
                {isSubmitting ? t("testimony.form.submitting") : t("testimony.form.submit")}
              </SubmitButton>
            </FormCard>
          </FormContainer>
        </FormSection>

        <ListSection>
          <ListContainer>
            <ListTitle>{t("testimony.list.title")}</ListTitle>
            {listLoading ? (
              <EmptyState>{t("testimony.list.loading")}</EmptyState>
            ) : items.length === 0 ? (
              <EmptyState>{t("testimony.list.empty")}</EmptyState>
            ) : (
              items.map((item) => (
                <TestimonyCard key={item.id}>
                  <TestimonyContent>{item.content}</TestimonyContent>
                  <TestimonyMeta>
                    <span>{item.name}</span>
                    {item.source === "audio" && (
                      <AudioBadge>🎙️ {t("testimony.list.audioBadge")}</AudioBadge>
                    )}
                  </TestimonyMeta>
                </TestimonyCard>
              ))
            )}
          </ListContainer>
        </ListSection>
      </Main>
    </Page>
  );
};

export default Testemunhos;
