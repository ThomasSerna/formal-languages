import { useState } from 'react';
import type { MachineKind } from '../domain';
import { MODEL_NAMES, MODEL_SHORT } from '../format';
import HoverDotsBackground from './HoverDotsBackground';
import LiquidGlassNavbar from './LiquidGlassNavbar';

const KINDS: MachineKind[] = ['dfa', 'nfa', 'pda', 'tm'];
const MODEL_DESCRIPTIONS: Record<MachineKind, string> = {
  dfa: 'Un símbolo, un camino.',
  nfa: 'Varios caminos, una posibilidad.',
  pda: 'Una memoria en forma de pila.',
  tm: 'Lee, escribe y vuelve atrás.',
};

const PROFESSOR_PAGE_URL =
  'https://sites.google.com/site/sergiosramirezrico/eafit/si2002-st0270';

interface ReferenceLink {
  label: string;
  href: string;
}

interface ReferenceEntry {
  title: string;
  href?: string;
  meta?: string;
  links?: ReferenceLink[];
}

interface ReferenceGroup {
  badge: string;
  title: string;
  entries: ReferenceEntry[];
}

const REFERENCE_GROUPS: ReferenceGroup[] = [
  {
    badge: 'Curso',
    title: 'Material y evaluaciones',
    entries: [
      {
        title: 'Página oficial · SI2002-ST0270',
        href: PROFESSOR_PAGE_URL,
        meta: 'Prof. Sergio S. Ramírez Rico',
      },
      {
        title: 'Parciales de semestres anteriores',
        href: 'https://drive.google.com/drive/folders/1eP4MxLXJWFJvOATiJQVb9D6PoUP3jyC0?usp=sharing',
        meta: 'Exámenes pasados en Google Drive',
      },
      {
        title: 'Plan de trabajo semanal',
        href: 'https://drive.google.com/file/d/1ZuR5P3d47WzvKp0YGa5CibmYbcUmERHg/view?usp=sharing',
        meta: 'Cronograma y ejercicios sugeridos',
      },
      {
        title: 'Programas oficiales (cuenta EAFIT)',
        links: [
          {
            label: 'Programa SI2002',
            href: 'https://eafit-my.sharepoint.com/:b:/g/personal/ssramirezr_eafit_edu_co/EQRHvPB_X0FPjQx_n58rD7QBZAddGxuZaBgNnsiBSqU27Q?e=Klflbj',
          },
          {
            label: 'Programa ST0270',
            href: 'https://eafit-my.sharepoint.com/:b:/g/personal/ssramirezr_eafit_edu_co/IQAz0VAWZiXTQa_TjRwaXYgpAdHtuBVuv8vlJdygFVPQHlc?e=adgdAs',
          },
        ],
      },
    ],
  },
  {
    badge: 'Clase',
    title: 'Diapositivas y apuntes',
    entries: [
      {
        title: 'Diapositivas · Sergio Ramírez Rico',
        href: 'https://drive.google.com/drive/folders/1tN8Fr1BdVpLTwbIQwl_qaLFRnDAB-Zyo?usp=drive_link',
        meta: 'Presentaciones del curso en Google Drive',
      },
      {
        title: 'Curso ST0270 · Andrés Sicard Ramírez',
        href: 'https://asr.github.io/cursos/st0270-lenguajes-formales-y-compiladores/index.html',
        meta: 'Diapositivas por tema y JFLAP',
      },
      {
        title: 'Apuntes de Kozen (Cornell)',
        links: [
          {
            label: 'Autómatas finitos',
            href: 'https://www.cs.cornell.edu/courses/cs6861/2024sp/Handouts/ACLec2-6.pdf',
          },
          {
            label: 'Expresiones regulares',
            href: 'https://www.cs.cornell.edu/courses/cs6861/2024sp/Handouts/ACLec7-12.pdf',
          },
          {
            label: 'Máquinas de Turing',
            href: 'https://www.cs.cornell.edu/courses/cs4820/2014sp/notes/kozen-computability-sp13.pdf',
          },
        ],
      },
    ],
  },
  {
    badge: 'Libros',
    title: 'Bibliografía del curso',
    entries: [
      {
        title: 'Kozen (1997 / 2012) · Automata and Computability',
        meta: 'Libro guía principal',
        links: [
          {
            label: 'Springer',
            href: 'https://doi.org/10.1007/978-1-4612-1844-9',
          },
          {
            label: 'Biblioteca EAFIT',
            href: 'https://ebookcentral-proquest-com.ezproxy.eafit.edu.co/lib/eafit/detail.action?docID=3076071',
          },
        ],
      },
      {
        title: 'Aho, Lam, Sethi y Ullman (2007)',
        meta: 'Compilers: Principles, Techniques, & Tools (2.ª ed.)',
        links: [
          {
            label: 'Material suplementario',
            href: 'https://suif.stanford.edu/dragonbook/',
          },
        ],
      },
      {
        title: 'Linz (2016)',
        meta: 'An Introduction to Formal Languages and Automata (6.ª ed.)',
      },
      {
        title: 'Sipser (2012)',
        meta: 'Introduction to the Theory of Computation (3.ª ed.)',
      },
    ],
  },
];

