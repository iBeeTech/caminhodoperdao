#!/usr/bin/env bash
#
# Baixa os modelos de rosto usados pelo fotos_faces.py.
#
# YuNet (deteccao) e SFace (reconhecimento), os dois do OpenCV Zoo. A escolha e
# por LICENCA: YuNet e MIT, SFace e Apache 2.0, e as duas permitem uso comercial.
# Os modelos do InsightFace (buffalo_*), que sao os mais precisos, saem so para
# pesquisa nao-comercial - e o album de 2026 vende foto.
#
# Os arquivos NAO entram no git (ver .gitignore): sao binarios grandes que se
# baixam de novo em um minuto. Para a tela do peregrino eles vao para o R2, e nao
# para o repositorio.
#
# Uso:
#   bash scripts/fotos_faces_modelos.sh
set -euo pipefail

ZOO="https://github.com/opencv/opencv_zoo/raw/main/models"
DESTINO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/modelos"

mkdir -p "$DESTINO"

baixar() {
  local url="$1" arquivo="$2" minimo="$3"

  if [ -f "$DESTINO/$arquivo" ]; then
    echo "ja existe: $arquivo"
    return
  fi

  echo "baixando $arquivo..."
  curl -sL -o "$DESTINO/$arquivo" "$url"

  # O GitHub responde 200 com uma pagina de erro quando o caminho muda de lugar.
  # Sem esta conferencia, o arquivo "baixa" e so o OpenCV reclama la na frente,
  # com uma mensagem que nao diz que o problema foi o download.
  local tamanho
  tamanho=$(stat -c%s "$DESTINO/$arquivo")
  if [ "$tamanho" -lt "$minimo" ]; then
    rm -f "$DESTINO/$arquivo"
    echo "ERRO: $arquivo veio com $tamanho bytes, esperado ao menos $minimo." >&2
    echo "Confira se o caminho no opencv_zoo mudou: $url" >&2
    exit 1
  fi
}

# Deteccao: acha o rosto e os 5 pontos (olhos, nariz, cantos da boca) que o
# alinhamento usa. ~230 KB.
baixar "$ZOO/face_detection_yunet/face_detection_yunet_2023mar.onnx" "yunet.onnx" 100000

# Reconhecimento, versao cheia: e a que INDEXA o album, aqui na maquina, onde
# tamanho nao importa. ~39 MB.
baixar "$ZOO/face_recognition_sface/face_recognition_sface_2021dec.onnx" "sface.onnx" 30000000

# Reconhecimento, versao comprimida: candidata a ir para o navegador do
# peregrino, onde 39 MB seria inviavel no 3G da estrada. ~10 MB.
#
# ⚠️ Modelo comprimido gera vetores um pouco diferentes do cheio. Se a tela usar
# este, o album TEM de ser indexado com este mesmo - misturar os dois nao da
# erro, so faz a busca achar menos gente.
baixar "$ZOO/face_recognition_sface/face_recognition_sface_2021dec_int8.onnx" "sface_int8.onnx" 5000000

echo
ls -la "$DESTINO"
