"""
Busca uma selfie no indice gerado pelo fotos_faces.py, aqui na maquina mesmo.

E o ensaio da Fase 2: antes de escrever endpoint, tela e baixar 15 MB de modelo
no celular do peregrino, este script responde a unica pergunta que decide se o
filtro de rosto vale a pena:

    de quantas fotos da pessoa ele acha, e quantos estranhos entram junto?

COMO CALIBRAR O LIMIAR. Rode com 15 a 20 selfies de gente que voce sabe que
aparece no album e olhe os resultados na mao:

    similaridade alta  -> e a pessoa
    similaridade baixa -> e outra pessoa parecida

O corte fica no meio dessa fronteira. Para o buffalo_s costuma cair entre 0,35 e
0,45, mas o numero TEM de sair das suas fotos: iluminacao, angulo e distancia da
estrada de Assis nao sao os do dataset de ninguem.

⚠️ Falso positivo e pior que falso negativo. Quem nao se acha numa foto fica
frustrado; quem ve a foto de um estranho aparecendo como "sua" perde a confianca
na galeria inteira. Na duvida, aperte o limiar.

Uso:
  python3 scripts/fotos_faces_buscar.py --indice /tmp/teste --ano 2025 --selfie eu.jpg
  python3 scripts/fotos_faces_buscar.py --indice /tmp/teste --ano 2025 --selfie eu.jpg --limiar 0.4
"""
import argparse
import json
import os
import sys

import numpy as np

PASTA_MODELOS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "modelos")

# Mesmo valor do fotos_faces.py: os dois lados tem de enxergar a foto igual.
LADO_DETECCAO = 1920

# Chute inicial, NAO uma recomendacao. Existe para o script rodar antes de voce
# ter calibrado; o numero certo sai da Fase 2.
LIMIAR_PADRAO = 0.38

# Lado minimo do rosto NA SELFIE. Igual ao MIN_LADO_ROSTO_SELFIE de
# functions/_utils/photoFaces.ts - se mudar la, mude aqui: e a mesma regra, e o
# teste local so vale se recusar as mesmas fotos que a tela vai recusar.
MIN_LADO_ROSTO_SELFIE = 100


def carregar_indice(pasta: str, ano: int):
    caminho_json = os.path.join(pasta, f"faces_{ano}.json")
    caminho_bin = os.path.join(pasta, f"faces_{ano}.bin")

    with open(caminho_json, encoding="utf-8") as arquivo:
        meta = json.load(arquivo)

    vetores = np.fromfile(caminho_bin, dtype=np.int8).reshape(-1, meta["dim"])

    # Se estes dois numeros divergirem, o .bin e o .json vieram de rodadas
    # diferentes e TODO resultado abaixo seria mentira - cada vetor casaria com o
    # nome da foto errada. Melhor parar aqui do que devolver foto trocada.
    if len(vetores) != len(meta["rostos"]):
        raise SystemExit(
            f"ERRO: o indice esta inconsistente — {len(vetores)} vetores no .bin "
            f"e {len(meta['rostos'])} no .json. Rode o fotos_faces.py de novo."
        )

    return meta, vetores.astype(np.float32) / 127.0


