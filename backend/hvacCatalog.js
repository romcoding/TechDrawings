// Reference catalog of HVAC / building-automation components that the analyzer
// should be able to recognize on technical drawings.
//
// The catalog is intentionally kept close to the typography used in real
// Swiss / German HVAC and KNX/BACnet schematics so the LLM and the fuzzy
// matcher have a common vocabulary.  Each entry lists:
//   - kategorie : top level grouping (used in BOM "Anlage" column fallbacks)
//   - komponente: canonical component name (German)
//   - englisch  : canonical component name (English)
//   - synonyme  : alternative names / typical codes / symbols
//   - norm      : references to applicable standards
//
// The catalog is used to:
//   1. Enrich the prompt given to the Vision model so it knows what to look
//      for and which canonical label to emit.
//   2. Provide a fallback dictionary that augments the company-specific
//      component database used by the matching service.

export const HVAC_STANDARDS = [
  {
    code: 'VDI 3814',
    title: 'Building automation and control systems (BACS)',
    scope: 'Funktionen, Symbole und Funktionsbeschreibungen der Gebäudeautomation.'
  },
  {
    code: 'ISO 16484',
    title: 'Building automation and control systems',
    scope: 'Hardware, Software, Funktionen und Datenkommunikation der GA.'
  },
  {
    code: 'ISO 14617',
    title: 'Graphical symbols for diagrams',
    scope: 'Grafische Symbole in Fließbildern und Schemata.'
  },
  {
    code: 'IEC 60617',
    title: 'Graphical symbols for diagrams',
    scope: 'Elektrische Symbole in Stromlauf- und Funktionsplänen.'
  },
  {
    code: 'DIN EN 81346',
    title: 'Industrial systems, installations and equipment - Reference designation system',
    scope: 'Kennzeichnungssystem (z. B. =Anlage +Ort -Betriebsmittel :Anschluss).'
  },
  {
    code: 'SIA 108 / 382 / 384',
    title: 'Schweizer Normen für HLKKS-Anlagen',
    scope: 'Planung, Bau und Abrechnung von Lüftungs-, Kälte- und Heizungsanlagen.'
  },
  {
    code: 'DIN EN 12792',
    title: 'Ventilation for buildings - Symbols, terminology',
    scope: 'Einheitliche Symbolik und Terminologie für Lüftungsanlagen.'
  },
  {
    code: 'DIN EN 1861',
    title: 'Refrigerating systems and heat pumps',
    scope: 'Rohrleitungsschemata und Symbole für Kälteanlagen.'
  }
];

