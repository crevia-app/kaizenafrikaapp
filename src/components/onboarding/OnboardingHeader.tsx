import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface OnboardingHeaderProps {
  progress: number;
}

const OnboardingHeader = ({ progress }: OnboardingHeaderProps) => {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50 px-4 py-3">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-bronze rounded-lg" />
            <span className="font-vollkorn text-xl font-bold">Kaizen Afrika</span>
          </Link>
          
          <span className="text-sm text-muted-foreground">
            {Math.round(progress)}% complete
          </span>
        </div>
        
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-bronze to-bronze-light rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </header>
  );
};

export default OnboardingHeader;
