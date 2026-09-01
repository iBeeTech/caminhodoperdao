#!/usr/bin/env bash
#
# Sobe para o R2 as versoes publicas das fotos de um ano: thumbs, previews e/ou
# medias.
#
# Sao ~2900 arquivos por prefixo, e o wrangler gasta ~3 segundos em cada um (ele
# sobe o node inteiro por chamada). Em fila unica isso da mais de duas horas; por
# isso o -P alto. E por isso o script e IDEMPOTENTE: cada arquivo enviado entra
# num registro local, e rodar de novo continua de onde parou em vez de reenviar
# tudo. Se a conexao cair no meio, e so repetir o mesmo comando.
#
# ⚠️ REGRAVANDO POR CIMA (trocou a marca d'agua de um album ja publicado)? Duas
# coisas, nesta ordem:
#   1. apague o registro do prefixo (--reenviar faz isso), senao o script acha
#      que ja subiu tudo e nao faz nada;
#   2. suba a VERSAO_DAS_FOTOS em src/services/fotos/fotos.service.ts. As fotos
#      publicas vao com cache de UM ANO: sem trocar a versao na URL, quem ja
#      visitou continua vendo a foto antiga por meses, e o CDN tambem.
#
# ⚠️ `medias` so vai ao ar depois que a venda daquele ano acabar. A rota recusa
# antes disso (nao ha vazamento se subir cedo), mas o arquivo fica parado.
#
# Uso:
#   bash scripts/fotos_publicar.sh --ano 2026 --pasta ~/fotos2026
#   bash scripts/fotos_publicar.sh --ano 2026 --pasta ~/fotos2026 --prefixos medias
#   bash scripts/fotos_publicar.sh --ano 2026 --pasta ~/fotos2026 --reenviar
set -euo pipefail

BALDE="caminhodoperdao-fotos"
DESTINO="--remote"
ONDE="PRODUCAO"
PARALELO=16
PREFIXOS="thumbs,previews,medias"
REENVIAR=0
ANO=""
PASTA=""

while [ $# -gt 0 ]; do
  case "$1" in
    --ano) ANO="$2"; shift 2 ;;
    --pasta) PASTA="$2"; shift 2 ;;
    --prefixos) PREFIXOS="$2"; shift 2 ;;
    --paralelo) PARALELO="$2"; shift 2 ;;
    --reenviar) REENVIAR=1; shift ;;
    --local) DESTINO="--local"; ONDE="R2 local (sua maquina)"; shift ;;
    *) echo "opcao desconhecida: $1" >&2; exit 1 ;;
  esac
done

if [ -z "$ANO" ] || [ -z "$PASTA" ]; then
  echo "uso: bash scripts/fotos_publicar.sh --ano 2026 --pasta ~/fotos2026 [--prefixos thumbs,previews,medias]" >&2
  exit 1
fi

echo "destino: $ONDE  ($BALDE)"
echo

subir() {
  local arquivo="$1" nome
  nome=$(basename "$arquivo")
  grep -qxF "$nome" "$ENVIADOS" && return 0

  if npx wrangler r2 object put "$BALDE/$PREFIXO/$ANO/$nome" \
       --file "$arquivo" --content-type=image/jpeg $DESTINO >/dev/null 2>&1; then
    # >> com uma linha curta e atomico o bastante para varios processos: e por
    # isso que o registro guarda so o nome, uma linha por foto.
    echo "$nome" >> "$ENVIADOS"
  else
    echo "FALHOU $PREFIXO/$nome" >&2
  fi
}
export -f subir

FALTOU=0

for PREFIXO in ${PREFIXOS//,/ }; do
  ORIGEM="$PASTA/$PREFIXO/$ANO"
  if [ ! -d "$ORIGEM" ]; then
    echo "pulando $PREFIXO: nao existe $ORIGEM"
    continue
  fi

  # O registro do que ja subiu. Fica junto das fotos, e nao no repositorio: e
  # estado de uma maquina, de uma rodada.
  ENVIADOS="$PASTA/${PREFIXO}_${ANO}_enviados.txt"
  [ "$REENVIAR" = "1" ] && rm -f "$ENVIADOS"
  touch "$ENVIADOS"

  TOTAL=$(find "$ORIGEM" -maxdepth 1 -type f -name '*.jpg' | wc -l)
  echo "$PREFIXO/$ANO: $TOTAL fotos, $(wc -l < "$ENVIADOS") ja enviadas, paralelo $PARALELO"

  export BALDE ANO PREFIXO DESTINO ENVIADOS
  find "$ORIGEM" -maxdepth 1 -type f -name '*.jpg' -print0 \
    | xargs -0 -P "$PARALELO" -I{} bash -c 'subir "$@"' _ {}

  FIM=$(wc -l < "$ENVIADOS")
  echo "  enviadas: $FIM de $TOTAL"
  [ "$FIM" -lt "$TOTAL" ] && FALTOU=1
  echo
done

if [ "$FALTOU" = "1" ]; then
  echo "faltou arquivo. Rode o mesmo comando de novo: ele pula o que ja subiu." >&2
  exit 1
fi

echo "pronto. Confira com:"
echo "  curl -s 'https://caminhodoperdao.com.br/api/fotos/album?ano=$ANO' | head -c 200"
