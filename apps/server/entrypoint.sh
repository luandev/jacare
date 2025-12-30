#!/bin/sh
set -e

# Ensure /data directory is writable by the jacare user (UID 1001)
# This is critical when using bind mounts that may have restrictive permissions
if [ -d "/data" ]; then
  echo "Checking /data directory permissions..."
  
  # Check if we can write to /data
  if ! touch /data/.write_test 2>/dev/null; then
    echo "WARNING: /data directory is not writable by user $(id -u)"
    echo "This will cause 'readonly database' errors"
    
    # If running as root (shouldn't happen but check anyway), fix permissions
    if [ "$(id -u)" = "0" ]; then
      echo "WARNING: Running as root - fixing /data ownership..."
      echo "NOTE: This is a fallback. Host directory permissions should be properly configured."
      echo "Recommended: Set ownership to UID 1001 on the host: sudo chown -R 1001:1001 /path/to/data"
      chown -R jacare:jacare /data
    else
      echo "ERROR: Cannot write to /data. Please ensure the host directory has appropriate permissions."
      echo "Run: chmod -R 755 /path/to/host/data && chown -R 1001:1001 /path/to/host/data"
      exit 1
    fi
  else
    # Clean up test file
    rm -f /data/.write_test
    echo "/data directory is writable"
  fi
fi

# Execute the main command (start the server)
exec "$@"
