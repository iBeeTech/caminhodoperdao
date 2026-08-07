#!/usr/bin/env bash
#
# Sobe para o R2 o que a busca por rosto precisa em producao: o INDICE do ano e
# os MODELOS que o geraram.
#
# Sao quatro arquivos e nenhum deles esta no repositorio:
#
#   faces/<ano>.bin     o indice de vetores (privado, nunca sai por rota nenhuma)
#   faces/<ano>.json    os metadados na mesma ordem
#   modelos/yunet.onnx  detector, servido ao navegador por /api/fotos/modelo
#   modelos/<sface>     reconhecedor, idem — 39 MB
#
# ⚠️ O .bin e o .json TEM de subir juntos, da mesma rodada do indexador. Se
# divergirem, cada vetor casa com o NOME ERRADO: a busca continua rapida e
# entrega ao peregrino as fotos de outra pessoa. O endpoint recusa o indice
# quando os tamanhos nao batem (indiceConsistente), mas isso so pega o caso
# grosseiro.
#
# ⚠️ O nome do modelo e a versao. Regravar "sface.onnx" com outro conteudo deixa
# metade dos celulares com o antigo em cache (a rota manda cache de um ano,
# imutavel) gerando vetores que nao casam com o indice — sem erro nenhum. Modelo
# novo entra com NOME novo, e o indice tem de ser refeito com ele.
#
# Uso:
#   bash scripts/fotos_faces_publicar.sh --ano 2026 --pasta ~/fotos2026
#   bash scripts/fotos_faces_publicar.sh --ano 2026 --pasta ~/fotos2026 --local
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BALDE="caminhodoperdao-fotos"
DESTINO="--remote"
ONDE="PRODUCAO"
ANO=""
PASTA=""

while [ $# -gt 0 ]; do
  case "$1" in
    --ano) ANO="$2"; shift 2 ;;
    --pasta) PASTA="$2"; shift 2 ;;
    --local) DESTINO="--local"; ONDE="R2 local (sua maquina)"; shift ;;
    *) echo "opcao desconhecida: $1" >&2; exit 1 ;;
  esac
done

if [ -z "$ANO" ] || [ -z "$PASTA" ]; then
  echo "uso: bash scripts/fotos_faces_publicar.sh --ano 2026 --pasta ~/fotos2026 [--local]" >&2
  exit 1
fi

BIN="$PASTA/faces_$ANO.bin"
JSON="$PASTA/faces_$ANO.json"

for arquivo in "$BIN" "$JSON"; do
  [ -f "$arquivo" ] || { echo "ERRO: nao achei $arquivo. Rode o fotos_faces.py antes." >&2; exit 1; }
done

# O reconhecedor sai do proprio indice, e nao de uma constante aqui: e ele que
# manda: subir outro faria a tela baixar um modelo que nao gerou este indice.
RECONHECEDOR=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['modelo'])" "$JSON")
DETECTOR=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get('detector','yunet.onnx'))" "$JSON")

# Conferencia barata que evita o pior erro possivel: .bin e .json de rodadas
# diferentes. O mesmo calculo do indiceConsistente em functions/_utils/photoFaces.ts.
python3 - "$JSON" "$BIN" <<'PY'
import json, os, sys
meta = json.load(open(sys.argv[1]))
esperado = len(meta["rostos"]) * meta["dim"]
real = os.path.getsize(sys.argv[2])
if esperado != real:
    raise SystemExit(
        f"ERRO: o .bin tem {real} bytes e o .json descreve {esperado}.\n"
        f"Os dois vieram de rodadas diferentes do indexador. Reindexe antes de publicar."
    )
print(f"indice conferido: {len(meta['rostos'])} rostos de {meta['dim']} dimensoes, modelo {meta['modelo']}")
PY

echo
echo "destino: $ONDE  ($BALDE)"
echo

subir() {
  local arquivo="$1" chave="$2" tipo="${3:-}"
  local tamanho
  tamanho=$(du -h "$arquivo" | cut -f1)
  echo "  $chave  ($tamanho)"
  # shellcheck disable=SC2086
  npx wrangler r2 object put "$BALDE/$chave" --file "$arquivo" $DESTINO $tipo >/dev/null
}

subir "$BIN" "faces/$ANO.bin"
subir "$JSON" "faces/$ANO.json" "--content-type=application/json"

for modelo in "$DETECTOR" "$RECONHECEDOR"; do
  caminho="$RAIZ/scripts/modelos/$modelo"
  [ -f "$caminho" ] || { echo "ERRO: falta $caminho. Rode bash scripts/fotos_faces_modelos.sh" >&2; exit 1; }
  subir "$caminho" "modelos/$modelo" "--content-type=application/octet-stream"
done

echo
echo "pronto. Confira com:"
echo "  curl -s https://caminhodoperdao.com.br/api/fotos/rosto?ano=$ANO"
