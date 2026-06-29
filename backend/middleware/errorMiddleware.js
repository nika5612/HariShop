const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`)
  res.status(404)
  next(error)
}

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Safe message handling
  const message = err.message || 
    err.toString() || 
    (err.error && err.error.message) || 
    'Internal Server Error';
  
  console.error('❌ Global Error:', {
    message,
    statusCode,
    url: req.originalUrl,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
  
  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
}


export { notFound, errorHandler }
