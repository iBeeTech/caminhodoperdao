#!/bin/bash

# Check if nvm is installed
if ! command -v nvm &> /dev/null; then
    echo "❌ NVM não está instalado. Por favor, instale nvm primeiro."
    exit 1
fi

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use the version specified in .nvmrc
nvm use

# Check if the correct version is being used
CURRENT_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$CURRENT_VERSION" != "20" ]; then
    echo "❌ Versão do Node.js incorreta. Use: nvm use"
    exit 1
fi

echo "✅ Node.js v20 ativado com sucesso!"
