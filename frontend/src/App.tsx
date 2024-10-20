import "./App.css";
import { CodingPage } from "./components/CodingPage";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Landing } from "./components/Landing";

function App() {
  return (
    <div className="min-h-screen">
      <BrowserRouter>
        <Routes>
          <Route path="/coding" element={<CodingPage />} />
          <Route path="/" element={<Landing />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
