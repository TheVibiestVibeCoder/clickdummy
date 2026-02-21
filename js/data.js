/* ============================================================
   DATA — Cluster / Narrative / Actor data
   ============================================================ */

export const NRI = {
  score: 67,
  delta: +4.2,
  drivers: 'Getrieben durch Preisdebatte (+8 Velocity) und Fernwärme-Monopol Narrativ (neue Quelle: AK Pressekonferenz)',
  subscores: [
    { key: 'velocity', label: 'Velocity', value: 72, color: 'var(--risk-amber)' },
    { key: 'proximity', label: 'Proximity', value: 58, color: 'var(--accent)' },
    { key: 'sentiment', label: 'Sentiment Accel.', value: 71, color: 'var(--risk-red)' }
  ]
};

export const CLUSTERS = [
  {
    id: 1,
    x: -30, y: -22, z: 0,
    label: 'PREIS & TARIFE',
    color: '#ff9966',
    reportText: 'Das Narrativ "Übergewinne auf Kosten der Kunden" dominiert weiterhin die Diskussion in sozialen Medien. Besonders die Jahresabrechnungen treiben negatives Sentiment. Vergleiche mit Spotmarktpreisen werden von AK und Boulevardmedien verstärkt.',
    riskText: 'Risiko einer koordinierten "Zahlungsstreik"-Kampagne auf Telegram. Sammelklagen-Thematik gewinnt durch Berichterstattung des VKI an Fahrt.',
    riskLevel: 'red',
    subTopics: [
      {
        id: 's1',
        label: 'Strompreise',
        offX: -10, offY: -10,
        trend: 'flat',
        sentiment: 'neg',
        score: -0.65,
        vol: 'high',
        explanation: 'Kunden empfinden die Senkungen als zu gering im Vergleich zum Großhandelspreis. "Optima Entspannt" vs "Garant" sorgt für Verwirrung.',
        micro: [
          { id: 'm1', label: 'Nachzahlungs-Schock', offX: -4, offY: -4, desc: 'Nutzer posten Fotos hoher Nachzahlungen trotz Sparmaßnahmen. Emotional hoch aufgeladen.' },
          { id: 'm2', label: 'Marktpreis-Gap', offX: 4, offY: 2, desc: 'Technischer Diskurs über Merit-Order und warum Endkundenpreise nicht sofort sinken.' }
        ],
        sources: [
          { name: 'Facebook', cls: 'media-logo--fb', label: 'fb', share: 30 },
          { name: 'Kronen Zeitung', cls: 'media-logo--kro', label: 'K', share: 25 },
          { name: 'Heute.at', cls: 'media-logo--kro', label: 'H', share: 15 },
          { name: 'Arbeiterkammer', cls: 'media-logo--red', label: 'AK', share: 15 },
          { name: 'Twitter/X', cls: 'media-logo--x', label: 'X', share: 10 },
          { name: 'Reddit', cls: 'media-logo--red', label: 'r/', share: 5 }
        ]
      },
      {
        id: 's2',
        label: 'Fernwärme',
        offX: 10, offY: -5,
        trend: 'up',
        sentiment: 'neg',
        score: -0.45,
        vol: 'med',
        explanation: 'Die Indexanpassung der Fernwärme wird als "Monopol-Diktat" wahrgenommen. Mietervereinigungen mobilisieren in Online-Foren.',
        micro: [
          { id: 'm3', label: 'Grundgebühr', offX: 3, offY: -3, desc: 'Kritik an hohen Fixkosten unabhängig vom Verbrauch. "Sparen lohnt sich nicht"-Narrativ.' },
          { id: 'm4', label: 'Monopol-Kritik', offX: -2, offY: 3, desc: 'Politische Debatte über die Entflechtung des Fernwärmenetzes und fehlende Anbieterwahl.' }
        ],
        sources: [
          { name: 'Reddit Wien', cls: 'media-logo--red', label: 'r/W', share: 35 },
          { name: 'Der Standard', cls: 'media-logo--std', label: 'derS', share: 20 },
          { name: 'Facebook', cls: 'media-logo--fb', label: 'fb', share: 20 },
          { name: 'Kurier', cls: 'media-logo--kur', label: 'Ku', share: 15 },
          { name: 'Twitter/X', cls: 'media-logo--x', label: 'X', share: 10 }
        ]
      },
      {
        id: 's3',
        label: 'Gaskosten',
        offX: 0, offY: 12,
        trend: 'down',
        sentiment: 'mixed',
        score: -0.15,
        vol: 'low',
        explanation: 'Das Thema verliert an Volatilität, aber die "Raus aus Gas" Förderung sorgt für Unsicherheit bei Thermenbesitzern.',
        micro: [
          { id: 'm5', label: 'CO2-Steuer', offX: -3, offY: 0, desc: 'Diskussion über die schrittweise Erhöhung und Auswirkung auf die Heizkostenabrechnung.' },
          { id: 'm6', label: 'Thermentausch', offX: 3, offY: 0, desc: 'Fragen zur Machbarkeit und Finanzierung des Umstiegs in Altbauwohnungen.' }
        ],
        sources: [
          { name: 'ORF.at', cls: 'media-logo--orf', label: 'ORF', share: 30 },
          { name: 'Die Presse', cls: 'media-logo--pre', label: 'P', share: 20 },
          { name: 'Facebook', cls: 'media-logo--fb', label: 'fb', share: 20 },
          { name: 'Google News', cls: 'media-logo--kro', label: 'GN', share: 15 },
          { name: 'Der Standard', cls: 'media-logo--std', label: 'derS', share: 15 }
        ]
      }
    ]
  },
  {
    id: 2,
    x: 30, y: -7, z: 0,
    label: 'WÄRMEWENDE & INFRA',
    color: '#ffb28c',
    reportText: 'Infrastrukturprojekte wie "Geothermie Simmering" werden von Leitmedien sehr positiv aufgenommen. Auf lokaler Ebene dominiert jedoch der "Baustellen-Frust" durch Straßensperren.',
    riskText: 'Lokaler Widerstand gegen Fernwärme-Ausbau in Währing und Döbling könnte sich zu einer stadtweiten "Verkehrschaos"-Debatte ausweiten.',
    riskLevel: 'amber',
    subTopics: [
      {
        id: 's4',
        label: 'Großprojekte',
        offX: -12, offY: 5,
        trend: 'up',
        sentiment: 'pos',
        score: 0.82,
        vol: 'med',
        explanation: 'Geothermie und Großwärmepumpen werden als technologische Leuchtturmprojekte gefeiert. Stärkt das Image als Innovationsführer.',
        micro: [
          { id: 'm7', label: 'Geothermie Simmering', offX: -3, offY: -3, desc: 'Positives Echo auf die Versorgung von 125.000 Haushalten. "Wien wird unabhängig".' },
          { id: 'm8', label: 'Wasserstoff-Versuch', offX: 3, offY: 2, desc: 'Technik-Blogs loben die Pilotanlage im Kraftwerk Donaustadt.' }
        ],
        sources: [
          { name: 'ORF Wien', cls: 'media-logo--orf', label: 'ORF', share: 40 },
          { name: 'LinkedIn', cls: 'media-logo--fb', label: 'in', share: 25 },
          { name: 'Der Standard', cls: 'media-logo--std', label: 'derS', share: 15 },
          { name: 'Stadt Wien', cls: 'media-logo--orf', label: 'W', share: 10 },
          { name: 'Tech Blogs', cls: 'media-logo--heise', label: 'TB', share: 10 }
        ]
      },
      {
        id: 's5',
        label: 'Baustellen',
        offX: 12, offY: -8,
        trend: 'up',
        sentiment: 'neg',
        score: -0.55,
        vol: 'high',
        explanation: 'Der notwendige Fernwärme-Ausbau führt zu Verkehrsbehinderungen. Narrative verschieben sich von "Notwendigkeit" zu "Planlosigkeit".',
        micro: [
          { id: 'm9', label: 'Gürtel-Stau', offX: 1, offY: -3, desc: 'Massive Beschwerden über gleichzeitige Aufgrabungen in mehreren Bezirken.' },
          { id: 'm10', label: 'Parkplatzverlust', offX: 2, offY: 3, desc: 'Lokaler Ärger über temporäre Halteverbote für Baufahrzeuge.' }
        ],
        sources: [
          { name: 'Facebook Bezirke', cls: 'media-logo--fb', label: 'fb', share: 45 },
          { name: 'Heute', cls: 'media-logo--kro', label: 'H', share: 20 },
          { name: 'Nextdoor', cls: 'media-logo--tg', label: 'nd', share: 15 },
          { name: 'Bezirkszeitung', cls: 'media-logo--kro', label: 'BZ', share: 15 },
          { name: 'Twitter/X', cls: 'media-logo--x', label: 'X', share: 5 }
        ]
      }
    ]
  },
  {
    id: 3,
    x: 0, y: 29, z: 0,
    label: 'VERSORGUNG & INNOVATION',
    color: '#8e99ac',
    reportText: 'Das Thema Versorgungssicherheit ist stabil. E-Mobilität wächst stetig, aber die "Ladesäulen-Blockierer" sind ein emotionales Aufregerthema.',
    riskText: 'Sicherheitslücke bei Smart Metern könnte instrumentalisiert werden. Erste Berichte in Nischen-Foren über angebliche Datenschutzprobleme.',
    riskLevel: 'neutral',
    subTopics: [
      {
        id: 's6',
        label: 'E-Mobilität',
        offX: -10, offY: -5,
        trend: 'up',
        sentiment: 'pos',
        score: 0.35,
        vol: 'med',
        explanation: 'Ausbau der Ladeinfrastruktur wird honoriert, aber Verfügbarkeit in Außenbezirken kritisiert.',
        micro: [
          { id: 'm11', label: 'Ladesäulen-Mangel', offX: -3, offY: -2, desc: 'Forderung nach mehr Schnellladern in Transdanubien (Floridsdorf/Donaustadt).' },
          { id: 'm12', label: 'E-Tarife', offX: 3, offY: 2, desc: 'Diskussion über die Attraktivität der neuen Tanke-Wien-Energie Tarife.' }
        ],
        sources: [
          { name: 'GoingElectric', cls: 'media-logo--auto', label: 'GE', share: 35 },
          { name: 'Facebook E-Auto', cls: 'media-logo--fb', label: 'fb', share: 25 },
          { name: 'Instagram', cls: 'media-logo--ig', label: 'IG', share: 20 },
          { name: 'Twitter/X', cls: 'media-logo--x', label: 'X', share: 10 },
          { name: 'Auto Revue', cls: 'media-logo--auto', label: 'AR', share: 10 }
        ]
      },
      {
        id: 's7',
        label: 'Smart Meter',
        offX: 8, offY: 6,
        trend: 'flat',
        sentiment: 'mixed',
        score: 0.10,
        vol: 'low',
        explanation: 'Rollout ist weitgehend abgeschlossen. Fokus verschiebt sich auf die Nutzung der Daten im Webportal.',
        micro: [
          { id: 'm13', label: 'Portal-Login', offX: -2, offY: -3, desc: 'Technische Probleme beim Login und der Datenvisualisierung am Wochenende.' },
          { id: 'm14', label: 'Datenschutz', offX: 3, offY: 2, desc: 'Verschwörungstheorien über Fernabschaltung in Telegram-Gruppen (Nische).' }
        ],
        sources: [
          { name: 'Help.gv.at', cls: 'media-logo--std', label: 'gv', share: 30 },
          { name: 'Twitter/X', cls: 'media-logo--x', label: 'X', share: 25 },
          { name: 'Telegram', cls: 'media-logo--tg', label: 'tg', share: 25 },
          { name: 'Futurezone', cls: 'media-logo--heise', label: 'Fz', share: 20 }
        ]
      }
    ]
  }
];

