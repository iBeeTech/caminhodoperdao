"""
Gera o indice do album (manifesto) que a galeria le no lugar da API do GitHub.

ORDEM DAS FOTOS. O evento teve tres cameras e os relogios NAO batem entre si:

    SONY SLT-A99V        1379 fotos   02/08 17:50 -> 02/08 23:27
    Canon EOS R8          956 fotos   02/08 22:07 -> 03/08 08:01
    LEICA V-LUX (Typ 114) 500 fotos   02/08 19:05 -> 02/08 20:24

As fotos da Leica sao de DIA (sol a pino, sombra curta), mas o relogio dela marca
19h-20h. Ou seja: o relogio esta errado, nao as fotos. Por isso o album NAO e
ordenado pelo horario global - isso jogaria fotos de sol no meio da madrugada.
Cada camera e mantida em bloco, na sua propria ordem de tempo, e as cameras
entram na ordem em que comecaram.

Quando alguem da organizacao disser a hora real da Leica, da para corrigir o
deslocamento e reordenar - por isso o horario de cada foto fica gravado aqui.

BLOCOS. Sao faixas de 200 fotos ("Fotos 1-200"), so para a tela oferecer um
"pular para". Nao sao trechos do percurso: com dois relogios errados, rotular
"largada" ou "chegada" seria inventar.
"""
import json
import os
import sys
from collections import defaultdict

from PIL import Image

BASE = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.getcwd()
ORIGINAIS = os.path.join(BASE, "originais")
ANO = 2026
FOTOS_POR_BLOCO = 200

EXIF_DATA_ORIGINAL = 36867
EXIF_DATA = 306
EXIF_FABRICANTE = 271
EXIF_MODELO = 272


def ler_exif(caminho):
    try:
        exif = Image.open(caminho).getexif()
    except Exception:
        return "", ""
    data = exif.get(EXIF_DATA_ORIGINAL) or exif.get(EXIF_DATA) or ""
    camera = f"{exif.get(EXIF_FABRICANTE, '?')} {exif.get(EXIF_MODELO, '?')}".strip()
    return str(data), camera


def main():
    nomes = sorted(n for n in os.listdir(ORIGINAIS) if n.lower().endswith((".jpg", ".jpeg")))
    por_camera = defaultdict(list)
    for nome in nomes:
        data, camera = ler_exif(os.path.join(ORIGINAIS, nome))
        por_camera[camera or "desconhecida"].append((data, nome))

    # Cameras na ordem em que comecaram a fotografar; fotos na ordem do relogio
    # da propria camera (com o nome do arquivo como desempate).
    cameras = sorted(por_camera, key=lambda c: min(d for d, _ in por_camera[c]))
    ordenadas = []
    for camera in cameras:
        for data, nome in sorted(por_camera[camera]):
            ordenadas.append({"n": nome, "t": data, "c": camera})

    blocos = []
    fotos = []
    for i, foto in enumerate(ordenadas):
        indice = i // FOTOS_POR_BLOCO
        if indice == len(blocos):
            inicio = indice * FOTOS_POR_BLOCO + 1
            fim = min(inicio + FOTOS_POR_BLOCO - 1, len(ordenadas))
            blocos.append({"titulo": f"Fotos {inicio}–{fim}", "total": 0})
        blocos[indice]["total"] += 1
        fotos.append({"n": foto["n"], "b": indice, "t": foto["t"]})

    manifesto = {"ano": ANO, "total": len(fotos), "blocos": blocos, "fotos": fotos}
    destino = os.path.join(BASE, f"manifesto-{ANO}.json")
    with open(destino, "w", encoding="utf-8") as saida:
        json.dump(manifesto, saida, ensure_ascii=False, separators=(",", ":"))

    print(f"{len(fotos)} fotos, {len(blocos)} blocos, {os.path.getsize(destino) // 1024} KB")
    for camera in cameras:
        print(f"  {len(por_camera[camera]):5d}  {camera}")


if __name__ == "__main__":
    main()
