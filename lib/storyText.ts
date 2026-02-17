export function splitTitleAndBody(raw: string) {
  const text = (raw ?? "").replace(/\r\n/g, "\n").trim();
  const [firstLine, ...rest] = text.split("\n");

  const title =
    (firstLine ?? "")
      .trim()
      .replace(/^#+\s*/, "")
      .slice(0, 140) || "Masal";

  const storyText = rest
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { title, storyText };
}
