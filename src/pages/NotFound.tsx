import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
 
const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
 
  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);

    // Safety net: if an invite code is present (in search or hash), redirect to the signup page
    let code: string | null = null;

    // From standard query string
    const searchParams = new URLSearchParams(location.search);
    code = searchParams.get("invite");

    // Fallback: check hash-based links like #/signup?invite=CODE
    if (!code && typeof window !== "undefined") {
      const hash = window.location.hash || "";
      const hashQuery = hash.includes("?") ? hash.split("?")[1] : "";
      if (hashQuery) {
        const hashParams = new URLSearchParams(hashQuery);
        code = hashParams.get("invite");
      }
    }

    if (code) {
      navigate(`/signup?invite=${code}`, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);
 
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-gray-600">Oops! Page not found</p>
        <Link to="/auth" className="text-blue-500 underline hover:text-blue-700">
          Return to Home
        </Link>
      </div>
    </div>
  );
};
 
export default NotFound;
