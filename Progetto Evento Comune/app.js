require('dotenv').config() // Carica le variabili d'ambiente

const fs = require('fs')
const express = require('express')
const session = require('express-session')
const path = require('path')
const bodyParser = require('body-parser')
const QRCode = require('qrcode') // Importa il modulo qrcode
const nodemailer = require('nodemailer') // Importa il modulo nodemailer
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { v4: uuidv4 } = require('uuid')
const mongoose = require('mongoose') // Importa mongoose

const app = express()

// Connessione a MongoDB
mongoose.connect(
  '#SERVER CONNECTION STRING',
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
)

const db = mongoose.connection
db.on('error', console.error.bind(console, 'MongoDB connection error:'))
db.once('open', function () {
  console.log('Connected to MongoDB')
})

// Modelli Mongoose
const userSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  firstName: String,
  lastName: String,
  email: String,
  paymentStatus: Boolean,
})

const playerSchema = new mongoose.Schema({
  email: { type: String, required: true },
  ticket_id: { type: String, required: true },
  bracelet_id: { type: String, required: true },
  games: { type: Array, default: [] },
  crediti_guadagnati: { type: Number, default: 0 },
  punteggio_classifica: { type: Number, default: 0 },
})

const Player = mongoose.model('Player', playerSchema)

const User = mongoose.model('User', userSchema)

// Set view engine to Pug
app.set('view engine', 'pug')
app.set('views', path.join(__dirname, 'views'))

// Servi file statici dalla cartella 'public'
app.use(express.static(path.join(__dirname, 'public')))
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString()
    },
  }),
)

app.use(
  session({
    secret: '#',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  }),
)

function checkAuth(req, res, next) {
  if (req.session.isAuthenticated) {
    next() // L'utente è autenticato, può accedere
  } else {
    res.redirect('/adminlogin') // Non autenticato, reindirizza alla pagina di login
  }
}

// Middleware per parsare il body delle richieste POST
app.use(bodyParser.urlencoded({ extended: true }))

const transporter_intern = nodemailer.createTransport({
  service: '#',
  auth: {
    user: '#',
    pass: '#',
  },
})

const transporter_out = nodemailer.createTransport({
  service: '#',
  auth: {
    user: '#',
    pass: '#',
  },
})

// Middleware per parsare il body delle richieste POST
app.use(bodyParser.urlencoded({ extended: true }))

const usersFile = path.join(__dirname, 'users.json')

function loadUsers() {
  if (fs.existsSync(usersFile)) {
    const data = fs.readFileSync(usersFile)
    return JSON.parse(data)
  }
  return []
}

function saveUsers(users) {
  try {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2))
    console.log('Utenti salvati con successo.')
  } catch (err) {
    console.error('Errore durante il salvataggio degli utenti:', err)
  }
}

app.post('/register', async (req, res) => {
  console.log('Ricevuto un POST a /register con dati:', req.body) // Logga i dati ricevuti

  const { firstName, lastName, email } = req.body

  try {
    let user = await User.findOne({ email }) // Cerca un utente con la stessa email

    if (user) {
      if (user.paymentStatus === false) {
        // Se l'utente esiste ed è in attesa di pagamento, aggiornalo con un nuovo UUID
        user.id = uuidv4()
        await user.save()
        console.log('Utente esistente aggiornato con nuovo UUID:', user)
      } else {
        // Se il pagamento è già stato completato, crea un nuovo utente con la stessa email
        user = new User({
          id: uuidv4(),
          firstName,
          lastName,
          email,
          paymentStatus: false, // Imposta lo stato del pagamento a false inizialmente
        })
        await user.save()
        console.log('Nuovo utente creato con la stessa email:', user)
      }
    } else {
      // Se non esiste un utente, creane uno nuovo
      user = new User({
        id: uuidv4(),
        firstName,
        lastName,
        email,
        paymentStatus: false, // Imposta lo stato del pagamento a false inizialmente
      })
      await user.save()
      console.log('Nuovo utente creato:', user)
    }

    // Crea una sessione di pagamento Stripe e reindirizza l'utente
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: '#', // Sostituisci con il tuo price ID
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `https://colorgame.it/success?user_id=${user.id}`,
      cancel_url: `https://colorgame.it/cancel`,
      metadata: { userId: user.id }, // Aggiungi l'UUID ai metadata della sessione
    })

    res.redirect(303, session.url) // Reindirizza l'utente alla pagina di pagamento
  } catch (error) {
    console.error('Errore durante la registrazione o pagamento:', error)
    res.status(500).send('Errore durante la registrazione o pagamento')
  }
})

