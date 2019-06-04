const {knex} = require('../../db')
const FHIRBase = require('./FHIRBase')

class Location extends FHIRBase {
	/**
	 * Location wrapper for fhir data and database queries
	 * @param {Object} params - Params to create the location and thus fhir/postrges query
	 * @param {Number} params.id - Database ID. Only used when Location is created from database
	 * @param {string} params.name - Name of the location (Ward 1, etc). Required for query
	 * @param {string} params.description - Description of the location. Required for query
	 * @param {Date}   params.lastUpdated - When the object was last updated. Not used for query
	 * @param {string} params.type - The type of location (wing/ward/room)
	 */
	constructor(params) {
		super(params)
		this.id = params.id
		this.status = params.status || 'active'
		this.name = params.name
		this.description = params.description
		this.lastUpdated = params.lastUpdated || new Date()
		this.type = Location.lookup(params.type || 'ward')
	}

	// based on the data this object is constructed with, create an insert query
	// perhaps make an object return so we can do Location.query.insert and Location.query.update
	get query() {
		const values = [this.status, this.name, this.description, this.type.display]
		if (values.includes(undefined)) return false
		return {
			name: 'create-location',
			text: 'INSERT INTO location (status, name, description, last_updated, type) VALUES ($1, $2, $3, $4, $5) RETURNING location_id;',
			values: [this.status, this.name, this.description, new Date(), this.type.display],
		}
	}

	insert() {
		const values = [this.status, this.name, this.description, this.type.display]
		if (values.includes(undefined)) return false
		return knex('location').insert({
			status: this.status,
			name: this.name,
			description: this.description,
			last_updated: new Date(),
			type: this.type.display,
		}).returning('location_id')
	}

	/**
	 * Ensure object is created with proper params
	 * @returns {boolean} - Whether the object is valid or not
	 */
	get valid() {
		return ['id', 'status', 'name', 'description', 'type'].filter(prop => Boolean(this[prop])).length
	}

	/**
	 * fetch data from database and populate location object
	 * @returns {void}
	 */
	async populate() {
		const [resp] = await knex('location').select().where({location_id: this.id})
		this.lastUpdated = resp.last_updated
		this.status = resp.status
		this.name = resp.name
		this.description = resp.description
	}

	delete() {
		return knex('location').where({location_id: this.id}).del()
	}

	/**
	 * Format database data in to expected fhir formatting
	 * @returns {object} object data formatted to fhir standards
	 */
	fhir() {
		if (!this.valid) return {}
		return {
			resourceType: 'Location',
			id: this.id,
			meta: {
				versionID: 1,
				lastUpdated: new Date(this.lastUpdated),
			},
			status: this.status,
			name: this.name,
			description: this.description,
			coding: [this.type],
		}
	}

	/**
	 * Formats the location appropriately to fhir standards
	 * @param {string} type The type of location
	 * @return {object} - correct formatting for location type
	 */
	static lookup(type) {
		switch (type.toLowerCase()) {
		case 'wing': {
			return {
				system: 'https://www.hl7.org/fhir/codesystem-location-physical-type.html',
				code: 'wi',
				display: 'Wing',
			}
		}
		case 'ward': {
			return {
				system: 'https://www.hl7.org/fhir/codesystem-location-physical-type.html',
				code: 'wa',
				display: 'Ward',
			}
		}
		case 'room': {
			return {
				system: 'https://www.hl7.org/fhir/codesystem-location-physical-type.html',
				code: 'ro',
				display: 'Room',
			}
		}
		default: {
			return false
		}
		}
	}
}

module.exports = Location
