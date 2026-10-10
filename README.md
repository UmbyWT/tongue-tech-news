# Tongue Tech

Un'app che mostra le ultime notizie pubblicate su Hacker News, dieci alla volta. L'ho sviluppata per Tongue, l'azienda (inventata) del progetto JavaScript Advanced del master start2impact: l'idea è portare le notizie tech a chi di solito le incontra scorrendo i social.

## Prova l'applicazione

**https://umbywt.github.io/tongue-tech-news/**

![L'elenco delle ultime notizie su desktop](docs/screenshot-desktop.png)

## Cosa fa

All'avvio l'app chiede a Hacker News la lista degli id delle ultime notizie (sono circa 500) e carica il dettaglio solo delle prime 10. Per ogni notizia mostra titolo, link e data di pubblicazione, più il sito di provenienza e l'autore.

In fondo all'elenco c'è il pulsante Load more. Ogni click prende i 10 id successivi dalla lista già scaricata e chiama l'API di dettaglio solo per quelli. La lista degli id non viene richiesta di nuovo.

Ho aggiunto qualche cosa che la consegna non chiedeva:

- mentre i dati arrivano compaiono delle righe grigie al posto delle notizie, così la pagina non salta
- se la rete non risponde esce un messaggio con il pulsante Riprova, e le notizie già caricate restano dove sono
- accanto a ogni notizia c'è da quanto tempo è uscita ("5 min fa"), aggiornato ogni minuto
- il pulsante Aggiorna in alto riparte dalle notizie più recenti
- quando le notizie sono finite il pulsante Load more sparisce e un messaggio lo dice

![L'app su telefono, con il pulsante Load more in fondo all'elenco](docs/screenshot-mobile.png)

## Il flusso delle chiamate

1. `GET /v0/newstories.json` restituisce un array di circa 500 id, dal più recente al più vecchio.
2. L'app prende i primi 10 id e fa partire insieme 10 chiamate a `GET /v0/item/<id>.json`.
3. Quando sono arrivate tutte, le notizie vanno in pagina nell'ordine della lista.
4. Con Load more si ripetono i punti 2 e 3 sui 10 id successivi.

All'avvio le chiamate sono quindi 11 e non 501. Le dieci chiamate di dettaglio partono in parallelo con `Promise.allSettled`: se una fallisce le altre nove vengono mostrate comunque, se falliscono tutte l'app mostra l'errore.

Guardando le risposte vere ho trovato un paio di casi da gestire. Circa 3 notizie su 100 non hanno il campo `url` (sono i post "Ask HN"): in quel caso il link porta alla discussione su Hacker News. Per un id inesistente l'API risponde `null`, e la documentazione prevede notizie segnate come `deleted` o `dead`: l'app le salta.

## Architettura e design pattern

Il codice è diviso in quattro parti che si parlano in una sola direzione:

```
API di Hacker News  ->  repository  ->  store  ->  vista
```

Ho usato due pattern.

Il primo è il Repository (`src/js/api/newsRepository.js`). È l'unico file che conosce gli indirizzi di Hacker News e la forma dei dati che arrivano. Il resto dell'app riceve oggetti già puliti, con `title`, `url`, `publishedAt` e poco altro. Il client HTTP gli viene passato da fuori: nell'app è Axios, nei test è un oggetto finto. Se domani Tongue volesse leggere le notizie da un'altra fonte, cambierebbe solo questo file.

Il secondo è l'Observer (`src/js/store/newsStore.js`). Lo store tiene lo stato (lista degli id, notizie caricate, a che punto sono) e avvisa chi si è iscritto ogni volta che lo stato cambia. La vista si iscrive e ridisegna la pagina. In questo modo lo store non sa nulla del DOM e la vista non sa nulla delle API, e posso provare tutta la logica del Load more senza aprire un browser.

`main.js` si limita a collegare i pezzi.

## Struttura del progetto

```
tongue-tech-news/
├── index.html
├── src/
│   ├── js/
│   │   ├── main.js              punto di partenza
│   │   ├── config.js            indirizzi e costanti
│   │   ├── api/
│   │   │   ├── httpClient.js    istanza di Axios
│   │   │   └── newsRepository.js
│   │   ├── store/
│   │   │   └── newsStore.js
│   │   ├── ui/
│   │   │   ├── newsView.js      aggiorna la pagina in base allo stato
│   │   │   └── storyItem.js     crea la riga di una notizia
│   │   └── utils/
│   │       ├── date.js          date e "5 min fa"
│   │       ├── pagination.js    blocchi da 10
│   │       └── story.js         pulizia dei dati dell'API
│   ├── css/
│   │   └── style.css
│   └── img/
│       └── favicon.svg
├── tests/
│   ├── unit/
│   ├── integration/
│   └── helpers/
├── docs/                        screenshot del README
├── .github/workflows/deploy.yml
├── vite.config.js
└── package.json
```

## Tecnologie

- JavaScript ES6+ con moduli ES, senza framework
- [Vite](https://vite.dev/) come server di sviluppo e per la build
- [Vitest](https://vitest.dev/) per i test, con jsdom per quelli che toccano il DOM
- [Axios](https://axios-http.com/) per le chiamate HTTP
- [Lodash](https://lodash.com/) (`get`) per leggere i campi delle risposte senza errori quando mancano
- Font Roboto e Roboto Condensed, installati da NPM con Fontsource

Le date sono formattate con `Intl`, che è già nel browser, quindi non ho aggiunto librerie apposta.

## Avvio in locale

Serve Node 20.19 o superiore (io ho usato la 22).

```bash
git clone https://github.com/UmbyWT/tongue-tech-news.git
cd tongue-tech-news
npm install
npm run dev
```

Poi apri l'indirizzo che compare nel terminale, di solito `http://localhost:5173`.

Per la versione di produzione:

```bash
npm run build     # crea la cartella dist
npm run preview   # la serve in locale per controllarla
```

## Test

```bash
npm test            # tutti i test, una volta
npm run test:watch  # li rilancia a ogni salvataggio
npm run coverage    # con il report di copertura
```

I test sono 70, divisi in sei file.

I test unitari coprono le funzioni che fanno calcoli o trasformano dati: la conversione del tempo di Hacker News (che è in secondi) in una data, il formato della data, il tempo relativo, il taglio della lista in blocchi da 10, la pulizia dei dati di una notizia. Ci sono poi i test del repository, con un client HTTP finto, e quelli dello store, con un repository finto.

I test di integrazione montano repository, store e vista veri sull'HTML di `index.html` e controllano quello che un utente vedrebbe: 10 notizie all'avvio con 10 chiamate di dettaglio, altre 10 dopo Load more, i messaggi di errore, la fine della lista.

La copertura è intorno al 98% delle righe. Resta fuori `main.js`, che collega soltanto i moduli e che ho provato a mano nel browser.

## Deploy

L'app è pubblicata su GitHub Pages. A ogni push su `main` una GitHub Action installa le dipendenze, lancia i test, fa la build e pubblica la cartella `dist`. Se un test fallisce il sito resta quello di prima.

In `vite.config.js` ho impostato `base: './'`, così la build usa percorsi relativi e funziona anche dentro la sottocartella `/tongue-tech-news/`.

## Qualche nota

Il pulsante si chiama Load more, in inglese, perché la consegna lo indica con questo nome. Il resto dell'interfaccia è in italiano, come il pubblico di Tongue.

I titoli vengono scritti in pagina con `textContent` e mai con `innerHTML`: arrivano da un servizio esterno e non devono poter inserire HTML. Per lo stesso motivo accetto solo link che iniziano con `http` o `https`.

Se una singola notizia non si carica viene saltata senza avvisi. Mi è sembrato meglio mostrarne 9 che bloccare tutto per una, ma è una scelta discutibile: in un prodotto vero aggiungerei un secondo tentativo.

## Autore

Umberto Brignone

- GitHub: [UmbyWT](https://github.com/UmbyWT)
- LinkedIn: [umberto-brignone](https://www.linkedin.com/in/umberto-brignone/)
