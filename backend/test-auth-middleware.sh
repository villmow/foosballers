#!/bin/bash
# filepath: /Users/johannes/projects/personal/foosball-streaming/backend/test-auth-middleware.sh

# Change to the backend directory
cd "$(dirname "$0")"

# Run the authentication middleware tests
echo "Running authentication middleware tests..."
npx jest middleware/authMiddleware.test.ts

# Run the security middleware tests
echo "Running security middleware tests..."
npx jest middleware/securityMiddleware.test.ts

echo "Tests completed!"
