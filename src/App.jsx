import React from 'react'; // useState is no longer needed
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx'; // Added .jsx
import Overview from './pages/Overview.jsx'; // Added .jsx
import DataConversion from './pages/DataConversion.jsx'; // Added .jsx
import OnTheFly from './pages/OnTheFly.jsx'; // Added .jsx
import GeoTiffDisplay from './pages/GeoTiffDisplay.jsx'; // Added .jsx
import './App.css';

function App() {

  return (
    <Router>
      <div className="min-h-screen bg-gray-950">
        {/* Navbar no longer needs activeTab or setActiveTab props */}
        <Navbar />
        <main className="w-full">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/data-conversion" element={<DataConversion />} />
            <Route path="/on-the-fly" element={<OnTheFly />} />
            <Route path="/geotiff-display" element={<GeoTiffDisplay />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;