
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import 'react-toastify/dist/ReactToastify.css';
  
  createRoot(document.getElementById("root")!).render(<App />);
  