// Flat list of all subtopics
export const ALL_SUBTOPICS = CLUSTERS.flatMap(c =>
  c.subTopics.map(s => ({ ...s, cluster: c }))
);

// Flat list of all micro-narratives
export const ALL_MICROS = ALL_SUBTOPICS.flatMap(s =>
  s.micro.map(m => ({ ...m, subTopic: s, cluster: s.cluster }))
);

// Early warnings (top 5 most volatile)
export const EARLY_WARNINGS = [
  {
    title: 'Strompreise: Jahresabrechnungen Q1/2026',
    delta: 'NRI-Velocity Haupttreiber (+8 Pkt.). AK-Pressekonferenz erzeugte Pickup in KZ, ORF, Heute innerhalb 4h. Sentiment-Score: −0.65.',
    risk: 'red',
    subId: 's1'
  },
  {
    title: 'Fernwärme: Preisindexbindung März 2026',
    delta: 'Mentions +180% in 48h. r/Wien-Thread: 450 Upvotes. Mietervereinigung mobilisiert. Erster Der Standard-Artikel gesetzt.',
    risk: 'red',
    subId: 's2'
  },
  {
    title: 'Fernwärme-Ausbau: Straßensperren Bezirke 16+17',
    delta: 'Sentiment −0.30 → −0.55 in 72h. Nextdoor als neue Plattform aktiv. FB-Bezirksgruppen: 45% Share of Voice.',
    risk: 'amber',
    subId: 's5'
  },
  {
    title: 'Smart Meter: Datenschutz-Crosspost Telegram',
    delta: '3 Kanäle, 800 Mitglieder. Crosspost-Muster identifiziert. Futurezone-Redaktionsanfrage eingegangen.',
    risk: 'amber',
    subId: 's7'
  },
  {
    title: 'Ladeinfrastruktur: Verfügbarkeit Transdanubien',
    delta: 'Engagement +45% (GoingElectric Forum). Positives E-Mobilitäts-Narrativ zeigt erste Negativeintrübung bei Verfügbarkeit in 21./22. Bezirk.',
    risk: 'neutral',
    subId: 's6'
  }
];

