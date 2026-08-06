"""
Indexa os ROSTOS do album: para cada foto, guarda a "impressao digital" de cada
pessoa que aparece nela. E o que permite o peregrino mandar uma selfie e receber
so as fotos em que ele esta, em vez de rolar 2882 miniaturas.

O QUE SAI DAQUI (dois arquivos, lidos juntos):

  faces_<ano>.bin    N * dim bytes. Um vetor int8 por rosto, ja normalizado.
  faces_<ano>.json   metadados na MESMA ordem dos vetores.

MODELOS: YuNet (deteccao, MIT) + SFace (reconhecimento, Apache 2.0), os dois do
OpenCV Zoo. A escolha e por LICENCA, nao por gosto: os modelos do InsightFace
(buffalo_*) sao liberados so para pesquisa nao-comercial, e o album de 2026 vende
foto. Baixe com scripts/fotos_faces_modelos.sh.

De quebra, os dois rodam identicos no Python e no opencv.js do navegador. Como o
peregrino vai gerar o vetor da selfie no proprio celular, os dois lados usam a
MESMA implementacao para endireitar o rosto - e some o erro mais traicoeiro
desta funcionalidade, que e cada lado alinhar de um jeito e nenhuma foto casar,
sem erro nenhum aparecer.

Por que int8 e nao float32: sao ~12 mil rostos em 2882 fotos. Vetor normalizado
guardado em int8 corta o indice para um quarto e muda a similaridade na terceira
casa decimal - irrelevante perto do erro do proprio modelo.

⚠️ INDEXE OS ORIGINAIS, NUNCA OS PREVIEWS DE 2026. O fotos_processar.py grava
uma trama por toda a foto do album que vende, e essa trama passa por cima dos
rostos. O reconhecimento continua "funcionando" - so que pior, sem avisar.

⚠️ O MODELO E CONTRATO. Vetor gerado por um modelo so pode ser comparado com
vetor do MESMO modelo (o arquivo, inclusive a versao quantizada ou nao). Trocar
o modelo depois obriga a reindexar tudo. Por isso o nome do arquivo vai gravado
no .json.

Uso:
  python3 scripts/fotos_faces.py --ano 2026 --pasta /caminho          # espera originais/
  python3 scripts/fotos_faces.py --ano 2025 --pasta /tmp/t --sub fotos
"""
import argparse
import json
import os
import sys

import numpy as np

PASTA_MODELOS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "modelos")

# O lado maior a que a foto e reduzida antes da deteccao. Original de 24MP nao
# acha mais rosto que isto - so gasta tempo. Abaixo de ~1600 os rostos do fundo
# (quem esta longe na estrada) comecam a sumir.
LADO_DETECCAO = 1920

# Rosto menor que isto no eixo maior e borrao: gera vetor instavel, que casa com
# qualquer um. Melhor nao indexar do que indexar lixo que vira falso positivo.
MIN_LADO_ROSTO = 32

# Confianca minima do YuNet. Abaixo disso costuma ser rosto em cartaz, estatua ou
# padrao de folhagem que lembra cara.
MIN_SCORE_DETECCAO = 0.6

# Quantos rostos no maximo por foto. Foto de multidao na largada tem dezenas.
MAX_ROSTOS_POR_FOTO = 5000

EXTENSOES = (".jpg", ".jpeg", ".png")


def carregar_modelos(detector_path: str, reconhecedor_path: str):
    import cv2

    for caminho in (detector_path, reconhecedor_path):
        if not os.path.isfile(caminho):
            raise SystemExit(
                f"ERRO: modelo nao encontrado em {caminho}.\n"
                f"Rode: bash scripts/fotos_faces_modelos.sh"
            )

    detector = cv2.FaceDetectorYN.create(
        detector_path, "", (320, 320), MIN_SCORE_DETECCAO, 0.3, MAX_ROSTOS_POR_FOTO
    )
    reconhecedor = cv2.FaceRecognizerSF.create(reconhecedor_path, "")
    return detector, reconhecedor


