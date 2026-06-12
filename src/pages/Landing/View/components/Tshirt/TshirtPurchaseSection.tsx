import React from "react";
import { useTranslation } from "react-i18next";
import { Callout } from "../../../../../components";
import { useSectionView } from "../../../../../hooks/useSectionView";
import { LANDING_SECTIONS } from "../../../../../utils/analytics/catalog/sections";
import { Container, Header, TshirtCard, TshirtSectionWrapper } from "./TshirtPurchaseSection.styles";

// As vendas de camisetas foram encerradas. A seção mantém o id/âncora e o
// rastreio de visualização, mas agora exibe apenas um aviso de encerramento.
const TshirtPurchaseSection: React.FC = () => {
  const { t } = useTranslation("landing");

  const sectionViewRef = useSectionView({
    pageName: "landing",
    sectionId: LANDING_SECTIONS.TSHIRT_PURCHASE.id,
    sectionName: LANDING_SECTIONS.TSHIRT_PURCHASE.name,
    position: LANDING_SECTIONS.TSHIRT_PURCHASE.position,
  });

  return (
    <TshirtSectionWrapper id="tshirt-purchase" ref={sectionViewRef}>
      <Container>
        <TshirtCard>
          <Header>
            <h2>{t("tshirt.closed.title")}</h2>
          </Header>
          <Callout variant="info">{t("tshirt.closed.message")}</Callout>
        </TshirtCard>
      </Container>
    </TshirtSectionWrapper>
  );
};

export default TshirtPurchaseSection;
