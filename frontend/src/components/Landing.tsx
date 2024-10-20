import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import slugify from "slugify";

const INIT_SERVICE_URL = "http://localhost:3001";

/** Helper function */
function getRandomSlug() {
  const randomWord = `project-${Math.random().toString(36).substring(2, 10)}`;
  return slugify(randomWord, { lower: true, remove: /[*+~.()'"!:@]/g });
}

/** Component */
export const Landing = () => {
  const [language, setLanguage] = useState("nodejs");
  const [replId, setReplId] = useState(getRandomSlug());
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-white">
      <h1 className="text-4xl font-bold text-black mb-8">CodeRaft</h1>

      <input
        onChange={(e) => setReplId(e.target.value)}
        type="text"
        placeholder="Repl ID"
        value={replId}
        className="w-full max-w-xs p-3 mb-4 text-black rounded-lg border border-gray-600 bg-gray-100 focus:outline-none focus:ring focus:ring-gray-700"
      />

      <select
        name="language"
        id="language"
        onChange={(e) => setLanguage(e.target.value)}
        className="w-full max-w-xs p-3 mb-4 text-black rounded-lg border border-gray-600 bg-gray-100 focus:outline-none focus:ring focus:ring-gray-700"
      >
        <option value="nodejs">Node.js</option>
        <option value="python">Python</option>
      </select>

      <button
        disabled={loading}
        type="button"
        onClick={async () => {
          setLoading(true);
          await axios.post(`${INIT_SERVICE_URL}/project`, { replId, language });
          await axios.post("http://localhost:3003/container", { replId });
          setLoading(false);
          setTimeout(() => {
            navigate(`/coding?replId=${replId}`);
          }, 10000);
        }}
        className={`w-full max-w-xs p-3 rounded-lg ${
          loading ? "bg-gray-600" : "bg-gray-800 hover:bg-gray-700"
        } text-white font-semibold focus:outline-none focus:ring focus:ring-gray-700 transition-colors duration-300`}
      >
        {loading ? (
          <div className="animate-spin h-5 w-5 border-4 border-t-transparent border-white rounded-full"></div>
        ) : (
          "Start Coding"
        )}
      </button>
    </div>
  );
};
