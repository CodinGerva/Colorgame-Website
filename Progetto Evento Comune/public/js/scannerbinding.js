document.addEventListener('DOMContentLoaded', function () {
  let selectedInput = null // Per determinare quale input riempire
  let scannedQrCode = null

  // Funzione per avviare lo scanner QR
  function startQrScanner(targetInput) {
    selectedInput = targetInput
    document.getElementById('qr-reader').style.display = 'block'

    const html5QrCode = new Html5Qrcode('qr-reader')
    html5QrCode
      .start(
        { facingMode: 'environment' },
        {
          fps: 20,
          qrbox: { width: 200, height: 300 },
          aspectRatio: 1.0,
        },
        (qrCodeMessage) => {
          document.getElementById(selectedInput).value = qrCodeMessage
          html5QrCode.stop().then(() => {
            document.getElementById('qr-reader').style.display = 'none'
          })
        },
        (errorMessage) => {
          console.error('Errore nella scansione del QR:', errorMessage)
        },
      )
      .catch((err) => console.error('Impossibile avviare la scansione:', err))
  }

  // Event listener per aprire lo scanner dal campo biglietto
  document.getElementById('ticketScannerIcon').addEventListener('click', () => {
    startQrScanner('ticketCodeInput')
  })

  // Event listener per aprire lo scanner dal campo braccialetto
  document
    .getElementById('braceletScannerIcon')
    .addEventListener('click', () => {
      startQrScanner('braceletCodeInput')
    })

  // Conferma e invio dati al server
  document.getElementById('confirmButton').addEventListener(
    'click',
    () => {
      console.log('pulsante premuto')
      const ticketCode = document.getElementById('ticketCodeInput').value
      const braceletCode = document.getElementById('braceletCodeInput').value

      if (!ticketCode || !braceletCode) {
        alert('Inserisci o scansiona entrambi i codici.')
        return
      }

      // Disabilita il pulsante per evitare clic multipli
      const confirmButton = document.getElementById('confirmButton')
      confirmButton.disabled = true

      // Controllo se il biglietto è valido e inserimento nella collection 'player'
      fetch('/check-ticket-and-bracelet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketCode: ticketCode,
          braceletCode: braceletCode,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.valid) {
            alert(
              'Biglietto e braccialetto validi. Giocatore creato con successo.',
            )
          } else {
            alert('Biglietto o braccialetto non validi.')
          }
        })
        .catch((err) => console.error('Errore durante il controllo:', err))
        .finally(() => {
          // Riabilita il pulsante dopo la risposta
          confirmButton.disabled = false
        })
    },
    { once: true },
  )
})