export const HVAC_CATALOG = [
  // --- Heating / Heizung ---
  {
    kategorie: 'Wärmeerzeugung',
    komponente: 'Heizkessel',
    englisch: 'Boiler',
    synonyme: ['Gasheizkessel', 'Ölkessel', 'Brennwertkessel', 'Kessel', 'WE'],
    norm: ['DIN EN 15502', 'SIA 384']
  },
  {
    kategorie: 'Wärmeerzeugung',
    komponente: 'Wärmepumpe',
    englisch: 'Heat pump',
    synonyme: ['Sole/Wasser-WP', 'Luft/Wasser-WP', 'Heat Pump', 'WP'],
    norm: ['DIN EN 14511', 'DIN EN 14825']
  },
  {
    kategorie: 'Wärmeerzeugung',
    komponente: 'Fernwärmeübergabestation',
    englisch: 'District heating substation',
    synonyme: ['FW-Station', 'Übergabestation', 'FWÜ'],
    norm: ['AGFW FW 507']
  },
  {
    kategorie: 'Wärmeverteilung',
    komponente: 'Heizungspumpe',
    englisch: 'Circulation pump',
    synonyme: ['Umwälzpumpe', 'Heizungsumwälzpumpe', 'Pumpe', 'Pump'],
    norm: ['DIN EN 16297', 'ErP-Richtlinie']
  },
  {
    kategorie: 'Wärmeverteilung',
    komponente: 'Hydraulische Weiche',
    englisch: 'Low-loss header',
    synonyme: ['Weiche', 'Hydraulic separator'],
    norm: ['VDI 4708']
  },
  {
    kategorie: 'Wärmeverteilung',
    komponente: 'Verteiler / Sammler',
    englisch: 'Manifold / distributor',
    synonyme: ['Heizkreisverteiler', 'Distributor'],
    norm: ['DIN 18380']
  },
  {
    kategorie: 'Wärmeverteilung',
    komponente: 'Mischventil 3-Wege',
    englisch: '3-way mixing valve',
    synonyme: ['Dreiwegeventil', 'Mischer', '3-Wege-Mischer', 'MV', 'Ventil 3-Punkt'],
    norm: ['DIN EN 60534']
  },
  {
    kategorie: 'Wärmeverteilung',
    komponente: 'Regelventil stetig',
    englisch: 'Modulating control valve',
    synonyme: ['Ventil Stetig', 'Stetigventil', 'Control valve'],
    norm: ['DIN EN 60534']
  },
  {
    kategorie: 'Wärmeverteilung',
    komponente: 'Absperrventil',
    englisch: 'Shut-off valve',
    synonyme: ['Absperrarmatur', 'Schieber', 'Kugelhahn', 'Shut-off'],
    norm: ['DIN EN 12266']
  },
  {
    kategorie: 'Wärmeverteilung',
    komponente: 'Rückschlagventil',
    englisch: 'Check valve',
    synonyme: ['Rückschlagklappe', 'Check valve'],
    norm: ['DIN EN 12334']
  },
  {
    kategorie: 'Sicherheitsarmaturen',
    komponente: 'Sicherheitsventil',
    englisch: 'Safety valve',
    synonyme: ['Sicherheitsarmatur', 'SV', 'Safety valve'],
    norm: ['DIN EN ISO 4126']
  },
  {
    kategorie: 'Sicherheitsarmaturen',
    komponente: 'Membranausdehnungsgefäß',
    englisch: 'Expansion vessel',
    synonyme: ['MAG', 'Ausdehnungsgefäß', 'Expansion'],
    norm: ['DIN EN 13831']
  },
  {
    kategorie: 'Sicherheitsarmaturen',
    komponente: 'Mikroblasenabscheider',
    englisch: 'Air separator',
    synonyme: ['Entlüfter', 'Luftabscheider', 'Entgaser'],
    norm: ['VDI 2035']
  },

  // --- Pumps / Actuators ---
  {
    kategorie: 'Antriebe & Aktoren',
    komponente: 'Stellantrieb Ventil',
    englisch: 'Valve actuator',
    synonyme: ['Ventilantrieb', 'Stellmotor', 'Actuator'],
    norm: ['DIN EN ISO 5211', 'VDI 3814']
  },
  {
    kategorie: 'Antriebe & Aktoren',
    komponente: 'Klappenantrieb stetig',
    englisch: 'Modulating damper actuator',
    synonyme: ['Luftklappe Stetig', 'Damper actuator', 'Klappenmotor'],
    norm: ['VDI 3814']
  },
  {
    kategorie: 'Antriebe & Aktoren',
    komponente: 'Klappenantrieb 3-Punkt',
    englisch: '3-point damper actuator',
    synonyme: ['Luftklappe 3-Punkt', '3-Punkt-Antrieb'],
    norm: ['VDI 3814']
  },

  // --- Sensors / Instrumentation ---
  {
    kategorie: 'Sensorik',
    komponente: 'Temperaturfühler',
    englisch: 'Temperature sensor',
    synonyme: ['Fühler Temperatur', 'Pt100', 'Pt1000', 'Vorlauffühler', 'Rücklauffühler'],
    norm: ['DIN EN 60751']
  },
  {
    kategorie: 'Sensorik',
    komponente: 'Feuchtefühler',
    englisch: 'Humidity sensor',
    synonyme: ['Fühler Feuchte', 'Humidity sensor'],
    norm: ['VDI 3519']
  },
  {
    kategorie: 'Sensorik',
    komponente: 'Kombifühler Temp/Feuchte',
    englisch: 'Combined temperature/humidity sensor',
    synonyme: ['Fühler Temperatur / Feuchte'],
    norm: ['VDI 3519']
  },
  {
    kategorie: 'Sensorik',
    komponente: 'CO2-Fühler',
    englisch: 'CO2 sensor',
    synonyme: ['Fühler CO2', 'Luftqualitätsfühler'],
    norm: ['DIN EN 13779']
  },
  {
    kategorie: 'Sensorik',
    komponente: 'Drucksensor',
    englisch: 'Pressure sensor',
    synonyme: ['Druckfühler', 'Pressure transducer', 'Pressure sensor'],
    norm: ['DIN EN 837']
  },
  {
    kategorie: 'Sensorik',
    komponente: 'Pressostat',
    englisch: 'Pressure switch',
    synonyme: ['Presostat', 'Druckwächter'],
    norm: ['DIN EN 12263']
  },
  {
    kategorie: 'Sensorik',
    komponente: 'Frostschutzwächter',
    englisch: 'Frost protection thermostat',
    synonyme: ['Frostat', 'Frost protection'],
    norm: ['VDI 6022']
  },
  {
    kategorie: 'Sensorik',
    komponente: 'Strömungswächter',
    englisch: 'Flow switch',
    synonyme: ['Flow switch', 'Durchflusswächter'],
    norm: ['VDI 3814']
  },

  // --- Ventilation / Air handling ---
  {
    kategorie: 'Lufttechnik',
    komponente: 'Lüftungsgerät / Monobloc',
    englisch: 'Air-handling unit (AHU)',
    synonyme: ['AHU', 'Lüftungsgerät', 'Monobloc', 'RLT-Gerät'],
    norm: ['DIN EN 13053', 'DIN EN 1886']
  },
  {
    kategorie: 'Lufttechnik',
    komponente: 'Ventilator Zuluft',
    englisch: 'Supply fan',
    synonyme: ['Zuluftventilator', 'ZUL-Ventilator'],
    norm: ['DIN EN 13053']
  },
  {
    kategorie: 'Lufttechnik',
    komponente: 'Ventilator Abluft',
    englisch: 'Extract fan',
    synonyme: ['Abluftventilator', 'ABL-Ventilator'],
    norm: ['DIN EN 13053']
  },
  {
    kategorie: 'Lufttechnik',
    komponente: 'EC-Ventilator',
    englisch: 'EC fan',
    synonyme: ['EC Ventilator', 'Ventilator FU'],
    norm: ['DIN EN 13053']
  },
  {
    kategorie: 'Lufttechnik',
    komponente: 'Wärmerückgewinnung Rotor',
    englisch: 'Rotary heat recovery',
    synonyme: ['WRG Rotor', 'Rotationswärmetauscher'],
    norm: ['DIN EN 308']
  },
  {
    kategorie: 'Lufttechnik',
    komponente: 'Volumenstromregler VAV',
    englisch: 'VAV box',
    synonyme: ['VAV', 'VAV - Mod-Bus', 'Variable air volume'],
    norm: ['DIN EN 12589']
  },
  {
    kategorie: 'Lufttechnik',
    komponente: 'Brandschutzklappe',
    englisch: 'Fire damper',
    synonyme: ['BSK', 'Fire damper'],
    norm: ['DIN EN 15650']
  },
  {
    kategorie: 'Lufttechnik',
    komponente: 'Luftfilter',
    englisch: 'Air filter',
    synonyme: ['Filter', 'Taschenfilter', 'Schwebstofffilter'],
    norm: ['DIN EN ISO 16890']
  },

  // --- Cooling / Refrigeration ---
  {
    kategorie: 'Kältetechnik',
    komponente: 'Kältemaschine',
    englisch: 'Chiller',
    synonyme: ['Kältemaschine gross', 'Kältemaschine klein', 'Chiller'],
    norm: ['DIN EN 14511']
  },
  {
    kategorie: 'Kältetechnik',
    komponente: 'Rückkühler',
    englisch: 'Dry cooler',
    synonyme: ['Rückkühler', 'Dry cooler', 'Freecooler'],
    norm: ['DIN EN 1048']
  },
  {
    kategorie: 'Kältetechnik',
    komponente: 'Plattenwärmetauscher',
    englisch: 'Plate heat exchanger',
    synonyme: ['PWT', 'Wärmetauscher', 'Heat exchanger'],
    norm: ['DIN EN 1148']
  },

  // --- Metering ---
  {
    kategorie: 'Messtechnik',
    komponente: 'Wärmezähler',
    englisch: 'Heat meter',
    synonyme: ['Wärmezähler M-Bus', 'Wärmemengenzähler', 'WMZ'],
    norm: ['EN 1434']
  },
  {
    kategorie: 'Messtechnik',
    komponente: 'Elektrozähler',
    englisch: 'Electricity meter',
    synonyme: ['Elektrozähler M-Bus', 'Elektrozähler ModBus IP', 'Elektrozähler ModBus RTU'],
    norm: ['DIN EN 50470']
  },

  // --- BACS / Controllers ---
  {
    kategorie: 'Automation',
    komponente: 'Automationsstation',
    englisch: 'Building automation controller',
    synonyme: ['AS', 'DDC', 'BMS controller', 'Programmable controller'],
    norm: ['ISO 16484-3']
  },
  {
    kategorie: 'Automation',
    komponente: 'Raumbediengerät',
    englisch: 'Room operating unit',
    synonyme: ['RBG', 'Raumbedienung', 'Room panel'],
    norm: ['VDI 3814-3']
  },
  {
    kategorie: 'Automation',
    komponente: 'Binärer Eingang',
    englisch: 'Digital input (DI)',
    synonyme: ['Digitaler Eingang', 'DI', 'BI'],
    norm: ['ISO 16484-5']
  },
  {
    kategorie: 'Automation',
    komponente: 'Binärer Ausgang',
    englisch: 'Digital output (DO)',
    synonyme: ['Digitaler Ausgang', 'DO', 'BO'],
    norm: ['ISO 16484-5']
  },
  {
    kategorie: 'Automation',
    komponente: 'Analoger Eingang',
    englisch: 'Analog input (AI)',
    synonyme: ['Analoger Eingang', 'AI'],
    norm: ['ISO 16484-5']
  },
  {
    kategorie: 'Automation',
    komponente: 'Analoger Ausgang',
    englisch: 'Analog output (AO)',
    synonyme: ['Analoger Ausgang', 'AO'],
    norm: ['ISO 16484-5']
  }
];

