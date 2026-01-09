import styled from "styled-components";

export const VerseContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0;
  margin-bottom: 0px;
  background: transparent;
  border: none;
  border-radius: 0;
  max-width: 100%;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
  grid-column: 1 / -1;

  @media (max-width: 768px) {
    padding: 0;
    margin-bottom: 0px;
  }
`;

export const VerseLabel = styled.p`
  font-size: 14px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  margin: 0;
  letter-spacing: 0.3px;

  @media (max-width: 768px) {
    font-size: 12px;
  }
`;

export const VerseWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
`;

export const VerseText = styled.p`
  font-size: 19px;
  font-weight: 500;
  color: #ffffff;
  text-align: center;
  line-height: 1.5;
  margin: 0;
  font-style: italic;

  @media (max-width: 768px) {
    font-size: 16px;
  }
`;

export const VerseCitation = styled.p`
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  margin: 0;
  letter-spacing: 0.3px;

  @media (max-width: 768px) {
    font-size: 13px;
  }
`;
