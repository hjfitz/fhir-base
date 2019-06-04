// https://www.hl7.org/fhir/patient.html
const express = require('express')
const OperationOutcome = require('./classes/OperationOutcome')
const Patient = require('./classes/Patient')
const Contact = require('./classes/Contact')
const {knex} = require('../db')

const patientRouter = express.Router()


// used for debugging. removed in production
patientRouter.get('/all', async (req, res) => {
	const rows = await knex('patient').select()
	res.json(rows)
})

// read a specific patient
patientRouter.get('/:id', async (req, res) => {
	const {id} = req.params
	// create a new patient and send.
	const patient = new Patient({id})
	const populated = await patient.populate()
	if (populated) {
		const fhir = await patient.fhir()
		return res.json(fhir)
	}
	// patient not populated? let the user know
	const outcome = new OperationOutcome('error', 406, req.originalUrl, 'could not find patient')
	return outcome.makeResponse(res)
})

patientRouter.get('/', async (req, res) => {
	const {_query} = req.query
	// handle searches and Bundle requests for all
	if (_query) {
		const nestedRows = await knex('patient').whereRaw('fullname Ilike ?', [`%${_query}%`])
		const mapped = await Promise.all(
			nestedRows.map(row => new Patient({...row, id: row.patient_id}).fhir()),
		)
		res.json(mapped)
		return
	}
	const rows = await knex('patient')
	const patients = await Promise.all(rows.map(row => new Patient({id: row.patient_id}).fhir()))
	const resp = patients.map(patient => ({
		url: `/fhir/Patient/${patient.id}`,
		...patient,
	}))
	res.json({
		resourceType: 'Bundle',
		meta: {
			lastUpdated: new Date(),
		},
		type: 'searchset',
		entry: resp,
	})
})

// create
patientRouter.post('/', async (req, res) => {
	const meta = {file: 'fhir/patient.js', func: 'POST /'}
	// const {active, id, fullname, given, prefix, gender, last_updated, photo, family} = params

	const patient = new Patient({
		active: req.body.active,
		fullname: req.body.name[0].family,
		given: req.body.name[0].given,
		prefix: req.body.name[0].prefix,
		gender: req.body.gender,
		last_updated: new Date(),
		photo: req.body.photo,
		family: req.body.name[0].family,
	})

	const contact = new Contact({
		prefix: req.body.contact[0].name.prefix,
		fullname: req.body.contact[0].name.family,
		given: req.body.contact[0].name.given,
		phone: req.body.contact[0].telecom[0].value,
		family: req.body.contact[0].name.family,
	})

	// attempt to insert contact. if that succeeds, insert patient
	const row = await contact.insert()
	if (!row) {
		// couldn't succeed? return bad outcome
		const outcome = new OperationOutcome('error', 406, req.originalUrl, 'Unable to insert contact')
		return outcome.makeResponse(res)
	}
	patient.contact_id = row.contact_id
	const patientRow = await patient.insert()
	const outcome = patientRow
		? new OperationOutcome('success', 200, req.originalUrl, 'success', patientRow)
		: new OperationOutcome('error', 406, req.originalUrl, 'Unable to insert patient')
	return outcome.makeResponse(res)
})

// update
patientRouter.put('/:id', async (req, res) => {
	const patientKeys = ['active', 'fullname', 'given', 'family', 'prefix', 'gender', 'photo_url']
	// create an object to enable us to create an update query
	const rawPatient = Object.keys(req.body).reduce((acc, key) => {
		const newKey = key.replace('patient-', '')
		if (key.indexOf('patient-') === 0 && patientKeys.includes(newKey)) {
			acc[newKey] = req.body[key]
		}
		return acc
	}, {})

	const patient = new Patient({...rawPatient, id: req.params.id})
	const updated = await patient.update()
	let outcome = new OperationOutcome('success', 200, req.originalUrl, 'success updating')
	if (!updated) outcome = new OperationOutcome('warn', 406, req.originalUrl, 'Unable to update patient')
	outcome.makeResponse(res)
})

// delete
patientRouter.delete('/:id', async (req, res) => {
	const {id} = req.params
	const patient = new Patient({id})
	const resp = await patient.delete()
	let outcome = new OperationOutcome('success', 200, req.originalUrl, resp.msg)
	if (!resp.deleted) outcome = new OperationOutcome('error', 406, req.originalUrl, resp.msg.detail)
	outcome.makeResponse(res)
})

module.exports = patientRouter
