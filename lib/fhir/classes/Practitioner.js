const FHIRBase = require('./FHIRBase')
const OperationOutcome = require('./OperationOutcome')
const {knex} = require('../../db')

class Practitioner extends FHIRBase {
	constructor(params) {
		super({table: 'practitioner'})
		this.table = 'practitioner'
		this.id = params.practitioner_id
		this.name = params.name
		this.username = params.username
		this.added = new Date(params.added)
	}

	async populate() {
		// get all data from db based on the id
		const [row] = await knex(this.table).select().where({practitioner_id: this.id})
		// assign all rows to this object for use in fhir() or update()
		Object.keys(row).forEach((key) => {
			this[key] = row[key]
		})
		// true if successful in fetching
		return this
	}

	fhir() {
		if (!('added' in this && 'name' in this && 'id' in this)) {
			const {outcome} = new OperationOutcome('error', 404, `/fhir/Practitioner/${this.id}`, 'Item not found')
			return outcome
		}
		return {
			resourceType: 'Practitioner',
			active: true,
			id: this.id,
			lastUpdated: this.added,
			name: [
				{given: [this.name]},
			],
			telecom: [{
				system: 'email',
				value: this.username,
			}],
		}
	}
}

module.exports = Practitioner