def vetor_da_selfie(caminho: str, detector_path: str, reconhecedor_path: str, min_rosto: int):
    """
    Gera a impressao digital da selfie com os MESMOS modelos que indexaram o
    album. E o mesmo caminho que o navegador vai percorrer depois, via opencv.js:
    detectar, endireitar pelos 5 pontos, gerar o vetor.
    """
    import cv2

    imagem = cv2.imread(caminho)
    if imagem is None:
        raise SystemExit(f"ERRO: nao consegui abrir {caminho}")

    altura, largura = imagem.shape[:2]
    maior = max(altura, largura)
    if maior > LADO_DETECCAO:
        escala = LADO_DETECCAO / maior
        imagem = cv2.resize(imagem, (int(largura * escala), int(altura * escala)), interpolation=cv2.INTER_AREA)
        altura, largura = imagem.shape[:2]

    detector = cv2.FaceDetectorYN.create(detector_path, "", (largura, altura), 0.6, 0.3, 5000)
    reconhecedor = cv2.FaceRecognizerSF.create(reconhecedor_path, "")
    _, rostos = detector.detect(imagem)

    if rostos is None or len(rostos) == 0:
        raise SystemExit("ERRO: nenhum rosto na selfie. Peca outra foto, de frente e com luz.")

    # Mais de um rosto na selfie: fica com o MAIOR, que e quem tirou a foto. Sem
    # isto, uma selfie com o grupo atras buscaria o rosto de quem passou no fundo.
    if len(rostos) > 1:
        print(f"aviso: {len(rostos)} rostos na selfie, usando o maior", file=sys.stderr)
        rostos = sorted(rostos, key=lambda r: r[2] * r[3], reverse=True)

    lado = int(max(rostos[0][2], rostos[0][3]))
    if lado < min_rosto:
        # A mesma regra que a tela aplica (MIN_LADO_ROSTO_SELFIE em
        # functions/_utils/photoFaces.ts). Deixar passar aqui daria um resultado
        # cheio de estranhos e faria voce calibrar o limiar contra lixo.
        raise SystemExit(
            f"ERRO: o rosto tem {lado}px na selfie, minimo {min_rosto}px.\n"
            f"Rosto pequeno gera vetor instavel: no teste de 2026, uma selfie de 46px\n"
            f"devolveu 79 fotos e quase nenhuma era da pessoa. Use uma foto mais de perto."
        )

    vetor = reconhecedor.feature(reconhecedor.alignCrop(imagem, rostos[0])).flatten()
    return np.asarray(vetor, dtype=np.float32) / np.linalg.norm(vetor)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--indice", required=True, help="pasta com faces_<ano>.bin e .json")
    parser.add_argument("--ano", type=int, required=True)
    parser.add_argument("--selfie", required=True)
    parser.add_argument("--limiar", type=float, default=LIMIAR_PADRAO)
    parser.add_argument("--maximo", type=int, default=30, help="quantas fotos mostrar")
    parser.add_argument("--detector", default=os.path.join(PASTA_MODELOS, "yunet.onnx"))
    parser.add_argument("--reconhecedor", default=None, help="padrao: o mesmo que indexou")
    parser.add_argument("--mosaico", default=None, help="grava um PNG com os rostos achados")
    parser.add_argument("--fotos", default=None, help="pasta das fotos, para o mosaico recortar")
    parser.add_argument("--mosaico-quantidade", type=int, default=10)
    parser.add_argument("--min-rosto", type=int, default=MIN_LADO_ROSTO_SELFIE)
    opcoes = parser.parse_args()

    if opcoes.mosaico and not opcoes.fotos:
        raise SystemExit("ERRO: --mosaico precisa de --fotos apontando para a pasta das fotos.")

    meta, vetores = carregar_indice(opcoes.indice, opcoes.ano)
    print(f"indice: {meta['total_rostos']} rostos em {meta['total_fotos']} fotos ({meta['modelo']})")

    # O indice grava o ARQUIVO que o gerou, e a busca usa esse mesmo por padrao.
    # Comparar vetor do modelo cheio com vetor do comprimido nao da erro nenhum -
    # so faz a busca achar menos gente, e ninguem descobre por que.
    reconhecedor = opcoes.reconhecedor or os.path.join(PASTA_MODELOS, meta["modelo"])
    selfie = vetor_da_selfie(opcoes.selfie, opcoes.detector, reconhecedor, opcoes.min_rosto)

    # Os dois lados estao normalizados, entao este produto de matriz JA e a
    # similaridade do cosseno de todos os rostos de uma vez. E exatamente a conta
    # que o Worker vai fazer - por isso ela mora aqui tambem, para o resultado da
    # tela nunca divergir do que voce calibrou.
    similaridades = vetores @ selfie

    # Uma pessoa aparece varias vezes na MESMA foto (ela e o reflexo, ela ao
    # fundo). Interessa a melhor pontuacao por foto, senao a lista repete arquivo.
    melhor_por_foto: dict[str, float] = {}
    melhor_por_indice: dict[str, int] = {}
    for posicao, similaridade in enumerate(similaridades):
        nome = meta["rostos"][posicao]["n"]
        if similaridade > melhor_por_foto.get(nome, -1.0):
            melhor_por_foto[nome] = float(similaridade)
            # Guardado para o mosaico recortar O ROSTO que casou, e nao o
            # primeiro da foto: numa foto com cinco pessoas, recortar o rosto
            # errado faria voce reprovar um acerto.
            melhor_por_indice[nome] = posicao

    ordenadas = sorted(melhor_por_foto.items(), key=lambda item: item[1], reverse=True)
    acima = [item for item in ordenadas if item[1] >= opcoes.limiar]

    print(f"limiar {opcoes.limiar}: {len(acima)} foto(s) de {len(ordenadas)}")
    print()
    print("  similaridade  foto")
    for nome, similaridade in ordenadas[: opcoes.maximo]:
        marca = "✓" if similaridade >= opcoes.limiar else " "
        print(f"{marca}   {similaridade:.3f}       {nome}")

    if len(ordenadas) > opcoes.maximo:
        print(f"    ... mais {len(ordenadas) - opcoes.maximo} foto(s) abaixo")

    # A fronteira e o que interessa calibrar: se houver um degrau claro entre o
    # ultimo certo e o primeiro errado, o limiar esta bom. Se os valores descerem
    # de mansinho, nao existe corte que separe - e o modelo nao esta dando conta.
    if opcoes.mosaico:
        gerar_mosaico(meta, ordenadas, melhor_por_indice, opcoes)

    print()
    print("Olhe as fotos em volta do limiar: e ali que se decide o numero.")
    return 0


def gerar_mosaico(meta, ordenadas, melhor_por_indice, opcoes) -> None:
    """
    Recorta os rostos encontrados lado a lado, do mais parecido para o menos.

    Numero em tabela nao calibra nada: so olhando os rostos e que se decide onde
    esta a fronteira entre "e a pessoa" e "e outra parecida". Por isso a imagem
    passa do limiar de proposito - o que interessa e ver quem ficou de fora por
    pouco.
    """
    from PIL import Image, ImageDraw

    lado = 180
    mostrar = ordenadas[: opcoes.mosaico_quantidade]
    folha = Image.new("RGB", (lado * len(mostrar), lado + 22), "white")
    desenho = ImageDraw.Draw(folha)

    for coluna, (nome, similaridade) in enumerate(mostrar):
        x, y, largura, altura = meta["rostos"][melhor_por_indice[nome]]["box"]
        margem = int(largura * 0.35)
        imagem = Image.open(os.path.join(opcoes.fotos, nome)).convert("RGB")
        recorte = imagem.crop(
            (
                max(0, x - margem),
                max(0, y - margem),
                min(imagem.width, x + largura + margem),
                min(imagem.height, y + altura + margem),
            )
        ).resize((lado, lado))

        folha.paste(recorte, (coluna * lado, 22))
        marca = "*" if similaridade >= opcoes.limiar else " "
        desenho.text((coluna * lado + 4, 6), f"{marca}{nome} {similaridade:.2f}", fill="black")

    folha.save(opcoes.mosaico)
    print()
    print(f"mosaico: {opcoes.mosaico}   (* = passou do limiar)")


if __name__ == "__main__":
    raise SystemExit(main())
