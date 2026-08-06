"""
Gera o indice do album (manifesto) que a galeria le no lugar da API do GitHub.

ORDEM DAS FOTOS (2026). As TRES cameras do evento gravaram 12 HORAS A MAIS que a
hora real - o erro classico de AM trocado por PM. O que os arquivos dizem e o que
de fato aconteceu:

    SONY SLT-A99V   1426 fotos   grava 17:50 -> 23:30   real 05:50 -> 11:30
    LEICA V-LUX      500 fotos   grava 19:05 -> 20:24   real 07:05 -> 08:24
    Canon EOS R8     956 fotos   grava 22:07 -> 22:47   real 10:07 -> 10:47

Como se sabe que sao 12 horas e nao um palpite: o brilho medio das fotos da Sony
sobe de 45 (escuro) na hora gravada "17h" para 56 (penumbra) na "18h" e 106 (dia
claro) na "19h". Isso e um AMANHECER. Se a hora gravada fosse a verdadeira, a
sequencia seria a inversa - claro virando escuro ao anoitecer. A organizacao
confirmou em 06/08/2026: tudo aconteceu na manha do dia 02/08.

Por isso o album e ordenado pelo HORARIO CORRIGIDO, misturando as cameras: a
ordem passa a ser a do evento (largada no escuro, amanhecer, cafe, chegada).
Antes da correcao, ordenar pelo relogio jogaria as fotos do cafe da manha no meio
das fotos de lanterna - e era por isso que cada camera ficava num bloco separado.

O ajuste NAO fica chumbado no codigo: vem por --ajuste-horas, e por
--ajuste-camera quando so uma das cameras estiver errada. O manifesto guarda o
horario ja corrigido.

Album sem EXIF (2025, fotos que vieram do GitHub ja reduzidas) cai na ordem do
nome do arquivo, com numero tratado como numero: "2.jpeg" antes de "10.jpeg".

BLOCOS. Faixas de 200 fotos rotuladas com a hora real ("Fotos 1-200 ·
05h50-06h12"), para o "pular para" da tela dizer alguma coisa a quem lembra mais
ou menos a hora em que passou. Album pequeno sai sem bloco nenhum.

VENDA. `venda: false` (--sem-venda) marca album gratuito: a tela esconde a
escolha de fotos e o carrinho, e oferece o download direto da previa.

Uso:
  python3 scripts/fotos_manifesto.py --ano 2026 --pasta /caminho --ajuste-horas -12
  python3 scripts/fotos_manifesto.py --ano 2025 --pasta /caminho --sem-venda
"""
import argparse
import json
import os
import re
from collections import defaultdict
from datetime import datetime, timedelta

from PIL import Image

FOTOS_POR_BLOCO = 200
MINIMO_PARA_BLOCOS = 300
FORMATO_EXIF = "%Y:%m:%d %H:%M:%S"

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


def corrigir(data_exif, camera, ajuste_global, ajustes_por_camera):
    """Aplica o deslocamento de horas e devolve a data corrigida (ou "" se nao houver)."""
    if not data_exif:
        return ""
    horas = ajuste_global
    for pedaco, valor in ajustes_por_camera.items():
        if pedaco.lower() in camera.lower():
            horas = valor
            break
    try:
        quando = datetime.strptime(data_exif, FORMATO_EXIF)
    except ValueError:
        return data_exif
    return (quando + timedelta(hours=horas)).strftime(FORMATO_EXIF)


def chave_natural(nome):
    """"10.jpeg" depois de "2.jpeg", e nao antes como faria a ordem alfabetica."""
    return [int(p) if p.isdigit() else p.lower() for p in re.split(r"(\d+)", nome)]


