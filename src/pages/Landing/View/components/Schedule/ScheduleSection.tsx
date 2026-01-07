import React from "react";
import { useTranslation } from "react-i18next";
import warningIcon from "../../../../../assets/warning.png";
import scheduleIcon from "../../../../../assets/schedule.png";
import bedIcon from "../../../../../assets/bed.png";
import walkingIcon from "../../../../../assets/walking.png";
import infoIcon from "../../../../../assets/info.png";
import {
  BlockSubtitle,
  BlockTitle,
  Container,
  NoteContent,
  NoteIcon,
  ScheduleBlock,
  ScheduleCard,
  ScheduleList,
  ScheduleNote,
  ScheduleSectionWrapper,
  ScheduleTitle,
  TitleIcon,
} from "./ScheduleSection.styles";

const ScheduleSection: React.FC = () => {
  const { t } = useTranslation();
  const confessionItems = t("schedule.confession.items", { returnObjects: true }) as string[];
  const sleepItems = t("schedule.sleep.items", { returnObjects: true }) as string[];
  const walkItems = t("schedule.walk.items", { returnObjects: true }) as string[];

  return (
    <ScheduleSectionWrapper id="schedule">
      <Container>
        <ScheduleCard>
          <ScheduleTitle>{t("schedule.title")}</ScheduleTitle>
          <ScheduleNote>
            <NoteContent>
              <NoteIcon src={warningIcon} alt={t("schedule.title") as string} />
              <span>{t("schedule.note")}</span>
            </NoteContent>
          </ScheduleNote>

          <ScheduleBlock>
            <BlockTitle>
              <TitleIcon src={scheduleIcon} alt={t("schedule.confession.title") as string} />
              <span>{t("schedule.confession.title")}</span>
            </BlockTitle>
            <ScheduleList>
              {confessionItems.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ScheduleList>
          </ScheduleBlock>

          <ScheduleBlock>
            <BlockSubtitle>
              <TitleIcon src={bedIcon} alt={t("schedule.sleep.title") as string} />
              <span>{t("schedule.sleep.title")}</span>
            </BlockSubtitle>
            <ScheduleList>
              {sleepItems.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ScheduleList>
          </ScheduleBlock>

          <ScheduleBlock>
            <BlockSubtitle>
              <TitleIcon src={walkingIcon} alt={t("schedule.walk.title") as string} />
              <span>{t("schedule.walk.title")}</span>
            </BlockSubtitle>
            <ScheduleList>
              {walkItems.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ScheduleList>
          </ScheduleBlock>

          <ScheduleBlock>
            <BlockSubtitle>
              <TitleIcon src={infoIcon} alt={t("schedule.distance.title") as string} />
              <span>{t("schedule.distance.title")}</span>
            </BlockSubtitle>
            <p>{t("schedule.distance.description")}</p>
          </ScheduleBlock>
        </ScheduleCard>
      </Container>
    </ScheduleSectionWrapper>
  );
};

export default ScheduleSection;
