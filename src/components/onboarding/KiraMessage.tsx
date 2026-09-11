import { motion } from "framer-motion";

interface KiraMessageProps {
  content: string;
}

const KiraMessage = ({ content }: KiraMessageProps) => {
  const lines = content.split("\n");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/50 max-w-[85%]">
        {lines.map((line, index) => (
          <p key={index} className={`text-foreground leading-relaxed ${index > 0 ? "mt-2" : ""}`}>
            {line}
          </p>
        ))}
      </div>
    </motion.div>
  );
};

export default KiraMessage;