def reduzir(imagem, lado_maior: int):
    """Reduz mantendo a proporcao. Devolve (imagem, escala aplicada)."""
    import cv2

    altura, largura = imagem.shape[:2]
    maior = max(altura, largura)
    if maior <= lado_maior:
        return imagem, 1.0

    escala = lado_maior / maior
    novo = (int(round(largura * escala)), int(round(altura * escala)))
    return cv2.resize(imagem, novo, interpolation=cv2.INTER_AREA), escala


def normalizar(vetor: np.ndarray) -> np.ndarray:
    """
    Deixa o vetor com comprimento 1. Depois disso, comparar dois rostos vira uma
    multiplicacao simples (produto escalar = similaridade do cosseno), que e o
    que o Worker precisa fazer milhares de vezes por busca.
    """
    norma = np.linalg.norm(vetor)
    return vetor / norma if norma > 0 else vetor


def quantizar(vetor: np.ndarray) -> np.ndarray:
    """
    float32 -> int8. Vetor normalizado tem todo valor entre -1 e 1, entao a
    conversao e so multiplicar por 127. Quem le desfaz dividindo pelo mesmo 127
    (functions/_utils/photoFaces.ts faz exatamente isso).
    """
    return np.clip(np.round(vetor * 127.0), -127, 127).astype(np.int8)


