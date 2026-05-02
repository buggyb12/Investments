# Důchodová kalkulačka

Orientační důchodová kalkulačka pro finanční poradce — gap analýza, potřebný
kapitál a měsíční odkládání. Single-page React aplikace s živým výpočtem
a PDF reportem pro klienta.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS (custom paper aesthetic)
- `@react-pdf/renderer` pro klientský report
- `recharts` pro vizualizace
- `motion` pro animace

## Spuštění

```bash
npm install
npm run dev      # http://localhost:5173
npm run test     # vitest — testy výpočtového jádra
npm run build    # produkční build
```

## Struktura

- `src/lib/pension.ts` — výpočtové jádro (státní důchod, gap, anuity)
- `src/lib/retirementAge.ts` — tabulka důchodového věku ČR
- `src/components/InputForm.tsx` — formulář vstupů
- `src/components/ResultsPanel.tsx` — živé výsledky + CTA stažení PDF
- `src/components/pdf/ClientReport.tsx` — A4 PDF report

## Disclaimer

Výpočet je orientační, není závazným výpočtem ČSSZ. Skutečný důchod závisí na
celoživotních příjmech a aktuálních pravidlech v roce odchodu do důchodu.
