const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const bodyParser = require('body-parser')
require('dotenv').config()

const fhir = require('./fhir')

const app = express()
const port = process.env.PORT || 5000

// app setup
app.use(cors())
app.use(helmet())
app.use(morgan('combined'))
app.use(bodyParser.json())
app.use(bodyParser.json({type: 'application/fhir+json'}))
app.use('/fhir', fhir)

app.listen(port, () => console.log(`server running on port ${port}`))