type LandingSection = 'models' | 'references' | null;

export default function LandingHero({
  kind,
  onEnterLab,
  onGoHome,
}: {
  kind: MachineKind;
  onEnterLab: (kind?: MachineKind) => void;
  onGoHome: () => void;
}) {
  const [openSection, setOpenSection] = useState<LandingSection>(null);

  const toggleSection = (section: Exclude<LandingSection, null>) => {
    setOpenSection((current) => (current === section ? null : section));
  };

  return (
    <section
      className="landing-screen"
      aria-label="Presentación del laboratorio de autómatas"
    >
      <LiquidGlassNavbar
        kind={kind}
        activeView="landing"
        onSelectModel={(selected) => onEnterLab(selected)}
        onGoHome={onGoHome}
      />
      <HoverDotsBackground />
      <div className="landing-ambient" aria-hidden="true" />

      <div className="landing-content">
        <h1 className="landing-title">Construye y ejecuta autómatas paso a paso</h1>

        <p className="landing-subtitle">
          Define estados y reglas de transición, simula cadenas símbolo a símbolo y comprueba lenguajes formales sobre un lienzo interactivo basado en Kozen.
        </p>

        <div className="landing-actions">
          <button
            type="button"
            className="landing-btn-primary"
            aria-expanded={openSection === 'models'}
            aria-controls="landing-models-grid"
            onClick={() => toggleSection('models')}
          >
            <span>Explorar autómatas</span>
            <svg className="landing-btn-chevron" width="6" height="8" viewBox="0 0 6 8" fill="none" aria-hidden="true">
              <path
                d="M1.25.5 4.75 4l-3.5 3.5"
                stroke="currentColor"
                strokeOpacity=".7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <a
            className="landing-btn-secondary"
            href={PROFESSOR_PAGE_URL}
            target="_blank"
            rel="noreferrer"
            title="Sergio Ramírez Rico - SI2002-ST0270"
          >
            <span>Página oficial · SI2002-ST0270</span>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M3.5 8.5 8.5 3.5M4.5 3.5h4v4"
                stroke="currentColor"
                strokeOpacity=".65"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>

          <button
            type="button"
            className="landing-btn-secondary"
            aria-expanded={openSection === 'references'}
            aria-controls="landing-references"
            onClick={() => toggleSection('references')}
          >
            <span>Referencias</span>
            <svg className="landing-btn-chevron" width="6" height="8" viewBox="0 0 6 8" fill="none" aria-hidden="true">
              <path
                d="M1.25.5 4.75 4l-3.5 3.5"
                stroke="currentColor"
                strokeOpacity=".5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div
          id="landing-models-grid"
          className="landing-models"
          hidden={openSection !== 'models'}
          role="region"
          aria-label="Modelos disponibles"
        >
          {KINDS.map((item) => (
            <button
              key={item}
              type="button"
              className="landing-model-card"
              onClick={() => onEnterLab(item)}
            >
              <span className="landing-model-card__abbr">{MODEL_SHORT[item]}</span>
              <strong className="landing-model-card__name">{MODEL_NAMES[item]}</strong>
              <span className="landing-model-card__desc">{MODEL_DESCRIPTIONS[item]}</span>
            </button>
          ))}
        </div>

        <div
          id="landing-references"
          className="landing-references"
          hidden={openSection !== 'references'}
          role="region"
          aria-label="Referencias del curso"
        >
          {REFERENCE_GROUPS.map((group) => (
            <section key={group.badge} className="landing-ref-card" aria-label={group.title}>
              <div className="landing-ref-card__header">
                <span className="landing-model-card__abbr">{group.badge}</span>
                <h2 className="landing-model-card__name">{group.title}</h2>
              </div>
              <ul className="landing-ref-list">
                {group.entries.map((entry) => (
                  <li key={entry.title} className="landing-ref-item">
                    {entry.href ? (
                      <a href={entry.href} target="_blank" rel="noreferrer">
                        {entry.title}
                      </a>
                    ) : (
                      <strong className="landing-ref-item__title">{entry.title}</strong>
                    )}
                    {entry.meta && <span className="landing-ref-item__meta">{entry.meta}</span>}
                    {entry.links && (
                      <div className="landing-ref-links">
                        {entry.links.map((link) => (
                          <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                            {link.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
