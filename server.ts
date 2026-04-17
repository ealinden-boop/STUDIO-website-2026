import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  app.use("/selected-works", express.static(path.join(process.cwd(), "home page images", "selected works folder")));

  // API route to list selected works with metadata from RTF
  app.get("/api/selected-works", (req, res) => {
    const worksDir = path.join(process.cwd(), "home page images", "selected works folder");
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
          
          // Robust RTF stripping
          let stripped = rtfContent;
          
          // 1. Remove metadata groups (font tables, color tables, etc.)
          let prev;
          do {
            prev = stripped;
            stripped = stripped.replace(/\{(\\\*|\\fonttbl|\\colortbl|\\stylesheet|\\info|\\expandedcolortbl|\\header|\\footer)[^{}]*\}/g, "");
          } while (stripped !== prev);
          
          // 2. Replace RTF line breaks with a temporary placeholder
          stripped = stripped.replace(/\\par(?![a-z0-9])|\\line(?![a-z0-9])|\\page(?![a-z0-9])|\\\n|\\\r/gi, "__RTF_BR__");
          
          // 3. Convert RTF formatting to HTML tags
          // Italics: \i or \i1 to start, \i0 to end
          stripped = stripped.replace(/\\i[1 ]|\\i(?![a-z0-9])/gi, "<em>");
          stripped = stripped.replace(/\\i0 ?/gi, "</em>");
          // Bold: \b or \b1 to start, \b0 to end
          stripped = stripped.replace(/\\b[1 ]|\\b(?![a-z0-9])/gi, "<strong>");
          stripped = stripped.replace(/\\b0 ?/gi, "</strong>");
          
          // 4. Remove all literal newlines (RTF ignores these)
          stripped = stripped.replace(/[\r\n]/g, "");
          
          // 5. Remove all other control words
          stripped = stripped.replace(/\\[a-z0-9*-]+ ?/gi, "");
          
          // 6. Handle hex characters like \'a0 (non-breaking space)
          stripped = stripped.replace(/\\'[0-9a-f]{2}/gi, (match) => {
            const hex = match.substring(2);
            if (hex === "a0") return " ";
            return String.fromCharCode(parseInt(hex, 16));
          });
          
          // 7. Remove remaining braces and backslashes
          stripped = stripped.replace(/\{|\}|\\/g, "");
          
          // 8. Replace placeholder with actual newlines and clean up
          const textWithBreaks = stripped
            .split("__RTF_BR__")
            .map(line => line.trim())
            .filter(line => line.length > 0);

          if (textWithBreaks.length > 0) {
            const firstLine = textWithBreaks[0];
            const parts = firstLine.split(",");
            title = parts[0].trim();
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
