import { Link, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import BoardEditor from "./pages/BoardEditor";

function App() {
  return (
    <div className="app-shell">
      <div className="app-shell__glow app-shell__glow--left" />
      <div className="app-shell__glow app-shell__glow--right" />
      <header className="app-header">
        <Link className="app-brand" to="/">
          <span className="app-brand__mark">Board Studio</span>
          <span className="app-brand__caption">Local-first creative boards</span>
        </Link>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/boards/:boardId" element={<BoardEditor />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
