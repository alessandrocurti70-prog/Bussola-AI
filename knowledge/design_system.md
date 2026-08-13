# Bussola AI — Design System (regole visive del sito)

**In una riga:** bianco, tanto respiro, testo serif da rivista, un solo accento blu bussola. Meno è meglio.
**Direzione:** stile editoriale minimal ispirato all'esperienza di lettura di Substack — serif su fondo bianco, il blu della bussola come unico accento. Pulito, autorevole, umano.

## Colori
| Ruolo | Nome | HEX | Uso |
|---|---|---|---|
| Fondo principale | Bianco | `#FFFFFF` | Sfondo di quasi tutto |
| Testo principale | Inchiostro | `#0F172A` | Titoli e corpo |
| Testo secondario | Ardesia | `#475569` | Sottotitoli, didascalie, metadati |
| Testo tenue | Grigio nebbia | `#64748B` | Etichette piccole, date |
| **Accento (bussola)** | **Blu bussola** | **`#2E7DF6`** | Link, pulsanti, dettagli, icona |
| Accento scuro | Blu profondo | `#0B3D91` | Logo, titoli d'impatto |
| Sfondo tenue | Azzurro nebbia | `#EAF2FF` | Riquadri evidenziati, badge |
| Linee/bordi | Grigio chiaro | `#E7ECF3` | Separatori sottili |
| Navbar scura | Navy | `#08111f` | Barra di navigazione (ospita il logo) |

**Regola d'oro:** il blu è prezioso perché raro. Usalo solo dove serve attirare l'occhio. Da evitare: gradienti, ombre pesanti, colori accesi diversi dal blu, fondi scuri (salvo la navbar).

## Tipografia
- **Contenuti — Source Serif 4** (serif): logo, titoli, sottotitoli e tutto il corpo. Titoli 700; occhiello 400 corsivo; corpo 400 con interlinea generosa (1.75).
- **Servizio — Hanken Grotesk** (sans): etichette, date, metadati, pulsanti, menu. Mai per contenuti lunghi.
- Entrambi gratuiti su Google Fonts. Fallback: Georgia (serif), Arial (sans).
- Regole: sentence case (mai TUTTO MAIUSCOLO né Ogni Parola Maiuscola); max due pesi serif (400/700); righe ~65-75 caratteri.

## Logo
Icona bussola (rosa dei venti) in blu bussola `#2E7DF6` + logotipo "Bussola AI" in Source Serif 4 bold. Il logo vive nella navbar scura `#08111f`.

## Layout e responsive
Il bianco è protagonista: margini generosi. Articoli in una colonna centrata (~larghezza da rivista). Separatori sottili grigio chiaro; angoli arrotondati 8-12px; niente ombre marcate. Un solo elemento colorato per vista. Tutto leggibile su computer, smartphone e tablet.

## Convivenza layout ↔ immagini
Il layout del sito resta minimal ed editoriale (bianco, serif, un accento blu); le **immagini** sono ricche e illustrate (vedi `image_design_system.md`). Pagina pulita + copertina illustrata d'impatto.

## Tono visivo
Pulito · Autorevole · Umano. Se un elemento non aiuta la lettura o non guida l'utente, si toglie.
