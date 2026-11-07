# 📺 Fjernbetjening

Styr dit TV fra telefonen. En hurtig, mobilvenlig fjernbetjening med alle de knapper en rigtig fjernbetjening har – plus genveje, apps, tekstindtastning, touchpad og sleep-timer.

Virker med **Samsung** (Tizen, 2016+), **LG** (webOS), **Sony Bravia** og **Roku**. Der er også et **Demo-TV**, så du kan prøve det hele uden et TV.

## Sådan virker det

En browser på telefonen må ikke selv tale direkte med TV'et, så appen består af to dele:

1. **Broen** (`server.js`) – et lille program uden afhængigheder, der kører på en enhed på dit hjemmenetværk (computer, Raspberry Pi, NAS – eller selve Android-telefonen via Termux). Den taler med TV'et.
2. **Fjernbetjeningen** – web-appen du åbner på telefonen. Den kan tilføjes til hjemmeskærmen, så den åbner som en almindelig app.

```
Telefon  ──Wi-Fi──▶  Broen (server.js)  ──▶  TV
```

## Kom i gang

Kræver [Node.js](https://nodejs.org) 20 eller nyere.

```bash
cd fjernbetjening
npm start
```

Broen skriver en adresse som `http://192.168.1.20:8777`. Åbn den på telefonen (samme Wi-Fi), gå til **Indstillinger → Tilføj TV**, tryk **Find TV'er på netværket** og vælg dit TV. Godkend forbindelsen på TV-skærmen første gang.

**Tilføj til hjemmeskærm:** iPhone: Del → *Føj til hjemmeskærm*. Android: menu ⋮ → *Føj til startskærm*.

### Kun en Android-telefon?

Installér [Termux](https://termux.dev) og kør:

```bash
pkg install nodejs git
git clone https://github.com/lukadumic19/fitnessmakker && cd fitnessmakker/fjernbetjening
npm start
```

Åbn derefter `http://localhost:8777` i telefonens browser.

### Kør broen automatisk (Raspberry Pi / Linux)

```bash
# /etc/systemd/system/fjernbetjening.service
[Unit]
Description=Fjernbetjening
After=network-online.target

[Service]
WorkingDirectory=/home/pi/fitnessmakker/fjernbetjening
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

`sudo systemctl enable --now fjernbetjening`

## Funktioner

- **Alle de vigtige knapper** – tænd/sluk, lydstyrke, kanal, piletaster med OK, tilbage, hjem, menu, info, guide, afslut, hurtigmenu, kilde, lydløs.
- **Langt tryk gentager** – hold lyd, kanal eller pilene nede, så bliver knappen ved.
- **Touchpad** – stryg for at navigere, tryk for OK og hold for Tilbage. På LG kan touchpad'en også styre **musemarkøren**.
- **Afspilning** – afspil/pause, spol, stop, optag og undertekster.
- **Taltastatur**, kanalliste og forrige kanal.
- **Farveknapper** (rød/grøn/gul/blå) og søgeknap.
- **Favoritkanaler** – ét tryk skifter til fx DR1 eller TV 2.
- **App-genveje** – Netflix, YouTube, DR TV, TV 2 Play, Disney+, Prime Video, Max, Viaplay, SkyShowtime, Spotify, Plex og Twitch. Kendes app'ens id ikke, slås den op i TV'ets egen app-liste. Du kan også hente **alle apps på TV'et**.
- **Kildevælger** – vælg HDMI-indgang fra en liste (LG, Sony, Roku TV).
- **Skriv på TV'et** – skriv søgeord eller koder på telefonens tastatur i stedet for at taste med pilene. Med **tale-til-tekst**, hvor browseren understøtter det, og historik.
- **Genveje (makroer)** – lav dine egne trin-for-trin genveje, fx *Filmaften*: tænd TV → vent → åbn Netflix. Trin kan være knapper, kanaler, apps, tekst, pauser, tænd/sluk og sleep-timer.
- **Sleep-timer** – slukker TV'et efter 15 min til 2 timer (kører i broen, så telefonen må gerne låses).
- **Tænd via netværket** – langt tryk på tænd-knappen sender Wake-on-LAN. MAC-adressen hentes automatisk når muligt.
- **Status** – se om TV'et er tændt, hvilken app der kører, og lydstyrken (LG, Sony, Demo).
- **Flere TV'er** – skift mellem stue, soveværelse osv. Alle telefoner i hjemmet deler TV'er, favoritter og genveje.
- **Vibration ved tryk**, lyst/mørkt tema efter telefonens indstilling, og tastaturgenveje på en computer (pile, Enter, Backspace, M, +/−).

## Opsætning pr. TV-mærke

| Mærke | På TV'et | Parring |
| --- | --- | --- |
| Samsung | Slå *Tænd med mobil* / *Netværksstandby* til for at kunne tænde det. | Vælg **Tillad** når TV'et spørger. |
| LG | Slå *LG Connect Apps* og *Tænd via Wi-Fi* til (findes under *Generelt/Forbindelse*). | Tryk **Accepter** med TV'ets egen fjernbetjening. |
| Sony | Indstillinger → Netværk → Hjemmenetværk → **IP-kontrol**: godkendelse *Normal og Pre-Shared Key*, vælg en kode, og slå *Fjernstart* til. | Indtast koden (PSK) i app'en. |
| Roku | Indstillinger → System → Avanceret → **Styring via mobilapps**: *Aktiveret*. | Ingen. |

**Tip:** Giv TV'et en fast IP-adresse i din router, så skal du ikke rette den senere.

## Fejlfinding

- **"Kan ikke nå broen"** – kører `npm start` stadig, og er telefonen på samme Wi-Fi? Tjek også computerens firewall (port 8777).
- **TV'et findes ikke ved søgning** – tast IP-adressen ind manuelt. Nogle routere blokerer søgning (SSDP) mellem Wi-Fi og kabel.
- **Kan ikke tænde TV'et** – Wake-on-LAN skal være slået til på TV'et, og MAC-adressen skal være udfyldt. Mange TV'er kan kun vågne via netværket kort tid efter de er slukket, eller kun via kabel.
- **En knap virker ikke** – ikke alle TV'er har alle knapper; app'en giver besked, hvis en knap ikke understøttes.

## Indstillinger

| Variabel | Standard | Betydning |
| --- | --- | --- |
| `PORT` | `8777` | Porten broen lytter på |
| `HOST` | `0.0.0.0` | Netværksadressen broen lytter på |
| `DATA_DIR` | `./data` | Hvor TV'er, nøgler, favoritter og genveje gemmes |

Broen har ingen login – den er beregnet til dit eget hjemmenetværk. Gør den ikke tilgængelig på internettet.

## Udvikling

```bash
npm test   # tester protokollerne mod simulerede Samsung-, LG- og Roku-TV'er
```

- `server.js` – HTTP-server og API (`/api/...`), sleep-timer og genveje
- `lib/drivers/` – én driver pr. TV-mærke, der oversætter fælles knapnavne til TV'ets protokol
- `lib/ws.js` – lille WebSocket-klient uden afhængigheder
- `lib/net.js` – søgning efter TV'er (SSDP), Wake-on-LAN og MAC-opslag
- `public/` – selve fjernbetjeningen (HTML/CSS/JS, intet byggetrin)

LG-parringsmanifestet (`lib/drivers/lg-pairing.json`) stammer fra [lgtv2](https://github.com/hobbyquaker/lgtv2) (MIT).
