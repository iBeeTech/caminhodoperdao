"""
Gera o indice do album (manifesto) que a galeria le no lugar da API do GitHub.

ORDEM DAS FOTOS (2026). O evento teve tres cameras e os relogios NAO batem:

    SONY SLT-A99V        1426 fotos   02/08 17:50 -> 02/08 23:27
    Canon EOS R8          956 fotos   02/08 22:07 -> 03/08 08:01
    LEICA V-LUX (Typ 114)  500 fotos  02/08 19:05 -> 02/08 20:24

As fotos da Leica sao de DIA (sol a pino, sombra curta), mas o relogio dela
marca 19h-20h. Ou seja: o relogio esta errado, nao as fotos. Por isso o album
NAO e ordenado pelo horario global - isso jogaria fotos de sol no meio da
madrugada. Cada camera fica em bloco, na sua propria ordem de tempo, e as
cameras entram na ordem em que comecaram. Quando alguem informar a hora real da
Leica, da para corrigir o deslocamento e reordenar: o horario de cada foto fica
gravado aqui.

Album sem EXIF (2025, fotos que vieram do GitHub ja reduzidas) cai na ordem do
nome do arquivo, com numero tratado como numero: "2.jpeg" antes de "10.jpeg".

BLOCOS. Faixas de 200 fotos ("Fotos 1-200"), so para a tela oferecer um "pular
para". Nao sao trechos do percurso: com dois relogios errados, rotular "largada"
ou "chegada" seria inventar. Album pequeno sai sem bloco nenhum.

VENDA. `venda: false` (--sem-venda) marca album gratuito: a tela esconde a
escolha de fotos e o carrinho, e oferece o download direto da previa.

Uso:
  python3 scripts/fotos_manifesto.py --ano 2026 --pasta /caminho
  python3 scripts/fotos_manifesto.py --ano 2025 --pasta /caminho --sem-venda
"""
import argparse
import json
import os
import re
from collections import defaultdict

from PIL import Image

FOTOS_POR_BLOCO = 200
MINIMO_PARA_BLOCOS = 300

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


def chave_natural(nome):
    """"10.jpeg" depois de "2.jpeg", e nao antes como faria a ordem alfabetica."""
    return [int(p) if p.isdigit() else p.lower() for p in re.split(r"(\d+)", nome)]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ano", type=int, required=True)
    parser.add_argument("--pasta", default=os.getcwd())
    parser.add_argument("--sem-venda", action="store_true", help="album gratuito")
    opcoes = parser.parse_args()
    pasta = os.path.abspath(opcoes.pasta)

    # A lista sai de previews/, e nao de originais/: e a pasta que representa o
    # que existe publicado. Original sem previa gerada nao pode entrar no album.
    previas = os.path.join(pasta, "previews", str(opcoes.ano))
    nomes = sorted(
        (n for n in os.listdir(previas) if n.lower().endswith(".jpg")), key=chave_natural
    )

    por_camera = defaultdict(list)
    originais = os.path.join(pasta, "originais")
    for nome in nomes:
        data, camera = "", ""
        for candidato in (nome, os.path.splitext(nome)[0] + ".jpeg"):
            caminho = os.path.join(originais, candidato)
            if os.path.exists(caminho):
                data, camera = ler_exif(caminho)
                break
        por_camera[camera or "sem camera"].append((data, nome))

    cameras = sorted(por_camera, key=lambda c: min(d for d, _ in por_camera[c]))
    ordenadas = []
    for camera in cameras:
        fotos_da_camera = por_camera[camera]
        # Sem horario, o desempate e o proprio nome, em ordem natural.
        if all(not data for data, _ in fotos_da_camera):
            fotos_da_camera = sorted(fotos_da_camera, key=lambda item: chave_natural(item[1]))
        else:
            fotos_da_camera = sorted(fotos_da_camera)
        ordenadas.extend(fotos_da_camera)

    usa_blocos = len(ordenadas) >= MINIMO_PARA_BLOCOS
    blocos = []
    fotos = []
    for i, (data, nome) in enumerate(ordenadas):
        indice = i // FOTOS_POR_BLOCO if usa_blocos else 0
        if usa_blocos and indice == len(blocos):
            inicio = indice * FOTOS_POR_BLOCO + 1
            fim = min(inicio + FOTOS_POR_BLOCO - 1, len(ordenadas))
            blocos.append({"titulo": f"Fotos {inicio}–{fim}", "total": 0})
        if usa_blocos:
            blocos[indice]["total"] += 1
        fotos.append({"n": nome, "b": indice if usa_blocos else 0, "t": data})

    manifesto = {
        "ano": opcoes.ano,
        "total": len(fotos),
        "venda": not opcoes.sem_venda,
        "blocos": blocos,
        "fotos": fotos,
    }
    destino = os.path.join(pasta, f"manifesto-{opcoes.ano}.json")
    with open(destino, "w", encoding="utf-8") as saida:
        json.dump(manifesto, saida, ensure_ascii=False, separators=(",", ":"))

    print(
        f"{len(fotos)} fotos, {len(blocos)} blocos, venda={manifesto['venda']}, "
        f"{os.path.getsize(destino) // 1024} KB -> {destino}"
    )
    for camera in cameras:
        print(f"  {len(por_camera[camera]):5d}  {camera}")


if __name__ == "__main__":
    main()
