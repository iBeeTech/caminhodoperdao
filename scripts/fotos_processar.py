"""
Gera as versoes publicas das fotos do evento a partir dos originais baixados do R2.

Para cada foto saem ate TRES versoes:

  thumbs/<ano>/     400px no lado maior  -> a miniatura da grade
  previews/<ano>/  1200px no lado maior  -> a foto que abre ao clicar
  medias/<ano>/    2048px no lado maior  -> o que se BAIXA depois que a venda acaba

A miniatura existe por um motivo de dinheiro do peregrino, nao de estetica: sao
2882 fotos numa pagina so. Se a grade usar a foto de 1200px, rolar o album gasta
centenas de MB do celular de quem so queria se achar numa foto.

O original em alta NUNCA e alterado nem republicado por este script.

ALBUM QUE VENDE x ALBUM GRATUITO. A trama por toda a foto existe para o arquivo
em alta nao ser levado de graca. Album gratuito (--sem-trama, caso de 2025, cujos
arquivos ja sao versoes reduzidas e nao ha o que vender) leva so a assinatura no
canto: encher de marca uma foto que se pode baixar ao lado seria estorvo sem
motivo.

A MEDIA RESOLUCAO nunca leva trama, nem em album de venda: ela so vai ao ar
depois que a venda daquele ano acaba (a rota /api/fotos/medias recusa antes
disso), e nesse momento a foto e um presente, nao uma amostra. Leva a assinatura
no canto, que e credito do fotografo.

ALBUM SEM MARCA NENHUMA (--sem-marca). Decisao do organizador em 01/09/2026 para
2026: com a venda encerrada, nao ha mais o que proteger, e a marca so atrapalha a
foto que a pessoa vai guardar. Sai a trama E a assinatura. Nao e o padrao de
proposito: album em venda TEM de sair marcado, e um esquecimento aqui entrega de
graca o que esta no carrinho.

REGRAVAR POR CIMA (--refazer). Sem esta flag o script pula o que ja existe, que e
o que deixa repetir a rodada depois de uma queda. Com ela, refaz tudo - e o que
se usa ao trocar a marca de um album ja publicado. Nesse caso, LEMBRE de subir a
VERSAO_DAS_FOTOS em src/services/fotos/fotos.service.ts: as fotos publicas sao
servidas com cache de um ano, e sem isso metade dos celulares continua mostrando
a versao marcada.

POR QUE 2048px. Imprime bem ate 15x20 cm, enche qualquer tela de celular e pesa
~600 KB. Fica claramente abaixo do original da camera (6000px, 5-15 MB), que
continua sendo o que se vendeu a quem doou.

Uso:
  # durante a venda: so miniatura e previa, marcadas
  python3 scripts/fotos_processar.py --ano 2026 --pasta /caminho

  # depois que a venda acaba: as tres versoes, sem marca nenhuma
  python3 scripts/fotos_processar.py --ano 2026 --pasta /caminho \
      --saidas thumbs,previews,medias --sem-marca --refazer

  python3 scripts/fotos_processar.py --ano 2025 --pasta /caminho --sem-trama
"""
import argparse
import os
from multiprocessing import Pool

from PIL import Image, ImageOps

from fotos_marca import marca_dagua

EXTENSOES = (".jpg", ".jpeg", ".png", ".webp")

# lado maior, qualidade JPEG, altura da marca (fracao do lado maior),
# espacamento entre marcas, assinatura no canto, aceita trama.
# A miniatura leva marca PROPORCIONALMENTE MAIOR: a marca da previa, reduzida a
# 400px, vira poeira ilegivel e deixa de proteger.
TAMANHOS = {
    "previews": (1200, 82, 0.09, 1.08, True, True),
    "thumbs": (400, 78, 0.20, 1.12, False, True),
    # A media nao aceita trama: os numeros dela so valem para a assinatura.
    "medias": (2048, 85, 0.09, 1.08, True, False),
}

# O que sai quando ninguem escolhe: as duas versoes que o album usa enquanto a
# venda esta aberta. A media resolucao e pedida de proposito, com --saidas.
SAIDAS_PADRAO = ["previews", "thumbs"]

opcoes = None  # preenchido no __main__; os processos filhos herdam por fork.


def processar(nome: str):
    origem = os.path.join(opcoes.pasta, "originais", nome)
    saida = os.path.splitext(nome)[0] + ".jpg"
    try:
        with Image.open(origem) as raw:
            # exif_transpose: sem isto, foto tirada na vertical sai deitada.
            base = ImageOps.exif_transpose(raw).convert("RGB")
            for pasta in opcoes.saidas:
                lado, qualidade, altura, passo, canto, aceita_trama = TAMANHOS[pasta]
                destino = os.path.join(opcoes.pasta, pasta, str(opcoes.ano), saida)
                if os.path.exists(destino) and not opcoes.refazer:
                    continue
                im = base.copy()
                im.thumbnail((lado, lado), Image.LANCZOS)
                # Sem EXIF de proposito: o original guarda camera, data e GPS;
                # a versao publica nao precisa levar coordenada de ninguem.
                if not opcoes.sem_marca:
                    im = marca_dagua(
                        im,
                        opacidade=opcoes.opacidade,
                        altura_ratio=altura,
                        passo=passo,
                        com_canto=canto,
                        trama_ligada=aceita_trama and not opcoes.sem_trama,
                    )
                im.save(destino, "JPEG", quality=qualidade, optimize=True, progressive=True)
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
    parser.add_argument("--sem-marca", action="store_true", help="foto limpa: sem trama e sem assinatura")
    parser.add_argument("--refazer", action="store_true", help="regrava por cima do que ja existe")
    parser.add_argument("--processos", type=int, default=12)
    parser.add_argument(
        "--saidas",
        default=",".join(SAIDAS_PADRAO),
        help=f"versoes a gerar, separadas por virgula ({', '.join(TAMANHOS)})",
    )
    opcoes = parser.parse_args()
    opcoes.pasta = os.path.abspath(opcoes.pasta)

    opcoes.saidas = [nome.strip() for nome in opcoes.saidas.split(",") if nome.strip()]
    desconhecidas = [nome for nome in opcoes.saidas if nome not in TAMANHOS]
    if desconhecidas or not opcoes.saidas:
        parser.error(f"--saidas invalido: {desconhecidas or 'vazio'}. Use: {', '.join(TAMANHOS)}")

    for pasta in opcoes.saidas:
        os.makedirs(os.path.join(opcoes.pasta, pasta, str(opcoes.ano)), exist_ok=True)

    origem = os.path.join(opcoes.pasta, "originais")
    nomes = sorted(n for n in os.listdir(origem) if n.lower().endswith(EXTENSOES))
    com_trama = not opcoes.sem_trama and any(TAMANHOS[nome][5] for nome in opcoes.saidas)
    marca = "SEM MARCA" if opcoes.sem_marca else (f"trama {opcoes.opacidade}" if com_trama else "so assinatura")
    refaz = ", regravando por cima" if opcoes.refazer else ""
    print(f"{len(nomes)} fotos de {opcoes.ano} -> {', '.join(opcoes.saidas)}, {marca}{refaz}")

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
