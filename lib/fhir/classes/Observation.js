const {knex} = require('../../db')
const {client} = require('../../db')
const FHIRBase = require('./FHIRBase')

class Observation extends FHIRBase {
	/**
	 * FHIR wrapper for Observation data
	 * @param {string} name Name of observation (blood pressure/respiratory rate etc)
	 * @param {string} value Value (what was recorded)
	 * @param {number} id DB ID of the Observation
	 * @param {boolean} updated Then the resource was last updated
	 */
	constructor(name, value, id, updated = new Date()) {
		super({name, value, id, updated})
		this.name = name
		this.value = value
		this.id = `${id}`
		this.updated = updated
		this.unitCode = {
			respiratory_rate: {
				unit: 'breaths/minute',
				code: '/min',
			},
			oxygen_saturation: {
				unit: '%',
				code: '%',
			},
			body_temperature: {
				unit: 'C',
				code: 'cel',
			},
			systolic_bp: {
				unit: 'mmHg',
				code: 'mm[Hg]',
			},
			heart_rate: {
				unit: 'beats/min',
				code: '/min',
			},
			level_of_consciousness: {
				unit: '{score}', // https://s.details.loinc.org/LOINC/35088-4.html?sections=Comprehensive
				code: '',
			},
			supplemental_oxygen: {
				unit: '{yes/no}',
				code: '',
			},
		}[name || 'heart_rate']
	}

	/**
	 * Generates a query for inserting data in to database (uses node-pg structured queries for now)
	 * TODO: Update this to knex
	 * @returns {object} node-pg query
	 */
	get query() {
		return {
			text: 'INSERT INTO observation (last_updated, name, value) VALUES ($1, $2, $3) RETURNING observation_id, name',
			values: [this.updated, this.name, this.value],
		}
	}

	insert() {
		return knex('observation')
			.returning(['observation_id', 'name'])
			.insert({
				last_updated: this.updated,
				name: this.name,
				value: this.value,
			})
	}

	/**
	 * Format the observation data to fhir data
	 * @returns {object} fhir formatted observation data
	 */
	async fhir() {
		const {name, id, value, unitCode, updated} = this
		const valueQuantity = Object.assign({value, system: 'http://unitsofmeasure.org'}, unitCode)
		// DIRTY FIX ME PLEAAAASE
		const [row] = await knex('diagnostic_report').where({[name]: id})
		return {
			resourceType: 'Observation',
			id,
			code: {
				text: this.name,
			},
			meta: {lastUpdated: updated},
			status: 'final',
			subject: {reference: `Diagnostic/${row.report_id}`},
			valueQuantity,
		}
	}
}

module.exports = Observation