app.get('/success', async (req, res) => {
  const { user_id } = req.query

  try {
    const user = await User.findOne({ id: user_id })
    if (user) {
      user.paymentStatus = true // Aggiorna lo stato del pagamento a true
      await user.save()

      // Percorso della cartella temp
      const tempDir = path.join(__dirname, 'temp')

      // Controlla se la cartella temp esiste, altrimenti la crea
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }

      // Genera il codice QR usando l'ID dell'utente
      const qrCodePath = path.join(tempDir, `${user_id}.png`)
      await QRCode.toFile(qrCodePath, user_id)

      // Configura l'email da inviare con il QR code
      const mailOptions = {
        from: '#',
        to: user.email,
        subject: 'Il tuo biglietto elettronico',
        html: `
          <div style="background-color: rgb(13, 55, 127); padding: 20px; font-family: Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1); text-align: center;">
              <h1 style="color: rgb(13, 55, 127);">Grazie per il tuo acquisto!</h1>
              <p style="font-size: 18px; color: rgb(13, 55, 127);">Il tuo biglietto è pronto. Scansiona questo codice QR all'ingresso:</p>
              <img src="cid:qrCodeImage" alt="QR Code" style="margin: 20px 0;"/>
              <p style="font-size: 16px; color: rgb(13, 55, 127);">Non vediamo l'ora di vederti al nostro evento!</p>
              <a href="https://colorgame.it/" style="display: inline-block; padding: 10px 20px; background-color: rgb(255, 165, 0); color: white; text-decoration: none; font-size: 16px; border-radius: 5px; margin-top: 20px;">Leggi il programma</a>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: 'qrcode.png',
            path: qrCodePath,
            cid: 'qrCodeImage', // Identificatore dell'immagine per usarla nel contenuto dell'email
          },
        ],
      }

      // Invia l'email con il QR code
      transporter_out.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log("Errore nell'invio dell'email:", error)
          return res
            .status(500)
            .send("Errore durante l'invio del biglietto elettronico.")
        }
        console.log('Email inviata:', info.response)
        res.render('success') // Mostra la pagina di successo

        // Rimuovi il file QR code temporaneo dopo l'invio dell'email
        fs.unlink(qrCodePath, (err) => {
          if (err) {
            console.log('Errore nella cancellazione del file QR code:', err)
          }
        })
      })
    } else {
      res.status(404).send('Utente non trovato')
    }
  } catch (error) {
    console.error("Errore durante l'aggiornamento dell'utente:", error)
    res.status(500).send("Errore durante l'aggiornamento dell'utente")
  }
})

app.post('/richiestacontatto', (req, res) => {
  const { nome, email, messaggio } = req.body

  // Verifica se i dati vengono ricevuti correttamente
  console.log('Nome:', nome)
  console.log('Email:', email)
  console.log('Messaggio:', messaggio)

  // Configurazione dell'email
  const mailOptions = {
    from: 'tuoindirizzo@gmail.com',
    to: '#',
    subject: 'Nuova Richiesta di Contatto',
    text: `Hai ricevuto una nuova richiesta di contatto:\n\nNome: ${nome}\nEmail: ${email}\nMessaggio: ${messaggio}`,
  }

  // Invia l'email
  transporter_intern.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Errore durante l'invio dell'email:", error)
      return res
        .status(500)
        .json({ error: "Errore durante l'invio dell'email." })
    }
    console.log('Email inviata:', info.response)
  })
})

app.post('/richiestasponsor', (req, res) => {
  const { nomeazienda, email, messaggio } = req.body

  // Verifica se i dati vengono ricevuti correttamente
  console.log('Nome:', nomeazienda)
  console.log('Email:', email)
  console.log('Messaggio:', messaggio)

  // Configurazione dell'email
  const mailOptions = {
    from: 'tuoindirizzo@gmail.com',
    to: '#',
    subject: 'Nuova Richiesta di Sponsor',
    text: `Hai ricevuto una nuova richiesta di Sponsor:\n\nNome: ${nomeazienda}\nEmail: ${email}\nMessaggio: ${messaggio}`,
  }

  // Invia l'email
  transporter_intern.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Errore durante l'invio dell'email:", error)
      return res
        .status(500)
        .json({ error: "Errore durante l'invio dell'email." })
    }
    console.log('Email inviata:', info.response)

    // Risposta al client
    res.json({
      message: 'Richiesta di contatto ricevuta e email inviata con successo!',
    })
  })
})

// Routes
app.get('/registrati', (req, res) => {
  res.render('register')
})

app.get('/cancel', (req, res) => {
  res.render('cancel')
})

app.get('/adminlogin', (req, res) => {
  res.render('adminlogin') // Renderizza il modulo di login
})

// Gestione del login
app.post('/adminlogin', (req, res) => {
  const { username, password } = req.body

  // Pulisci i dati in ingresso
  const cleanUsername = username.trim()
  const cleanPassword = password.trim()

  // Controlla se l'utente è già autenticato
  if (req.session.isAuthenticated) {
    return res.redirect('/private')
  }

  // Controlla le credenziali (nel tuo caso, saranno uguali per tutti)
  if (cleanUsername === '#' && cleanPassword === '#') {
    req.session.isAuthenticated = true
    res.redirect('/private') // Reindirizza alla pagina privata
  } else {
    res.render('adminlogin', { error: 'Credenziali errate' })
  }
})

app.post('/adminregister', async (req, res) => {
  const { firstName, lastName, email, uuid } = req.body

  console.log(req.body)

  try {
    let user = await User.findOne({ email })
    if (!user) {
      user = new User({
        id: uuid || uuidv4(), // Usa l'UUID personalizzato se fornito, altrimenti genera uno nuovo
        firstName,
        lastName,
        email,
        paymentStatus: true,
      })
      await user.save()
      return res
        .status(200)
        .json({ message: 'Registrazione avvenuta con successo!' })
    } else {
      return res.status(400).json({ message: 'Utente già registrato!' })
    }
  } catch (error) {
    console.error('Errore durante la registrazione:', error)
    return res
      .status(500)
      .json({ message: 'Errore del server. Riprova più tardi.' })
  }
})

app.get('/private', checkAuth, (req, res) => {
  // TODO
  res.render('admindashboard') // Renderizza la pagina privata
})

// Pagine interne protette
app.get('/private/registrazionecontanti', checkAuth, (req, res) => {
  res.render('adminregister')
})

app.get('/private/checkin', checkAuth, (req, res) => {
  res.render('assegnacodici')
})

app.get('/private/assegnazionepunti', checkAuth, (req, res) => {
  res.render('assegnapunti')
})

app.get('/private/adminclassifica', checkAuth, async (req, res) => {
  try {
    const players = await Player.find()
      .sort({ punteggio_classifica: -1 })
      .lean()

    // Recupera i dati di tutti gli utenti in una volta
    const users = await User.find({}).lean()

    // Associa nome e cognome a ciascun player
    const playerWithDetails = players.map((player) => {
      const user = users.find((u) => u.id === player.ticket_id) // match con l'id dell'utente
      return {
        ...player,
        firstName: user ? user.firstName : 'N/A',
        lastName: user ? user.lastName : 'N/A',
      }
    })

    res.render('adminclassifica', { players: playerWithDetails })
  } catch (error) {
    console.error(
      'Errore durante il recupero dei dati per la classifica:',
      error,
    )
    res.status(500).send('Errore del server.')
  }
})

app.get('/disclaimerprivacy', (req, res) => {
  res.render('disclaimerprivacy')
})

app.get('/limitazionediresponsabilita', (req, res) => {
  res.render('limitazionediresponsabilita')
})

app.get('/adminLogin', (req, res) => {
  res.render('adminlogin')
})

app.get('/contatti', (req, res) => {
  res.render('contatti')
})

app.get('/sponsors', (req, res) => {
  res.render('sponsors')
})

app.get('/partecipa', (req, res) => {
  res.render('partecipa')
})

app.get('/home', (req, res) => {
  res.render('home')
})

// Route per mostrare il form
app.get('/', (req, res) => {
  res.render('home', {
    error: null,
    firstName: '',
    lastName: '',
    email: '',
  })
})

// Funzione per gestire la registrazione

// Route per gestire il form normale
app.post('/iscriviti', (req, res) => {
  handleRegistration(req, res, false)
})

// Route per gestire il form atleta
app.post('/iscrizioneatleta', (req, res) => {
  handleRegistration(req, res, true)
})

app.get('/checkout', (req, res) => {
  res.render('checkout', {
    publicKey: process.env.STRIPE_PUBLIC_KEY,
  })
})

app.post('/check-ticket-and-bracelet', async (req, res) => {
  const { ticketCode, braceletCode } = req.body
  console.log('Ricevuta richiesta per:', { ticketCode, braceletCode }) // Log per debug

  try {
    // Controlla se il biglietto esiste nella collection 'users'
    const user = await User.findOne({ id: ticketCode })
    if (!user) {
      console.log('Ticket non trovato:', ticketCode)
      return res.json({ valid: false, message: 'Ticket non trovato.' })
    }

    // Controlla se esiste già un player con lo stesso ticket_id o bracelet_id
    const existingPlayer = await Player.findOne({
      $or: [{ ticket_id: ticketCode }, { bracelet_id: braceletCode }],
    })

    if (existingPlayer) {
      console.log('Player duplicato trovato:', existingPlayer)
      return res.json({
        valid: false,
        message: 'Esiste già un player con questo ticket_id o bracelet_id.',
      })
    }

    // Crea un nuovo oggetto 'player' nella collection 'players'
    const newPlayer = new Player({
      email: user.email,
      ticket_id: ticketCode, // Usa ticketCode come ticket_id
      bracelet_id: braceletCode, // Usa braceletCode come bracelet_id
      games: [], // Lista giochi vuota, da riempire successivamente
    })

    await newPlayer.save()
    console.log('Player creato con successo:', newPlayer)
    return res.json({ valid: true, message: 'Player creato con successo.' })
  } catch (error) {
    console.error('Errore nel controllo del biglietto e braccialetto:', error)
    return res.status(500).json({ valid: false, message: 'Errore del server.' })
  }
})

app.post('/submit-evaluation', async (req, res) => {
  let { braceletId, game, points, sacchetti } = req.body

  try {
    // Converti i valori in numeri
    points = parseInt(points.split(' ')[0], 10) // Estrai solo il numero dai punti
    sacchetti = sacchetti ? parseInt(sacchetti, 10) : 0

    const player = await Player.findOne({ bracelet_id: braceletId })

    if (!player) {
      return res
        .status(404)
        .json({ success: false, message: 'Player non trovato.' })
    }

    // Controlla se il gioco è già stato giocato, tranne "sei-troppo-bianco-colorati"
    const existingGameIndex = player.games.findIndex((g) => g.name === game)
    if (existingGameIndex !== -1 && game !== 'sei-troppo-bianco-colorati') {
      return res
        .status(400)
        .json({ success: false, message: "Gioco già giocato dall'utente" })
    }

    // Se il gioco non è stato giocato o è "sei-troppo-bianco-colorati", procediamo
    if (game === 'sei-troppo-bianco-colorati') {
      const totalCost = sacchetti * 80
      if (player.crediti_guadagnati < totalCost) {
        return res.status(400).json({
          success: false,
          message: `Crediti insufficienti per acquistare i sacchetti. Hai ${player.crediti_guadagnati} crediti disponibili.`,
        })
      }
      // Sottrarre i crediti per i sacchetti
      player.crediti_guadagnati -= totalCost

      // Aggiungi un record per l'acquisto dei sacchetti (non influisce sulla classifica)
      player.games.push({ name: game, score: points })
    } else {
      // Aggiungi un nuovo gioco e aggiorna i punteggi per i giochi regolari
      player.games.push({ name: game, score: points })
      player.punteggio_classifica += points
      player.crediti_guadagnati += points
    }

    // Salvataggio dei dati aggiornati
    await player.save()

    res.json({
      success: true,
      message: 'Valutazione aggiornata.',
      punteggio_classifica: player.punteggio_classifica,
      crediti_guadagnati: player.crediti_guadagnati,
    })
  } catch (error) {
    console.error('Errore durante la valutazione:', error)
    res.status(500).json({ success: false, message: 'Errore del server.' })
  }
})

app.get('/get-player-info', async (req, res) => {
  const { braceletId } = req.query

  try {
    const player = await Player.findOne({ bracelet_id: braceletId })

    if (!player) {
      return res
        .status(404)
        .json({ success: false, message: 'Giocatore non trovato' })
    }

    // Risposta JSON con email e crediti guadagnati
    res.json({
      success: true,
      player: {
        email: player.email, // Restituisce l'email
        crediti_guadagnati: player.crediti_guadagnati, // Restituisce i crediti guadagnati
      },
    })
  } catch (error) {
    console.error('Errore nel recupero del giocatore:', error)
    res.status(500).json({ success: false, message: 'Errore del server' })
  }
})

// Start the server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
