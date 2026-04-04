import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SubmissionPage from './components/SubmissionPage';
import OfficialDashboard from './pages/OfficialDashboard';
import TrackingPage from './components/TrackingPage';
import GrievanceTrackPage from './pages/GrievanceTrackPage';
import LeaderboardPage from './pages/LeaderboardPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"             element={<SubmissionPage />} />
        <Route path="/official"     element={<OfficialDashboard />} />
        <Route path="/track"        element={<TrackingPage />} />
        <Route path="/track/:id"    element={<GrievanceTrackPage />} />
        <Route path="/leaderboard"  element={<LeaderboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

