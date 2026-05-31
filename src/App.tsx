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
  return <span className={fontClass}>{text}</span>;
};

type View = "home" | "works" | "writing" | "cv" | "contact" | "project-detail" | "grouped-list" | "series-detail";

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
    fetch("/api/home-images.json")
      .then(res => res.json())
      .then(data => setHomeImages(data))
      .catch(err => console.error("Failed to fetch home images:", err));
  }, []);

  // Fetch projects from API
  useEffect(() => {
    fetch("/api/selected-works.json")
      .then(res => res.json())
      .then(data => setProjects(data))
      .catch(err => console.error("Failed to fetch projects:", err));
  }, []);

  // Fetch CV from API
  useEffect(() => {
    fetch("/api/cv.json")
      .then(res => res.json())
      .then(data => {
        if (data.content) setCvContent(data.content);
      })
      .catch(err => console.error("Failed to fetch CV:", err));
  }, []);

  // Fetch Writing from API
  useEffect(() => {
    fetch("/api/writing.json")
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
  
  // Find project in root projects or inside any series' works list
  let selectedProject = projects.find(p => p.id === selectedProjectId);
  if (!selectedProject) {
    for (const p of projects) {
      if (p.isSeries && p.seriesWorks) {
        const foundSub = p.seriesWorks.find((sw: any) => sw.id === selectedProjectId);
        if (foundSub) {
          selectedProject = foundSub;
          break;
        }
      }
    }
  }
  
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
                  onClick={() => handleLinkClick(p.isSeries ? "series-detail" : "project-detail", p.id)}
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
                className="relative aspect-[4/5] bg-pure-black overflow-hidden flex items-center justify-center select-none"
              >
                <img 
                  src="https://picsum.photos/seed/archive/1920/1080" 
                  className="w-full h-full object-cover opacity-20 pointer-events-none" 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                  <h3 className="text-pure-white/80 font-integral font-bold text-3xl md:text-5xl leading-[0.9] tracking-tight uppercase">
                    OTHER WORKS<br/>ADDED SOON...
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
              {/* Back Button */}
              <div className="mb-4">
                <button 
                  onClick={() => {
                    if (selectedProject.isSubWork && selectedProject.parentSeriesId) {
                      handleLinkClick("series-detail", selectedProject.parentSeriesId);
                    } else {
                      handleLinkClick("works");
                    }
                  }}
                  className="font-integral font-bold text-xs tracking-widest text-pure-black/50 hover:text-fluorescent-red transition-colors uppercase flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                >
                  ← {selectedProject.isSubWork ? "BACK TO SERIES" : "BACK TO SELECTED WORKS"}
                </button>
              </div>

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

        {currentView === "series-detail" && selectedProject && (
          <motion.main
            key={`series-${selectedProject.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-[25vh] px-6 md:px-12 pb-24 max-w-5xl mx-auto"
          >
            {/* Back Button */}
            <div className="mb-12">
              <button 
                onClick={() => handleLinkClick("works")}
                className="font-integral font-bold text-xs tracking-widest text-pure-black/50 hover:text-fluorescent-red transition-colors uppercase flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
              >
                ← BACK TO SELECTED WORKS
              </button>
            </div>

            {/* Series Title */}
            <div className="mb-16">
              <h2 className="text-[10vw] md:text-[8vw] font-integral font-bold leading-[0.9] tracking-tight text-pure-black uppercase">
                <SafeText text={selectedProject.seriesTitle || selectedProject.title} />
              </h2>
            </div>

            {/* Thumbnail List */}
            <div className="flex flex-col gap-8">
              {selectedProject.seriesWorks?.map((subWork: any) => (
                <div 
                  key={subWork.id}
                  onClick={() => handleLinkClick("project-detail", subWork.id)}
                  className="flex flex-col md:flex-row gap-6 md:items-center pb-8 border-b border-pure-black/10 group cursor-pointer"
                >
                  {/* Thumbnail Image Container */}
                  <div className="w-[160px] aspect-[4/5] bg-pure-black overflow-hidden flex-shrink-0 transition-transform duration-500 group-hover:scale-[1.03]">
                    <img 
                      src={subWork.image} 
                      alt={subWork.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Metadata Text */}
                  <div className="flex-grow flex flex-col pt-2 md:pt-0">
                    <h3 className="text-xl md:text-3xl font-integral font-bold text-pure-black group-hover:text-fluorescent-red transition-colors uppercase leading-none mb-2">
                      <span className="italic"><SafeText text={subWork.title} /></span>, <SafeText text={subWork.year} />
                    </h3>
                    <p className="font-montserrat font-light text-sm md:text-base text-pure-black/70 leading-relaxed mb-1">
                      <SafeText text={subWork.medium} />
                    </p>
                    {subWork.description && (
                      <p 
                        className="font-montserrat font-light text-xs md:text-sm text-pure-black/50 leading-relaxed italic"
                        dangerouslySetInnerHTML={{ __html: subWork.description }}
                      />
                    )}
                  </div>
                </div>
              ))}
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
                      let foundProj: any = null;
                      const p = projects.find(proj => {
                        const cleanTitle = proj.title.toLowerCase().replace(/[^a-z0-9]/g, "");
                        const targetTitle = "thephotographer";
                        const fileMatch = proj.image.toLowerCase().includes("the_photographer") || 
                                         proj.image.toLowerCase().includes("thephotographer");
                        return cleanTitle.includes(targetTitle) || fileMatch;
                      });
                      
                      if (p) {
                        if (p.isSeries && p.seriesWorks) {
                          const sub = p.seriesWorks.find((sw: any) => 
                            sw.title.toLowerCase().includes("the photographer") || 
                            sw.image.toLowerCase().includes("the_photographer")
                          );
                          foundProj = sub || p;
                        } else {
                          foundProj = p;
                        }
                      }
                      
                      if (foundProj) {
                        handleLinkClick("project-detail", foundProj.id);
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
