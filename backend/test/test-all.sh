#!/bin/bash

echo "========================================="
echo "HMS COMPLETE SYSTEM TEST SUITE"
echo "========================================="

echo ""
echo "1. Testing database connection..."
node test-db.js

echo ""
echo "2. Starting server..."
npm run dev &
SERVER_PID=$!
sleep 3  # Wait for server to start

echo ""
echo "3. Testing API endpoints..."
node test-api.js

echo ""
echo "4. Stopping server..."
kill $SERVER_PID 2>/dev/null

echo ""
echo "========================================="
echo "TESTS COMPLETED!"
echo "========================================="