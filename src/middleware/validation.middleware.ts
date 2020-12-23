import {NextFunction, Request, Response} from 'express'
import {Result, ValidationError, validationResult} from 'express-validator'

/**
 * Checks the express-validator validationResult and responds with an error if needed
 */
export function validationMw(req: Request, res: Response, next: NextFunction) {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json(formattedValidationError(errors))
    }
    next()
}

function formattedValidationError(result: Result<ValidationError>): any {
    if (result.isEmpty()) return {}
    const error = result.array()[0] // we return the first error as a message
    if (error.nestedErrors) return {message: error.msg}
    return {message: `${error.param} ${error.msg}`}
}
