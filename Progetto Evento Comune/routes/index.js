const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')

router.get('/register', (req, res) => {
  res.render('register')
})

router.post('/register', (req, res) => {
  const { name, surname, email } = req.body
  const users = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../data/users.json')),
  )

  const newUser = {
    name,
    surname,
    email,
  }

  users.push(newUser)
  fs.writeFileSync(
    path.join(__dirname, '../data/users.json'),
    JSON.stringify(users, null, 2),
  )

  res.render('register', { message: 'Registrazione avvenuta con successo!' })
})

module.exports = router
