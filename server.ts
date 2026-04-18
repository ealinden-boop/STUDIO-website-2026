import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const convertRTFToHTML = (rtfContent: string) => {
  let stripped = rtfContent;
  
  // 1. Handle hex characters early
  const hexMap: { [key: string]: string } = {
    "a0": " ", "91": "'", "92": "'", "93": '"', "94": '"',
    "95": "•", "96": "–", "97": "—", "85": "...", "e9": "é", "c9": "É", "e0": "à", "e8": "è", "f4": "ô",
  };
  stripped = stripped.replace(/\\'[0-9a-f]{2}/gi, (match) => {
    const hex = match.substring(2).toLowerCase();
    return hexMap[hex] || String.fromCharCode(parseInt(hex, 16));
  });

  // 2. Remove metadata groups
  let prev;
  do {
    prev = stripped;
    stripped = stripped.replace(/\{(\\\*|\\fonttbl|\\colortbl|\\stylesheet|\\info|\\expandedcolortbl|\\header|\\footer)[^{}]*\}/g, "");
  } while (stripped !== prev);

  // 3. Convert Formatting TO PROTECTED PLACEHOLDERS
  stripped = stripped.replace(/\\i[1 ]|\\i(?![a-z0-9])/gi, "__EM_START__");
  stripped = stripped.replace(/\\i0 ?/gi, "__EM_END__");
  stripped = stripped.replace(/\\b[1 ]|\\b(?![a-z0-9])/gi, "__STRONG_START__");
  stripped = stripped.replace(/\\b0 ?/gi, "__STRONG_END__");

  // 4. Handle hyperlinks - Improved to preserve placeholders and CLOSE TAGS
  stripped = stripped.replace(/\{\\field\{\\\*\\fldinst\{HYPERLINK "(.*?)"\}\}\{\\fldrslt ([\s\S]*?)\}\}/gi, (match, url, label) => {
    // Only strip pure RTF tags, keep placeholders
    let cleanLabel = label
      .replace(/\\[a-z0-9*-]+ ?/gi, "")
      .replace(/\{|\}/g, "")
      .trim();
    
    // Safety check: if an opener exists but no closer within the label, append a closer
    if (cleanLabel.includes("__EM_START__") && !cleanLabel.includes("__EM_END__")) {
      cleanLabel += "__EM_END__";
    }
    if (cleanLabel.includes("__STRONG_START__") && !cleanLabel.includes("__STRONG_END__")) {
      cleanLabel += "__STRONG_END__";
    }
    
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="cv-link hover:text-fluorescent-red transition-colors">${cleanLabel}</a>`;
  });
  
  // 5. Replace RTF line breaks
  stripped = stripped.replace(/\\par(?![a-z0-9])|\\line(?![a-z0-9])|\\page(?![a-z0-9])|\\\n|\\\r/gi, "__RTF_BR__");
  
  // 6. Cleanup remaining RTF artifacts
  stripped = stripped.replace(/\\[a-z0-9*-]+ ?/gi, "");
  stripped = stripped.replace(/\{|\}|\\/g, "");
  
  // 7. RESTORE Formatting
  stripped = stripped.replace(/__EM_START__/g, "<em>")
                     .replace(/__EM_END__/g, "</em>")
                     .replace(/__STRONG_START__/g, "<strong>")
                     .replace(/__STRONG_END__/g, "</strong>");

  // 8. Custom CV link detection
  stripped = stripped.replace(/\bCV\b/g, '<a href="#" onclick="window.navigateToView(\'cv\'); return false;" class="cv-link">CV</a>');
  
  return stripped;
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
      
      const projects = imageFiles.map((img, index) => {
        const baseName = path.parse(img).name;
        const rtfFile = files.find(f => f.startsWith(baseName) && f.endsWith(".rtf"));
        let title = baseName;
        let year = "";
        let medium = "";
        let description = "";

        if (rtfFile) {
          const rtfContent = fs.readFileSync(path.join(worksDir, rtfFile), "utf8");
          const stripped = convertRTFToHTML(rtfContent);
          
          // 8. Replace placeholder with actual newlines and clean up
          const textWithBreaks = stripped
            .split("__RTF_BR__")
            .map(line => line.trim())
            .filter(line => line.length > 0);

          if (textWithBreaks.length > 0) {
            const firstLine = textWithBreaks[0];
            const parts = firstLine.split(",");
            title = parts[0].trim().replace(/<\/?strong>|<\/?em>/gi, "");
            year = parts[1] ? parts[1].trim() : "";
            
            if (textWithBreaks.length > 1) {
              medium = textWithBreaks[1];
            }
            if (textWithBreaks.length > 2) {
              description = textWithBreaks.slice(2).join("\n");
            }
          }
        }

        return {
          id: index + 1,
          title,
          year,
          medium,
          description,
          image: `/selected-works/${img}`
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
