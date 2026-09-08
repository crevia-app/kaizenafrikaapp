import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  fallback?: string;
  className?: string;
  label?: string;
}

export function BackButton({ fallback = "/kaizen-link", className = "", label = "Back" }: BackButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    // React Router v6 stores the history index in window.history.state.
    // idx > 0 means there is at least one entry to go back to within the SPA.
    const idx = (window.history.state as any)?.idx ?? 0;
    if (idx > 0) {
      navigate(-1);
    } else {
      navigate(fallback, { replace: true });
    }
  };

  return (
    <button
      onClick={handleBack}
      className={`inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-150 group ${className}`}
    >
      <ArrowLeft className="w-4 h-4 transition-transform duration-150 group-hover:-translate-x-0.5" />
    </button>
  );
}