def rostos_da_foto(detector, reconhecedor, caminho: str):
    """
    Devolve a lista de rostos de UMA foto. Erro em foto isolada nao derruba o
    lote: com 2882 arquivos, um JPEG truncado no meio da noite jogaria fora uma
    hora de processamento.
    """
    import cv2

    imagem = cv2.imread(caminho)
    if imagem is None:
        return None, "nao abriu"

    reduzida, escala = reduzir(imagem, LADO_DETECCAO)
    altura, largura = reduzida.shape[:2]

    try:
        # O YuNet exige saber o tamanho da entrada, e as fotos do evento vem em
        # retrato e paisagem misturados. Sem isto, a deteccao sai deslocada.
        detector.setInputSize((largura, altura))
        _, achados = detector.detect(reduzida)
    except Exception as erro:  # noqa: BLE001 - qualquer falha do modelo e "pula esta foto"
        return None, f"modelo falhou: {erro}"

    if achados is None:
        return [], None

    rostos = []
    for linha in achados:
        x, y, largura_rosto, altura_rosto = [float(v) for v in linha[:4]]
        score = float(linha[14])

        if max(largura_rosto, altura_rosto) < MIN_LADO_ROSTO:
            continue

        # alignCrop usa os 5 pontos (olhos, nariz, cantos da boca) para GIRAR e
        # recortar o rosto em 112x112. Sem esse endireitamento, a mesma pessoa de
        # cabeca inclinada gera um vetor diferente e nao casa consigo mesma.
        try:
            alinhado = reconhecedor.alignCrop(reduzida, linha)
            vetor = reconhecedor.feature(alinhado).flatten()
        except Exception as erro:  # noqa: BLE001
            return None, f"alinhamento falhou: {erro}"

        # A caixa volta para a escala da foto ORIGINAL: quem for desenhar o
        # quadrado na tela trabalha com o tamanho de verdade, nao com o 1920.
        rostos.append(
            {
                "vetor": normalizar(np.asarray(vetor, dtype=np.float32)),
                "box": [round(v / escala) for v in (x, y, largura_rosto, altura_rosto)],
                "score": round(score, 3),
            }
        )

    return rostos, None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--ano", type=int, required=True)
    parser.add_argument("--pasta", default=os.getcwd(), help="onde fica a pasta com as fotos")
    parser.add_argument("--sub", default="originais", help="subpasta das fotos (padrao: originais)")
    parser.add_argument("--saida", default=None, help="onde gravar o indice (padrao: --pasta)")
    parser.add_argument("--detector", default=os.path.join(PASTA_MODELOS, "yunet.onnx"))
    parser.add_argument("--reconhecedor", default=os.path.join(PASTA_MODELOS, "sface.onnx"))
    parser.add_argument("--limite", type=int, default=0, help="processa so as N primeiras (teste)")
    opcoes = parser.parse_args()

    pasta_fotos = os.path.join(os.path.abspath(opcoes.pasta), opcoes.sub)
    if not os.path.isdir(pasta_fotos):
        print(f"ERRO: nao achei a pasta {pasta_fotos}", file=sys.stderr)
        return 1

    arquivos = sorted(n for n in os.listdir(pasta_fotos) if n.lower().endswith(EXTENSOES))
    if opcoes.limite:
        arquivos = arquivos[: opcoes.limite]
    if not arquivos:
        print(f"ERRO: nenhuma foto em {pasta_fotos}", file=sys.stderr)
        return 1

    detector, reconhecedor = carregar_modelos(opcoes.detector, opcoes.reconhecedor)

    vetores: list[np.ndarray] = []
    metadados: list[dict] = []
    sem_rosto: list[str] = []
    falhas: list[str] = []

    # Sequencial de proposito, ao contrario do fotos_processar.py: o OpenCV ja usa
    # todos os nucleos por dentro. Abrir 12 processos aqui faria 12 copias do
    # modelo brigarem pela mesma CPU e ficaria MAIS lento.
    for indice, nome in enumerate(arquivos, start=1):
        rostos, erro = rostos_da_foto(detector, reconhecedor, os.path.join(pasta_fotos, nome))

        if erro:
            falhas.append(f"{nome}: {erro}")
        elif not rostos:
            sem_rosto.append(nome)
        else:
            for rosto in rostos:
                vetores.append(quantizar(rosto["vetor"]))
                metadados.append({"n": nome, "box": rosto["box"], "s": rosto["score"]})

        if indice % 50 == 0 or indice == len(arquivos):
            print(f"  {indice}/{len(arquivos)} fotos — {len(vetores)} rostos", flush=True)

    if not vetores:
        print("ERRO: nenhum rosto encontrado em nenhuma foto.", file=sys.stderr)
        return 1

    destino = os.path.abspath(opcoes.saida or opcoes.pasta)
    os.makedirs(destino, exist_ok=True)
    caminho_bin = os.path.join(destino, f"faces_{opcoes.ano}.bin")
    caminho_json = os.path.join(destino, f"faces_{opcoes.ano}.json")

    np.stack(vetores).tofile(caminho_bin)

    with open(caminho_json, "w", encoding="utf-8") as saida:
        json.dump(
            {
                "ano": opcoes.ano,
                # Nome do ARQUIVO, nao "sface": a versao quantizada gera vetores
                # levemente diferentes da normal. Quem for gerar o vetor da selfie
                # no navegador precisa carregar exatamente este arquivo.
                "modelo": os.path.basename(opcoes.reconhecedor),
                "detector": os.path.basename(opcoes.detector),
                "dim": len(vetores[0]),
                "total_fotos": len(arquivos),
                "total_rostos": len(vetores),
                "fotos_sem_rosto": len(sem_rosto),
                "rostos": metadados,
            },
            saida,
            ensure_ascii=False,
        )

    print()
    print(f"fotos lidas .......... {len(arquivos)}")
    print(f"rostos indexados ..... {len(vetores)}")
    print(f"fotos sem rosto ...... {len(sem_rosto)}")
    print(f"falhas ............... {len(falhas)}")
    print(f"media de rostos/foto . {len(vetores) / len(arquivos):.1f}")
    print(f"tamanho do indice .... {os.path.getsize(caminho_bin) / 1_000_000:.1f} MB")
    print()
    print(f"{caminho_bin}")
    print(f"{caminho_json}")

    for falha in falhas[:10]:
        print(f"  falhou: {falha}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