def ler_ajustes_por_camera(valores):
    """--ajuste-camera "LEICA=-12" (pode repetir). O nome e casado por pedaco."""
    ajustes = {}
    for item in valores or []:
        if "=" not in item:
            raise SystemExit(f'--ajuste-camera esperado como "NOME=HORAS", recebido: {item}')
        nome, horas = item.rsplit("=", 1)
        ajustes[nome.strip()] = float(horas)
    return ajustes


def rotulo_do_bloco(inicio, fim, fotos):
    """"Fotos 1–200 · 05h50–06h12" quando ha horario; sem a parte da hora, se nao houver."""
    horas = [f["t"][11:16].replace(":", "h") for f in fotos if f["t"]]
    faixa = f" · {horas[0]}–{horas[-1]}" if horas else ""
    return f"Fotos {inicio}–{fim}{faixa}"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ano", type=int, required=True)
    parser.add_argument("--pasta", default=os.getcwd())
    parser.add_argument("--sem-venda", action="store_true", help="album gratuito")
    parser.add_argument(
        "--ajuste-horas", type=float, default=0.0, help="horas a somar em TODAS as fotos"
    )
    parser.add_argument(
        "--ajuste-camera", action="append", help='ex: "LEICA=-12" (pode repetir)'
    )
    opcoes = parser.parse_args()
    pasta = os.path.abspath(opcoes.pasta)
    ajustes_por_camera = ler_ajustes_por_camera(opcoes.ajuste_camera)

    # A lista sai de previews/, e nao de originais/: e a pasta que representa o
    # que existe publicado. Original sem previa gerada nao pode entrar no album.
    previas = os.path.join(pasta, "previews", str(opcoes.ano))
    nomes = sorted(
        (n for n in os.listdir(previas) if n.lower().endswith(".jpg")), key=chave_natural
    )

    originais = os.path.join(pasta, "originais")
    registros = []
    por_camera = defaultdict(int)
    for nome in nomes:
        data, camera = "", ""
        for candidato in (nome, os.path.splitext(nome)[0] + ".jpeg"):
            caminho = os.path.join(originais, candidato)
            if os.path.exists(caminho):
                data, camera = ler_exif(caminho)
                break
        por_camera[camera or "sem camera"] += 1
        registros.append(
            {"n": nome, "t": corrigir(data, camera, opcoes.ajuste_horas, ajustes_por_camera)}
        )

    # Ordem do evento: quem tem horario vai por horario (ja corrigido), misturando
    # as cameras; quem nao tem horario fica no fim, na ordem do nome.
    com_hora = sorted((r for r in registros if r["t"]), key=lambda r: (r["t"], chave_natural(r["n"])))
    sem_hora = sorted((r for r in registros if not r["t"]), key=lambda r: chave_natural(r["n"]))
    ordenadas = com_hora + sem_hora

    usa_blocos = len(ordenadas) >= MINIMO_PARA_BLOCOS
    fotos = [{"n": r["n"], "b": (i // FOTOS_POR_BLOCO if usa_blocos else 0), "t": r["t"]}
             for i, r in enumerate(ordenadas)]

    blocos = []
    if usa_blocos:
        for inicio in range(0, len(fotos), FOTOS_POR_BLOCO):
            pedaco = fotos[inicio : inicio + FOTOS_POR_BLOCO]
            blocos.append(
                {
                    "titulo": rotulo_do_bloco(inicio + 1, inicio + len(pedaco), pedaco),
                    "total": len(pedaco),
                }
            )

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
        f"ajuste {opcoes.ajuste_horas:+g}h, {os.path.getsize(destino) // 1024} KB -> {destino}"
    )
    for camera, quantas in sorted(por_camera.items(), key=lambda kv: -kv[1]):
        print(f"  {quantas:5d}  {camera}")
    if com_hora:
        print(f"  periodo do album (ja corrigido): {com_hora[0]['t']} -> {com_hora[-1]['t']}")
    if sem_hora:
        print(f"  {len(sem_hora)} foto(s) sem horario, no fim do album")


if __name__ == "__main__":
    main()
