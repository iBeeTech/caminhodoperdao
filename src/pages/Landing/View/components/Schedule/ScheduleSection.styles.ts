import styled from "styled-components";
import { SectionContainer } from "../shared";

export const ScheduleSectionWrapper = styled.section`
  background: #f8fafc;
  padding: 72px 0;
`;

export const Container = styled(SectionContainer)``;

export const ScheduleCard = styled.div`
  background: #fff;
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
  max-width: 900px;
  margin: 0 auto;
  display: grid;
  gap: 18px;
`;

export const ScheduleTitle = styled.h2`
  font-size: 2rem;
  margin: 0;
  color: #1f2937;
`;

export const ScheduleNote = styled.p`
  margin: 0;
  color: #b45309;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  padding: 12px 14px;
  border-radius: 12px;
  font-weight: 600;
  line-height: 1.5;
`;

export const NoteContent = styled.span`
  display: flex;
  align-items: flex-start;
  gap: 10px;
`;

export const NoteIcon = styled.img`
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  margin-top: 2px;
`;

export const ScheduleBlock = styled.div`
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-of-type {
    border-bottom: none;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.muted};
    line-height: 1.6;
  }
`;

export const BlockTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 8px 0;
  color: #1f2937;
  font-size: 1.1rem;
`;

export const BlockSubtitle = styled.h4`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 8px 0;
  color: #1f2937;
  font-size: 1rem;
`;

export const TitleIcon = styled.img`
  width: 22px;
  height: 22px;
  flex-shrink: 0;
`;

export const ScheduleList = styled.ul`
  list-style: none;
  margin: 0;
  padding-left: 0;
  display: grid;
  gap: 6px;
  color: ${({ theme }) => theme.colors.muted};
  line-height: 1.5;
`;
