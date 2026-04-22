/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

const MENU_LINKS = [
  { label: "SELECTED WORKS", id: "works" },
  { label: "WRITING", id: "writing" },
  { label: "CV", id: "cv" },
  { label: "CONTACT", id: "contact" },
];

const SafeText = ({ text, fontClass = "" }: { text: string; fontClass?: string }) => {
  if (!text) return null;
  // We split text to separate letters, numbers, and symbols.
  const parts = text.split(/([0-9/\-(),.<>?:;"'{}[\]!@#$%^&*+=|\\~`])/);
  
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        
        if (/[0-9]/.test(part)) {
          // If the char is '4' and we're using Integral CF, we use Archivo Black
          // because the '4' is missing/watermarked in the Integral CF demo font.
          if (part === "4" && (fontClass.includes("font-integral") || !fontClass)) {
            return (
              <span 
                key={i} 
                className="font-archivo tracking-tight opacity-100" 
                style={{ 
                  fontStyle: 'normal', 
                  fontWeight: 900,
                  WebkitTextStroke: '0.04em currentcolor' // Artificial thickening to match the extra-heavy Integral CF
                }}
              >
                {part}
              </span>
            );
          }
          // Other numbers stay in Integral CF but forced upright to prevent "fake italic" glitches
          return <span key={i} className={fontClass} style={{ fontStyle: 'normal' }}>{part}</span>;
        }

        if (/[/\-(),.<>?:;"'{}[\]!@#$%^&*+=|\\~`]/.test(part)) {
          // Problematic symbols always get a fallback to avoid "weird character" boxes
          return <span key={i} className="font-archivo font-bold tracking-normal opacity-95" style={{ fontStyle: 'inherit', fontWeight: 'inherit' }}>{part}</span>;
        }

        return <span key={i} className={fontClass}>{part}</span>;
      })}
    </>
  );
};

