import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ExternalHyperlink,
  NumberFormat,
  ILevelsOptions,
  LevelFormat,
} from "docx";
import { saveAs } from "file-saver";

interface TextStyle {
  bold?: boolean;
  italics?: boolean;
  underline?: { type: "single" };
  strike?: boolean;
  color?: string;
  size?: number;
}

interface ParsedRun {
  text: string;
  style: TextStyle;
  href?: string;
}

function parseInlineNodes(node: ChildNode, inherited: TextStyle = {}): ParsedRun[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || "";
    if (!text) return [];
    return [{ text, style: { ...inherited } }];
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const style = { ...inherited };

  if (tag === "strong" || tag === "b") style.bold = true;
  if (tag === "em" || tag === "i") style.italics = true;
  if (tag === "u") style.underline = { type: "single" };
  if (tag === "s" || tag === "del" || tag === "strike") style.strike = true;
  if (tag === "code") {
    style.color = "C7254E";
  }

  let href: string | undefined;
  if (tag === "a") {
    href = el.getAttribute("href") || undefined;
    style.color = "0563C1";
    style.underline = { type: "single" };
  }

  const runs: ParsedRun[] = [];
  el.childNodes.forEach((child) => {
    const childRuns = parseInlineNodes(child, style);
    if (href) {
      childRuns.forEach((r) => (r.href = href));
    }
    runs.push(...childRuns);
  });

  // For <br>, add a line break
  if (tag === "br") {
    runs.push({ text: "\n", style: {} });
  }

  return runs;
}

function runsToDocxChildren(runs: ParsedRun[], defaultSize = 24): (TextRun | ExternalHyperlink)[] {
  const children: (TextRun | ExternalHyperlink)[] = [];

  for (const run of runs) {
    const props: any = {
      text: run.text,
      size: run.style.size || defaultSize,
      bold: run.style.bold,
      italics: run.style.italics,
      underline: run.style.underline,
      strike: run.style.strike,
      color: run.style.color,
    };

    if (run.href) {
      children.push(
        new ExternalHyperlink({
          link: run.href,
          children: [new TextRun({ ...props, style: undefined })],
        })
      );
    } else {
      children.push(new TextRun(props));
    }
  }

  return children;
}

