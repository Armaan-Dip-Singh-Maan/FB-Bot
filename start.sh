#!/bin/bash

echo "Starting RAG-Powered Chatbot..."
echo

echo "Checking if Node.js is installed..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "Node.js found!"
echo

echo "Installing backend dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi

echo
echo "Dependencies installed successfully!"
echo

echo "Starting backend server..."
echo "The chatbot will be available at http://localhost:3001"
echo "Press Ctrl+C to stop the server"
echo

npm start
