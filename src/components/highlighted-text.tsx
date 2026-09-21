const highlightClass =
  "font-semibold text-orange-700 dark:text-orange-300/90";

export function HighlightedText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <span key={index} className={highlightClass}>
              {part.slice(2, -2)}
            </span>
          );
        }
        return part;
      })}
    </>
  );
}
