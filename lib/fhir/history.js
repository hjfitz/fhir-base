/* eslint-disable no-restricted-syntax */
const historyRouter = require('express').Router()
const OperationOutcome = require('./classes/OperationOutcome')
const {knex} = require('../db')

const file = 'fhir/history.js'

/**
 * !! File does not follow FHIR specifications
 * No patient history concept exists yet, so try to keep this file impartial and plain json
 */


historyRouter.get('/:id', async (req, res) => {
	const [row] = await knex('patient_history').select().where({patient_id: req.params.id})
	if (row) {
		// aim to change to promise.all
		const [practitioner] = await knex('practitioner').select().where({practitioner_id: row.practitioner_id})
		const prescriptionLinks = await knex('history_prescription_medication_usage').select().where({history_id: row.history_id})
		const otcLinks = await knex('history_otc_medication_usage').select().where({history_id: row.history_id})
		const drugLinks = await knex('history_otc_drug_usage').select().where({history_id: row.history_id})
		const prescriptions = await Promise.all(prescriptionLinks.map(link => knex('medication_usage').select().where({medication_usage_id: link.medication_usage_id})))
		const otc = await Promise.all(otcLinks.map(link => knex('medication_usage').select().where({medication_usage_id: link.medication_usage_id})))
		const recreational = await Promise.all(drugLinks.map(link => knex('medication_usage').select().where({medication_usage_id: link.medication_usage_id})))
		res.json({...row, practitioner, drugs: {prescriptions, otc, recreational}})
	} else {
		const outcome = new OperationOutcome('error', 404, req.originalUrl, 'unable to find history')
		outcome.makeResponse(res)
	}
})

historyRouter.post('/', async (req, res) => {
	try {
		const historyBody = {
			// health history
			childhood_illnesses: JSON.stringify(req.body.health['childhood-illnesses']),
			immunisations: JSON.stringify(req.body.health.immunisations),
			medical_issues: JSON.stringify(req.body.health['medical-issues']),
			surgical_operations: JSON.stringify(req.body.health.operations),
			other_hospitalisations: JSON.stringify(req.body.health.hispitalisations),
			// medications. otc and prescription meds are in mtm so omitted from this body
			allergies: JSON.stringify(req.body.medication.allergies),
			// exercise information
			exercise_frequency: req.body.exercise.frequency,
			// dietary information
			dieting: req.body.diet.dieting,
			difficulties_eating: req.body.diet['difficulties-eating'],
			meals_daily: parseInt(req.body.diet['meals-eaten'], 10),
			// alcoholism questions
			drinks_alcohol: req.body.alcohol['does-drink'] || null,
			alcohol_type: req.body.alcohol.type || null,
			alcoholic_drinks_weekly: req.body.alcoholfreq || null,
			alcohol_concern: req.body.alcohol.concern || null,
			alcohol_consider_stopping: req.body.alcohol['consider-stopping'] || null,
			// tobacco questions
			tobacco_used_past_5_years: req.body.tobacco['used-prior'],
			tobacco_last_smoked: req.body.tobacco['last-use'],
			tobacco_type: req.body.tobacco['type-used'],
			currently_uses_tobacco: req.body.tobacco['current-use'],
			currently_uses_tobacco_repalcement: req.body.tobacco['nicotine-replace-therapy'],
			tobacco_replacement_type: req.body.tobacco['nicotine-replacement-types'],
			// drugs question - type and freq mtm
			uses_recreational_drugs: req.body.drug['currently-use'],
			used_recreational_with_needle: req.body.drug.injected,
			// other questions
			mental_health_history: req.body.other['mental-health-wellbeing'],
			social_history: req.body.other['social-history'],
			family_history: req.body.other['family-history'],
			relevant_history: req.body.other['relevant-history'],
			// sign off
			patient_id: req.body.patient_id,
			practitioner_id: req.body.sign.practitioner_id,
			date: new Date(req.body.sign.date),
			practitioner_designation: req.body.sign.designation,
			signature_blob: req.body.sign.image,
		}

		if (!req.body.sign.designation) {
			const outcome = new OperationOutcome('error', 400, req.url, 'Missing practitioner designation!', {})
			return outcome.makeResponse(res)
		}

		const [history_id] = await knex('patient_history').insert(historyBody).returning('history_id')
		if (req.body.medication.prescription.length) {
			for await (const prescription of req.body.medication.prescription) {
				const body = {
					medication_name: prescription.name,
					medication_dose: prescription.dose,
					medication_frequency: prescription.freq,
				}
				// add data to table
				const [medication_usage_id] = await knex('medication_usage').insert(body).returning('medication_usage_id')
				// create mtm relation
				await knex('history_prescription_medication_usage').insert({
					medication_usage_id,
					history_id,
				})
			}
		}
		if (req.body.medication.otc.length) {
			for await (const otc of req.body.medication.otc) {
				const body = {
					medication_name: otc.name,
					medication_dose: otc.dose,
					medication_frequency: otc.freq,
				}
				// create drug entry
				const [medication_usage_id] = await knex('medication_usage').insert(body).returning('medication_usage_id')
				// create mtm relation
				await knex('history_otc_medication_usage').insert({
					medication_usage_id,
					history_id,
				})
			}
		}
		if (req.body.drug['use-frequency'] && req.body.drug['use-frequency'].length) {
			for await (const drug of req.body.drug['use-frequency']) {
				const body = {
					medication_name: drug.name,
					medication_dose: drug.dose,
					medication_frequency: drug.freq,
				}
				// create drug entry
				const [medication_usage_id] = await knex('medication_usage').insert(body).returning('medication_usage_id')
				// create mtm relation
				await knex('history_otc_drug_usage').insert({
					medication_usage_id,
					history_id,
				})
			}
		}
		// const results = Object.keys(queries).reduce((acc, cur) => {})
		// const resp = await knex('patient_history').insert(req.body)
		const outcome = new OperationOutcome('success', 200, req.url, 'Successfully added history', {history_id})
		return outcome.makeResponse(res)
	} catch (err) {
		const outcome = new OperationOutcome('error', 500, req.url, err)
		return outcome.makeResponse(res)
	}
})

module.exports = historyRouter
