#!/bin/bash
set -e

cd /backend

echo "Starting up workers..."
arq app.worker.WorkerSettings 