function parseBlockElements(container: HTMLElement): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  const processNode = (node: ChildNode) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || "").trim();
      if (text) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text, size: 24 })],
            spacing: { after: 120 },
          })
        );
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    // Headings
    if (/^h[1-6]$/.test(tag)) {
      const level = parseInt(tag[1]);
      const headingMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
        4: HeadingLevel.HEADING_4,
        5: HeadingLevel.HEADING_5,
        6: HeadingLevel.HEADING_6,
      };
      const sizes: Record<number, number> = { 1: 36, 2: 32, 3: 28, 4: 26, 5: 24, 6: 22 };
      const runs = parseInlineNodes(el, { bold: true, size: sizes[level] });
      paragraphs.push(
        new Paragraph({
          heading: headingMap[level],
          children: runsToDocxChildren(runs, sizes[level]),
          spacing: { before: 240, after: 120 },
        })
      );
      return;
    }

    // Paragraphs
    if (tag === "p") {
      const runs = parseInlineNodes(el);
      if (runs.length === 0 || runs.every((r) => !r.text.trim())) {
        paragraphs.push(new Paragraph({ spacing: { after: 80 } }));
      } else {
        paragraphs.push(
          new Paragraph({
            children: runsToDocxChildren(runs),
            spacing: { after: 120 },
          })
        );
      }
      return;
    }

    // Lists
    if (tag === "ul" || tag === "ol") {
      const isOrdered = tag === "ol";
      el.querySelectorAll(":scope > li").forEach((li, idx) => {
        const runs = parseInlineNodes(li as HTMLElement);
        const bullet = isOrdered ? `${idx + 1}. ` : "•  ";
        const allRuns: ParsedRun[] = [{ text: bullet, style: { bold: false } }, ...runs];
        paragraphs.push(
          new Paragraph({
            children: runsToDocxChildren(allRuns),
            spacing: { after: 60 },
            indent: { left: 720 },
          })
        );
      });
      return;
    }

    // Blockquote
    if (tag === "blockquote") {
      const runs = parseInlineNodes(el, { italics: true, color: "555555" });
      paragraphs.push(
        new Paragraph({
          children: runsToDocxChildren(runs),
          spacing: { after: 120 },
          indent: { left: 720 },
          border: {
            left: { style: "single" as any, size: 6, color: "CCCCCC", space: 10 },
          },
        })
      );
      return;
    }

    // Horizontal rule
    if (tag === "hr") {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: "─".repeat(60), color: "CCCCCC", size: 16 })],
          spacing: { before: 200, after: 200 },
        })
      );
      return;
    }

    // Pre/code blocks
    if (tag === "pre") {
      const codeText = el.textContent || "";
      codeText.split("\n").forEach((line) => {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: line || " ", font: "Courier New", size: 20, color: "333333" })],
            spacing: { after: 0 },
            shading: { fill: "F5F5F5" },
          })
        );
      });
      paragraphs.push(new Paragraph({ spacing: { after: 120 } }));
      return;
    }

    // Divs and other containers — recurse into children
    if (tag === "div" || tag === "span" || tag === "section" || tag === "article") {
      el.childNodes.forEach(processNode);
      return;
    }

    // Table — render as simple text rows
    if (tag === "table") {
      el.querySelectorAll("tr").forEach((tr) => {
        const cells: string[] = [];
        tr.querySelectorAll("th, td").forEach((cell) => {
          cells.push((cell.textContent || "").trim());
        });
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: cells.join("  |  "), size: 22 })],
            spacing: { after: 60 },
          })
        );
      });
      paragraphs.push(new Paragraph({ spacing: { after: 120 } }));
      return;
    }

    // Fallback: treat as inline
    const runs = parseInlineNodes(el);
    if (runs.length > 0 && runs.some((r) => r.text.trim())) {
      paragraphs.push(
        new Paragraph({
          children: runsToDocxChildren(runs),
          spacing: { after: 120 },
        })
      );
    }
  };

  container.childNodes.forEach(processNode);
  return paragraphs;
}

export function htmlToDocxParagraphs(html: string): Paragraph[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return parseBlockElements(doc.body);
}

export async function downloadLessonAsDocx(
  title: string,
  content: string | null,
  videoUrl: string | null,
  courseName: string,
  sectionName: string
): Promise<void> {
  const headerParagraphs: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 36, color: "1F2937" })],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Course: `, italics: true, size: 20, color: "666666" }),
        new TextRun({ text: courseName, italics: true, size: 20, color: "444444", bold: true }),
        new TextRun({ text: `  |  Section: `, italics: true, size: 20, color: "666666" }),
        new TextRun({ text: sectionName, italics: true, size: 20, color: "444444", bold: true }),
      ],
      spacing: { after: 200 },
    }),
  ];

  if (videoUrl) {
    headerParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Video: ", bold: true, size: 20, color: "333333" }),
          new ExternalHyperlink({
            link: videoUrl,
            children: [new TextRun({ text: videoUrl, size: 20, color: "0563C1", underline: { type: "single" } })],
          }),
        ],
        spacing: { after: 100 },
      })
    );
  }

  // Separator
  headerParagraphs.push(
    new Paragraph({
      children: [new TextRun({ text: "─".repeat(60), color: "DDDDDD", size: 16 })],
      spacing: { before: 100, after: 200 },
    })
  );

  const contentParagraphs = content ? htmlToDocxParagraphs(content) : [
    new Paragraph({ children: [new TextRun({ text: "No content available.", italics: true, color: "999999", size: 24 })] }),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [...headerParagraphs, ...contentParagraphs],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_")}.docx`);
}
