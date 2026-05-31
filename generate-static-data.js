import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const convertRTFToHTML = (rtfContent) => {
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
  const cp1252 = {
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
  text = text.replace(/\\[a-z][a-z0-9*-]* ?/gi, "");
  text = text.replace(/\\([\\{}])/g, "$1");
  text = text.replace(/[\\{}]/g, "");
  
  // 10. Restore formatting and collapse whitespace
  text = text.replace(/__EM_START__/g, "<em>")
             .replace(/__EM_END__/g, "</em>")
             .replace(/__STRONG_START__/g, "<strong>")
             .replace(/__STRONG_END__/g, "</strong>");

  text = text.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
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

const findMatchingRTF = (imageFile, rtfFiles) => {
  const baseImg = path.parse(imageFile).name.toLowerCase();
  
  let found = rtfFiles.find(rtf => path.parse(rtf).name.toLowerCase() === baseImg);
  if (found) return found;

  const cleanImg = baseImg.replace(/[^a-z0-9]/g, "");
  found = rtfFiles.find(rtf => {
    const cleanRtf = path.parse(rtf).name.toLowerCase().replace(/[^a-z0-9]/g, "");
    return cleanRtf === cleanImg;
  });
  if (found) return found;

  const imgPrefix = baseImg.split("_")[0];
  if (imgPrefix) {
    const matches = rtfFiles.filter(rtf => path.parse(rtf).name.toLowerCase().startsWith(imgPrefix));
    if (matches.length === 1) {
      return matches[0];
    } else if (matches.length > 1) {
      const wordsImg = baseImg.split(/[_\s-]/);
      let bestMatch = matches[0];
      let maxOverlap = -1;
      for (const m of matches) {
        const mBase = path.parse(m).name.toLowerCase();
        const wordsM = mBase.split(/[_\s-]/);
        const overlap = wordsImg.filter(w => wordsM.includes(w)).length;
        if (overlap > maxOverlap) {
          maxOverlap = overlap;
          bestMatch = m;
        }
      }
      return bestMatch;
    }
  }

  return undefined;
};

// Ensure directories exist
const publicDir = path.join(process.cwd(), "public");
const apiDir = path.join(publicDir, "api");
fs.mkdirSync(apiDir, { recursive: true });

function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach(element => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      if (element !== ".DS_Store") {
        fs.copyFileSync(fromPath, toPath);
      }
    }
  });
}

// 1. Copy public asset directories
console.log("Copying asset directories to public/...");
copyFolderSync(path.join(process.cwd(), "home page images"), path.join(publicDir, "home-page-images"));
copyFolderSync(path.join(process.cwd(), "selected works folder"), path.join(publicDir, "selected-works"));

// 2. Generate home images JSON
const imagesDir = path.join(process.cwd(), "home page images");
let homeImages = [];
if (fs.existsSync(imagesDir)) {
  const files = fs.readdirSync(imagesDir)
    .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
  homeImages = files.map((file, index) => ({
    id: index + 1,
    image: `/home-page-images/${file}`
  }));
}
fs.writeFileSync(path.join(apiDir, "home-images.json"), JSON.stringify(homeImages, null, 2));
console.log("Generated public/api/home-images.json");

// 3. Generate CV JSON
const cvPath = path.join(process.cwd(), "CV.rtf");
let cvContent = { content: "" };
if (fs.existsSync(cvPath)) {
  const rtfContent = fs.readFileSync(cvPath, "utf8");
  const htmlContent = convertRTFToHTML(rtfContent)
    .split("__RTF_BR__")
    .map(line => line.trim())
    .join("<br />");
  cvContent = { content: htmlContent };
}
fs.writeFileSync(path.join(apiDir, "cv.json"), JSON.stringify(cvContent, null, 2));
console.log("Generated public/api/cv.json");

// 4. Generate Writing JSON
const writingPath = path.join(process.cwd(), "writing.rtf");
let writingContent = { content: "" };
if (fs.existsSync(writingPath)) {
  const rtfContent = fs.readFileSync(writingPath, "utf8");
  const htmlContent = convertRTFToHTML(rtfContent)
    .split("__RTF_BR__")
    .map(line => line.trim())
    .join("<br />");
  writingContent = { content: htmlContent };
}
fs.writeFileSync(path.join(apiDir, "writing.json"), JSON.stringify(writingContent, null, 2));
console.log("Generated public/api/writing.json");

