const mimeTypes = require('mime-types')
const sha1 = require('crypto-js/sha1')
const fs = require('fs')
const path = require('path')
const shortid = require('shortid')
const mime = require('mime-types')


const {knex} = require('../../db')
const Contact = require('./Contact')
const FHIRBase = require('./FHIRBase')

class Patient extends FHIRBase {
	/**
	 * Fhir wrapper for patient information
	 * @param {object} params patient params
	 * @param {boolean} params.active whether the patient is still active in the hospital
	 * @param {string} params.id DB id for the patient
	 * @param {string} params.fullname fullname of patient
	 * @param {string} params.given patient family name
	 * @param {string} params.prefix patient prefix (Mr, Miss)
	 * @param {string} params.gender patient gender: male, female or other
	 * @param {Date} params.last_updated when the patient was last updated
	 * @param {string} params.photo_url where the patient url is stored
	 * @param {string} params.family patient family name (surname)
	 */
	constructor(params) {
		super(params)
		this.meta = {file: 'fhir/classes/Patient.js'}
		const {active, id, fullname, given, prefix, gender, last_updated, photo, family} = params
		this.active = active
		this.loaded = false
		this.id = id
		this.fullname = fullname
		this.given = given
		this.prefix = prefix
		this.gender = gender
		this.last_updated = last_updated
		this.photo = photo
		this.family = family
		this.required = ['active', 'fullname', 'given', 'prefix', 'gender', 'contact_id']
		this.values = [...this.required, 'family', 'last_updated']
	}

	/**
	 * Based on this.id, populate the patient with database info
	 * @return {boolean} populated or not
	 */
	async populate() {
		const {meta, id} = this
		if (!id) {
			return false
		}
		try {
			const [patient] = await knex('patient').select().where({patient_id: id})
			this.loaded = true
			Object.keys(patient).forEach(key => this[key] = patient[key])
			this.contact = new Contact({contact_id: patient.contact_id})
			await this.contact.populate()
			return true
		} catch (err) {
			return false
		}
	}

	/**
	 * Attempt to insert a patient with params provided
	 * @returns {boolean} inserted or not
	 */
	async insert() {
		const isValid = this.required.filter(key => !(this[key]))
		if (isValid.length) {
			return false
		}
		// create object
		this.last_updated = new Date()
		this.active = true

		// create an object consisting of values (from this.values) to put in DB
		const obj = this.values.reduce((acc, cur) => {
			acc[cur] = this[cur]
			return acc
		}, {})

		// attempt to write B64 photo
		if (this.photo) {
			const mimetype = this.photo.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)[1]
			const ext = mime.extension(mimetype)
			const photo_url = path.join('/patient', `${this.given}-${shortid.generate()}.${ext}`)
			const newPath = path.join(process.cwd(), photo_url)
			const base64Data = this.photo.replace(/^data:image\/jpeg;base64,/, '')

			fs.writeFileSync(newPath, base64Data, 'base64')
			obj.photo_url = photo_url
		}
		// make query
		const [resp] = await knex('patient').insert(obj).returning(['patient_id', ...this.values])
		return resp
	}

	/**
	 * Attempts to delete a patient based on this.id
	 * fetch patient photo URL so that this can be removed from the disk
	 * delete the patient from the database, then the image
	 * order is important, because if database delete fails, no more image for patient
	 * @returns {boolean} Deleted or nah
	 */
	async delete() {
		try {
			// get patient photo url from db
			const [row] = await knex('patient').select().where('patient_id', this.id)
			const url = path.join(process.cwd(), (row.photo_url || ''))
			// remove DB entry and then the associated image
			await knex('patient_history').where({patient_id: this.id}).del()
			await knex('practitionerpatients').where('patient_id', this.id).del()
			await knex('patient').where('patient_id', this.id).del()
			if (row.photo_url && fs.existsSync(url)) fs.unlinkSync(url)
			return {deleted: true, msg: 'Successfully deleted patient'}
		} catch (err) {
			return {deleted: false, msg: err}
		}
	}

	/**
	 * Attempts to perform UPDATE on the database with this.id and params provided
	 * @returns {boolean} Updated or not
	 */
	async update() {
		const toUpdate = this.values
			.filter(val => this[val])
			.reduce((acc, cur) => {
				acc[cur] = this[cur]
				return acc
			}, {})
		if (Object.keys(toUpdate).length) {
			return false
		}
		try {
			await knex('patient').update(toUpdate)
			await this.populate()
		} catch (err) {
			return false
		}
		return true
	}

	/**
	 * Attempts to delete a patient based on this.id
	 * fetch patient photo URL so that this can be removed from the disk
	 * delete the patient from the database, then the image
	 * order is important, because if database delete fails, no more image for patient
	 * @returns {boolean} Deleted or nah
	 */
	async delete() {
		try {
			// get patient photo url from db
			const [row] = await knex('patient').select().where('patient_id', this.id)
			const url = path.join(process.cwd(), (row.photo_url || ''))
			// remove DB entry and then the associated image
			await knex('patient').delete('patient', this.id)
			if (row.photo_url && fs.existsSync(url)) fs.unlinkSync(url)
			return {deleted: true, msg: 'Successfully deleted patient'}
		} catch (err) {
			return {deleted: false, msg: err}
		}
	}

	/**
	 * Formats patient to standard fhir patient
	 * @returns {object} patient info formatted in fhir
	 */
	async fhir() {
		await this.populate()
		const {contact} = this
		if (!contact) return false
		const local = path.join(process.cwd(), this.photo_url || '')
		const photo = this.photo_url && fs.existsSync(local)
			? [{
				contentType: mimeTypes.lookup(local),
				url: this.photo_url,
				hash: sha1(fs.readFileSync(local)).toString(),
			}]
			: []
		return {
			identifier: [{
				use: 'usual',
				system: 'urn:ietf:rfc:3986',
				value: 'database id',
				assigner: 'SoN',
			}],
			resourceType: 'Patient',
			id: this.id,
			active: this.active,
			name: [{
				use: 'usual',
				text: this.fullname,
				family: this.family,
				given: this.given,
				prefix: this.prefix.split(' '),
			}],
			gender: this.gender,
			photo,
			contact: [{
				name: {
					use: 'usual',
					text: contact.fullname,
					family: contact.family,
					given: contact.given,
					prefix: contact.prefix.split(' '),
				},
				telecom: [{
					system: 'phone',
					value: contact.phone,
					use: 'home',
				}],
			}],
		}
	}
}

module.exports = Patient
