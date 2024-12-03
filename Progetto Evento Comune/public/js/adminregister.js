document.addEventListener('DOMContentLoaded', function () {
  let selectedInput = null

  // Funzione per avviare lo scanner QR
  function startQrScanner(targetInput) {
    selectedInput = targetInput
    document.getElementById('qr-reader').style.display = 'block'

    const html5QrCode = new Html5Qrcode('qr-reader')
    html5QrCode
      .start(
        { facingMode: 'environment' }, // Usa la fotocamera posteriore
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

  // Event listener per aprire lo scanner dal campo UUID
  document.getElementById('uuidScannerIcon').addEventListener('click', () => {
    startQrScanner('uuid')
  })

  // Conferma e invio dati al server
  document
    .getElementById('registrationForm')
    .addEventListener('submit', async function (event) {
      event.preventDefault()

      const formData = new FormData(this)
      const data = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        uuid: formData.get('uuid'), // Aggiunto UUID al payload
      }

      const response = await fetch('/adminregister', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const successMessage = document.getElementById('successMessage')
        successMessage.style.display = 'block'
        setTimeout(() => {
          successMessage.style.display = 'none'
        }, 1500)
        document.getElementById('registrationForm').reset()
      } else {
        alert('Errore durante la registrazione. Riprova.')
      }
    })
})
