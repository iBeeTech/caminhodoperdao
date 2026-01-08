import React from "react";
import { BrowserRouter } from "react-router-dom";
import styled from "styled-components";
import Routes from "./routes";
import "./i18n";
import SkipLink from "./components/a11y/SkipLink";
import AutoAnalyticsListener from "./components/analytics/AutoAnalyticsListener";

function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <SkipLink />
        <AutoAnalyticsListener />
        <Routes />
      </AppShell>
    </BrowserRouter>
  );
}

const AppShell = styled.div`
  min-height: 100vh;
`;

export default App;
