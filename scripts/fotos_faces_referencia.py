"""
Gera as fixtures que o scripts/fotos_faces_validar_js.mjs usa para conferir se o
navegador enxerga o rosto do MESMO jeito que o indexador.

Por que este script existe. O indice do album e gerado aqui, em Python, pelo
OpenCV. O vetor da selfie e gerado la, no navegador, por codigo TypeScript que
reimplementa a deteccao e o alinhamento na mao (nenhum build de opencv.js traz o
modulo de rosto). Se as duas implementacoes divergirem em qualquer detalhe,
NADA DA ERRO: o navegador gera numeros, o Worker responde rapido, e nenhuma foto
casa. Nunca. Estas fixtures sao a unica forma de pegar isso.

O que sai daqui, em /tmp/ref:

  entrada_rgba.bin     a selfie ja reduzida a 1920, em RGBA (como sai de um canvas)
  crop_python_bgr.bin  o recorte 112x112 que o alignCrop do OpenCV produziu
  quadrado_rgba.bin    a mesma selfie encaixada num quadrado 640x640 preto
  referencia.json      dimensoes, os 5 pontos, o vetor do SFace e o que o YuNet
                       achou no quadrado de 640

Uso:
  .venv-faces/bin/python scripts/fotos_faces_referencia.py --selfie ~/fotos2026/selfies/maria.jpg
  node scripts/fotos_faces_validar_js.mjs
"""
import argparse
import json
import os

import numpy as np

PASTA_MODELOS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "modelos")

# Os dois numeros vem do codigo que esta em producao, e nao daqui:
#   LADO_DETECCAO        = scripts/fotos_faces.py (o indexador)
#   LADO_ENTRADA_QUADRADO = src/services/fotos/rosto/deteccao.ts (a tela)
# Mudar um sem mudar o outro e exatamente o tipo de divergencia que este script
# existe para pegar.
LADO_BASE = 1920
LADO_ENTRADA_QUADRADO = 640

MIN_SCORE_DETECCAO = 0.6
MAX_SOBREPOSICAO = 0.3


def reduzir(imagem, lado_maior: int):
    import cv2

    altura, largura = imagem.shape[:2]
    maior = max(altura, largura)
    if maior <= lado_maior:
        return imagem
    escala = lado_maior / maior
    novo = (int(round(largura * escala)), int(round(altura * escala)))
    return cv2.resize(imagem, novo, interpolation=cv2.INTER_AREA)


def encaixar_no_quadrado(imagem, lado: int):
    """
    Mesma conta do encaixarNoQuadrado do imagem.ts: encolhe mantendo a proporcao,
    cola no canto (0,0) e deixa o resto PRETO.

    O canto, e nao o centro, para que desfazer o encaixe seja uma divisao simples.
    """
    import cv2

    altura, largura = imagem.shape[:2]
    escala = lado / max(altura, largura)
    nova_largura = max(1, int(round(largura * escala)))
    nova_altura = max(1, int(round(altura * escala)))

    reduzida = cv2.resize(imagem, (nova_largura, nova_altura), interpolation=cv2.INTER_AREA)
    quadrado = np.zeros((lado, lado, 3), dtype=np.uint8)
    quadrado[:nova_altura, :nova_largura] = reduzida
    return quadrado, escala


