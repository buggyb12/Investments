/**
 * Slovník důchodových pojmů pro klienta. Sdílený zdroj pro webovou aplikaci
 * (rozbalovací sekce) i PDF report, aby se obsah needuploval.
 *
 * Definice jsou orientační a klientsky srozumitelné, vycházejí ze zákona
 * č. 155/1995 Sb. a parametrů roku 2026.
 */

export interface GlossaryItem {
  term: string;
  definition: string;
}

export const GLOSSARY: GlossaryItem[] = [
  {
    term: "Rozhodné období",
    definition:
      "Roky, ze kterých se hodnotí výdělky pro výpočet důchodu. Počítá se od 1. 1. roku po dosažení 18 let, nejdříve však od roku 1986. K výdělkům před rozhodným obdobím se nepřihlíží.",
  },
  {
    term: "Vyměřovací základ (VZ)",
    definition:
      "Částka, ze které se odvádí důchodové pojištění. U zaměstnance je to hrubá mzda za rok, u OSVČ aktuálně polovina daňového základu.",
  },
  {
    term: "Osobní vyměřovací základ (OVZ)",
    definition:
      "Váš průměrný měsíční výdělek za rozhodné období po přepočtu na dnešní hodnotu (zohlednění růstu mezd a inflace koeficienty MPSV).",
  },
  {
    term: "Výpočtový základ",
    definition:
      "OVZ po uplatnění redukčních hranic. Do 1. hranice se počítá celý, mezi 1. a 2. hranicí jen 26 %, nad 2. hranici se nepřihlíží.",
  },
  {
    term: "Redukční hranice (2026)",
    definition:
      "1. hranice 21 546 Kč, 2. hranice 195 868 Kč. Omezují, kolik z vysokých příjmů se do důchodu skutečně promítne.",
  },
  {
    term: "Základní výměra (2026)",
    definition:
      "Pevná část důchodu stejná pro všechny (4 900 Kč v roce 2026, ~10 % průměrné mzdy).",
  },
  {
    term: "Procentní výměra",
    definition:
      "Část důchodu odvozená z výpočtového základu a počtu odpracovaných let (1,5 % výpočtového základu za každý rok). Tvoří obvykle větší část důchodu. Minimum 770 Kč.",
  },
  {
    term: "Náhradní doba",
    definition:
      "Období, které se počítá do let pojištění, i když jste neměl výdělky a neplatil pojistné — např. studium (do roku 2010), péče o dítě, vojna. Některé se krátí na 80 %.",
  },
  {
    term: "Vyloučená doba",
    definition:
      "Doba, kdy jste byl pojištěn, ale bez výdělku (nemoc, péče o dítě do 4 let, invalidita 3. stupně). Vylučuje se z výpočtu průměru — má na důchod pozitivní vliv.",
  },
  {
    term: "Neevidovaná / chybějící doba",
    definition:
      "Období, o kterém ČSSZ nemá záznam (mezery v evidenci nebo doba od 18 let do prvního záznamu, typicky studium). Snižuje důchod a je třeba ho aktivně doplnit.",
  },
  {
    term: "Dnešní kupní síla vs. nominální hodnota",
    definition:
      "Dnešní kupní síla = kolik si za budoucí důchod koupíte v dnešních cenách. Nominální hodnota = částka v korunách roku odchodu (vyšší číslo, ale zahrnuje budoucí inflaci a valorizace).",
  },
  {
    term: "Předčasný důchod",
    definition:
      "Možnost odejít do důchodu dříve při splnění podmínek. Za každých 90 dní předčasnosti se důchod trvale krátí o 1,5 % výpočtového základu — krácení už zůstává navždy.",
  },
  {
    term: "Předdůchod",
    definition:
      "Čerpání z vlastního doplňkového penzijního spoření až 5 let před nárokem. Nekrátí starobní důchod, stát za vás platí zdravotní pojištění. Bere se jako vyloučená doba.",
  },
  {
    term: "Přesluhování",
    definition:
      "Práce po vzniku nároku na důchod. Za každých 90 dní navíc roste procentní výměra o 1,5 % výpočtového základu (varianta s pobíráním poloviny / bez pobírání důchodu).",
  },
  {
    term: "Invalidní důchod",
    definition:
      "Počítá se ze stejné evidence jako starobní. Tři stupně dle poklesu pracovní schopnosti: I. 35–49 %, II. 50–69 %, III. 70 %+. Podmínkou je i potřebná doba pojištění podle věku.",
  },
];