// Fake evidence trail events
export const EVIDENCE_EVENTS = [
  { time: '14:32', date: '20.02.2026', text: 'AK Pressekonferenz: "Strompreise senken sofort" — Pickup durch Krone, Heute, ORF', risk: true },
  { time: '12:15', date: '20.02.2026', text: 'Reddit r/Wien: Mega-Thread "Fernwärme Abzocke" erreicht 450 Upvotes', risk: false, amber: true },
  { time: '09:48', date: '20.02.2026', text: 'Facebook Bezirksgruppe 1160: Baustellen-Fotos viral (2.3k Shares)', risk: false },
  { time: '08:00', date: '20.02.2026', text: 'ORF Wien Heute: Beitrag über Geothermie Simmering — positiv', risk: false },
  { time: '22:17', date: '19.02.2026', text: 'Telegram Gruppe "Energie Wahrheit": Smart Meter Verschwörung, 800 Members', risk: false, amber: true },
  { time: '18:30', date: '19.02.2026', text: 'Der Standard Online: Analyse "Wien Energie auf Kurs?" — balanced', risk: false },
  { time: '15:00', date: '19.02.2026', text: 'GoingElectric Forum: Thread "Tanke Wien Energie vs. Smatrics"', risk: false },
  { time: '11:20', date: '19.02.2026', text: 'LinkedIn: Wien Energie CEO Post zur Wärmewende, 1.2k Reactions', risk: false }
];

