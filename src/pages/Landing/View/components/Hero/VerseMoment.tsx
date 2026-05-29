import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  VerseContainer,
  VerseCitation,
  VerseLabel,
  VerseText,
  VerseWrapper,
} from "./VerseMoment.styles";

interface Verse {
  refKey: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  reference: string;
}

const VerseMoment = () => {
  const { t } = useTranslation(["landing", "common"]);
  const [verse, setVerse] = useState<Verse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDailyVerse = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/verse/random");

      if (!response.ok) {
        throw new Error("Erro ao buscar versículo");
      }

      const data = (await response.json()) as Verse;
      setVerse(data);
    } catch (err) {
      console.error("Erro:", err);
      setError(t("landing:verseMoment.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Buscar versículo do dia ao montar
  useEffect(() => {
    fetchDailyVerse();
  }, [fetchDailyVerse]);

  if (error) {
    return (
      <VerseContainer>
        <VerseLabel>{t("landing:verseMoment.label")}</VerseLabel>
        <VerseText style={{ fontSize: "14px" }}>{error}</VerseText>
      </VerseContainer>
    );
  }

  if (loading || !verse) {
    return (
      <VerseContainer>
        <VerseLabel>{t("landing:verseMoment.label")}</VerseLabel>
        <VerseText>{t("common:loading")}</VerseText>
      </VerseContainer>
    );
  }

  return (
    <VerseContainer>
      <VerseLabel>{t("landing:verseMoment.label")}</VerseLabel>
      <VerseWrapper>
        <VerseText>"{verse.text}"</VerseText>
        <VerseCitation>— {verse.reference}</VerseCitation>
      </VerseWrapper>
    </VerseContainer>
  );
};

export default VerseMoment;
