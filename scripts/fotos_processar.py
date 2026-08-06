"""
Gera as versoes publicas das fotos do evento a partir dos originais baixados do R2.

Para cada foto saem DUAS versoes:

  previews/<ano>/  1200px no lado maior  -> a foto que abre ao clicar
  thumbs/<ano>/     400px no lado maior  -> a miniatura da grade

A miniatura existe por um motivo de dinheiro do peregrino, nao de estetica: sao
2882 fotos numa pagina so. Se a grade usar a foto de 1200px, rolar o album gasta
centenas de MB do celular de quem so queria se achar numa foto.

O original em alta NUNCA e alterado nem republicado por este script.

ALBUM QUE VENDE x ALBUM GRATUITO. A trama por toda a foto existe para o arquivo
em alta nao ser levado de graca. Album gratuito (--sem-trama, caso de 2025, cujos
arquivos ja sao versoes reduzidas e nao ha o que vender) leva so a assinatura no
canto: encher de marca uma foto que se pode baixar ao lado seria estorvo sem
motivo.

Uso:
  python3 scripts/fotos_processar.py --ano 2026 --pasta /caminho
  python3 scripts/fotos_processar.py --ano 2025 --pasta /caminho --sem-trama
"""
import argparse
import os
from multiprocessing import Pool

from PIL import Image, ImageOps

from fotos_marca import marca_dagua

EXTENSOES = (".jpg", ".jpeg", ".png", ".webp")

# pasta, lado maior, qualidade JPEG, altura da marca (fracao do lado maior),
# espacamento entre marcas, assinatura no canto.
# A miniatura leva marca PROPORCIONALMENTE MAIOR: a marca da previa, reduzida a
# 400px, vira poeira ilegivel e deixa de proteger.
TAMANHOS = [
    ("previews", 1200, 82, 0.09, 1.08, True),
    ("thumbs", 400, 78, 0.20, 1.12, False),
]

opcoes = None  # preenchido no __main__; os processos filhos herdam por fork.


def processar(nome: str):
    origem = os.path.join(opcoes.pasta, "originais", nome)
    saida = os.path.splitext(nome)[0] + ".jpg"
    try:
        with Image.open(origem) as raw:
            # exif_transpose: sem isto, foto tirada na vertical sai deitada.
            base = ImageOps.exif_transpose(raw).convert("RGB")
            for pasta, lado, qualidade, altura, passo, canto in TAMANHOS:
                destino = os.path.join(opcoes.pasta, pasta, str(opcoes.ano), saida)
                if os.path.exists(destino):
                    continue
                im = base.copy()
                im.thumbnail((lado, lado), Image.LANCZOS)
                # Sem EXIF de proposito: o original guarda camera, data e GPS;
                # a versao publica nao precisa levar coordenada de ninguem.
                marca_dagua(
                    im,
                    opacidade=opcoes.opacidade,
                    altura_ratio=altura,
                    passo=passo,
                    com_canto=canto,
                    trama_ligada=not opcoes.sem_trama,
                ).save(destino, "JPEG", quality=qualidade, optimize=True, progressive=True)
        return None
    except Exception as erro:  # arquivo truncado, formato estranho, etc.
        return f"{nome}: {erro}"


def main():
    global opcoes
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ano", type=int, required=True)
    parser.add_argument("--pasta", default=os.getcwd(), help="onde fica a pasta originais/")
    parser.add_argument("--opacidade", type=float, default=0.45, help="forca da trama (0 a 1)")
    parser.add_argument("--sem-trama", action="store_true", help="album gratuito: so a assinatura")
    parser.add_argument("--processos", type=int, default=12)
    opcoes = parser.parse_args()
    opcoes.pasta = os.path.abspath(opcoes.pasta)

    for pasta, *_ in TAMANHOS:
        os.makedirs(os.path.join(opcoes.pasta, pasta, str(opcoes.ano)), exist_ok=True)

    origem = os.path.join(opcoes.pasta, "originais")
    nomes = sorted(n for n in os.listdir(origem) if n.lower().endswith(EXTENSOES))
    marca = "so assinatura" if opcoes.sem_trama else f"trama {opcoes.opacidade}"
    print(f"{len(nomes)} fotos de {opcoes.ano}, {marca}")

    falhas = []
    with Pool(opcoes.processos) as pool:
        for i, erro in enumerate(pool.imap_unordered(processar, nomes, chunksize=8), 1):
            if erro:
                falhas.append(erro)
            if i % 200 == 0:
                print(f"  {i}/{len(nomes)}", flush=True)

    print(f"pronto: {len(nomes) - len(falhas)} ok, {len(falhas)} com erro")
    for f in falhas:
        print("  FALHOU", f)


if __name__ == "__main__":
    main()
