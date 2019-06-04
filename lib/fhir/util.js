/**
 * create an OperationOutcome
 * @param {Express.Request} req request
 * @param {Express.Response} res Response
 * @param {number} code HTTP Status code
 * @param {string} text details to send to user
 * @param {object} diagnostics further diagnostic data
 * @param {string} severity how bad the error is
 */
function createOutcome(req, res, code, text, diagnostics = {}, severity = 'error') {
	const err = {
		resourceType: 'OperationOutcome',
		issue: [{
			severity,
			code,
		}],
		expression: [req.originalUrl],
	}
	res.status(code).json(Object.assign({}, err, {details: {text}, diagnostics}))
}

module.exports = {
	createOutcome,
}
