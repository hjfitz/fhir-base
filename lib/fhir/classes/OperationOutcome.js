const FHIRBase = require('./FHIRBase')

class OperationOutcome extends FHIRBase {
	/**
	 * Object form of https://www.hl7.org/fhir/operationoutcome.html
	 * @param {string} sev Severity of the issue (fatal/error/warning/information)
	 * @param {number} code HTTP status code to set
	 * @param {string} path fhir path
	 * @param {string} infoText Information text to display in an error
	 * @param {string} diagnostics Diagnostics information
	 */
	constructor(sev, code, path, infoText, diagnostics = {}) {
		super({sev, code, infoText, diagnostics, path})
		this.sev = sev
		this.code = code
		this.infoText = infoText
		this.diagnostics = diagnostics
		this.fhirPath = path
	}

	/**
	 * Create a fhir OperationOutcome object literal
	 * @returns {object} fhir object literal
	 */
	get outcome() {
		return {
			resourceType: 'OperationOutcome',
			issue: [{
				severity: this.sev,
				code: this.code,
				details: {
					text: this.infoText,
				},
				diagnostics: this.diagnostics,
				expression: this.fhirPath,
			}],
		}
	}

	/**
	 * Make a HTTP response
	 * @returns {void}
	 */
	makeResponse(res) {
		return res.status(this.code).json(this.outcome)
	}
}

module.exports = OperationOutcome
