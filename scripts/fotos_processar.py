"""
Gera as versoes publicas das fotos do evento a partir dos originais baixados do R2.

Para cada foto saem DUAS versoes, as duas com a marca gravada:

  previews/<ano>/  1200px no lado maior  -> a foto que abre ao clicar
  thumbs/<ano>/     400px no lado maior  -> a miniatura da grade

A miniatura existe por um motivo de dinheiro do peregrino, nao de estetica: sao
2882 fotos numa pagina so. Se a grade usar a foto de 1200px, rolar o album gasta
centenas de MB do celular de quem so queria se achar numa foto.

O original em alta NUNCA e alterado nem republicado por este script.

Uso:  python3 scripts/fotos_processar.py [opacidade] [pasta]

  opacidade  forca da trama (0 a 1). 0.45 e a que esta publicada em 2026.
  pasta      onde ficam os "originais/" baixados do R2; padrao: pasta atual.
"""
import os
import sys
from multiprocessing import Pool

from PIL import Image, ImageOps

from fotos_marca import marca_dagua

BASE = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else os.getcwd()
ORIGINAIS = os.path.join(BASE, "originais")
ANO = 2026

# pasta, lado maior, qualidade JPEG, altura da marca (fracao do lado maior),
# espacamento entre marcas, assinatura no canto.
# A miniatura leva marca PROPORCIONALMENTE MAIOR: a marca da previa, reduzida a
# 400px, vira poeira ilegivel e deixa de proteger.
TAMANHOS = [
    ("previews", 1200, 82, 0.09, 1.08, True),
    ("thumbs", 400, 78, 0.20, 1.12, False),
]

OPACIDADE = float(sys.argv[1]) if len(sys.argv) > 1 else 0.45


def processar(nome: str):
    origem = os.path.join(ORIGINAIS, nome)
    try:
        with Image.open(origem) as raw:
            # exif_transpose: sem isto, foto tirada na vertical sai deitada.
            base = ImageOps.exif_transpose(raw).convert("RGB")
            for pasta, lado, qualidade, altura, passo, canto in TAMANHOS:
                destino = os.path.join(BASE, pasta, str(ANO), nome)
                if os.path.exists(destino):
                    continue
                im = base.copy()
                im.thumbnail((lado, lado), Image.LANCZOS)
                # Sem EXIF de proposito: o original guarda camera, data e GPS;
                # a versao publica nao precisa levar coordenada de ninguem.
                marca_dagua(
                    im, opacidade=OPACIDADE, altura_ratio=altura, passo=passo, com_canto=canto
                ).save(destino, "JPEG", quality=qualidade, optimize=True, progressive=True)
        return None
    except Exception as erro:  # arquivo truncado, formato estranho, etc.
        return f"{nome}: {erro}"


if __name__ == "__main__":
    for pasta, *_ in TAMANHOS:
        os.makedirs(os.path.join(BASE, pasta, str(ANO)), exist_ok=True)

    nomes = sorted(n for n in os.listdir(ORIGINAIS) if n.lower().endswith((".jpg", ".jpeg")))
    print(f"{len(nomes)} fotos, opacidade da trama {OPACIDADE}")

    falhas = []
    with Pool(12) as pool:
        for i, erro in enumerate(pool.imap_unordered(processar, nomes, chunksize=8), 1):
            if erro:
                falhas.append(erro)
            if i % 200 == 0:
                print(f"  {i}/{len(nomes)}", flush=True)

    print(f"pronto: {len(nomes) - len(falhas)} ok, {len(falhas)} com erro")
    for f in falhas:
        print("  FALHOU", f)
