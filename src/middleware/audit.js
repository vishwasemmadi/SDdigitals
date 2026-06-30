const { dbQuery } = require('../db');

const auditLog = async (req, res, next) => {
  // Capture original send/json to hook into response completion
  const originalJson = res.json;
  
  res.json = function (body) {
    res.locals.body = body;
    originalJson.call(this, body);
  };

  res.on('finish', async () => {
    // Only log successful mutating requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const userId = req.user ? req.user.id : null;
        let action = req.method;
        
        // Extract a meaningful table name from URL path
        const pathSegments = req.path.split('/').filter(Boolean);
        const tableName = pathSegments[1] || 'unknown'; // /api/{table}/...
        
        // Try to capture ID from URL or response body
        const recordId = req.params.id || (res.locals.body && res.locals.body.id) || null;
        
        // Stringify bodies for logging, limit length
        const newValues = req.method !== 'DELETE' ? JSON.stringify(req.body).substring(0, 500) : null;
        
        await dbQuery.run(`
          INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, owner, source)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          userId,
          action,
          tableName,
          recordId,
          newValues,
          req.user ? req.user.username : 'system',
          'API'
        ]);
      } catch (err) {
        console.error('Audit log failed:', err.message);
      }
    }
  });

  next();
};

module.exports = { auditLog };
