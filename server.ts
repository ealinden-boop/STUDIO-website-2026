import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const convertRTFToHTML = (rtfContent: string) => {
  let text = rtfContent;

  // 1. Remove metadata groups (font table, color table, etc.)
  let prev;
  do {
    prev = text;
    text = text.replace(/\{(\\\*|\\fonttbl|\\colortbl|\\stylesheet|\\info|\\expandedcolortbl|\\header|\\footer)[^{}]*\}/g, "");
  } while (text !== prev);

  // 2. Handle escaped newlines (backslashes at end of line) BEFORE stripping physical newlines
  text = text.replace(/\\\r?\n/g, "__RTF_BR__");
  // 3. Normalize all physical whitespace to spaces (RTF standard)
  text = text.replace(/[\r\n\t]+/g, " ");

  // 4. Handle Unicode escapes: \uN? (consume the fallback char ?)
  text = text.replace(/\\u(-?\d+)\??/g, (match, n) => {
    return String.fromCharCode(parseInt(n, 10));
  });

  // 5. Handle Hex escapes (Windows-1252)
  const cp1252: { [key: number]: string } = {
    133: "...", 145: "'", 146: "'", 147: '"', 148: '"', 149: "•", 150: "-", 151: "-", 160: " ", 174: "(R)", 169: "(C)"
  };
  text = text.replace(/\\'([0-9a-f]{2})/gi, (match, hex) => {
    const code = parseInt(hex, 16);
    return cp1252[code] || String.fromCharCode(code);
  });

  // 6. Handle control symbols
  text = text.replace(/\\~/g, " "); // Non-breaking space
  text = text.replace(/\\_/g, "-"); // Non-breaking hyphen
  text = text.replace(/\\-/g, "");  // Optional hyphen
  text = text.replace(/\\par(?![a-z0-9])|\\line(?![a-z0-9])|\\page(?![a-z0-9])/gi, "__RTF_BR__");

  // 7. Convert Formatting TO PROTECTED PLACEHOLDERS
  // Capture \i, \i1 as start, \i0 as end. Robust against touching other tags.
  text = text.replace(/\\i(?!0)[01]? ?/gi, "__EM_START__");
  text = text.replace(/\\i0 ?/gi, "__EM_END__");
  text = text.replace(/\\b(?!0)[01]? ?/gi, "__STRONG_START__");
  text = text.replace(/\\b0 ?/gi, "__STRONG_END__");

  // 8. Handle hyperlinks
  text = text.replace(/\{\\field\{\\\*\\fldinst\{HYPERLINK "(.*?)"\}\}\{\\fldrslt ([\s\S]*?)\}\}/gi, (match, url, label) => {
    let cleanLabel = label
      .replace(/\\[a-z]+(-?\d+)? ?/gi, "")
      .replace(/\{|\}/g, "")
      .trim();
    
    if (cleanLabel.includes("__EM_START__") && !cleanLabel.includes("__EM_END__")) cleanLabel += "__EM_END__";
    if (cleanLabel.includes("__STRONG_START__") && !cleanLabel.includes("__STRONG_END__")) cleanLabel += "__STRONG_END__";
    
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="cv-link hover:text-fluorescent-red transition-colors">${cleanLabel}</a>`;
  });
  
  // 9. Strip ALL remaining RTF tags rigorously
  // This version handles tags with numeric params (\f0), or no params (\i).
  text = text.replace(/\\[a-z][a-z0-9*-]* ?/gi, "");
  // Only strip backslashes that were escaping literal braces or other control chars
  text = text.replace(/\\([\\{}])/g, "$1");
  // Final cleanup of any orphaned backslashes or braces
  text = text.replace(/[\\{}]/g, "");
  
  // 10. Restore formatting and collapse whitespace
  text = text.replace(/__EM_START__/g, "<em>")
             .replace(/__EM_END__/g, "</em>")
             .replace(/__STRONG_START__/g, "<strong>")
             .replace(/__STRONG_END__/g, "</strong>");

  // Ensure standard digits (just in case of weird unicode digit variants)
  text = text.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));

  // Collapse multiple spaces to single space, except around our custom line breaks
  text = text.replace(/ +/g, " ");
  
  // 11. Final Character Normalization
  text = text.replace(/[\u2010-\u2015]/g, "-")
             .replace(/[\u2018-\u201B]/g, "'")
             .replace(/[\u201C-\u201F]/g, '"')
             .replace(/\u00A0/g, " ")
             .replace(/\u2026/g, "...");
  
  // 12. Custom navigation link
  text = text.replace(/\bCV\b/g, '<a href="#" onclick="window.navigateToView(\'cv\'); return false;" class="cv-link">CV</a>');
  
  return text.trim();
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API route to list home images
  app.get("/api/home-images", (req, res) => {
    const imagesDir = path.join(process.cwd(), "home page images");
    try {
      if (!fs.existsSync(imagesDir)) {
        return res.json([]);
      }
      const files = fs.readdirSync(imagesDir)
        .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
      
      const images = files.map((file, index) => ({
        id: index + 1,
        image: `/home-page-images/${file}`
      }));
      res.json(images);
    } catch (error) {
      console.error("Error reading images directory:", error);
      res.status(500).json({ error: "Failed to list images" });
    }
  });

  // Serve home page images from root directory
  app.use("/home-page-images", express.static(path.join(process.cwd(), "home page images")));
  
  // Serve selected works images from root directory
  app.use("/selected-works", express.static(path.join(process.cwd(), "selected works folder")));

  // API route to get CV content
  app.get("/api/cv", (req, res) => {
    const cvPath = path.join(process.cwd(), "CV.rtf");
    try {
      if (!fs.existsSync(cvPath)) {
        return res.json({ content: "" });
      }
      const rtfContent = fs.readFileSync(cvPath, "utf8");
      const htmlContent = convertRTFToHTML(rtfContent)
        .split("__RTF_BR__")
        .map(line => line.trim())
        .join("<br />");
      res.json({ content: htmlContent });
    } catch (error) {
      console.error("Error reading CV:", error);
      res.status(500).json({ error: "Failed to read CV" });
    }
  });

  // API route to get Writing content
  app.get("/api/writing", (req, res) => {
    const writingPath = path.join(process.cwd(), "writing.rtf");
    try {
      if (!fs.existsSync(writingPath)) {
        return res.json({ content: "" });
      }
      const rtfContent = fs.readFileSync(writingPath, "utf8");
      const htmlContent = convertRTFToHTML(rtfContent)
        .split("__RTF_BR__")
        .map(line => line.trim())
        .join("<br />");
      res.json({ content: htmlContent });
    } catch (error) {
      console.error("Error reading Writing page:", error);
      res.status(500).json({ error: "Failed to read Writing page" });
    }
  });

  // API route to list selected works with metadata from RTF
  app.get("/api/selected-works", (req, res) => {
    const worksDir = path.join(process.cwd(), "selected works folder");
    try {
      if (!fs.existsSync(worksDir)) return res.json([]);
      const files = fs.readdirSync(worksDir);
      const imageFiles = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
      // Sort files descending so newest years come first
      imageFiles.sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }));
      
      const projects = imageFiles.map((img, index) => {
        const baseName = path.parse(img).name;
        // Exact match for RTF file to avoid prefix collisions
        const rtfFile = files.find(f => f === `${baseName}.rtf`);
        let title = baseName.replace(/^\d{4}_/, "").replace(/_/g, " ");
        let year = baseName.match(/^\d{4}/)?.[0] || "";
        let medium = "";
        let description = "";

        if (rtfFile) {
          const rtfContent = fs.readFileSync(path.join(worksDir, rtfFile), "utf8");
          const stripped = convertRTFToHTML(rtfContent);
          
          // Split by our placeholder and clean up
          const lines = stripped
            .split("__RTF_BR__")
            .map(line => line.trim())
            .filter(line => line.length > 0);

          if (lines.length > 0) {
            // The first line often contains "Title, Year" or just "Title"
            // We use the whole first line as the title area, but we'll try to extract the year if it ends in , 20XX
            const firstLine = lines[0].replace(/<[^>]*>/g, ""); // STRIP HTML from Title line
            const yearMatch = firstLine.match(/,\s*(\d{4}(-\d{4}|-present)?)$/);
            
            if (yearMatch) {
              title = firstLine.substring(0, yearMatch.index).trim();
              year = yearMatch[1];
            } else {
              title = firstLine;
            }

            if (lines.length > 1) {
              medium = lines[1].replace(/<[^>]*>/g, ""); // STRIP HTML from Medium
            }
            if (lines.length > 2) {
              // Join description lines. We strip internal physical breaks in step 1.5,
              // so lines here are genuine RTF paragraphs (\par).
              description = lines.slice(2).join("\n"); 
            }
          }
        }

        // Final sanitize for Title to ensure ASCII-only symbols for the high-impact font
        const safeTitle = title
          .replace(/[\u2010-\u2015\u2043\u2212\u2013\u2014]/g, "-") // All dashes to hyphen
          .replace(/[\u2044\u2215\u2041]/g, "/") // Fraction/Division slashes to standard slash
          .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
          .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
          .replace(/\u00A0/g, " ")
          .replace(/\u2026/g, "...");

        return {
          id: index + 1,
          title: safeTitle,
          year,
          medium,
          description,
          image: `/selected-works/${img}`,
          // Special case for long horizontal images that need custom tile cropping
          objectPosition: img.includes("non_sequitur") ? "right" : "center"
        };
      });
      res.json(projects);
    } catch (error) {
      console.error("Error reading selected works:", error);
      res.status(500).json({ error: "Failed to list selected works" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