// 5. Generate Selected Works JSON
const worksDir = path.join(process.cwd(), "selected works folder");
let projects = [];
if (fs.existsSync(worksDir)) {
  const files = fs.readdirSync(worksDir);
  const dirs = files.filter(f => !f.startsWith(".") && fs.statSync(path.join(worksDir, f)).isDirectory());
  const imageFiles = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
  imageFiles.sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: "base" }));

  let nextId = 1;
  projects = imageFiles.map((img) => {
    const baseName = path.parse(img).name;
    const rtfFile = files.find(f => f === `${baseName}.rtf`);
    let title = baseName.replace(/^\d{4}_/, "").replace(/_/g, " ");
    let year = baseName.match(/^\d{4}/)?.[0] || "";
    let medium = "";
    let description = "";

    if (rtfFile) {
      const rtfContent = fs.readFileSync(path.join(worksDir, rtfFile), "utf8");
      const stripped = convertRTFToHTML(rtfContent);
      const lines = stripped
        .split("__RTF_BR__")
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (lines.length > 0) {
        const firstLine = lines[0].replace(/<[^>]*>/g, "");
        const yearMatch = firstLine.match(/,\s*(\d{4}(-\d{4}|-present)?)$/);
        if (yearMatch) {
          title = firstLine.substring(0, yearMatch.index).trim();
          year = yearMatch[1];
        } else {
          title = firstLine;
        }

        if (lines.length > 1) {
          medium = lines[1].replace(/<[^>]*>/g, "");
        }
        if (lines.length > 2) {
          description = lines.slice(2).join("\n");
        }
      }
    }

    const safeTitle = title
      .replace(/[\u2010-\u2015\u2043\u2212\u2013\u2014]/g, "-")
      .replace(/[\u2044\u2215\u2041]/g, "/")
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
      .replace(/\u00A0/g, " ")
      .replace(/\u2026/g, "...");

    const currentProjectId = nextId++;
    const matchingDir = dirs.find(d => {
      const dLower = d.toLowerCase();
      const baseNameLower = baseName.toLowerCase();
      return baseNameLower.startsWith(dLower) || 
             baseNameLower.includes(dLower.split("_")[1] || "___") ||
             dLower.startsWith(baseNameLower.split("_").slice(0, 2).join("_"));
    });

    let isSeries = false;
    let seriesFolder = "";
    let seriesTitle = "";
    let seriesWorks = [];

    if (matchingDir) {
      isSeries = true;
      seriesFolder = matchingDir;
      seriesTitle = matchingDir.replace(/^\d{4}_/, "").replace(/_/g, " ");

      const seriesPath = path.join(worksDir, matchingDir);
      const subFiles = fs.readdirSync(seriesPath);
      const subImages = subFiles.filter(f => 
        /\.(jpg|jpeg|png|webp)$/i.test(f) && 
        path.parse(f).name.toLowerCase() !== matchingDir.toLowerCase()
      );
      subImages.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
      const subRtfs = subFiles.filter(f => f.toLowerCase().endsWith(".rtf"));

      seriesWorks = subImages.map((subImg) => {
        const subBaseName = path.parse(subImg).name;
        const rtfMatch = findMatchingRTF(subImg, subRtfs);
        
        let subTitle = subBaseName.replace(/^\d+(_\d{4})?_/, "").replace(/_/g, " ");
        let subYear = subBaseName.match(/\d{4}/)?.[0] || year;
        let subMedium = "";
        let subDesc = "";

        if (rtfMatch) {
          const rtfContent = fs.readFileSync(path.join(seriesPath, rtfMatch), "utf8");
          const stripped = convertRTFToHTML(rtfContent);
          const lines = stripped
            .split("__RTF_BR__")
            .map(line => line.trim())
            .filter(line => line.length > 0);

          if (lines.length > 0) {
            const firstLine = lines[0].replace(/<[^>]*>/g, "");
            const yearMatch = firstLine.match(/,\s*(\d{4}(-\d{4}|-present)?)$/);
            if (yearMatch) {
              subTitle = firstLine.substring(0, yearMatch.index).trim();
              subYear = yearMatch[1];
            } else {
              subTitle = firstLine;
            }

            if (lines.length > 1) {
              subMedium = lines[1].replace(/<[^>]*>/g, "");
            }
            if (lines.length > 2) {
              subDesc = lines.slice(2).join("\n");
            }
          }
        }

        const safeSubTitle = subTitle
          .replace(/[\u2010-\u2015\u2043\u2212\u2013\u2014]/g, "-")
          .replace(/[\u2044\u2215\u2041]/g, "/")
          .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
          .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
          .replace(/\u00A0/g, " ")
          .replace(/\u2026/g, "...");

        return {
          id: nextId++,
          title: safeSubTitle,
          year: subYear,
          medium: subMedium,
          description: subDesc,
          image: `/selected-works/${matchingDir}/${subImg}`,
          isSubWork: true,
          parentSeriesId: currentProjectId
        };
      });
    }

    return {
      id: currentProjectId,
      title: safeTitle,
      year,
      medium,
      description,
      image: `/selected-works/${img}`,
      objectPosition: (img.includes("non_sequitur") || img.includes("the_truth_about")) ? "right" : "center",
      isSeries,
      seriesFolder,
      seriesTitle,
      seriesWorks
    };
  });
}
fs.writeFileSync(path.join(apiDir, "selected-works.json"), JSON.stringify(projects, null, 2));
console.log("Generated public/api/selected-works.json");
console.log("Static assets and data build completed successfully!");
