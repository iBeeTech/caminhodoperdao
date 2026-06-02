import styled from "styled-components";

export const BlockingCalloutWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 40px 20px;
`;

export const CalloutContent = styled.div`
  text-align: center;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.6;
  color: #7f1d1d;
  background: #fff5f5;
  border: 2px solid #fca5a5;
  border-radius: 12px;
  padding: 60px 40px;
  max-width: 600px;
`;

export const CountdownWrapper = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 16px;
  margin-top: 32px;

  @media (max-width: 480px) {
    gap: 10px;
  }
`;

export const CountdownUnit = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 72px;

  @media (max-width: 480px) {
    min-width: 56px;
  }
`;

export const CountdownValue = styled.span`
  display: block;
  font-size: 40px;
  font-weight: 800;
  line-height: 1.1;
  color: #7f1d1d;
  background: #fff;
  border: 2px solid #fca5a5;
  border-radius: 10px;
  padding: 12px 8px;
  width: 100%;
  font-variant-numeric: tabular-nums;

  @media (max-width: 480px) {
    font-size: 28px;
    padding: 10px 6px;
  }
`;

export const CountdownLabel = styled.span`
  margin-top: 8px;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #b91c1c;

  @media (max-width: 480px) {
    font-size: 11px;
  }
`;
