import { useState, useEffect } from "react";

interface Verse {
  text: string;
  reference: string;
}

export const useRandomVerse = () => {
  const [verse, setVerse] = useState<Verse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verses: Verse[] = [
      { text: "Bem-aventurados os que promovem a paz, pois serão chamados filhos de Deus.", reference: "Mateus 5:9" },
      { text: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.", reference: "João 3:16" },
      { text: "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.", reference: "Mateus 11:28" },
      { text: "Porque maior é o que está em vós do que aquele que está no mundo.", reference: "1 João 4:4" },
      { text: "Tudo posso naquele que me fortalece.", reference: "Filipenses 4:13" },
      { text: "O Senhor é o meu pastor, nada me faltará.", reference: "Salmos 23:1" },
      { text: "E conhecereis a verdade, e a verdade vos libertará.", reference: "João 8:32" },
      { text: "Porque Deus não nos deu espírito de covardia, mas de poder, de amor e de domínio próprio.", reference: "2 Timóteo 1:7" },
      { text: "Confiai no Senhor de todo o vosso coração, e não vos apoieis na vossa própria prudência.", reference: "Provérbios 3:5" },
      { text: "Lançai sobre ele toda a vossa ansiedade, porque ele tem cuidado de vós.", reference: "1 Pedro 5:7" },
      { text: "Se confessarmos os nossos pecados, ele é fiel e justo para nos perdoar e nos purificar de toda a injustiça.", reference: "1 João 1:9" },
      { text: "Aquele que em mim crê, ainda que esteja morto, viverá.", reference: "João 11:25" },
      { text: "Porque de Deus é o reino, o poder e a glória, para sempre.", reference: "Mateus 6:13" },
      { text: "A paz deixo com vós, a minha paz vos dou; não vo-la dou como o mundo a dá.", reference: "João 14:27" },
      { text: "Portanto, se alguém está em Cristo, é nova criatura; as coisas antigas já passaram; eis que se fizeram novas.", reference: "2 Coríntios 5:17" },
    ];

    const randomVerse = verses[Math.floor(Math.random() * verses.length)];
    setVerse(randomVerse);
    setLoading(false);
  }, []);

  return { verse, loading };
};
