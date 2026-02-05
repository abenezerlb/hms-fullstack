// JWT Configuration for your HMS application

module.exports = {
  // Secret key for signing JWT tokens
  // IMPORTANT: Change this in production and keep it secure!
  secret: process.env.JWT_SECRET || 'hms-jwt-secret-key-change-in-production-2024',
  
  // Token expiration time
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  
  // Token issuer and audience
  issuer: 'hms-api',
  audience: 'hms-users',
  
  // Token generation options
  get options() {
    return {
      expiresIn: this.expiresIn,
      issuer: this.issuer,
      audience: this.audience
    };
  }
};