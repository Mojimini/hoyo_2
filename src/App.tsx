import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { CharactersPage } from "./pages/characters/CharactersPage";
import { CharacterDetailPage } from "./pages/character-detail/CharacterDetailPage";
import { PlannerPage } from "./pages/planner/PlannerPage";
import { TeamsPage } from "./pages/teams/TeamsPage";
import { AccountPage } from "./pages/account/AccountPage";
import { SettingsPage } from "./pages/settings/SettingsPage";

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="characters" element={<CharactersPage />} />
        <Route path="characters/:id" element={<CharacterDetailPage />} />
        <Route path="planner" element={<PlannerPage />} />
        <Route path="teams" element={<TeamsPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Route>
    </Routes>
  );
}
