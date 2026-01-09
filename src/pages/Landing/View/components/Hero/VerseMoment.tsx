import React, { useState, useEffect } from "react";
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
  const [verse, setVerse] = useState<Verse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar versículo do dia ao montar
  useEffect(() => {
    fetchDailyVerse();
  }, []);

  const fetchDailyVerse = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/verse/random");
      
      if (!response.ok) {
        throw new Error("Erro ao buscar versículo");
      }

      const data = await response.json() as Verse;
      setVerse(data);
    } catch (err) {
      console.error("Erro:", err);
      setError("Não foi possível carregar o versículo");
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <VerseContainer>
        <VerseLabel>Este versículo da Bíblia foi escolhido exclusivamente para você:</VerseLabel>
        <VerseText style={{ fontSize: "14px" }}>{error}</VerseText>
      </VerseContainer>
    );
  }

  if (loading || !verse) {
    return (
      <VerseContainer>
        <VerseLabel>Este versículo da Bíblia foi escolhido exclusivamente para você:</VerseLabel>
        <VerseText>Carregando...</VerseText>
      </VerseContainer>
    );
  }

  return (
    <VerseContainer>
      <VerseLabel>Este versículo da Bíblia foi escolhido exclusivamente para você:</VerseLabel>
      <VerseWrapper>
        <VerseText>"{verse.text}"</VerseText>
        <VerseCitation>— {verse.reference}</VerseCitation>
      </VerseWrapper>
    </VerseContainer>
  );
};

export default VerseMoment;
