import React from "react";
import { BrowserRouter } from "react-router-dom";
import styled from "styled-components";
import Routes from "./routes";
import "./i18n";

function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes />
      </AppShell>
    </BrowserRouter>
  );
}

const AppShell = styled.div`
  min-height: 100vh;
`;

export default App;
