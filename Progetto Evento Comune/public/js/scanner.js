document.addEventListener('DOMContentLoaded', function () {
  const gameSelect = document.getElementById('game')
  const buttonScansione = document.getElementById('button_scansione')
  const testoRisultatoScansione = document.getElementById('player-info')
  const evaluationForm = document.getElementById('evaluationForm')
  const submitEvaluationButton = document.getElementById('submitEvaluation')
  const sacchettiInputContainer = document.querySelector(
    '.color-purchase-options',
  )
  const sacchettiInput = document.getElementById('sacchetti')
  let scannedBraceletId = null
  let selectedEvaluation = null
  const visibleplayerInfo = document.getElementById('player-info')

  const evaluationOptions = {
    'color-run': [
      '1° - 60 punti',
      '2° - 50 punti',
      '3° - 40 punti',
      '4° - 30 punti',
      '5° - 20 punti',
      '6° - 15 punti',
    ],
    ostacoloso: [
      'Molto Buono - 80 punti',
      'Buono - 50 punti',
      'Medio - 30 punti',
      'Sufficiente - 20 punti',
    ],
    'buttala-dentro': [
      'Impossibile - 100 punti',
      'Difficile - 60 punti',
      'Facile - 30 punti',
      'Ci ha provato - 10 punti',
    ],
    'contano-i-canestri': [
      '4 Canestri - 60 punti',
      '3 Canestri - 40 punti',
      '2 Canestri - 30 punti',
      '1 Canestro - 20 punti',
      '0 Canestri - 10 punti',
    ],
    'vediamo-quanto-vola': [
      'Molto Buono - 80 punti',
      'Buono - 50 punti',
      'Medio - 30 punti',
      'Sufficiente - 10 punti',
    ],
    'chi-tira-vince': ['Vincita - 50 punti', 'Perdita - 10 punti'],
    'quanto-resisti': [
      '100s - 100 punti',
      '60s - 60 punti',
      '40s - 40 punti',
      'Minimo - 10 punti',
    ],
    'questione-di-punti': [
      '180 - 100 punti',
      '120 - 70 punti',
      '90 - 60 punti',
      '60 - 40 punti',
      '30 - 30 punti',
      'Minimo - 10 punti',
    ],
    'fai-centro': [
      '4 In Buca - 60 punti',
      '3 In Buca - 40 punti',
      '2 In Buca - 30 punti',
      '1 In Buca - 20 punti',
      '0 In Buca - 10 punti',
    ],
    'water-pong': [
      '3 Colpiti - 60 punti',
      '2 Colpiti - 40 punti',
      '1 Colpito - 20 punti',
      '0 Colpiti - 10 punti',
    ],
    'quante-ne-sai': [
      '7+ Indovinate - 90 punti',
      '7 Indovinate - 60 punti',
      '6 Indovinate - 50 punti',
      '5 Indovinate - 40 punti',
      '4 Indovinate - 30 punti',
      '3 Indovinate - 25 punti',
      '2 Indovinate - 20 punti',
      '1 Indovinata - 15 punti',
      '0 Indovinate - 10 punti',
    ],
    reattivita: [
      '0.00s - 80 punti',
      '0.10s - 70 punti',
      '0.30s - 50 punti',
      '0.50s - 30 punti',
      '0.80s - 20 punti',
      '+0.80s - 10 punti',
    ],
    'l-intesa-vincente': [
      '6+ Parole - 45 punti',
      '6 Parole - 35 punti',
      '5 Parole - 30 punti',
      '4 Parole - 25 punti',
      '3 Parole - 20 punti',
      '2 Parole - 15 punti',
      '1 Parola - 10 punti',
      '0 Parole - 5 punti',
    ],
    'sei-troppo-bianco-colorati': ['Sacchetto Colore 80g - 80 punti'],
  }

  function updateEvaluationOptions(game) {
    const evaluationContainer = document.getElementById('evaluationOptions')
    evaluationContainer.innerHTML = ''

    if (evaluationOptions[game]) {
      evaluationOptions[game].forEach((option) => {
        const optionElement = document.createElement('div')
        optionElement.classList.add('evaluation-option')
        optionElement.textContent = option

        optionElement.addEventListener('click', function () {
          document
            .querySelectorAll('.evaluation-option')
            .forEach((el) => el.classList.remove('selected'))
          optionElement.classList.add('selected')
          selectedEvaluation = option
          submitEvaluationButton.disabled = false
        })

        evaluationContainer.appendChild(optionElement)
      })
    }

    // Mostra o nasconde il campo di input per i sacchetti in base al gioco selezionato
    if (game === 'sei-troppo-bianco-colorati') {
      sacchettiInputContainer.style.display = 'block'
    } else {
      sacchettiInputContainer.style.display = 'none'
    }
  }

  function startQrScanner() {
    const qrReaderElement = document.getElementById('qr-reader')
    qrReaderElement.style.display = 'block'

    const html5QrCode = new Html5Qrcode('qr-reader')
    html5QrCode
      .start(
        { facingMode: 'environment' },
        {
          fps: 20,
          qrbox: { width: 200, height: 200 },
          aspectRatio: 1.0,
        },
        (qrCodeMessage) => {
          scannedBraceletId = qrCodeMessage
          testoRisultatoScansione.textContent =
            'Braccialetto scansionato: ' + scannedBraceletId

          // Richiesta al server per ottenere le informazioni del giocatore

          html5QrCode
            .stop()
            .then(() => {
              qrReaderElement.style.display = 'none'
              evaluationForm.style.display = 'block'
            })
            .catch((err) =>
              console.error('Errore durante la chiusura dello scanner:', err),
            )
        },
        (errorMessage) =>
          console.error('Errore nella scansione del QR:', errorMessage),
      )
      .catch((err) => console.error('Impossibile avviare la scansione:', err))
  }

  document.getElementById('ticketScannerIcon').addEventListener('click', () => {
    startQrScanner('ticketCodeInput')
  })

  gameSelect.addEventListener('change', () => {
    const selectedGame = gameSelect.value
    updateEvaluationOptions(selectedGame)
  })

  buttonScansione.addEventListener('click', () => {
    let braceletId =
      scannedBraceletId ||
      document.getElementById('ticketCodeInput').value.trim()

    if (!braceletId) {
      alert('Inserisci o scansiona un codice braccialetto.')
      return
    }

    fetch(`/get-player-info?braceletId=${braceletId}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          // Mostra le informazioni del giocatore con i crediti guadagnati
          document.getElementById('player-info').innerHTML = `
            <p>Email: ${data.player.email}</p>
            <p>Crediti Guadagnati: ${data.player.crediti_guadagnati} crediti</p>
          `

          // Apri il menu per la selezione dei punti
          document.getElementById('evaluationForm').style.display = 'block'
        } else {
          alert('Giocatore non trovato.')
        }
      })
      .catch((error) =>
        console.error('Errore durante il recupero delle informazioni:', error),
      )
  })

  submitEvaluationButton.addEventListener('click', () => {
    let braceletId =
      scannedBraceletId ||
      document.getElementById('ticketCodeInput').value.trim()

    if (!braceletId) {
      alert('Devi prima scansionare o inserire un codice braccialetto.')
      return
    }

    const evaluationData = {
      game: gameSelect.value,
      braceletId: braceletId, // Usa il valore scansionato o inserito manualmente
      points: selectedEvaluation.split('-')[1].trim(),
    }

    // Se il gioco selezionato è "sei-troppo-bianco-colorati", aggiungi la quantità dei sacchetti
    if (gameSelect.value === 'sei-troppo-bianco-colorati') {
      evaluationData.sacchetti = sacchettiInput.value

      if (!evaluationData.sacchetti || evaluationData.sacchetti <= 0) {
        alert("Devi selezionare almeno un sacchetto per l'acquisto.")
        return
      }
    }

    fetch('/submit-evaluation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(evaluationData),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          alert('Valutazione salvata con successo.')
          testoRisultatoScansione.textContent = ''
          evaluationForm.style.display = 'none'
          submitEvaluationButton.disabled = true
        } else {
          alert(data.message)
        }
      })
      .catch((error) => console.error('Errore durante la richiesta:', error))
  })

  updateEvaluationOptions(gameSelect.value)
})
