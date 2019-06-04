const practitionerRouter = require('express').Router()
const Practitioner = require('./classes/Practitioner')

const {knex} = require('../db')

practitionerRouter.get('/', async (req, res) => {
	const practitioners = await knex('practitioner')
	const fhirPractitioners = practitioners
		.map(row => new Practitioner(row).fhir())
		.map(fhirRow => ({
			fullUrl: `${req.originalUrl}/${fhirRow.id}`,
			...fhirRow,
		}))
	res.send({
		resourceType: 'Bundle',
		meta: {
			lastUpdated: new Date(),
		},
		type: 'searchset',
		entry: fhirPractitioners,
	})
})

practitionerRouter.get('/:id', async (req, res) => {
	const [practitioner] = await knex('practitioner').select().where({
		practitioner_id: req.params.id,
	})
	const fhirPractitioner = new Practitioner(practitioner).fhir()
	res.json(fhirPractitioner)
})

module.exports = practitionerRouter
