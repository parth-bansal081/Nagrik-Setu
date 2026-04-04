import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SubmissionPage from './components/SubmissionPage';
import OfficialDashboard from './pages/OfficialDashboard';
import TrackingPage from './components/TrackingPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SubmissionPage />} />
        <Route path="/official" element={<OfficialDashboard />} />
        <Route path="/track" element={<TrackingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