// Flatten catalog so the matching service can include the norms-approved
// designations as an always-available reference database.
export const HVAC_CATALOG_AS_DB_ENTRIES = HVAC_CATALOG.map((entry) => ({
  code: entry.komponente,
  description: `${entry.komponente} / ${entry.englisch} — ${entry.kategorie}` +
    (entry.norm && entry.norm.length ? ` [${entry.norm.join(', ')}]` : ''),
  kategorie: entry.kategorie,
  englisch: entry.englisch,
  synonyme: entry.synonyme || [],
  norm: entry.norm || [],
  source: 'hvac-catalog'
}));

export const componentsSystemPromptFragment = () => {
  const lines = HVAC_CATALOG.map((c) => {
    const synonyms = (c.synonyme || []).slice(0, 5).join(', ');
    return `- ${c.kategorie} :: ${c.komponente} (EN: ${c.englisch})${synonyms ? ` — Synonyme: ${synonyms}` : ''}`;
  });
  const standards = HVAC_STANDARDS.map((s) => `- ${s.code}: ${s.title}`).join('\n');
  return `RELEVANTE NORMEN UND STANDARDS:\n${standards}\n\nBEKANNTE HLK / GA-KOMPONENTEN (nicht erschöpfend):\n${lines.join('\n')}`;
};