def main() -> int:
    import cv2

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--selfie", required=True)
    parser.add_argument("--saida", default="/tmp/ref")
    parser.add_argument("--detector", default=os.path.join(PASTA_MODELOS, "yunet.onnx"))
    parser.add_argument("--reconhecedor", default=os.path.join(PASTA_MODELOS, "sface.onnx"))
    opcoes = parser.parse_args()

    imagem = cv2.imread(opcoes.selfie)
    if imagem is None:
        raise SystemExit(f"ERRO: nao consegui abrir {opcoes.selfie}")

    imagem = reduzir(imagem, LADO_BASE)
    altura, largura = imagem.shape[:2]

    reconhecedor = cv2.FaceRecognizerSF.create(opcoes.reconhecedor, "")

    # --- Parte 1: o alinhamento -------------------------------------------
    # Detecta na resolucao natural, como faz o indexador. Estes 5 pontos sao a
    # ENTRADA do teste de alinhamento: o JS recebe os mesmos pontos e tem de
    # produzir o mesmo recorte. Assim o teste isola o alinhamento da deteccao.
    detector = cv2.FaceDetectorYN.create(
        opcoes.detector, "", (largura, altura), MIN_SCORE_DETECCAO, MAX_SOBREPOSICAO, 5000
    )
    _, achados = detector.detect(imagem)
    if achados is None or len(achados) == 0:
        raise SystemExit("ERRO: nenhum rosto na selfie. Use outra, de frente e com luz.")

    maior = sorted(achados, key=lambda linha: linha[2] * linha[3], reverse=True)[0]
    recorte = reconhecedor.alignCrop(imagem, maior)
    vetor = np.asarray(reconhecedor.feature(recorte).flatten(), dtype=np.float32)
    vetor = vetor / np.linalg.norm(vetor)

    # --- Parte 2: a deteccao ----------------------------------------------
    # O onnxruntime nao aceita redimensionar a entrada do yunet.onnx, entao a tela
    # detecta sempre num quadrado de 640. Aqui o OpenCV faz o mesmo, sobre os
    # MESMOS pixels, para que a comparacao seja do decodificador e nao do
    # redimensionador de cada lado.
    quadrado, escala_quadrado = encaixar_no_quadrado(imagem, LADO_ENTRADA_QUADRADO)
    detector.setInputSize((LADO_ENTRADA_QUADRADO, LADO_ENTRADA_QUADRADO))
    _, no_quadrado = detector.detect(quadrado)
    no_quadrado = [] if no_quadrado is None else no_quadrado.tolist()

    os.makedirs(opcoes.saida, exist_ok=True)

    # RGBA porque e assim que os pixels chegam de um canvas no navegador. O
    # OpenCV trabalha em BGR: converter aqui evita que o JS tenha de "consertar"
    # o que na vida real ja chega certo.
    cv2.cvtColor(imagem, cv2.COLOR_BGR2RGBA).tofile(os.path.join(opcoes.saida, "entrada_rgba.bin"))
    cv2.cvtColor(quadrado, cv2.COLOR_BGR2RGBA).tofile(os.path.join(opcoes.saida, "quadrado_rgba.bin"))
    # Este fica em BGR de proposito: e a saida crua do OpenCV, e o validador
    # inverte os canais na comparacao. Converter aqui esconderia um erro de canal.
    recorte.tofile(os.path.join(opcoes.saida, "crop_python_bgr.bin"))

    with open(os.path.join(opcoes.saida, "referencia.json"), "w", encoding="utf-8") as saida:
        json.dump(
            {
                "selfie": os.path.basename(opcoes.selfie),
                "modelo": os.path.basename(opcoes.reconhecedor),
                "detector": os.path.basename(opcoes.detector),
                "largura": largura,
                "altura": altura,
                "landmarks": [[float(maior[4 + 2 * i]), float(maior[5 + 2 * i])] for i in range(5)],
                "rosto_px": int(max(maior[2], maior[3])),
                "vetor": [float(v) for v in vetor],
                "quadrado": {
                    "lado": LADO_ENTRADA_QUADRADO,
                    "escala": float(escala_quadrado),
                    # box (4) + 5 pontos (10) + score (1), no formato do OpenCV.
                    "rostos": [[float(v) for v in linha] for linha in no_quadrado],
                },
            },
            saida,
            ensure_ascii=False,
        )

    print(f"selfie ........... {largura}x{altura}, rosto de {int(max(maior[2], maior[3]))}px")
    print(f"deteccao em 640 .. {len(no_quadrado)} rosto(s)")
    print(f"fixtures ......... {opcoes.saida}")
    print()
    print("Agora rode: node scripts/fotos_faces_validar_js.mjs")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
