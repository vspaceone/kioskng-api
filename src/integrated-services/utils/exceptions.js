class DatabaseOperationException extends Error {  
    constructor (message, cause) {
      super(message)
  
      // assign the error class name in your custom error (as a shortcut)
      this.name = this.constructor.name
  
      // capturing the stack trace keeps the reference to your error class
      Error.captureStackTrace(this, this.constructor);
  
      // you may also assign additional properties to your error
      this.cause = cause
    }
}

class PayloadValidationException extends Error {  
    constructor (message, errors) {
      super(message)
  
      // assign the error class name in your custom error (as a shortcut)
      this.name = this.constructor.name
  
      // capturing the stack trace keeps the reference to your error class
      Error.captureStackTrace(this, this.constructor);
  
      // you may also assign additional properties to your error
      this.errors = errors
    }
}

class DataConflictException extends Error {  
    constructor (message, suggestedStatusCode) {
      super(message)
  
      // assign the error class name in your custom error (as a shortcut)
      this.name = this.constructor.name
  
      // capturing the stack trace keeps the reference to your error class
      Error.captureStackTrace(this, this.constructor);
  
      // you may also assign additional properties to your error
      this.suggestedStatusCode = suggestedStatusCode
    }
}
  

exports.DatabaseOperationException = DatabaseOperationException
exports.PayloadValidationException = PayloadValidationException
exports.DataConflictException = DataConflictException