type View = "home" | "works" | "writing" | "cv" | "contact" | "project-detail" | "grouped-list";

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState<View>("home");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [homeImages, setHomeImages] = useState<{id: number, image: string}[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [cvContent, setCvContent] = useState<string>("");
  const [writingContent, setWritingContent] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch home images from API
  useEffect(() => {
    fetch("/api/home-images")
      .then(res => res.json())
      .then(data => setHomeImages(data))
      .catch(err => console.error("Failed to fetch home images:", err));
  }, []);

  // Fetch projects from API
  useEffect(() => {
    fetch("/api/selected-works")
      .then(res => res.json())
      .then(data => setProjects(data))
      .catch(err => console.error("Failed to fetch projects:", err));
  }, []);

  // Fetch CV from API
  useEffect(() => {
    fetch("/api/cv")
      .then(res => res.json())
      .then(data => {
        if (data.content) setCvContent(data.content);
      })
      .catch(err => console.error("Failed to fetch CV:", err));
  }, []);

  // Fetch Writing from API
  useEffect(() => {
    fetch("/api/writing")
      .then(res => res.json())
      .then(data => {
        if (data.content) setWritingContent(data.content);
      })
      .catch(err => console.error("Failed to fetch writing:", err));
  }, []);

  // Prevent scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isMenuOpen]);

  // Infinite scroll logic for home page
  useEffect(() => {
    if (currentView !== "home" || homeImages.length === 0) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const fullHeight = homeImages.length * windowHeight;

      // If scrolled past the middle set, jump back to start of middle set
      if (scrollY >= fullHeight * 2) {
        window.scrollTo(0, scrollY - fullHeight);
      } 
      // If scrolled before the middle set, jump to end of middle set
      else if (scrollY <= windowHeight * 0.5) {
        window.scrollTo(0, scrollY + fullHeight);
      }
    };

    // Initial scroll to middle set
    window.scrollTo(0, homeImages.length * window.innerHeight);

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [currentView, homeImages]);

  const handleLinkClick = (view: View, projectId?: number) => {
    setCurrentView(view);
    setIsMenuOpen(false);
    if (projectId) {
      setSelectedProjectId(projectId);
    }
    if (view !== "home") {
      window.scrollTo(0, 0);
    }
  };

  // Expose navigation to window for RTF links
  useEffect(() => {
    (window as any).navigateToView = (view: View, id?: number) => {
      handleLinkClick(view, id);
    };
    return () => {
      delete (window as any).navigateToView;
    };
  }, [handleLinkClick]);

  const isHome = currentView === "home";
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const infiniteHomeImages = [...homeImages, ...homeImages, ...homeImages];

  return (
    <div className="relative min-h-screen bg-pure-white selection:bg-fluorescent-red selection:text-pure-white">
      {/* Fixed Corner Navigation - Individual Fixed Elements for Maximum Reliability */}
      {!isMenuOpen && (
        <>
          {/* Top Left: LIZ LINDEN */}
          <div className="fixed top-4 left-4 md:top-8 md:left-8 z-[9999] pointer-events-auto">
            <motion.button
              onClick={() => handleLinkClick("home")}
              whileHover={{ scale: 1.3, color: "#FF3131" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="text-[clamp(1.5rem,8vw,8rem)] font-integral font-bold tracking-tight leading-[0.8] cursor-pointer text-left whitespace-nowrap md:whitespace-nowrap text-pure-black bg-transparent border-none p-0 origin-top-left"
            >
              LIZ LINDEN
            </motion.button>
          </div>
          
          {/* Top Right: MENU */}
          <div className="fixed top-4 right-4 md:top-8 md:right-8 z-[9999] pointer-events-auto">
            <motion.button
              onClick={() => setIsMenuOpen(true)}
              whileHover={{ scale: 1.3, color: "#FF3131" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="text-[clamp(1.5rem,8vw,8rem)] font-integral font-bold tracking-tight leading-[0.8] cursor-pointer text-right text-pure-black bg-transparent border-none p-0 origin-top-right"
            >
              MENU
            </motion.button>
          </div>

          {isHome && (
            <>
              {/* Bottom Left: ART */}
              <div className="fixed bottom-4 left-4 md:bottom-8 md:left-8 z-[9999] pointer-events-auto">
                <motion.button
                  onClick={() => handleLinkClick("works")}
                  whileHover={{ scale: 1.3, color: "#FF3131" }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="text-[clamp(1.5rem,8vw,8rem)] font-integral font-bold tracking-tight leading-[0.8] cursor-pointer text-pure-black bg-transparent border-none p-0 origin-bottom-left"
                >
                  ART
                </motion.button>
              </div>
              {/* Bottom Right: WRITING */}
              <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-[9999] pointer-events-auto">
                <motion.button
                  onClick={() => handleLinkClick("writing")}
                  whileHover={{ scale: 1.3, color: "#FF3131" }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="text-[clamp(1.5rem,8vw,8rem)] font-integral font-bold tracking-tight leading-[0.8] cursor-pointer text-pure-black bg-transparent border-none p-0 origin-bottom-right"
                >
                  WRITING
                </motion.button>
              </div>
            </>
          )}
        </>
      )}

      {/* Views */}
      <AnimatePresence mode="wait">
        {currentView === "home" && (
          <motion.main
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col"
          >
            {infiniteHomeImages.map((project, idx) => (
              <section
                key={`${project.id}-${idx}`}
                className="h-screen w-full relative overflow-hidden cursor-pointer"
                onClick={() => handleLinkClick("works")}
              >
                <img
                  src={project.image}
                  alt={`Home Image ${project.id}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </section>
            ))}
          </motion.main>
        )}

        {currentView === "works" && (
          <motion.main
            key="works"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-[25vh] px-6 md:px-12 pb-24 max-w-7xl mx-auto"
          >
            <h2 className="text-[10vw] md:text-[8vw] font-integral font-bold leading-[0.9] tracking-tight mb-24 text-pure-black">
              SELECTED WORKS
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {projects.map((p) => (
                <div 
                  key={p.id} 
                  className="relative aspect-[4/5] bg-pure-black overflow-hidden cursor-pointer group"
                  onClick={() => handleLinkClick("project-detail", p.id)}
                >
                  <img 
                    src={p.image} 
                    className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110" 
                    style={{ objectPosition: p.objectPosition || 'center' }}
                    referrerPolicy="no-referrer" 
                  />
                </div>
              ))}
              {/* Archive Tile */}
              <div 
                className="relative aspect-[4/5] bg-pure-black overflow-hidden cursor-pointer group flex items-center justify-center"
                onClick={() => handleLinkClick("grouped-list")}
              >
                <img 
                  src="https://picsum.photos/seed/archive/1920/1080" 
                  className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 opacity-40" 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                  <h3 className="text-pure-white font-integral font-bold text-3xl md:text-5xl leading-[0.9] tracking-tight uppercase">
                    SCULPTURE<br/><SafeText text="2015-2024" />
                  </h3>
                </div>
              </div>
            </div>
          </motion.main>
        )}

        {currentView === "project-detail" && selectedProject && (
          <motion.main
            key={`project-${selectedProject.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-[25vh] px-6 md:px-12 pb-24 max-w-7xl mx-auto"
          >
            <div className="flex flex-col gap-6">
              <div className="w-full flex justify-center">
                <img 
                  src={selectedProject.image} 
                  alt={selectedProject.title} 
                  className="max-w-full h-auto max-h-[85vh] object-contain mx-auto"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="max-w-3xl text-pure-black">
                <h2 className="text-2xl md:text-3xl font-integral font-bold leading-tight mb-2">
                  <span className="italic"><SafeText text={selectedProject.title} fontClass="font-integral" /></span>, <SafeText text={selectedProject.year} fontClass="font-integral" />
                </h2>
                <div className="font-montserrat font-light text-base md:text-lg leading-snug opacity-80 space-y-1">
                  <p><SafeText text={selectedProject.medium} fontClass="font-montserrat" /></p>
                  {selectedProject.description && (
                    <p 
                      className="whitespace-pre-wrap mt-2"
                      dangerouslySetInnerHTML={{ __html: selectedProject.description }}
                    />
                  )}
                </div>
              </div>
            </div>
          </motion.main>
        )}

        {currentView === "grouped-list" && (
          <motion.main
            key="grouped-list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-[25vh] px-6 md:px-12 pb-24 max-w-4xl mx-auto"
          >
            <h2 className="text-[10vw] md:text-[8vw] font-integral font-bold leading-[0.9] tracking-tight mb-24 text-pure-black">
              SCULPTURE <SafeText text="2015-2024" />
            </h2>
            <div className="flex flex-col gap-6">
              {[
                "The Photographer, 2019",
                "Silent Structures, 2023",
                "Industrial Echo, 2022",
                "Glass Voids, 2021",
                "Steel Tension, 2020",
                "Monolith I, 2019",
                "Monolith II, 2018",
                "Suspended Form, 2017",
                "Gravity Study, 2016",
                "First Form, 2015"
              ].map((item, i) => (
                <div 
                  key={i} 
                  className="border-b border-pure-black/10 pb-4 group cursor-pointer"
                  onClick={() => {
                    if (item.toLowerCase().includes("the photographer")) {
                      // Find project by title or filename
                      const p = projects.find(proj => {
                        const cleanTitle = proj.title.toLowerCase().replace(/[^a-z0-9]/g, "");
                        const targetTitle = "thephotographer";
                        const fileMatch = proj.image.toLowerCase().includes("the_photographer") || 
                                         proj.image.toLowerCase().includes("thephotographer");
                        return cleanTitle.includes(targetTitle) || fileMatch;
                      });
                      
                      if (p) {
                        handleLinkClick("project-detail", p.id);
                      }
                    }
                  }}
                >
                  <h3 className="text-2xl md:text-4xl font-integral font-bold hover:text-fluorescent-red transition-colors text-pure-black">
                    {item.includes("The Photographer") ? (
                      <>
                        <span className="italic"><SafeText text="The Photographer" /></span>, <SafeText text="2019" />
                      </>
                    ) : <SafeText text={item} />}
                  </h3>
                </div>
              ))}
            </div>
          </motion.main>
        )}

        {currentView === "writing" && (
          <motion.main
            key="writing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-[25vh] px-6 md:px-12 pb-24 max-w-4xl mx-auto"
          >
            <h2 className="text-[10vw] md:text-[8vw] font-integral font-bold leading-[0.9] tracking-tight mb-24 text-pure-black">
              WRITING
            </h2>
            <div 
              className="font-montserrat font-light text-xl md:text-2xl text-pure-black leading-[1.4] rtf-content"
              dangerouslySetInnerHTML={{ __html: writingContent }}
            />
          </motion.main>
        )}

        {currentView === "cv" && (
          <motion.main
            key="cv"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-[25vh] px-6 md:px-12 pb-24 max-w-4xl mx-auto"
          >
            <h2 className="text-[10vw] md:text-[8vw] font-integral font-bold leading-[0.9] tracking-tight mb-24 text-pure-black">
              CV
            </h2>
            <div 
              className="font-montserrat font-light text-base md:text-lg text-pure-black leading-[1.3] rtf-content"
              dangerouslySetInnerHTML={{ __html: cvContent }}
            />
          </motion.main>
        )}

        {currentView === "contact" && (
          <motion.main
            key="contact"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-[25vh] px-6 md:px-12 pb-24 flex flex-col items-center text-center"
          >
            <h2 className="text-[12vw] md:text-[10vw] font-integral font-bold leading-[0.9] tracking-tight mb-12 text-pure-black">
              CONTACT
            </h2>
            <a 
              href="mailto:studio@lizlinden.com" 
              className="font-integral font-bold text-3xl md:text-6xl border-b-8 border-pure-black pb-4 hover:text-fluorescent-red hover:border-fluorescent-red transition-all text-pure-black"
            >
              studio@lizlinden.com
            </a>
          </motion.main>
        )}
      </AnimatePresence>

      {/* Full-Screen Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 bg-pure-black z-[100] flex flex-col p-6 md:p-10"
          >
            <div className="flex justify-between items-start">
              <button
                onClick={() => handleLinkClick("home")}
                className="text-pure-white text-[10vw] font-integral font-bold tracking-tight leading-[0.8] hover:text-fluorescent-red transition-colors text-left md:whitespace-nowrap"
              >
                LIZ LINDEN
              </button>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="text-pure-white font-integral font-bold text-[10vw] md:text-[10vw] tracking-tight leading-[0.8] hover:text-fluorescent-red transition-colors cursor-pointer text-right"
              >
                X
              </button>
            </div>

            <div className="flex-grow flex flex-col justify-center gap-4 md:gap-8 mt-12">
              {MENU_LINKS.map((link, i) => (
                <motion.button
                  key={link.id}
                  onClick={() => handleLinkClick(link.id as View)}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
                  className="text-pure-white font-integral font-bold text-[10vw] md:text-[8vw] leading-[0.8] tracking-tight hover:text-fluorescent-red transition-all text-left"
                >
                  {link.label}
                </motion.button>
              ))}
            </div>

            <div className="flex justify-end items-end">
              <span className="text-pure-white font-montserrat font-medium text-[10px] md:text-xs tracking-widest">
                ©2026
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
