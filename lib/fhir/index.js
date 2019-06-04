const router = require('express').Router()

const patientRouter = require('./patient')
const diagnosticRouter = require('./diagnostic-report')
const observationRouter = require('./observation')
const locationRouter = require('./location')
const encounterRouter = require('./encounter')
const historyRouter = require('./history')
const practitionerRouter = require('./practitioner')

// all FHIR routes. note: all sit on /fhir
router.use('/Observation', observationRouter)
router.use('/Diagnostics', diagnosticRouter)
router.use('/Encounter', encounterRouter)
router.use('/Location', locationRouter)
router.use('/Patient', patientRouter)
router.use('/History', historyRouter)
router.use('/Practitioner', practitionerRouter)

module.exports = router