// Fake actors
export const ACTORS = [
  { name: 'Arbeiterkammer Wien', role: 'Regulator / Watchdog', reach: '2.1M', color: '#ff9966', initial: 'AK' },
  { name: 'Kronen Zeitung', role: 'Boulevard Media', reach: '4.5M', color: '#ff7f45', initial: 'KR' },
  { name: 'ORF Wien', role: 'Public Broadcast', reach: '3.2M', color: '#d79f80', initial: 'ORF' },
  { name: 'Der Standard', role: 'Quality Media', reach: '1.8M', color: '#ffb28c', initial: 'dS' },
  { name: 'r/Wien Community', role: 'Social / Forum', reach: '145K', color: '#ff8a54', initial: 'r/' },
  { name: 'FB Bezirksgruppen', role: 'Social / Local', reach: '320K', color: '#c2cada', initial: 'fb' },
  { name: 'VKI', role: 'Consumer Protection', reach: '890K', color: '#ffd3bc', initial: 'VKI' },
  { name: 'Telegram Channels', role: 'Alt-Media', reach: '12K', color: '#8e99ac', initial: 'tg' }
];

// Data source config for settings page
export const DATA_SOURCES = [
  { name: 'Social Media Crawler', status: 'ok', region: 'EU-West (Frankfurt)', latency: '< 200ms', lastSync: 'vor 2 Min.' },
  { name: 'News Wire API', status: 'ok', region: 'EU-West (Frankfurt)', latency: '< 500ms', lastSync: 'vor 5 Min.' },
  { name: 'Broadcast Monitor', status: 'ok', region: 'EU-Central (Wien)', latency: '< 1s', lastSync: 'vor 12 Min.' },
  { name: 'Forum Scraper', status: 'warn', region: 'EU-West (Frankfurt)', latency: '< 2s', lastSync: 'vor 45 Min.' },
  { name: 'Telegram Ingest', status: 'ok', region: 'EU-Central (Wien)', latency: '< 300ms', lastSync: 'vor 8 Min.' },
  { name: 'NLP Pipeline', status: 'ok', region: 'EU-Central (Wien)', latency: 'Batch', lastSync: 'vor 15 Min.' }
];

// Helpers
export function getSentimentColor(score) {
  if (score > 0.3) return 'var(--sentiment-pos)';
  if (score < -0.3) return 'var(--sentiment-neg)';
  return 'var(--sentiment-neutral)';
}

export function getSentimentLabel(score) {
  if (score > 0.3) return 'Positiv';
  if (score < -0.3) return 'Negativ';
  return 'Neutral';
}

export function getRiskClass(level) {
  if (level === 'red') return 'risk-badge--red';
  if (level === 'amber') return 'risk-badge--amber';
  return 'risk-badge--neutral';
}

export function getClusterAvgScore(cluster) {
  const total = cluster.subTopics.reduce((s, t) => s + t.score, 0);
  return parseFloat((total / cluster.subTopics.length).toFixed(2));
}

export function sparkPoints(trend) {
  if (trend === 'up') return '0,18 8,14 16,16 24,9 32,11 40,5 48,1';
  if (trend === 'down') return '0,4 8,7 16,4 24,11 32,14 40,16 48,18';
  return '0,9 8,4 16,14 24,4 32,14 40,7 48,9';
}
